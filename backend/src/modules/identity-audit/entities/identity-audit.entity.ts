import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Identity Audit Log Entity
 *
 * Comprehensive audit trail for all identity-related changes
 * Enables:
 * - Full history of user identity changes
 * - Fraud investigation and detection
 * - Compliance and regulatory reporting
 * - Account recovery verification
 *
 * Logged Events:
 * - USER_REGISTERED: New user account created
 * - NRC_VERIFIED: User's NRC verified
 * - NRC_VERIFICATION_FAILED: NRC verification failed
 * - EMAIL_ADDED: New email added to account
 * - EMAIL_REMOVED: Email removed from account
 * - EMAIL_PRIMARY_CHANGED: Primary email changed
 * - EMAIL_VERIFIED: Email address verified
 * - PASSWORD_CHANGED: User changed password
 * - ACCOUNT_SUSPENDED: Account suspended
 * - ACCOUNT_REACTIVATED: Suspended account reactivated
 * - ACCOUNT_DELETED: Account deleted
 * - SUSPICIOUS_ACTIVITY: Suspicious activity detected
 * - ADMIN_ACTION: Administrator action on account
 */
@Entity('identity_audits')
@Index('idx_identity_audits_user_id', ['userId'])
@Index('idx_identity_audits_event_type', ['eventType'])
@Index('idx_identity_audits_created_at', ['createdAt'])
@Index('idx_identity_audits_user_event', ['userId', 'eventType'])
@Index('idx_identity_audits_user_date', ['userId', 'createdAt'])
export class IdentityAudit {
  /**
   * Unique Identifier for audit record
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Foreign Key to User
   * Which user this audit entry is for
   */
  @Column({ type: 'uuid' })
  userId: string;

  /**
   * Event Type
   * Type of identity change being audited
   */
  @Column({
    type: 'enum',
    enum: [
      'USER_REGISTERED',
      'NRC_VERIFIED',
      'NRC_VERIFICATION_FAILED',
      'EMAIL_ADDED',
      'EMAIL_REMOVED',
      'EMAIL_PRIMARY_CHANGED',
      'EMAIL_VERIFIED',
      'PASSWORD_CHANGED',
      'ACCOUNT_SUSPENDED',
      'ACCOUNT_REACTIVATED',
      'ACCOUNT_DELETED',
      'SUSPICIOUS_ACTIVITY',
      'ADMIN_ACTION',
    ],
  })
  eventType: string;

  /**
   * Event Description
   * Human-readable description of what happened
   */
  @Column({ type: 'text' })
  description: string;

  /**
   * Previous Value
   * What the field was before the change
   * Stored as JSON for flexibility
   */
  @Column({ type: 'jsonb', nullable: true })
  previousValue: Record<string, any>;

  /**
   * New Value
   * What the field is after the change
   * Stored as JSON for flexibility
   */
  @Column({ type: 'jsonb', nullable: true })
  newValue: Record<string, any>;

  /**
   * Changed Field
   * Which field was changed (email, nrc, password, etc.)
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  changedField: string;

  /**
   * Admin ID (if applicable)
   * Which admin performed the action (if admin-initiated)
   */
  @Column({ type: 'uuid', nullable: true })
  adminId: string;

  /**
   * IP Address
   * From which IP the change originated
   * Helps detect suspicious activity
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  ipAddress: string;

  /**
   * User Agent
   * Browser/client information
   */
  @Column({ type: 'text', nullable: true })
  userAgent: string;

  /**
   * Is Suspicious
   * Flagged if activity appears suspicious
   * Triggers additional verification
   */
  @Column({ type: 'boolean', default: false })
  isSuspicious: boolean;

  /**
   * Metadata
   * Additional context about the event
   * Could include: location, device fingerprint, reason, etc.
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  /**
   * Verification Status
   * UNVERIFIED: Event not yet verified
   * VERIFIED: Event verified as legitimate
   * FRAUD: Event determined to be fraudulent
   */
  @Column({
    type: 'enum',
    enum: ['UNVERIFIED', 'VERIFIED', 'FRAUD'],
    default: 'UNVERIFIED',
  })
  verificationStatus: string;

  /**
   * Status Notes
   * Additional notes about verification or fraud determination
   */
  @Column({ type: 'text', nullable: true })
  statusNotes: string;

  /**
   * Audit Timestamp
   * When this change occurred
   */
  @CreateDateColumn()
  createdAt: Date;

  // ===== RELATIONSHIPS =====

  /**
   * Reference to User
   * Full user information for context
   */
  @ManyToOne(() => User, (user) => user.identityAudits, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'userId' })
  user: User;
}
