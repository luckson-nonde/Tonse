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
import { IdentityAudit } from './identity-audit.entity';

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
   */
  @Column({
    type: 'enum',
    enum: ['BUYER', 'SELLER', 'SERVICE_PROVIDER', 'ADMIN'],
    default: 'BUYER',
  })
  role: string;

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
