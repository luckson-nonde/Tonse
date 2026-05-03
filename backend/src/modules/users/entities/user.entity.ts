import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserEmail } from './user-email.entity';
import { IdentityAudit } from './identity-audit.entity';

/**
 * User Entity - Three-tier Identity System
 *
 * Architecture:
 * - NRC (National Registration Card): Immutable real-world anchor, unique constraint
 * - UUID (id): System identifier for internal operations, database primary key
 * - displayId: User-facing friendly identifier (USER-A3K9F2)
 *
 * This design allows:
 * - Linking real-world identity (NRC) to system operations (UUID)
 * - User-friendly communication (displayId)
 * - Prevention of duplicate accounts (same NRC = same person)
 * - Multiple emails per real person
 * - Complete audit trail of identity changes
 */
@Entity('users')
@Index('idx_users_nrc', ['nrcNumber'], { unique: true })
@Index('idx_users_display_id', ['displayId'], { unique: true })
@Index('idx_users_email_primary', ['primaryEmailId'])
@Index('idx_users_role', ['role'])
@Index('idx_users_verification_status', ['verificationStatus'])
@Index('idx_users_created_at', ['createdAt'])
@Index('idx_users_updated_at', ['updatedAt'])
export class User {
  /**
   * System Identifier (UUID)
   * Used for all internal operations and foreign key relationships
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * National Registration Card Number (Immutable Anchor)
   * Links user to real-world identity, prevents duplicate accounts
   * Never changes once set, unique across entire system
   */
  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
    nullable: true, // Nullable for backward compatibility with existing users
  })
  nrcNumber: string;

  /**
   * User-Friendly Display ID
   * Format: USER-XXXXXX (e.g., USER-A3K9F2)
   * Deterministically generated from UUID, memorable and shareable
   */
  @Column({
    type: 'varchar',
    length: 20,
    unique: true,
    nullable: true,
  })
  displayId: string;

  /**
   * User's Full Name
   */
  @Column({ type: 'varchar', length: 255 })
  name: string;

  /**
   * Primary Email Address
   * User can have multiple emails via UserEmail entity
   * This is the primary/default email for communications
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  primaryEmail: string;

  /**
   * Foreign key to primary email entity
   */
  @Column({ type: 'uuid', nullable: true })
  primaryEmailId: string;

  /**
   * Phone Number
   * Primary contact phone
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  /**
   * Date of Birth
   * Captured during registration, stored as DATE type
   */
  @Column({ type: 'date', nullable: true })
  dateOfBirth: string;

  /**
   * Hashed Password
   * Never selected in queries by default for security
   */
  @Column({ type: 'text', select: false })
  @Exclude({ toPlainOnly: true })
  password: string;

  /**
   * Refresh Token for JWT
   */
  @Column({ type: 'varchar', length: 500, nullable: true, select: false })
  @Exclude({ toPlainOnly: true })
  refreshToken: string;

  /**
   * Profile Picture
   * Base64 encoded image or URL
   */
  @Column({ type: 'text', nullable: true })
  profilePicture: string;

  /**
   * User's Location
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string;

  /**
   * User's Primary Auth Role.
   *
   * Phase 2 of the users-table restructure tightened this to four canonical
   * values. Business descriptors that used to live here (EVENTS,
   * ENTERTAINMENT, SUPPLIER) are now in the `categories` array — they're
   * what the user trades in, not who they are. LABOUR was demoted into
   * SERVICE_PROVIDER (per spec default — "events / entertainment / labour
   * are not roles, they're categories").
   *
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
   * Business Categories User is involved in
   */
  @Column({ type: 'simple-array', default: '' })
  categories: string[];

  /**
   * Verification Status
   * PENDING: Awaiting NRC verification
   * VERIFIED: NRC verified by admin
   * REJECTED: NRC verification failed
   * SUSPENDED: Account suspended
   */
  @Column({
    type: 'enum',
    enum: ['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'],
    default: 'PENDING',
  })
  verificationStatus: string;

  /**
   * NRC Document Verification Status
   */
  @Column({ type: 'boolean', default: false })
  isNrcVerified: boolean;

  /**
   * NRC Document Upload Path (encrypted)
   * Stores path to encrypted NRC document
   */
  @Column({ type: 'varchar', length: 500, nullable: true, select: false })
  @Exclude({ toPlainOnly: true })
  nrcDocumentPath: string;

  /**
   * Business License ID (if applicable)
   */
  @Column({ type: 'uuid', nullable: true })
  businessLicenseId: string;

  // ===== PROFILE FIELDS (formerly inside metadata jsonb) =====
  // Phase 1 of the users-table restructure: these were keys inside a
  // metadata jsonb column with a frontend whitelist (TOP_LEVEL_USER_KEYS in
  // AuthContext.tsx) doing the partitioning. That was opaque to admin tooling
  // and to SQL inspection — promoted to typed columns so every field is
  // visible, queryable and constrained.

  /**
   * Sub-role within the master role (e.g. PRODUCT_SELLER, SUPPLIER_SELLER,
   * COMPANY_PROCUREMENT_OFFICER, INDIVIDUAL_BUYER). Defines the legal/business
   * shape inside a role.
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  subRole: string;

  /**
   * Zambian province name. Captured during registration step 2.
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  province: string;

  /**
   * City within the province.
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  /**
   * Optional street / building / landmark.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  area: string;

  /**
   * GPS latitude. Range: roughly -8.2 to -18.1 for Zambia.
   */
  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  latitude: number;

  /**
   * GPS longitude. Range: roughly 21.9 to 33.7 for Zambia.
   */
  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  longitude: number;

  /**
   * Service / delivery radius in kilometres.
   */
  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  radius: number;

  /**
   * Company legal name as registered with PACRA. Filled in step 4 of seller
   * onboarding (CompanyDocuments).
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  companyName: string;

  /**
   * Zambian Tax Payer Identification Number (10 digits).
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  tpin: string;

  /**
   * PACRA Certificate of Incorporation — base64 data URL or storage path.
   */
  @Column({ type: 'text', nullable: true })
  incorporationCertUrl: string;

  /**
   * Labour-only: top-level labour category id picked at registration tier 1.
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  labourCategory: string;

  /**
   * Labour-only: array of selected labour sub-type ids.
   */
  @Column({ type: 'simple-array', default: '' })
  labourSubTypes: string[];

  /**
   * Reason supplied by the admin reviewer when verificationStatus is REJECTED.
   * Was previously stored in metadata.verificationRejectionReason.
   */
  @Column({ type: 'text', nullable: true })
  verificationRejectionReason: string;

  /**
   * Timestamp when the admin marked verificationStatus = VERIFIED.
   * Was previously stored in metadata.verifiedAt.
   */
  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  /**
   * Timestamp when the admin marked verificationStatus = REJECTED.
   * Was previously stored in metadata.rejectedAt.
   */
  @Column({ type: 'timestamp', nullable: true })
  rejectedAt: Date;

  /**
   * Social Links
   * JSON stringified or stored as JSONB
   */
  @Column({ type: 'text', nullable: true })
  socialLinks: string;

  /**
   * Account Active Status
   */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /**
   * Security PIN (optional)
   * Used for sensitive operations
   */
  @Column({ type: 'varchar', length: 4, nullable: true, select: false })
  @Exclude({ toPlainOnly: true })
  pin: string;

  /**
   * Last Login Timestamp
   */
  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  /**
   * Last NRC Verification Timestamp
   */
  @Column({ type: 'timestamp', nullable: true })
  lastNrcVerificationAt: Date;

  /**
   * Account Creation Timestamp
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * Last Account Update Timestamp
   */
  @UpdateDateColumn()
  updatedAt: Date;

  // ===== RELATIONSHIPS =====

  /**
   * Multiple Email Addresses linked to this user
   * Allows same person to use different emails
   * Always links back to same NRC/UUID
   */
  @OneToMany(() => UserEmail, (userEmail) => userEmail.user, {
    cascade: true,
    eager: false,
  })
  emails: UserEmail[];

  /**
   * Audit Log of all identity changes
   * Full history of email changes, NRC updates, verification status changes
   */
  @OneToMany(() => IdentityAudit, (audit) => audit.user, {
    cascade: true,
    eager: false,
  })
  identityAudits: IdentityAudit[];
}
