import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserEmail } from './user-email.entity';
import { IdentityAudit } from '../../identity-audit/entities/identity-audit.entity';

/**
 * User Entity — auth identity ONLY (Phase 3c contract).
 *
 * Three-tier identity system:
 *   - NRC (immutable real-world anchor, unique)
 *   - UUID (id) — internal system identifier
 *   - displayId — user-facing friendly identifier (USER-A3K9F2)
 *
 * Everything else — name, email, phone, location, business details,
 * verification status, etc. — lives on the profile rows
 * (buyer_profiles / seller_profiles / service_provider_profiles).
 * activeProfileId + activeProfileType point at whichever row is
 * currently active for routing / dashboard / lead matching.
 *
 * Contact emails are tracked via the UserEmail relation (the
 * multi-email index for sign-in lookup). The "active" profile's email
 * is the contact email shown in UI for that role.
 */
@Entity('users')
@Index('idx_users_nrc', ['nrcNumber'], { unique: true })
@Index('idx_users_display_id', ['displayId'], { unique: true })
@Index('idx_users_role', ['role'])
@Index('idx_users_created_at', ['createdAt'])
@Index('idx_users_updated_at', ['updatedAt'])
export class User {
  /**
   * System Identifier (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * National Registration Card Number (Immutable Anchor)
   * Links user to real-world identity, prevents duplicate accounts.
   */
  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
    nullable: true,
  })
  nrcNumber: string;

  /**
   * User-Friendly Display ID — e.g. USER-A3K9F2
   */
  @Column({
    type: 'varchar',
    length: 20,
    unique: true,
    nullable: true,
  })
  displayId: string;

  /**
   * Hashed Password — never selected by default.
   */
  @Column({ type: 'text', select: false })
  @Exclude({ toPlainOnly: true })
  password: string;

  /**
   * Refresh Token for JWT.
   */
  @Column({ type: 'varchar', length: 500, nullable: true, select: false })
  @Exclude({ toPlainOnly: true })
  refreshToken: string;

  /**
   * Auth Role.
   *   BUYER             — consumer side
   *   SELLER            — commerce side (products + sales-with-repair)
   *   SERVICE_PROVIDER  — services, repairs, labour, performances
   *   ADMIN             — internal
   *   PROMOTER          — referral-only artist account (hidden, invite-gated
   *                       signup). Carries NO profile row — see
   *                       createProfileForRole's default:null branch — and
   *                       never accepted by the public /auth/register DTO;
   *                       minted only via POST /promoter/signup.
   */
  @Column({
    type: 'enum',
    enum: ['BUYER', 'SELLER', 'SERVICE_PROVIDER', 'ADMIN', 'PROMOTER'],
    default: 'BUYER',
  })
  role: string;

  /**
   * Display name — ADMIN ONLY. Every other role keeps its name on the
   * matching profile row (the Phase 3 contract); ADMIN has no profile
   * table, so this column is the one carve-out. Populated by the admin
   * seed script and by AdminManagerService.create() for User Manager
   * sub-admins; flattenWithProfile() reads it back for admins. NULL on
   * every non-admin row.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  /**
   * NRC Document Verification Status (identity-level, separate from
   * profile-level verificationStatus that goes on each profile row).
   */
  @Column({ type: 'boolean', default: false })
  isNrcVerified: boolean;

  /**
   * NRC Document content / path. Held as `text` so we can either store
   * a base64-encoded image (the registration flow) or a server-side
   * upload path once we move large blobs out of the DB. Excluded from
   * default selects and from JSON serialisation — only the admin
   * verification path should ever see this value.
   */
  @Column({ type: 'text', nullable: true, select: false })
  @Exclude({ toPlainOnly: true })
  nrcDocumentPath: string;

  /**
   * Account Active Status (suspension lever — auth-level).
   */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /**
   * Last Login Timestamp.
   */
  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  /**
   * Last NRC Verification Timestamp.
   */
  @Column({ type: 'timestamp', nullable: true })
  lastNrcVerificationAt: Date;

  // ===== Active-profile pointer (Phase 3) =====

  /**
   * UUID of the active profile row (in buyer_profiles, seller_profiles,
   * or service_provider_profiles depending on activeProfileType).
   */
  @Column({ type: 'uuid', nullable: true })
  activeProfileId: string;

  /**
   * Which profile table activeProfileId references.
   */
  @Column({
    type: 'enum',
    enum: ['BUYER', 'SELLER', 'SERVICE_PROVIDER'],
    nullable: true,
  })
  activeProfileType: string;

  // ===== Team-member identity (Stage 1) =====

  /**
   * Parent provider's user.id — set when this user is a team member /
   * staff under another provider's account. NULL for top-level account
   * owners. The parent-provider's seller_profile / service_provider_-
   * profile is the one that owns categories, archetypes, leads etc.;
   * staff don't carry their own profile rows. Resolution happens in
   * the leads / orders / products surfaces by falling back to the
   * parent when this column is set.
   */
  @Column({ type: 'uuid', nullable: true })
  @Index('idx_users_parent_provider', ['parentProviderId'])
  parentProviderId: string | null;

  /**
   * Permission codes granted to this user. NULL on top-level owners
   * (they have full access via role/RBAC); a string[] on staff. Strings
   * match the values in src/utils/rbac.ts PERMISSIONS constants
   * (MANAGE_QUOTES, MANAGE_COLLECTIONS, VIEW_ANALYTICS, ...).
   */
  @Column({ type: 'simple-array', nullable: true })
  permissions: string[] | null;

  /**
   * For multi-archetype sellers, restrict this team member to one
   * specific archetype's leads view. Values match the Archetype enum
   * (RETAIL, REPAIR, ...). NULL = no restriction (the parent owner
   * sees everything; staff with NULL also see everything within their
   * permissions). Used by /inquiries/leads/me and the variant toggle
   * UI in ProviderLeadsView.
   */
  @Column({ type: 'varchar', length: 32, nullable: true })
  assignedArchetype: string | null;

  /**
   * Force a password change on next login. Set when an owner creates
   * a staff user with a generated password, so the staff member must
   * pick their own password before continuing.
   */
  @Column({ type: 'boolean', default: false })
  mustChangePassword: boolean;

  // ===== Department head delegation (Phase 5) =====

  /**
   * Whether this team member runs the department for their
   * `assignedArchetype`. Owners can promote one staff per
   * (parentProviderId, assignedArchetype) pair to head — the team
   * service enforces the uniqueness. Department heads gain finance-
   * view access (with their own PIN) and, when granted INDEPENDENT
   * autonomy, can move money out of the company virtual account.
   */
  @Column({ type: 'boolean', default: false })
  isDepartmentHead: boolean;

  /**
   * Autonomy mode for the department head. Only meaningful when
   * `isDepartmentHead = true`; NULL on regular staff and owners.
   *
   *   INDEPENDENT — full autonomy: view + move money out of the
   *                 company virtual account.
   *   MANAGED     — view-only: balance + transactions visible behind
   *                 their PIN, but no withdrawal UI / endpoint access.
   */
  @Column({
    type: 'enum',
    enum: ['INDEPENDENT', 'MANAGED'],
    nullable: true,
  })
  departmentAutonomy: 'INDEPENDENT' | 'MANAGED' | null;

  /**
   * Derived from `departmentAutonomy` (kept as a column so backend
   * gates can read it directly without re-deriving): TRUE when
   * autonomy is INDEPENDENT, FALSE otherwise. Withdrawal endpoints
   * + the FinancialPage withdrawal button gate on this field.
   */
  @Column({ type: 'boolean', default: false })
  canMoveFinance: boolean;

  /**
   * Per-user PIN for finance access. Owners use the PIN on their
   * active profile (seller_profiles.pin / etc.); department heads
   * (and any future staff who need self-scoped PIN gating) use this
   * column. select:false + @Exclude so the value never reaches the
   * wire — only `hasPin` is published via flattenWithProfile.
   *
   * 4 chars to match the existing profile-level PIN format.
   */
  @Column({ type: 'varchar', length: 4, nullable: true, select: false })
  @Exclude({ toPlainOnly: true })
  pin: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ===== RELATIONSHIPS =====

  /**
   * Multiple Email Addresses linked to this user. user_emails is the
   * canonical lookup table for sign-in.
   */
  @OneToMany(() => UserEmail, (userEmail) => userEmail.user, {
    cascade: true,
    eager: false,
  })
  emails: UserEmail[];

  /**
   * Audit Log of all identity changes (email changes, NRC updates,
   * verification status changes).
   */
  @OneToMany(() => IdentityAudit, (audit) => audit.user, {
    cascade: true,
    eager: false,
  })
  identityAudits: IdentityAudit[];
}
