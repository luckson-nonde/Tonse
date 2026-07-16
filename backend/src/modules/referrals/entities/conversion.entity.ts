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
import { ReferralLink } from './referral-link.entity';

/**
 * One row per referred user — the referral funnel record.
 *
 * `referredUserId` is UNIQUE: a user is referred exactly once, by whichever
 * code they registered with. `funnelStage` is monotonic (registration →
 * inquiry → trade_complete) and only ever advances via the guarded UPDATE
 * in FunnelTrackingService.advanceStage.
 *
 * The two `*AdvancedAt` timestamps are independent of the coarse stage:
 * a referred PROVIDER can jump registration → trade_complete without ever
 * creating an inquiry (providers don't file inquiries), leaving
 * inquiryAdvancedAt NULL forever. Milestone counting reads the timestamp
 * columns, never just the current stage.
 */
@Entity('conversions')
@Index('idx_conversions_referred_user', ['referredUserId'], { unique: true })
@Index('idx_conversions_referral_link', ['referralLinkId'])
@Index('idx_conversions_promoter_stage', ['promoterUserId', 'funnelStage'])
export class Conversion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  referralLinkId: string;

  @ManyToOne(() => ReferralLink, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referralLinkId' })
  referralLink: ReferralLink;

  /** Denormalized from the link at insert — every milestone-count query
   *  filters on promoter, and this saves the join. */
  @Column({ type: 'uuid' })
  promoterUserId: string;

  /** The referred user (UNIQUE — one conversion row per user, ever). */
  @Column({ type: 'uuid' })
  referredUserId: string;

  /** Furthest stage reached. createdAt doubles as "registeredAt". */
  @Column({
    type: 'enum',
    enum: ['registration', 'inquiry', 'trade_complete'],
    default: 'registration',
  })
  funnelStage: string;

  /** Set once, the first time this referred user creates an inquiry. */
  @Column({ type: 'timestamp', nullable: true })
  inquiryAdvancedAt: Date | null;

  /** Set once, the first time a trade tied to this referred user completes. */
  @Column({ type: 'timestamp', nullable: true })
  tradeCompleteAdvancedAt: Date | null;

  /** Audit trail: which inquiry advanced the row. */
  @Column({ type: 'uuid', nullable: true })
  firstInquiryId: string | null;

  /** Audit trail: which trade advanced the row — { type: 'order'|'quote', id }. */
  @Column({ type: 'json', nullable: true })
  firstTradeSource: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
