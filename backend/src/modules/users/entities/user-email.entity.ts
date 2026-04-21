import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * User Email Entity
 *
 * Allows a single user (identified by NRC/UUID) to have multiple email addresses
 * Supports:
 * - Account recovery (multiple backup emails)
 * - Different email for different purposes
 * - Email verification per email address
 * - Full history of email changes
 */
@Entity('user_emails')
@Index('idx_user_emails_email', ['email'], { unique: true })
@Index('idx_user_emails_user_id', ['userId'])
@Index('idx_user_emails_is_primary', ['isPrimary'])
@Index('idx_user_emails_verification_status', ['verificationStatus'])
@Index('idx_user_emails_created_at', ['createdAt'])
export class UserEmail {
  /**
   * Unique Identifier for this email record
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Foreign Key to User
   * Links this email to a specific user
   * All emails with same userId belong to same real person
   */
  @Column({ type: 'uuid' })
  userId: string;

  /**
   * Email Address
   * Unique across system - only one user can have this email
   * When a user adds an email, it cannot be used by another user
   */
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  /**
   * Is Primary Email
   * Only one email per user can be primary
   * Used for default communications
   */
  @Column({ type: 'boolean', default: false })
  isPrimary: boolean;

  /**
   * Email Verification Status
   * NOT_VERIFIED: Email not yet verified
   * VERIFICATION_SENT: Verification email sent, awaiting confirmation
   * VERIFIED: Email confirmed by user
   */
  @Column({
    type: 'enum',
    enum: ['NOT_VERIFIED', 'VERIFICATION_SENT', 'VERIFIED'],
    default: 'NOT_VERIFIED',
  })
  verificationStatus: string;

  /**
   * Verification Token
   * Single-use token sent to email for verification
   * Expires after configured time period
   */
  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  verificationToken: string;

  /**
   * Verification Token Expiry
   */
  @Column({ type: 'timestamp', nullable: true })
  verificationTokenExpiresAt: Date;

  /**
   * Timestamp when email was verified
   */
  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  /**
   * Account Recovery Email
   * Mark emails that can be used for account recovery
   */
  @Column({ type: 'boolean', default: false })
  isRecoveryEmail: boolean;

  /**
   * Email Creation Timestamp
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * Email Last Update Timestamp
   */
  @UpdateDateColumn()
  updatedAt: Date;

  // ===== RELATIONSHIPS =====

  /**
   * Back-reference to User
   * All operations on email must respect user's identity (NRC)
   */
  @ManyToOne(() => User, (user) => user.emails, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'userId' })
  user: User;
}
