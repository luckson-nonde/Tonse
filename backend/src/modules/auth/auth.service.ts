import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserDisplayIdUtil } from '../../utils/user-display-id.util';
import { BCRYPT_SALT_ROUNDS } from '../../common/constants/security';

const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Auth Service
 *
 * Handles authentication with the three-tier identity system:
 * - NRC verification during registration
 * - Login by NRC or email (with multiple email support)
 * - JWT token generation and refresh
 * - Password reset via single-use, short-lived token
 * - Complete audit logging of authentication events
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService
  ) {}

  /**
   * Register a new user with three-tier identity verification
   *
   * Required fields:
   * - NRC: National Registration Card (real-world anchor - prevents duplicates)
   * - email: Primary email address (verified separately)
   * - name: Full name
   * - password: Will be hashed with bcrypt
   * - phone: Contact phone
   *
   * Optional fields:
   * - role: User role (default: BUYER)
   * - profilePicture: User profile picture
   */
  async register(registerDto: RegisterDto, ipAddress?: string, userAgent?: string) {
    const {
      nrc,
      email,
      password,
      name,
      phone,
      role = 'BUYER',
      profilePicture,
      nrcDocument,
      dob,
      categoryIds,
      subRole,
      referralCode,
    } = registerDto;

    // Validate required NRC field
    if (!nrc || nrc.trim() === '') {
      throw new BadRequestException('NRC is required for account registration');
    }

    // Validate other required fields
    if (!email || !email.trim()) {
      throw new BadRequestException('Email is required');
    }

    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    if (!name || !name.trim()) {
      throw new BadRequestException('Name is required');
    }

    // Normalize NRC
    const normalizedNrc = UserDisplayIdUtil.normalizeIdentifier(nrc);

    // Check if NRC already exists (prevents duplicate real-world identities)
    const existingUserWithNrc = await this.usersService.findByNrc(normalizedNrc);
    if (existingUserWithNrc) {
      throw new ConflictException(
        `An account already exists with this NRC. One physical person (one NRC) = one account.`
      );
    }

    // Check if email already in use
    const existingUserWithEmail = await this.usersService.findByEmail(email);
    if (existingUserWithEmail) {
      throw new ConflictException(`Email already registered. Please use a different email.`);
    }

    // Check if phone already in use (identity verification)
    if (phone) {
      const existingUserWithPhone = await this.usersService.findByPhone(phone);
      if (existingUserWithPhone) {
        throw new ConflictException(
          `Phone number already registered. Please use a different phone number.`
        );
      }
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    try {
      // Register user using the three-tier identity system. categoryIds
      // + subRole travel into the profile create at register time, so
      // seller_profile_categories rows + the archetype cache land in the
      // same transaction as user creation. The previous flow relied on a
      // follow-up PATCH /users/:id which silently failed for every
      // seller registered to date.
      const user = await this.usersService.register(
        normalizedNrc,
        name,
        email,
        phone,
        passwordHash,
        role,
        profilePicture,
        dob,
        nrcDocument,
        ipAddress,
        userAgent,
        { categoryIds, subRole },
        // Referral attribution travels in the same server call as user
        // creation (not folded into profileSeed — it's not profile data).
        referralCode,
      );

      // Phase 3: profile fields (name, email, verificationStatus) live on
      // the active profile row created by usersService.register. Flatten to
      // include them in the response.
      const flat = await this.usersService.flattenWithProfile(user);

      // Issue auth tokens immediately so the client can authenticate the
      // follow-up onboarding writes (updateProfile, junction-table category
      // writes) without a separate /auth/login round-trip. Previously
      // register returned only the user, the frontend then tried to
      // updateProfile *before* logging in, that call returned 401, and the
      // apiClient interceptor force-redirected to /login — cutting the
      // seller out of their own onboarding right after account creation.
      const accessToken = this.generateAccessToken(
        user.id,
        user.displayId,
        email,
        user.role,
        user.nrcNumber,
      );
      const refreshToken = this.generateRefreshToken(user.id);
      await this.usersService.updateRefreshToken(user.id, refreshToken);

      return {
        success: true,
        accessToken,
        refreshToken,
        user: flat,
        message: 'Registration successful. Your account is pending NRC verification by an admin.',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Login user with email and password only
   *
   * NRC, phone, and other identity info are ONLY used for:
   * - Registration verification
   * - Account identity association
   * - Preventing duplicate accounts in the system
   *
   * Login credentials: Email + Password only
   */
  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const { email, password } = loginDto;

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    // Find user by email only
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const userWithPassword = await this.usersService.findById(user.id, true);
    const isPasswordValid = await bcrypt.compare(password, userWithPassword.password);

    if (!isPasswordValid) {
      // Log failed login attempt
      await this.usersService.flagSuspiciousActivity(
        user.id,
        'Failed login attempt',
        { email, method: 'password_mismatch' },
        ipAddress,
        userAgent
      );

      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is suspended or inactive');
    }

    // Update last login timestamp
    await this.usersService.updateLastLoginAt(user.id);

    // Generate tokens with enhanced claims. Email comes from the login
    // input — it's the verified address the user just authenticated with.
    // nrcNumber is select:false on the entity (see user.entity.ts), so it
    // must be fetched explicitly here rather than read off `user`.
    const userWithNrc = await this.usersService.findByIdWithNrc(user.id);
    const accessToken = this.generateAccessToken(
      user.id,
      user.displayId,
      email,
      user.role,
      userWithNrc?.nrcNumber
    );
    const refreshToken = this.generateRefreshToken(user.id);

    // Save refresh token
    await this.usersService.updateRefreshToken(user.id, refreshToken);

    // Log successful login
    await this.usersService.createAuditLog(
      user.id,
      'USER_REGISTERED', // Reuse event or create LOGIN event
      `User logged in via ${email}`,
      null,
      { method: 'password', email },
      'login',
      ipAddress,
      userAgent
    );

    // Phase 3: merge the active profile into the user response so the
    // frontend's existing reads (user.name, user.email, user.companyName,
    // user.verificationStatus, etc.) all see the right data — sourced from
    // the profile row, with auth fields kept on user.
    const flat = await this.usersService.flattenWithProfile(user);

    return {
      success: true,
      accessToken,
      refreshToken,
      user: flat,
    };
  }

  /**
   * Refresh access token using a valid, non-revoked refresh token.
   *
   * presentedRefreshToken is the raw token JwtRefreshStrategy pulled off
   * the Authorization header — its signature and expiry were already
   * verified against jwt.refreshSecret by that strategy before this method
   * runs. What's checked here is revocation: it must still match the copy
   * stored on the user row. logout() clears that column, and a successful
   * refresh always rotates it (below), so a logged-out or already-used
   * refresh token is rejected rather than silently accepted.
   */
  async refreshToken(userId: string, presentedRefreshToken: string) {
    // findByIdWithRefreshToken (not findById) — refreshToken is
    // select:false on the entity by default; findByIdWithNrc below is for
    // the token claim, which is select:false separately.
    const userWithToken = await this.usersService.findByIdWithRefreshToken(userId);
    if (!userWithToken || userWithToken.refreshToken !== presentedRefreshToken) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    const user = await this.usersService.findByIdWithNrc(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Phase 3: email lives on the active profile, so load it for the JWT
    // claim. Falls back to empty string if the user has no profile yet
    // (admins, freshly-bootstrapped accounts).
    const flat = await this.usersService.flattenWithProfile(user);
    const accessToken = this.generateAccessToken(
      user.id,
      user.displayId,
      flat?.email || '',
      user.role,
      user.nrcNumber
    );
    // Rotation: a new refresh token replaces the old one, so the token
    // just presented can never be used again even if it leaks afterward.
    const refreshToken = this.generateRefreshToken(user.id);

    await this.usersService.updateRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Logout user by clearing refresh token
   *
   * Also logs the logout event for security audit
   */
  async logout(userId: string, ipAddress?: string, userAgent?: string) {
    await this.usersService.clearRefreshToken(userId);

    // Log logout event
    await this.usersService.createAuditLog(
      userId,
      'USER_REGISTERED', // Reuse or create LOGOUT event
      'User logged out',
      null,
      null,
      'logout',
      ipAddress,
      userAgent
    );

    return { message: 'Logout successful' };
  }

  /**
   * Request a password reset. Always returns the same generic response
   * regardless of whether the email is registered — leaking that would
   * turn this into an account-enumeration oracle.
   *
   * Delivery is simulated: the reset link is logged server-side rather
   * than emailed, since no email/SMS provider is wired into this backend
   * yet. Swap the logger.warn below for a real send once one is.
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const genericResponse = {
      message: 'If an account exists for that email, a reset link has been sent.',
    };

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return genericResponse;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
    await this.usersService.setPasswordResetToken(user.id, tokenHash, expiresAt);

    const baseUrl = this.configService.get('promoter.appBaseUrl') || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${rawToken}`;
    // SIMULATED DELIVERY — see method docstring.
    this.logger.warn(
      `Password reset requested for ${email}. No email provider is configured, ` +
        `so the link is logged here instead of sent: ${resetLink} (expires in 30 min)`,
    );

    return genericResponse;
  }

  /**
   * Consume a password-reset token: hash the presented token, look up a
   * user whose stored hash matches and hasn't expired, set the new
   * password, and clear the token so it can never be reused (single-use).
   */
  async resetPassword(rawToken: string, newPassword: string): Promise<{ message: string }> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const user = await this.usersService.findByPasswordResetTokenHash(tokenHash);

    if (
      !user ||
      !user.passwordResetTokenExpiresAt ||
      user.passwordResetTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Reset link is invalid or has expired');
    }

    await this.usersService.changePassword(user.id, newPassword, undefined, {
      skipCurrentPasswordCheck: true,
    });
    await this.usersService.setPasswordResetToken(user.id, null, null);
    // A stolen session shouldn't survive a password reset either.
    await this.usersService.clearRefreshToken(user.id);

    await this.usersService.createAuditLog(
      user.id,
      'PASSWORD_CHANGED',
      'Password reset via token',
      { hasPassword: true },
      { hasPassword: true, via: 'reset_token' },
      'password',
    );

    return { message: 'Password has been reset. You can now log in with your new password.' };
  }

  /**
   * Generate JWT access token with enhanced security claims
   *
   * Includes:
   * - User UUID for internal operations
   * - Display ID for user-facing operations
   * - Email for communication
   * - Role for authorization
   * - NRC for identity verification (not exposed to client)
   */
  private generateAccessToken(
    userId: string,
    displayId: string,
    email: string,
    role: string,
    nrc?: string
  ): string {
    return this.jwtService.sign(
      {
        sub: userId, // User UUID
        displayId, // User-friendly display ID
        email, // Primary email
        role, // User role for authorization
        nrc: nrc ? nrc.substring(0, 5) + '****' : undefined, // Masked NRC for logging
        type: 'access',
      },
      {
        secret: this.configService.get('jwt.secret'),
        expiresIn: this.configService.get('jwt.expiresIn') || '1h',
      }
    );
  }

  /**
   * Generate JWT refresh token
   *
   * Shorter-lived token used only to obtain new access tokens
   * Less sensitive claims for security
   */
  private generateRefreshToken(userId: string): string {
    return this.jwtService.sign(
      {
        sub: userId,
        type: 'refresh',
      },
      {
        secret: this.configService.get('jwt.refreshSecret'),
        expiresIn: this.configService.get('jwt.refreshExpiresIn') || '7d',
      }
    );
  }
}
