import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserEmail } from './entities/user-email.entity';
import { IdentityAudit } from '../identity-audit/entities/identity-audit.entity';
import { IdentityAuditService } from '../identity-audit/identity-audit.service';
import { BuyerProfile } from './entities/buyer-profile.entity';
import { SellerProfile } from './entities/seller-profile.entity';
import { ServiceProviderProfile } from './entities/service-provider-profile.entity';
import { Archetype } from '../categories/entities/category.entity';
import { UserDisplayIdUtil } from '../../utils/user-display-id.util';
import { UpdateUserDto } from './dto/update-user.dto';
import { ProfileMatchingService } from './services/profile-matching.service';
import { ESCROW_HOLDING_STATUSES } from '../quotes/quote-status';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

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
  // `pin` lives on the active profile now (per the auth-row-is-identity-only
  // contract). Splitter routes pin to profile via the default branch.
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
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(UserEmail)
    private readonly userEmailRepository: Repository<UserEmail>,

    @InjectRepository(BuyerProfile)
    private readonly buyerProfileRepository: Repository<BuyerProfile>,

    @InjectRepository(SellerProfile)
    private readonly sellerProfileRepository: Repository<SellerProfile>,

    @InjectRepository(ServiceProviderProfile)
    private readonly serviceProviderProfileRepository: Repository<ServiceProviderProfile>,

    private readonly identityAuditService: IdentityAuditService,
    private readonly profileMatchingService: ProfileMatchingService,
    private readonly dataSource: DataSource,
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
   *
   * `pin` lives on the profile but is marked select:false / @Exclude
   * so it never travels over the wire. To let the frontend decide
   * between "set a new PIN" vs "enter your existing PIN", we expose a
   * boolean `hasPin` flag derived from a minimal pin-only query.
   */
  async flattenWithProfile(user: User | null | undefined): Promise<any> {
    if (!user) return null;
    const profile = await this.loadActiveProfile(user);
    if (!profile) return user;

    // Side query: select only the pin column so we can publish
    // hasPin without ever shipping the value itself. Staff
    // (parentProviderId set) read from users.pin (per-user PIN
    // for finance access — Phase 5); owners read from the active
    // profile row.
    let hasPin = false;
    if (user.parentProviderId) {
      const pinRow = await this.userRepository
        .createQueryBuilder('u')
        .select('u.id')
        .addSelect('u.pin')
        .where('u.id = :id', { id: user.id })
        .getOne();
      hasPin = !!pinRow?.pin;
    } else {
      const repo = this.profileRepoFor(user.activeProfileType);
      if (repo && user.activeProfileId) {
        const pinRow = await (repo as any)
          .createQueryBuilder('p')
          .select('p.id')
          .addSelect('p.pin')
          .where('p.id = :id', { id: user.activeProfileId })
          .getOne();
        hasPin = !!pinRow?.pin;
      }
    }

    // Phase: matching — load the profile's category IDs so the
    // frontend can re-hydrate selections without a second round-trip.
    // For BUYER profiles this stays empty (buyers don't subscribe to
    // categories the same way; see comment in categoryJunctionFor).
    //
    // Stage 1 (team auth): for staff (parentProviderId set), the
    // categories + archetypes that drive the dashboard composer come
    // from the PARENT'S seller profile, not the staff's own minimal
    // profile (which carries only personal contact info). Resolve to
    // parent first, fall back to self.
    const archetypeOwner =
      user.parentProviderId
        ? (await this.findById(user.parentProviderId).catch(() => null)) ?? user
        : user;
    const categoryIds = await this.loadActiveProfileCategoryIds(archetypeOwner);
    // Multi-archetype: load the SET of archetypes the active profile
    // serves. The dashboard composer reads this to merge per-archetype
    // schemas (e.g. RETAIL + REPAIR for a seller offering both
    // mobile-phones-buy and mobile-phones-repair).
    const archetypes = await this.loadActiveProfileArchetypes(archetypeOwner);

    // Staff (parentProviderId set) don't carry their own verification — it
    // mirrors the shop owner's, so a staff member is exactly as verified as
    // their shop and stays in sync if the owner is verified/rejected later.
    let verificationOverride: Record<string, any> | null = null;
    if (user.parentProviderId && archetypeOwner !== user) {
      const ownerProfile = await this.loadActiveProfile(archetypeOwner).catch(() => null);
      if (ownerProfile) {
        verificationOverride = {
          verificationStatus: (ownerProfile as any).verificationStatus,
          verifiedAt: (ownerProfile as any).verifiedAt ?? null,
          // Loan officers act as their parent lender — inherit the shop's
          // per-loan-type T&Cs so their offer form pre-fills the same terms.
          loanTerms: (ownerProfile as any).loanTerms ?? null,
        };
      }
    }

    const {
      id: _profId,
      userId: _profUserId,
      createdAt: _pCreated,
      updatedAt: _pUpdated,
      pin: _pin, // belt-and-braces — should never be present, but strip if it is
      archetype: _legacyArchetype, // dropped column; strip just in case a stale row leaks through
      ...profileFields
    } = profile as any;
    return {
      ...user,
      ...profileFields,
      ...(verificationOverride ?? {}),
      hasPin,
      categoryIds,
      archetypes,
    };
  }

  /**
   * Verify a candidate PIN. Staff (parentProviderId set) verify
   * against their own `users.pin`; owners verify against their
   * active profile's PIN. Server-side compare so the value never
   * leaves the box. Returns false when no PIN has been set yet.
   */
  async verifyProfilePin(userId: string, candidate: string): Promise<boolean> {
    if (!candidate || candidate.length !== 4) return false;
    const user = await this.findById(userId);
    if (!user) return false;

    // Staff branch: PIN lives on users.pin (per-user). Department
    // heads (and any future staff who need finance access) set it
    // themselves via POST /users/:id/pin.
    if (user.parentProviderId) {
      const row = await this.userRepository
        .createQueryBuilder('u')
        .select('u.id')
        .addSelect('u.pin')
        .where('u.id = :id', { id: user.id })
        .getOne();
      return !!row?.pin && row.pin === candidate;
    }

    // Owner branch: PIN lives on the active profile row.
    if (!user.activeProfileId || !user.activeProfileType) return false;
    const repo = this.profileRepoFor(user.activeProfileType);
    if (!repo) return false;
    const row = await (repo as any)
      .createQueryBuilder('p')
      .select('p.id')
      .addSelect('p.pin')
      .where('p.id = :id', { id: user.activeProfileId })
      .getOne();
    return !!row?.pin && row.pin === candidate;
  }

  /**
   * Set a PIN. Same staff-vs-owner branching as `verifyProfilePin`.
   * Staff write to `users.pin`; owners write to their active profile.
   * The 4-char shape is enforced here so callers can pass through a
   * trimmed input without re-validating.
   */
  async setProfilePin(userId: string, pin: string): Promise<void> {
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      throw new BadRequestException('PIN must be exactly 4 digits');
    }
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (user.parentProviderId) {
      await this.userRepository.update({ id: userId }, { pin });
      return;
    }

    if (!user.activeProfileId || !user.activeProfileType) {
      throw new BadRequestException(
        'User has no active profile yet — finish onboarding first',
      );
    }
    const repo = this.profileRepoFor(user.activeProfileType);
    if (!repo) {
      throw new BadRequestException('Profile type unsupported for PIN');
    }
    await (repo as any).update({ id: user.activeProfileId }, { pin });
  }

  /**
   * Change a user's password (and clear `mustChangePassword` in the
   * same write). Used by the ForcePasswordChange flow when a staff
   * member logs in with the auto-generated password and is required
   * to set their own. Always bcrypt-hashes — passwords never land in
   * the column unhashed. Sits outside the generic update path on
   * purpose: a password write deserves its own controller endpoint
   * with a tighter auth gate, not whitelist drift through UpdateUserDto.
   */
  async changePassword(userId: string, plainPassword: string): Promise<void> {
    if (!plainPassword || plainPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const passwordHash = await bcrypt.hash(plainPassword, 10);
    await this.userRepository.update(
      { id: userId },
      { password: passwordHash, mustChangePassword: false },
    );
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
   * Create a profile row matching `role` for the given user, then point
   * the user's activeProfileId / activeProfileType at the new row.
   *
   * Phase: matching — when `categoryIds` is in the profileFields, the
   * profile row, the junction rows, and the archetype recomputation all
   * happen inside one transaction. The profile pointer on `users` is
   * updated last. This is what closes the registration race that used
   * to ship `categories=[]` profiles when the post-register
   * `updateUser` call fired before the profile existed.
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

    const { categoryIds, ...rest } = profileFields as { categoryIds?: string[] } & Record<string, any>;
    const wantsCategories = Array.isArray(categoryIds) && categoryIds.length > 0;

    return this.dataSource.transaction(async (manager) => {
      const txProfileRepo = manager.getRepository(repo.target as any) as Repository<ActiveProfile>;
      const profile = (txProfileRepo as any).create({ userId, ...rest });
      const saved = await (txProfileRepo as any).save(profile);

      if (wantsCategories) {
        // Junction knowledge lives in ProfileMatchingService; these
        // manager-aware helpers run inside THIS transaction so the
        // profile row, junction rows, archetype rows, and the
        // activeProfileId pointer below stay one atomic unit.
        const unique = Array.from(new Set(categoryIds));
        await this.profileMatchingService.writeCategoryJunctionRows(
          manager,
          type,
          saved.id,
          unique,
        );
        const archetypes =
          await this.profileMatchingService.writeArchetypeJunctionRowsFromCategories(
            manager,
            type,
            saved.id,
            unique,
          );
        if (archetypes.length > 0) {
          (saved as any).archetypes = archetypes;
        }
      }

      await manager
        .getRepository(User)
        .update({ id: userId }, { activeProfileId: saved.id, activeProfileType: type });

      return saved;
    });
  }

  /**
   * Read the category IDs the active profile is subscribed to.
   * Thin pass-through: junction logic lives in ProfileMatchingService.
   * Kept public so existing callers keep working unchanged.
   */
  async loadActiveProfileCategoryIds(user: User): Promise<string[]> {
    return this.profileMatchingService.loadActiveProfileCategoryIds(user);
  }

  /**
   * Read the archetype set the active profile serves.
   * Thin pass-through: junction logic lives in ProfileMatchingService.
   * Kept public so existing callers keep working unchanged.
   */
  async loadActiveProfileArchetypes(user: User): Promise<Archetype[]> {
    return this.profileMatchingService.loadActiveProfileArchetypes(user);
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

    // Diagnostic — mirrors MatchingService's "(profileId, matchedCategoryIds,
    // inquiryCount)" pattern so the next "categories didn't land" report is
    // findable in one log scan. Logs the routing decision before any write
    // happens; pairs with a "...wrote N junction rows" line below.
    const profileKeys = Object.keys(profilePatch);
    const incomingCategoryIds = (profilePatch as any).categoryIds;
    this.logger.log(
      `update(${id}): userKeys=[${Object.keys(userPatch).join(',')}] ` +
        `profileKeys=[${profileKeys.join(',')}] ` +
        `categoryIds=${
          Array.isArray(incomingCategoryIds)
            ? `[${incomingCategoryIds.length}]`
            : 'null'
        }`,
    );

    if (Object.keys(userPatch).length > 0) {
      await this.userRepository.update({ id }, userPatch);
    }

    if (profileKeys.length > 0) {
      const user = await this.userRepository.findOne({ where: { id } });
      if (user) {
        // categoryIds writes are isolated from the column patch — they
        // route to the junction table via setProfileCategories, which
        // also recomputes archetype. Strip them out of the column patch
        // so TypeORM doesn't try to write a non-existent column.
        const { categoryIds, ...columnPatch } = profilePatch as {
          categoryIds?: string[];
        } & Record<string, any>;

        let activeId = user.activeProfileId;
        let activeType = user.activeProfileType;
        if (!activeId || !activeType) {
          // Lazily create the matching profile row + categories in
          // one transaction.
          this.logger.warn(
            `update(${id}): no activeProfile yet, lazily creating role=${user.role}`,
          );
          const created = await this.createProfileForRole(id, user.role, profilePatch);
          if (!created) {
            // Role with no profile concept (e.g. ADMIN) — nothing to write.
            return this.findById(id);
          }
        } else {
          if (Object.keys(columnPatch).length > 0) {
            const repo = this.profileRepoFor(activeType);
            if (repo) {
              // Only write columns that actually exist on THIS profile's
              // entity. A company field (companyName/tpin) routed to a
              // profile type that lacks it would otherwise throw
              // "Property X was not found in <Entity>" and 500 the whole
              // update. Skip + log any strays instead of crashing.
              const validCols = new Set(
                (repo as any).metadata.columns.map((c: any) => c.propertyName),
              );
              const safePatch: Record<string, any> = {};
              const skipped: string[] = [];
              for (const [key, val] of Object.entries(columnPatch)) {
                if (validCols.has(key)) safePatch[key] = val;
                else skipped.push(key);
              }
              if (skipped.length > 0) {
                this.logger.warn(
                  `update(${id}): skipped [${skipped.join(',')}] — not columns on ${activeType}`,
                );
              }
              if (Object.keys(safePatch).length > 0) {
                await (repo as any).update({ id: activeId }, safePatch);
              }
            }
          }
          if (Array.isArray(categoryIds)) {
            await this.profileMatchingService.setProfileCategories(activeType, activeId, categoryIds);
            this.logger.log(
              `update(${id}): set ${categoryIds.length} categories on ${activeType}/${activeId}`,
            );
          }
        }
      } else {
        this.logger.error(`update(${id}): user not found when applying profile patch`);
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
    // Full account deletion — hard-remove the user AND every trace of their
    // data. Kept as `remove` so existing callers (DELETE /users/:id, admin
    // delete) get the complete purge, not the old cascade-only stub.
    return this.deleteAccount(id);
  }

  /**
   * PRE-DELETION SAFETY CHECK — surfaces cross-user obligations that must
   * block or merely warn before an account is erased.
   *
   * Money in escrow is the hard line: a SELLER who still owes a handover
   * (the buyer already paid into the holding account) and a BUYER whose
   * funds are still held both HARD-BLOCK deletion — the escrow has to be
   * released/reversed first (a blocked buyer contacts the platform admin to
   * reverse the funds). Everything else — in-progress orders, offers still
   * awaiting the buyer's decision, open inquiries, incomplete off-platform
   * loans — only WARNS; the user may still choose to proceed.
   *
   * Escrow lives on the QUOTE (`quote.status`), never on the order, so both
   * hard blocks key off the collectible quote statuses. A user can be both a
   * buyer and a seller, so the same id is checked from both sides. Loan
   * quotes are barred from the collectible statuses, so a lender is never
   * hard-blocked here.
   */
  async getDeletionBlockers(userId: string): Promise<{
    canDelete: boolean;
    hardBlocks: {
      sellerCollections: { count: number; amount: number };
      buyerEscrow: { count: number; amount: number };
    };
    warnings: {
      inProgressOrders: number;
      pendingOffers: number;
      openInquiries: number;
      incompleteLoans: number;
    };
  }> {
    // The parcels still holding a buyer's escrowed funds. Single source of
    // truth — this list and collection.service's used to disagree, which let a
    // PENDING_COLLECTION quote block deletion while never appearing in the
    // provider's collection queue (so it could never be released).
    const COLLECTIBLE = [...ESCROW_HOLDING_STATUSES];

    // HARD BLOCK 1 — seller/provider owes a handover: buyer paid, funds not
    // yet released. This is exactly collection.service.queue(providerId).
    const sellerRows: Array<{ count: number; amount: string }> = await this.dataSource.query(
      // status::text — quotes.status is a Postgres enum; `= ANY(text[])` needs
      // the column cast to text or the comparison operator doesn't exist.
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(price), 0) AS amount
         FROM quotes WHERE "providerId" = $1 AND status::text = ANY($2)`,
      [userId, COLLECTIBLE],
    );

    // HARD BLOCK 2 — buyer's funds sitting in escrow on a paid order whose
    // quote hasn't been handed over. Buyer link is indirect (order → quote).
    const buyerRows: Array<{ count: number; amount: string }> = await this.dataSource.query(
      // q.status::text — see note above; enum column vs text[] parameter.
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(q.price), 0) AS amount
         FROM orders o JOIN quotes q ON q.id = o."quoteId"
        WHERE o."buyerId" = $1 AND q.status::text = ANY($2)`,
      [userId, COLLECTIBLE],
    );

    const sellerCollections = {
      count: Number(sellerRows[0]?.count || 0),
      amount: Number(sellerRows[0]?.amount || 0),
    };
    const buyerEscrow = {
      count: Number(buyerRows[0]?.count || 0),
      amount: Number(buyerRows[0]?.amount || 0),
    };

    // SOFT WARN — orders past confirmation but not yet completed (as either party).
    const ipoRows: Array<{ count: number }> = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count FROM orders
        WHERE ("buyerId" = $1 OR "sellerId" = $1)
          AND status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')`,
      [userId],
    );
    // Offers still awaiting THIS buyer's decision.
    const poRows: Array<{ count: number }> = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count FROM quotes q
         JOIN inquiries i ON i.id = q."inquiryId"
        WHERE i."buyerId" = $1 AND q.status = 'PENDING'`,
      [userId],
    );
    // Inquiries the buyer still has open to the market.
    const oiRows: Array<{ count: number }> = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count FROM inquiries
        WHERE "buyerId" = $1 AND status = 'OPEN'`,
      [userId],
    );
    // Incomplete off-platform loans (accepted, stage not yet COMPLETED) — the
    // user as borrower (inquiry.buyerId) or lender (quote.providerId).
    const ilRows: Array<{ count: number }> = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count FROM quotes q
         LEFT JOIN inquiries i ON i.id = q."inquiryId"
        WHERE q.condition = 'LOAN' AND q.status = 'ACCEPTED'
          AND COALESCE(q."dynamicFields"->>'stage', '') <> 'COMPLETED'
          AND (q."providerId" = $1 OR i."buyerId" = $1)`,
      [userId],
    );

    const canDelete = sellerCollections.count === 0 && buyerEscrow.count === 0;
    return {
      canDelete,
      hardBlocks: { sellerCollections, buyerEscrow },
      warnings: {
        inProgressOrders: Number(ipoRows[0]?.count || 0),
        pendingOffers: Number(poRows[0]?.count || 0),
        openInquiries: Number(oiRows[0]?.count || 0),
        incompleteLoans: Number(ilRows[0]?.count || 0),
      },
    };
  }

  /**
   * DATA PROTECTION — erase a user on request, using the TIERED model that
   * reconciles the right-to-erasure with lawful retention (Zambia Data
   * Protection Act 2021 §§ erasure exemptions; FIC/AML + tax record-keeping):
   *
   *   • HARD-DELETE all personal / private data and everything the user solely
   *     owns that carries no legal retention duty: profiles (name/contact/GPS),
   *     NRC + ID docs, PINs, uploaded files, portfolio, products, shops,
   *     schedules, loan requests/offers (the loan contract is off-platform, so
   *     TONSE holds no financial record there), and any inquiry/quote that never
   *     converted to a paid escrow order.
   *
   *   • ANONYMISE-AND-RETAIN the escrow FINANCIAL records TONSE must keep (buyer
   *     paid into the holding account): `orders` + `payments`, and the quote /
   *     inquiry they reference — the transaction FACTS stay (amount, date, fee,
   *     status), the PERSONAL data is stripped (contact, address, GPS, free
   *     text). The user row is reduced to a de-identified shell so those rows
   *     keep referential integrity; a user with NO financial footprint is
   *     hard-deleted outright.
   *
   *   • A PII-free ERASURE RECEIPT (audit action ACCOUNT_DELETED, keyed by a
   *     one-way hash of the user id) records that erasure happened, for proof of
   *     compliance — without retaining anything identifying.
   */
  async deleteAccount(userId: string): Promise<void> {
    // Server-side enforcement of the escrow hard-block — the frontend runs the
    // same check for UX, but this is the real gate (can't be bypassed). Money
    // in escrow (seller owes a handover, or buyer's funds still held) must be
    // released/reversed before the account can be erased.
    const blockers = await this.getDeletionBlockers(userId);
    if (!blockers.canDelete) {
      throw new ConflictException({
        reason: 'PENDING_ESCROW',
        message:
          'Account cannot be deleted while funds are held in escrow. Resolve the pending collection(s) first.',
        hardBlocks: blockers.hardBlocks,
      });
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      const staff: Array<{ id: string }> = await qr.query(
        'SELECT id FROM users WHERE "parentProviderId" = $1',
        [userId],
      );
      const staffIds = staff.map((s) => s.id);

      // Capture, BEFORE deleting the rows that hold them: uploaded-file paths,
      // and the user's display name(s) — so we can also scrub the name out of
      // OTHER parties' audit rows (buyerName/staffName).
      const files: string[] = [];
      const names: string[] = [];
      for (const id of [userId, ...staffIds]) {
        for (const t of ['buyer_profiles', 'seller_profiles', 'service_provider_profiles']) {
          (await qr.query(`SELECT * FROM "${t}" WHERE "userId" = $1`, [id])).forEach((r: any) => {
            this.collectFileRefs(r, files);
            if (r.name) names.push(String(r.name));
            if (r.companyName) names.push(String(r.companyName));
          });
        }
        (await qr.query('SELECT * FROM shops WHERE "sellerId" = $1', [id])).forEach((r: any) =>
          this.collectFileRefs(r, files),
        );
        (await qr.query('SELECT * FROM products WHERE "sellerId" = $1', [id])).forEach((r: any) =>
          this.collectFileRefs(r, files),
        );
        (
          await qr.query('SELECT attributes, items, preferences FROM inquiries WHERE "buyerId" = $1', [id])
        ).forEach((r: any) => this.collectFileRefs(r, files));
        (
          await qr.query(
            'SELECT ii."imagePath", ii."imageUrl" FROM inquiry_images ii JOIN inquiries i ON ii."inquiryId" = i.id WHERE i."buyerId" = $1',
            [id],
          )
        ).forEach((r: any) => this.collectFileRefs(r, files));
      }

      const pseudoKey = crypto.createHash('sha256').update(userId).digest('hex').slice(0, 32);

      await qr.startTransaction();
      try {
        // Staff hold no financial records of their own (their provider actions
        // attribute to the parent owner) — hard-purge them entirely.
        for (const sid of staffIds) {
          await this.hardPurgeUser(qr, sid);
        }

        // Resolve the owner's retained FINANCIAL footprint (paid escrow orders).
        const orderRows: Array<{ quoteId: string }> = await qr.query(
          'SELECT DISTINCT "quoteId" FROM orders WHERE ("buyerId" = $1 OR "sellerId" = $1) AND "quoteId" IS NOT NULL',
          [userId],
        );
        const retQuoteIds = orderRows.map((r) => r.quoteId);
        let retInquiryIds: string[] = [];
        if (retQuoteIds.length) {
          const inqRows: Array<{ inquiryId: string }> = await qr.query(
            'SELECT DISTINCT "inquiryId" FROM quotes WHERE id = ANY($1) AND "inquiryId" IS NOT NULL',
            [retQuoteIds],
          );
          retInquiryIds = inqRows.map((r) => r.inquiryId);
        }
        const paymentCount: Array<unknown> = await qr.query(
          'SELECT 1 FROM payments WHERE "userId" = $1 LIMIT 1',
          [userId],
        );
        const hasFinancial = orderRows.length > 0 || paymentCount.length > 0;

        // ── Scrub PII on the retained financial rows (keep the facts) ──
        await qr.query(
          `UPDATE orders SET "shippingAddress" = '[deleted]', notes = '[deleted]', items = '[]'::json
             WHERE "buyerId" = $1 OR "sellerId" = $1`,
          [userId],
        );
        await qr.query('UPDATE payments SET metadata = NULL WHERE "userId" = $1', [userId]);
        if (retQuoteIds.length) {
          await qr.query('UPDATE quotes SET "buyerContact" = NULL WHERE id = ANY($1)', [retQuoteIds]);
        }
        if (retInquiryIds.length) {
          await qr.query(
            `UPDATE inquiries SET title = '[deleted]', description = '[deleted]', location = '[deleted]',
               province = NULL, city = NULL, latitude = NULL, longitude = NULL,
               attributes = '{}'::json, items = '[]'::json, preferences = '{}'::json
             WHERE id = ANY($1)`,
            [retInquiryIds],
          );
        }

        // ── Hard-delete the owner's NON-retained, personal data ──
        if (retQuoteIds.length) {
          await qr.query('DELETE FROM quotes WHERE "providerId" = $1 AND NOT (id = ANY($2))', [
            userId,
            retQuoteIds,
          ]);
        } else {
          await qr.query('DELETE FROM quotes WHERE "providerId" = $1', [userId]);
        }
        // OTHER providers' quotes on this buyer's inquiries. The quote→inquiry
        // FK is RESTRICT (so escrow can never be cascade-vaporised), which means
        // these must be removed explicitly before their inquiry. Retained quotes
        // hang off retained inquiries, so they're never in this set.
        if (retInquiryIds.length) {
          await qr.query(
            `DELETE FROM quotes WHERE "inquiryId" IN (
               SELECT id FROM inquiries WHERE "buyerId" = $1 AND NOT (id = ANY($2)))`,
            [userId, retInquiryIds],
          );
          await qr.query('DELETE FROM inquiries WHERE "buyerId" = $1 AND NOT (id = ANY($2))', [
            userId,
            retInquiryIds,
          ]);
        } else {
          await qr.query(
            `DELETE FROM quotes WHERE "inquiryId" IN (SELECT id FROM inquiries WHERE "buyerId" = $1)`,
            [userId],
          );
          await qr.query('DELETE FROM inquiries WHERE "buyerId" = $1', [userId]);
        }
        await qr.query('DELETE FROM products WHERE "sellerId" = $1', [userId]);
        await qr.query('DELETE FROM schedules WHERE "userId" = $1', [userId]);
        await qr.query('DELETE FROM shops WHERE "sellerId" = $1', [userId]);
        await qr.query('DELETE FROM portfolio_items WHERE "userId" = $1', [userId]);
        await qr.query('DELETE FROM buyer_profiles WHERE "userId" = $1', [userId]);
        await qr.query('DELETE FROM seller_profiles WHERE "userId" = $1', [userId]);
        await qr.query('DELETE FROM service_provider_profiles WHERE "userId" = $1', [userId]);
        await qr.query('DELETE FROM identity_audits WHERE "userId" = $1', [userId]);
        await qr.query('DELETE FROM user_emails WHERE "userId" = $1', [userId]);
        // The user's OWN audit trail (holds ip/ua/names) is deleted; the FACTS
        // survive on the retained orders/payments.
        await qr.query(
          'DELETE FROM audit_logs WHERE "userId" = $1 OR "providerId" = $1 OR "staffId" = $1',
          [userId],
        );
        // Scrub the ex-user's name out of OTHER parties' audit rows.
        if (names.length) {
          await qr.query(`UPDATE audit_logs SET "buyerName" = 'Deleted user' WHERE "buyerName" = ANY($1)`, [names]);
          await qr.query(`UPDATE audit_logs SET "staffName" = 'Deleted user' WHERE "staffName" = ANY($1)`, [names]);
        }

        // ── User row: de-identified shell (anchors retained financials) or full delete ──
        if (hasFinancial) {
          await qr.query(
            `UPDATE users SET "nrcNumber" = NULL, "nrcDocumentPath" = NULL, "refreshToken" = NULL,
               password = '!deleted', "isActive" = false, "isNrcVerified" = false,
               "displayId" = NULL, "activeProfileId" = NULL, "activeProfileType" = NULL,
               permissions = NULL, "assignedArchetype" = NULL, pin = NULL,
               "parentProviderId" = NULL, "mustChangePassword" = false
             WHERE id = $1`,
            [userId],
          );
        } else {
          await qr.query('DELETE FROM users WHERE id = $1', [userId]);
        }

        // ── PII-free erasure receipt (proof of compliance) ──
        await qr.query(
          `INSERT INTO audit_logs (action, "entityType", "entityId", details, reason, status)
           VALUES ('ACCOUNT_DELETED', 'USER', $1, $2, $3, $4)`,
          [
            userId,
            hasFinancial
              ? 'Account PII erased; escrow financial records anonymised and retained per AML/tax retention.'
              : 'Account and all personal data erased; no financial records held.',
            pseudoKey,
            hasFinancial ? 'ANONYMISED' : 'DELETED',
          ],
        );

        await qr.commitTransaction();
      } catch (e) {
        await qr.rollbackTransaction();
        throw e;
      }

      // Files last — a failure here must not resurrect the (already-erased) account.
      this.deleteUploadedFiles(files);
      this.logger.log(
        `deleteAccount: erased user ${userId} + ${staffIds.length} staff; removed ${files.length} file(s)`,
      );
    } finally {
      await qr.release();
    }
  }

  /** Remove EVERYTHING for a user with no retained financial footprint (staff,
   *  or an owner who never transacted through escrow). */
  private async hardPurgeUser(qr: any, id: string): Promise<void> {
    await qr.query('DELETE FROM orders WHERE "buyerId" = $1 OR "sellerId" = $1', [id]);
    await qr.query('DELETE FROM payments WHERE "userId" = $1', [id]);
    await qr.query('DELETE FROM quotes WHERE "providerId" = $1', [id]);
    // Quotes others placed on this user's inquiries — the quote→inquiry FK is
    // RESTRICT (escrow can't be cascade-vaporised), so they go before the inquiry.
    await qr.query(
      `DELETE FROM quotes WHERE "inquiryId" IN (SELECT id FROM inquiries WHERE "buyerId" = $1)`,
      [id],
    );
    await qr.query('DELETE FROM inquiries WHERE "buyerId" = $1', [id]);
    await qr.query('DELETE FROM products WHERE "sellerId" = $1', [id]);
    await qr.query('DELETE FROM schedules WHERE "userId" = $1', [id]);
    await qr.query('DELETE FROM shops WHERE "sellerId" = $1', [id]);
    await qr.query('DELETE FROM portfolio_items WHERE "userId" = $1', [id]);
    await qr.query('DELETE FROM buyer_profiles WHERE "userId" = $1', [id]);
    await qr.query('DELETE FROM seller_profiles WHERE "userId" = $1', [id]);
    await qr.query('DELETE FROM service_provider_profiles WHERE "userId" = $1', [id]);
    await qr.query('DELETE FROM identity_audits WHERE "userId" = $1', [id]);
    await qr.query('DELETE FROM user_emails WHERE "userId" = $1', [id]);
    await qr.query('DELETE FROM audit_logs WHERE "userId" = $1 OR "providerId" = $1 OR "staffId" = $1', [id]);
    await qr.query('DELETE FROM users WHERE id = $1', [id]);
  }

  /** Recursively gather any string that points at an uploaded file. */
  private collectFileRefs(value: any, out: string[]): void {
    if (value == null) return;
    if (typeof value === 'string') {
      if (value.includes('/uploads/') || value.includes('/files/secure/')) out.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((v) => this.collectFileRefs(v, out));
      return;
    }
    if (typeof value === 'object') {
      Object.values(value).forEach((v) => this.collectFileRefs(v, out));
    }
  }

  /** Unlink uploaded files from disk (public/uploads AND the encrypted
   *  secure-uploads dir), each guarded to stay within its own directory. */
  private deleteUploadedFiles(candidates: string[]): void {
    const publicDir = path.join(process.cwd(), 'public');
    const uploadsDir = path.join(publicDir, 'uploads');
    const secureDir = path.join(process.cwd(), 'secure-uploads');
    for (const raw of candidates) {
      if (!raw || typeof raw !== 'string') continue;
      try {
        let p: string;
        let root: string;
        if (raw.includes('/files/secure/')) {
          // Encrypted sensitive file — lives in secure-uploads/<basename>.
          p = path.join(secureDir, path.basename(raw));
          root = secureDir;
        } else if (path.isAbsolute(raw)) {
          p = path.normalize(raw);
          root = uploadsDir;
        } else {
          const idx = raw.indexOf('/uploads/');
          if (idx === -1) continue;
          p = path.join(publicDir, raw.slice(idx + 1)); // 'uploads/…'
          root = uploadsDir;
        }
        if (!p.startsWith(root)) continue; // never escape the intended dir
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch {
        // best-effort — a missing/locked file must not fail the deletion
      }
    }
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
    nrcDocumentPath?: string,
    ipAddress?: string,
    userAgent?: string,
    /**
     * Optional profile-side seed: categories the user subscribes to (for
     * sellers / service-providers, drives matching) and an optional
     * subRole. Carried at register time so the active profile + its
     * `seller_profile_categories` rows + the archetype cache all land
     * in the same transaction. Without this they had to arrive in a
     * follow-up PATCH /users/:id, which silently failed for every
     * seller registered to date.
     */
    profileSeed?: { categoryIds?: string[]; subRole?: string },
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
    // on the matching profile row created below. nrcDocumentPath is an
    // exception — the NRC document is part of identity verification and
    // belongs with the immutable NRC anchor on the auth row.
    const user = this.userRepository.create({
      nrcNumber: normalizedNrc,
      password: passwordHash,
      role,
      isActive: true,
      ...(nrcDocumentPath ? { nrcDocumentPath } : {}),
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
    //
    // categoryIds + subRole are seeded here so the seller_profile_categories
    // rows + the archetype cache land in the same transaction as user
    // creation. createProfileForRole already understands categoryIds —
    // strips them out, writes the junction rows, recomputes archetype,
    // commits, all inside DataSource.transaction.
    await this.createProfileForRole(savedUser.id, role, {
      name,
      email: email.toLowerCase(),
      phone,
      profilePicture: profilePicture || null,
      dateOfBirth: dateOfBirth || null,
      verificationStatus: 'PENDING',
      ...(profileSeed?.subRole ? { subRole: profileSeed.subRole } : {}),
      ...(Array.isArray(profileSeed?.categoryIds) && profileSeed.categoryIds.length > 0
        ? { categoryIds: profileSeed.categoryIds }
        : {}),
    });

    if (profileSeed?.categoryIds?.length) {
      this.logger.log(
        `register(${savedUser.id}): seeded ${profileSeed.categoryIds.length} categories on ${role} profile at registration time`,
      );
    }

    // Log the registration event
    await this.identityAuditService.createAuditLog(
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
    await this.identityAuditService.createAuditLog(
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
    await this.identityAuditService.createAuditLog(
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

    await this.identityAuditService.createAuditLog(
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
    await this.identityAuditService.createAuditLog(
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
    await this.identityAuditService.createAuditLog(
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
    await this.identityAuditService.createAuditLog(
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
    await this.identityAuditService.createAuditLog(
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
    await this.identityAuditService.createAuditLog(
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
    await this.identityAuditService.createAuditLog(
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
    // Thin pass-through: audit logic lives in IdentityAuditService now.
    // Kept so external callers (auth.service.ts) need no changes.
    return this.identityAuditService.createAuditLog(
      userId,
      eventType,
      description,
      previousValue,
      newValue,
      changedField,
      ipAddress,
      userAgent,
      adminId,
      metadata
    );
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
    return this.identityAuditService.getAuditLogs(userId, limit, skip);
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
    return this.identityAuditService.flagSuspiciousActivity(
      userId,
      reason,
      metadata,
      ipAddress,
      userAgent
    );
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
