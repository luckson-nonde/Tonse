import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserEmail } from './entities/user-email.entity';
import { IdentityAudit } from './entities/identity-audit.entity';
import { BuyerProfile } from './entities/buyer-profile.entity';
import { SellerProfile } from './entities/seller-profile.entity';
import { ServiceProviderProfile } from './entities/service-provider-profile.entity';
import { UserDisplayIdUtil } from '../../utils/user-display-id.util';
import { UpdateUserDto } from './dto/update-user.dto';
import * as crypto from 'crypto';

// Phase 3 contract: users table holds ONLY these fields. Anything else is
// profile data and lives in buyer_profiles / seller_profiles /
// service_provider_profiles. The frontend doesn't see this split — auth
// responses merge active profile into user before returning.
const USER_AUTH_FIELDS = [
  'id',
  'nrcNumber',
  'displayId',
  'password',
  'refreshToken',
  'role',
  'isActive',
  'isNrcVerified',
  'nrcDocumentPath',
  'pin',
  'lastLoginAt',
  'lastNrcVerificationAt',
  'createdAt',
  'updatedAt',
  'activeProfileId',
  'activeProfileType',
];

type ActiveProfile = BuyerProfile | SellerProfile | ServiceProviderProfile;

/**
 * Users Service
 *
 * Manages the three-tier user identity system:
 * - NRC (National Registration Card): Immutable real-world anchor
 * - UUID: System identifier for internal operations
 * - DisplayId: User-facing friendly identifier
 *
 * Provides comprehensive methods for:
 * - User registration and NRC verification
 * - Email management (multiple emails per real person)
 * - Identity audit logging
 * - Fraud detection and account security
 * - Account recovery
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(UserEmail)
    private readonly userEmailRepository: Repository<UserEmail>,

    @InjectRepository(IdentityAudit)
    private readonly identityAuditRepository: Repository<IdentityAudit>,

    @InjectRepository(BuyerProfile)
    private readonly buyerProfileRepository: Repository<BuyerProfile>,

    @InjectRepository(SellerProfile)
    private readonly sellerProfileRepository: Repository<SellerProfile>,

    @InjectRepository(ServiceProviderProfile)
    private readonly serviceProviderProfileRepository: Repository<ServiceProviderProfile>
  ) {}

  // ===== PROFILE HELPERS (Phase 3) ============================================

  /**
   * Resolve the repository for a given profile type. Centralised so we don't
   * scatter `if/else if/else` over every read/write site.
   */
  private profileRepoFor(type: string): Repository<ActiveProfile> | null {
    switch (type) {
      case 'BUYER':
        return this.buyerProfileRepository as Repository<ActiveProfile>;
      case 'SELLER':
        return this.sellerProfileRepository as Repository<ActiveProfile>;
      case 'SERVICE_PROVIDER':
        return this.serviceProviderProfileRepository as Repository<ActiveProfile>;
      default:
        return null;
    }
  }

  /**
   * Default profile type for a role. Used when bootstrapping the active
   * profile pointer at registration time.
   */
  private defaultProfileTypeForRole(role: string): string | null {
    switch (role) {
      case 'BUYER':
        return 'BUYER';
      case 'SELLER':
        return 'SELLER';
      case 'SERVICE_PROVIDER':
        return 'SERVICE_PROVIDER';
      default:
        return null;
    }
  }

  /** Load the active profile row for a user (or null if none). */
  async loadActiveProfile(user: User): Promise<ActiveProfile | null> {
    if (!user?.activeProfileId || !user?.activeProfileType) return null;
    const repo = this.profileRepoFor(user.activeProfileType);
    if (!repo) return null;
    return (repo as any).findOne({ where: { id: user.activeProfileId } });
  }

  /**
   * Merge the active profile fields into the user object so the wire shape
   * the frontend receives stays flat. Profile is authoritative for any
   * overlapping field — that's the whole point of Phase 3 — so it spreads
   * AFTER user. Auth-only fields are safe because the profile doesn't
   * carry them. Profile bookkeeping (its own id / userId / created /
   * updated) is stripped before merging so it doesn't clobber the user's.
   *
   * The profile's id is exposed as `activeProfileId` (already present on
   * the user row) so write paths can target the right row directly.
   */
  async flattenWithProfile(user: User | null | undefined): Promise<any> {
    if (!user) return null;
    const profile = await this.loadActiveProfile(user);
    if (!profile) return user;
    const {
      id: _profId,
      userId: _profUserId,
      createdAt: _pCreated,
      updatedAt: _pUpdated,
      ...profileFields
    } = profile as any;
    return { ...user, ...profileFields };
  }

  /** Split a flat update payload into auth fields (for users) and profile
   *  fields (for the active profile). Auth keys are the ones in
   *  USER_AUTH_FIELDS — everything else is profile. */
  private splitUpdatePayload(data: Record<string, any>): {
    userPatch: Record<string, any>;
    profilePatch: Record<string, any>;
  } {
    const userPatch: Record<string, any> = {};
    const profilePatch: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      if (USER_AUTH_FIELDS.includes(key)) {
        userPatch[key] = data[key];
      } else {
        profilePatch[key] = data[key];
      }
    }
    return { userPatch, profilePatch };
  }

  /**
   * Create a profile row matching `role` for the given user, then point the
   * user's activeProfileId / activeProfileType at the new row. Returns the
   * created profile.
   */
  async createProfileForRole(
    userId: string,
    role: string,
    profileFields: Record<string, any> = {}
  ): Promise<ActiveProfile | null> {
    const type = this.defaultProfileTypeForRole(role);
    if (!type) return null;
    const repo = this.profileRepoFor(type);
    if (!repo) return null;

    const profile = (repo as any).create({ userId, ...profileFields });
    const saved = await (repo as any).save(profile);

    await this.userRepository.update(
      { id: userId },
      { activeProfileId: saved.id, activeProfileType: type }
    );

    return saved;
  }

  // ===== BACKWARD COMPATIBILITY METHODS (kept for existing code) =====

  /**
   * Legacy create method - maintains compatibility
   * Routes to register method for new three-tier system
   */
  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User> {
    return this.findByAnyEmail(email);
  }

  async updateRefreshToken(userId: string, refreshToken: string): Promise<void> {
    await this.userRepository.update({ id: userId }, { refreshToken });
  }

  async clearRefreshToken(userId: string): Promise<void> {
    await this.userRepository.update({ id: userId }, { refreshToken: null });
  }

  /**
   * Apply a profile update. Phase 3 contract: auth fields go to users,
   * everything else routes to the active profile. Caller passes a flat
   * payload — splitting happens here.
   *
   * If the user has no active profile yet (legacy row, or just-created),
   * we lazily create one matching their role and write the profile fields
   * to it.
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const { userPatch, profilePatch } = this.splitUpdatePayload(updateUserDto as any);

    if (Object.keys(userPatch).length > 0) {
      await this.userRepository.update({ id }, userPatch);
    }

    if (Object.keys(profilePatch).length > 0) {
      const user = await this.userRepository.findOne({ where: { id } });
      if (user) {
        let activeId = user.activeProfileId;
        let activeType = user.activeProfileType;
        if (!activeId || !activeType) {
          // Lazily create the matching profile row.
          const created = await this.createProfileForRole(id, user.role, profilePatch);
          if (!created) {
            // Role with no profile concept (e.g. ADMIN) — nothing to write.
            return this.findById(id);
          }
        } else {
          const repo = this.profileRepoFor(activeType);
          if (repo) {
            await (repo as any).update({ id: activeId }, profilePatch);
          }
        }
      }
    }

    return this.findById(id);
  }

  async findAll(filters: any = {}): Promise<{ data: User[]; total: number }> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (filters.role) {
      queryBuilder.andWhere('user.role = :role', { role: filters.role });
    }

    // Phase 3: verificationStatus lives on the role-specific profile row.
    // Join the profile table that matches the current role filter and
    // filter on profile.verificationStatus. The admin verification queue
    // always passes role together with verificationStatus, so this covers
    // every real caller. If verificationStatus is requested without a
    // role we silently skip (was always nonsensical even before Phase 3).
    if (filters.verificationStatus && filters.role) {
      const profileTable =
        filters.role === 'BUYER' ? 'buyer_profiles'
        : filters.role === 'SELLER' ? 'seller_profiles'
        : filters.role === 'SERVICE_PROVIDER' ? 'service_provider_profiles'
        : null;
      if (profileTable) {
        queryBuilder
          .innerJoin(profileTable, 'profile', 'profile."userId" = user.id')
          .andWhere('profile."verificationStatus" = :verificationStatus', {
            verificationStatus: filters.verificationStatus,
          });
      }
    }

    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive: filters.isActive });
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    queryBuilder.skip((page - 1) * limit).take(limit);

    queryBuilder.orderBy('user.createdAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  async remove(id: string): Promise<void> {
    await this.userRepository.delete({ id });
  }

  async updateLastLoginAt(userId: string): Promise<void> {
    await this.userRepository.update({ id: userId }, { lastLoginAt: new Date() });
  }

  // ===== USER REGISTRATION =====

  /**
   * Register a new user with NRC-based identity
   *
   * @param nrcNumber - National Registration Card number (immutable anchor)
   * @param name - User's full name
   * @param email - Primary email address
   * @param phone - Contact phone number
   * @param passwordHash - Hashed password
   * @param role - User's primary role
   * @param ipAddress - IP address for audit trail
   * @param userAgent - User agent for audit trail
   * @returns Created user
   * @throws ConflictException if NRC already exists (prevents duplicate accounts)
   * @throws ConflictException if email already exists
   */
  async register(
    nrcNumber: string,
    name: string,
    email: string,
    phone: string,
    passwordHash: string,
    role: string = 'BUYER',
    profilePicture?: string,
    dateOfBirth?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<User> {
    // Normalize NRC
    const normalizedNrc = UserDisplayIdUtil.normalizeIdentifier(nrcNumber);

    // Check if NRC already exists (prevent duplicate real-world identities)
    const existingUserWithNrc = await this.findByNrc(normalizedNrc);
    if (existingUserWithNrc) {
      throw new ConflictException(
        `Account with NRC ${normalizedNrc} already exists. Please use a different NRC or login to your existing account.`
      );
    }

    // Check if email already exists
    const existingEmail = await this.userEmailRepository.findOne({
      where: { email: email.toLowerCase() },
    });
    if (existingEmail) {
      throw new ConflictException(
        `Email ${email} is already registered. Please use a different email or recover your account.`
      );
    }

    // Phase 3c: users row holds auth identity ONLY. Profile fields (name,
    // email, phone, profilePicture, dateOfBirth, verificationStatus) live
    // on the matching profile row created below.
    const user = this.userRepository.create({
      nrcNumber: normalizedNrc,
      password: passwordHash,
      role,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);

    // Generate and assign display ID
    savedUser.displayId = UserDisplayIdUtil.generateDisplayId(savedUser.id);
    await this.userRepository.save(savedUser);

    // user_emails is the canonical lookup table for sign-in by email. The
    // primary email lives here flagged with isPrimary=true; other addresses
    // can be added later via the email-management endpoints.
    await this.userEmailRepository.save(
      this.userEmailRepository.create({
        userId: savedUser.id,
        email: email.toLowerCase(),
        isPrimary: true,
        verificationStatus: 'NOT_VERIFIED',
      })
    );

    // Create the matching profile row and point activeProfileId at it. The
    // profile carries the user-facing fields (name, email, phone, etc.) so
    // /auth/me, /auth/login, and dashboards see consistent data.
    await this.createProfileForRole(savedUser.id, role, {
      name,
      email: email.toLowerCase(),
      phone,
      profilePicture: profilePicture || null,
      dateOfBirth: dateOfBirth || null,
      verificationStatus: 'PENDING',
    });

    // Log the registration event
    await this.createAuditLog(
      savedUser.id,
      'USER_REGISTERED',
      `New user registered with NRC: ${normalizedNrc}`,
      null,
      { nrc: normalizedNrc, email, role },
      'nrc',
      ipAddress,
      userAgent
    );

    // Re-load so the returned object includes activeProfileId/Type.
    return this.findById(savedUser.id);
  }

  // ===== FIND OPERATIONS =====

  /**
   * Find user by UUID (internal system ID)
   *
   * @param id - User UUID
   * @param includePassword - Include password hash in result
   * @returns User or null
   */
  async findById(id: string, includePassword: boolean = false): Promise<User> {
    let query = this.userRepository.createQueryBuilder('user').where('user.id = :id', { id });

    if (includePassword) {
      query = query.addSelect('user.password');
    }

    return query.getOne();
  }

  /**
   * Find user by NRC (real-world identity anchor)
   * Primary lookup method - ensures identity is linked to real person
   *
   * @param nrcNumber - National Registration Card number
   * @returns User or null
   */
  async findByNrc(nrcNumber: string): Promise<User> {
    const normalizedNrc = UserDisplayIdUtil.normalizeIdentifier(nrcNumber);
    return this.userRepository.findOne({
      where: { nrcNumber: normalizedNrc },
      relations: ['emails', 'identityAudits'],
    });
  }

  /**
   * Find user by display ID (user-facing identifier)
   * Used when user provides their friendly ID
   *
   * @param displayId - User-friendly ID (USER-XXXXXX)
   * @returns User or null
   */
  async findByDisplayId(displayId: string): Promise<User> {
    return this.userRepository.findOne({
      where: { displayId },
      relations: ['emails', 'identityAudits'],
    });
  }

  /**
   * Find user by any email address (including secondary emails)
   * Allows login with any registered email for same account
   *
   * @param email - Any registered email
   * @returns User or null
   */
  async findByAnyEmail(email: string): Promise<User> {
    const userEmail = await this.userEmailRepository.findOne({
      where: { email: email.toLowerCase() },
      relations: ['user'],
    });
    return userEmail?.user || null;
  }

  /**
   * Find user by phone number (identity verification).
   * Phase 3: phone lives on profile rows. We check all three profile
   * tables — first hit wins. Used by registration to surface "phone
   * already in use" errors.
   */
  async findByPhone(phone: string): Promise<User | null> {
    if (!phone) return null;
    const repos: Repository<ActiveProfile>[] = [
      this.buyerProfileRepository as Repository<ActiveProfile>,
      this.sellerProfileRepository as Repository<ActiveProfile>,
      this.serviceProviderProfileRepository as Repository<ActiveProfile>,
    ];
    for (const repo of repos) {
      const hit = await (repo as any).findOne({ where: { phone } });
      if (hit?.userId) {
        return this.findById(hit.userId);
      }
    }
    return null;
  }

  /**
   * Get full user profile with all relationships
   *
   * @param id - User ID
   * @returns Complete user object with emails and audit logs
   */
  async getUserProfile(id: string): Promise<User> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['emails', 'identityAudits'],
      order: {
        emails: { createdAt: 'DESC' },
        identityAudits: { createdAt: 'DESC' },
      },
    });
  }

  // ===== EMAIL MANAGEMENT =====

  /**
   * Add a secondary email to user's account
   * Allows same person to use multiple email addresses
   *
   * @param userId - User ID
   * @param email - Email address to add
   * @param ipAddress - IP address for audit
   * @param userAgent - User agent for audit
   * @returns Created UserEmail
   * @throws ConflictException if email already in use
   */
  async addEmail(
    userId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserEmail> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email already exists
    const existingEmail = await this.userEmailRepository.findOne({
      where: { email: email.toLowerCase() },
    });
    if (existingEmail) {
      throw new ConflictException(`Email ${email} is already registered`);
    }

    // Create new email entry
    const userEmail = this.userEmailRepository.create({
      userId,
      email: email.toLowerCase(),
      isPrimary: false,
      verificationStatus: 'NOT_VERIFIED',
    });

    const savedEmail = await this.userEmailRepository.save(userEmail);

    // Generate verification token
    const verificationToken = this.generateVerificationToken();
    savedEmail.verificationToken = verificationToken;
    savedEmail.verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    savedEmail.verificationStatus = 'VERIFICATION_SENT';
    await this.userEmailRepository.save(savedEmail);

    // Log email addition. Phase 3: previous primary lives on user_emails
    // (isPrimary=true), not on the user row.
    const previousPrimary = await this.userEmailRepository.findOne({
      where: { userId, isPrimary: true },
    });
    await this.createAuditLog(
      userId,
      'EMAIL_ADDED',
      `New email added: ${email}`,
      { email: previousPrimary?.email ?? null },
      { email },
      'email',
      ipAddress,
      userAgent
    );

    return savedEmail;
  }

  /**
   * Remove an email from user's account
   * Cannot remove primary email
   *
   * @param userId - User ID
   * @param emailId - Email record ID to remove
   * @param ipAddress - IP address for audit
   * @param userAgent - User agent for audit
   */
  async removeEmail(
    userId: string,
    emailId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userEmail = await this.userEmailRepository.findOne({
      where: { id: emailId, userId },
    });

    if (!userEmail) {
      throw new NotFoundException('Email not found');
    }

    if (userEmail.isPrimary) {
      throw new BadRequestException('Cannot remove primary email');
    }

    const email = userEmail.email;
    await this.userEmailRepository.remove(userEmail);

    // Log email removal
    await this.createAuditLog(
      userId,
      'EMAIL_REMOVED',
      `Email removed: ${email}`,
      { email: email },
      null,
      'email',
      ipAddress,
      userAgent
    );
  }

  /**
   * Change primary email for user. Phase 3: the "primary" flag lives on
   * user_emails — flip the boolean on the new row, clear it on the old.
   * Selected email must be verified.
   */
  async changePrimaryEmail(
    userId: string,
    emailId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserEmail> {
    const newPrimary = await this.userEmailRepository.findOne({
      where: { id: emailId, userId },
    });
    if (!newPrimary) {
      throw new NotFoundException('Email not found');
    }
    if (newPrimary.verificationStatus !== 'VERIFIED') {
      throw new BadRequestException('Email must be verified before setting as primary');
    }

    const oldPrimary = await this.userEmailRepository.findOne({
      where: { userId, isPrimary: true },
    });
    if (oldPrimary && oldPrimary.id !== newPrimary.id) {
      oldPrimary.isPrimary = false;
      await this.userEmailRepository.save(oldPrimary);
    }

    newPrimary.isPrimary = true;
    const saved = await this.userEmailRepository.save(newPrimary);

    await this.createAuditLog(
      userId,
      'EMAIL_PRIMARY_CHANGED',
      `Primary email changed to: ${newPrimary.email}`,
      { email: oldPrimary?.email ?? null },
      { email: newPrimary.email },
      'primaryEmail',
      ipAddress,
      userAgent
    );

    return saved;
  }

  /**
   * Verify email address
   * User must provide correct verification token
   *
   * @param emailId - Email ID to verify
   * @param token - Verification token
   * @param ipAddress - IP address for audit
   * @param userAgent - User agent for audit
   */
  async verifyEmail(
    emailId: string,
    token: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserEmail> {
    const userEmail = await this.userEmailRepository.findOne({
      where: { id: emailId },
      relations: ['user'],
    });

    if (!userEmail) {
      throw new NotFoundException('Email not found');
    }

    if (userEmail.verificationStatus === 'VERIFIED') {
      throw new BadRequestException('Email already verified');
    }

    if (userEmail.verificationToken !== token) {
      throw new BadRequestException('Invalid verification token');
    }

    if (new Date() > userEmail.verificationTokenExpiresAt) {
      throw new BadRequestException('Verification token expired');
    }

    // Mark as verified
    userEmail.verificationStatus = 'VERIFIED';
    userEmail.verifiedAt = new Date();
    userEmail.verificationToken = null;
    userEmail.verificationTokenExpiresAt = null;

    const savedEmail = await this.userEmailRepository.save(userEmail);

    // Log email verification
    await this.createAuditLog(
      userEmail.userId,
      'EMAIL_VERIFIED',
      `Email verified: ${userEmail.email}`,
      { verificationStatus: 'NOT_VERIFIED' },
      { verificationStatus: 'VERIFIED' },
      'email',
      ipAddress,
      userAgent
    );

    return savedEmail;
  }

  // ===== NRC VERIFICATION =====

  /**
   * Mark NRC as verified (admin action)
   * After verification, user's verification status changes to VERIFIED
   *
   * @param userId - User ID
   * @param adminId - Admin performing verification
   * @param nrcDocumentPath - Path to encrypted NRC document
   * @param ipAddress - IP address for audit
   * @param userAgent - User agent for audit
   */
  async verifyNrc(
    userId: string,
    adminId: string,
    nrcDocumentPath?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Phase 3: isNrcVerified / nrcDocumentPath / lastNrcVerificationAt are
    // auth fields and stay on users. verificationStatus is a profile field
    // and routes to the active profile via the update() splitter.
    await this.update(userId, {
      isNrcVerified: true,
      lastNrcVerificationAt: new Date(),
      verificationStatus: 'VERIFIED',
      ...(nrcDocumentPath ? { nrcDocumentPath } : {}),
    } as any);

    // Log NRC verification
    await this.createAuditLog(
      userId,
      'NRC_VERIFIED',
      `NRC verified by admin: ${adminId}`,
      { isNrcVerified: false, verificationStatus: 'PENDING' },
      { isNrcVerified: true, verificationStatus: 'VERIFIED' },
      'nrc',
      ipAddress,
      userAgent,
      adminId
    );

    return this.findById(userId);
  }

  /**
   * Reject NRC verification (admin action)
   *
   * @param userId - User ID
   * @param adminId - Admin performing rejection
   * @param reason - Reason for rejection
   * @param ipAddress - IP address for audit
   * @param userAgent - User agent for audit
   */
  async rejectNrc(
    userId: string,
    adminId: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Phase 3: isNrcVerified stays on users; verificationStatus routes to
    // the active profile via the update() splitter.
    await this.update(userId, {
      isNrcVerified: false,
      verificationStatus: 'REJECTED',
    } as any);

    // Log NRC verification failure
    await this.createAuditLog(
      userId,
      'NRC_VERIFICATION_FAILED',
      `NRC rejected by admin: ${adminId}. Reason: ${reason}`,
      { verificationStatus: 'PENDING' },
      { verificationStatus: 'REJECTED' },
      'nrc',
      ipAddress,
      userAgent,
      adminId,
      { reason }
    );

    return this.findById(userId);
  }

  // ===== ACCOUNT SECURITY =====

  /**
   * Update user password
   *
   * @param userId - User ID
   * @param newPasswordHash - New hashed password
   * @param ipAddress - IP address for audit
   * @param userAgent - User agent for audit
   */
  async updatePassword(
    userId: string,
    newPasswordHash: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.password = newPasswordHash;
    const updatedUser = await this.userRepository.save(user);

    // Log password change
    await this.createAuditLog(
      userId,
      'PASSWORD_CHANGED',
      'User changed password',
      { hasPassword: true },
      { hasPassword: true },
      'password',
      ipAddress,
      userAgent
    );

    return updatedUser;
  }

  /**
   * Suspend user account
   *
   * @param userId - User ID
   * @param reason - Reason for suspension
   * @param adminId - Admin performing suspension
   * @param ipAddress - IP address for audit
   * @param userAgent - User agent for audit
   */
  async suspendAccount(
    userId: string,
    reason: string,
    adminId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Phase 3: isActive stays on users; verificationStatus routes to the
    // active profile via the update() splitter.
    await this.update(userId, {
      isActive: false,
      verificationStatus: 'SUSPENDED',
    } as any);
    const updatedUser = await this.findById(userId);

    // Log suspension
    await this.createAuditLog(
      userId,
      'ACCOUNT_SUSPENDED',
      `Account suspended. Reason: ${reason}`,
      { isActive: true },
      { isActive: false },
      'isActive',
      ipAddress,
      userAgent,
      adminId,
      { reason }
    );

    return updatedUser;
  }

  /**
   * Reactivate suspended account
   *
   * @param userId - User ID
   * @param adminId - Admin performing reactivation
   * @param ipAddress - IP address for audit
   * @param userAgent - User agent for audit
   */
  async reactivateAccount(
    userId: string,
    adminId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Phase 3: isActive stays on users; verificationStatus lives on the
    // active profile. Read it via flattenWithProfile to know whether to
    // flip SUSPENDED back to VERIFIED.
    const flat = await this.flattenWithProfile(user);
    const patch: Record<string, any> = { isActive: true };
    if (flat?.verificationStatus === 'SUSPENDED') {
      patch.verificationStatus = 'VERIFIED';
    }
    await this.update(userId, patch as any);
    const updatedUser = await this.findById(userId);

    // Log reactivation
    await this.createAuditLog(
      userId,
      'ACCOUNT_REACTIVATED',
      'Account reactivated',
      { isActive: false },
      { isActive: true },
      'isActive',
      ipAddress,
      userAgent,
      adminId
    );

    return updatedUser;
  }

  // ===== AUDIT LOGGING =====

  /**
   * Create audit log entry
   * All identity changes are logged for compliance and security
   *
   * @param userId - User ID
   * @param eventType - Type of event
   * @param description - Human-readable description
   * @param previousValue - Previous value (can be object)
   * @param newValue - New value (can be object)
   * @param changedField - Which field changed
   * @param ipAddress - Source IP address
   * @param userAgent - User agent
   * @param adminId - Admin ID if admin action
   * @param metadata - Additional metadata
   */
  async createAuditLog(
    userId: string,
    eventType: string,
    description: string,
    previousValue?: any,
    newValue?: any,
    changedField?: string,
    ipAddress?: string,
    userAgent?: string,
    adminId?: string,
    metadata?: Record<string, any>
  ): Promise<IdentityAudit> {
    const audit = this.identityAuditRepository.create({
      userId,
      eventType,
      description,
      previousValue,
      newValue,
      changedField,
      ipAddress,
      userAgent,
      adminId,
      metadata,
      verificationStatus: 'UNVERIFIED',
    });

    return this.identityAuditRepository.save(audit);
  }

  /**
   * Get audit logs for a user
   *
   * @param userId - User ID
   * @param limit - Number of records to return
   * @param skip - Number of records to skip
   * @returns Array of audit logs
   */
  async getAuditLogs(
    userId: string,
    limit: number = 100,
    skip: number = 0
  ): Promise<IdentityAudit[]> {
    return this.identityAuditRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });
  }

  /**
   * Flag suspicious activity
   *
   * @param userId - User ID
   * @param reason - Reason for flag
   * @param metadata - Additional context
   * @param ipAddress - IP address
   * @param userAgent - User agent
   */
  async flagSuspiciousActivity(
    userId: string,
    reason: string,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<IdentityAudit> {
    return this.createAuditLog(
      userId,
      'SUSPICIOUS_ACTIVITY',
      reason,
      null,
      null,
      null,
      ipAddress,
      userAgent,
      null,
      metadata || { flagReason: reason }
    ).then(async (audit) => {
      audit.isSuspicious = true;
      return this.identityAuditRepository.save(audit);
    });
  }

  // ===== UTILITY METHODS =====

  /**
   * Generate a verification token
   * Used for email and other verifications
   */
  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Search for user details for display
   * Safely returns only non-sensitive information
   *
   * @param id - User ID
   */
  async getSafeUserInfo(id: string) {
    const user = await this.findById(id);
    if (!user) {
      return null;
    }

    // Phase 3: name / email / location / profilePicture / verificationStatus
    // live on the active profile. flattenWithProfile merges them onto a
    // copy of the user.
    const flat: any = await this.flattenWithProfile(user);
    return {
      id: user.id,
      displayId: user.displayId,
      role: user.role,
      isNrcVerified: user.isNrcVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
      name: flat?.name ?? null,
      primaryEmail: flat?.email ?? null,
      profilePicture: flat?.profilePicture ?? null,
      verificationStatus: flat?.verificationStatus ?? null,
    };
  }

  /**
   * Check if user exists by NRC (for duplicate prevention)
   *
   * @param nrcNumber - NRC to check
   */
  async nrcExists(nrcNumber: string): Promise<boolean> {
    const user = await this.findByNrc(nrcNumber);
    return !!user;
  }
}
