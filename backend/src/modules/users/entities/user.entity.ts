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
   * NRC Document Upload Path (encrypted).
   */
  @Column({ type: 'varchar', length: 500, nullable: true, select: false })
  @Exclude({ toPlainOnly: true })
  nrcDocumentPath: string;

  /**
   * Account Active Status (suspension lever — auth-level).
   */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /**
   * Security PIN (optional, for sensitive ops).
   */
  @Column({ type: 'varchar', length: 4, nullable: true, select: false })
  @Exclude({ toPlainOnly: true })
  pin: string;

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
