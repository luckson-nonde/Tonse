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
 * Durable (Tier-1) in-app notification. One row per recipient per event.
 *
 * Only events that need PERSISTENCE are rows here:
 *   NEW_LEAD          → provider: a matching inquiry arrived (the Uber-style
 *                       dispatch). status tracks their Accept/Decline, which
 *                       doubles as buyer-facing behaviour telemetry.
 *   QUOTE_RECEIVED    → buyer: a provider quoted their inquiry.
 *   RESERVE_RELEASED  → provider: their reserve-tier quote is now visible
 *                       to the buyer.
 *   MILESTONE_UNLOCKED→ promoter: a referral milestone crossed its threshold
 *                       and equity shares were awarded (must survive the
 *                       promoter being offline → durable + catch-up replay).
 *   REPORT_FILED      → reporter: confirmation their complaint was filed.
 *   REPORT_RECEIVED   → admins (primary + ADMIN_REPORTS managers): a new
 *                       complaint is awaiting review.
 *
 * Ephemeral counter events (QUOTE_COUNT_UPDATE, LEAD_FULL, PROVIDER_ACCEPTED,
 * REFERRAL_PROGRESS, MILESTONE_UPDATED) are push-only — never persisted;
 * REST refetch self-heals them.
 */
@Entity('notifications')
@Index('idx_notifications_user_created', ['userId', 'createdAt'])
@Index('idx_notifications_user_inquiry', ['userId', 'inquiryId'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Recipient. */
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: [
      'NEW_LEAD',
      'QUOTE_RECEIVED',
      'RESERVE_RELEASED',
      'MILESTONE_UNLOCKED',
      'REPORT_FILED',
      'REPORT_RECEIVED',
    ],
  })
  type: string;

  @Column({ type: 'uuid', nullable: true })
  inquiryId: string;

  @Column({ type: 'uuid', nullable: true })
  quoteId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  /** Snapshot payload replayed verbatim by catch-up (enough to render the
   *  IncomingLeadAlert without a follow-up GET). */
  @Column({ type: 'json', nullable: true })
  data: Record<string, any>;

  /** NEW_LEAD lifecycle: PENDING → ACKNOWLEDGED (provider accepted/opened)
   *  or DECLINED (dismissed — never re-alert). Other types stay PENDING. */
  @Column({
    type: 'enum',
    enum: ['PENDING', 'ACKNOWLEDGED', 'DECLINED'],
    default: 'PENDING',
  })
  status: string;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
