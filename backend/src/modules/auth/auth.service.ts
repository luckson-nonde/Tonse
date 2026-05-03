import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserDisplayIdUtil } from '../../utils/user-display-id.util';

/**
 * Auth Service
 *
 * Handles authentication with the three-tier identity system:
 * - NRC verification during registration
 * - Login by NRC or email (with multiple email support)
 * - JWT token generation and refresh
 * - Account recovery via NRC lookup
 * - Complete audit logging of authentication events
 */
@Injectable()
export class AuthService {
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
    const { nrc, email, password, name, phone, role = 'BUYER', profilePicture, dob } = registerDto;

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
    const passwordHash = await bcrypt.hash(password, 10);

    try {
      // Register user using the three-tier identity system
      const user = await this.usersService.register(
        normalizedNrc,
        name,
        email,
        phone,
        passwordHash,
        role,
        profilePicture,
        dob,
        ipAddress,
        userAgent
      );

      return {
        success: true,
        user: {
          id: user.id,
          displayId: user.displayId,
          nrcNumber: user.nrcNumber,
          email: user.primaryEmail,
          name: user.name,
          role: user.role,
          verificationStatus: user.verificationStatus,
        },
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

    // Generate tokens with enhanced claims
    const accessToken = this.generateAccessToken(
      user.id,
      user.displayId,
      user.primaryEmail,
      user.role,
      user.nrcNumber
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
   * Refresh access token using valid refresh token
   *
   * Returns new access token and optionally new refresh token
   */
  async refreshToken(userId: string, ipAddress?: string, userAgent?: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    const accessToken = this.generateAccessToken(
      user.id,
      user.displayId,
      user.primaryEmail,
      user.role,
      user.nrcNumber
    );
    const refreshToken = this.generateRefreshToken(user.id);

    // Save new refresh token
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
   * Account recovery via NRC lookup
   *
   * Returns user information for password reset without exposing full NRC
   */
  async recoverAccount(nrc: string) {
    const normalizedNrc = UserDisplayIdUtil.normalizeIdentifier(nrc);
    const user = await this.usersService.findByNrc(normalizedNrc);

    if (!user) {
      // Don't reveal if NRC exists - security best practice
      throw new BadRequestException('If account exists, recovery email will be sent');
    }

    // In real implementation, would send recovery email here
    return {
      found: true,
      displayId: user.displayId,
      recoveryEmail:
        user.primaryEmail?.substring(0, user.primaryEmail.indexOf('@') + 2) + '***.***',
      message: 'Recovery email sent to your registered email address',
    };
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
