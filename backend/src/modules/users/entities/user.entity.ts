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
   * User's Primary Role/Category
   */
  @Column({
    type: 'enum',
    enum: [
      'BUYER',
      'SELLER',
      'SUPPLIER',
      'SERVICE_PROVIDER',
      'ENTERTAINMENT',
      'EVENTS',
      'LABOUR',
      'ADMIN',
    ],
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

  /**
   * Additional Metadata
   * JSON object for extensibility
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

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
