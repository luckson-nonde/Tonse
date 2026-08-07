import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type AdMediaType = 'IMAGE' | 'VIDEO';
export type AdPlacementLocation = 'HOMEPAGE_CENTER' | 'SECONDARY_SIDEBAR' | 'BUNDLE_ALL';
export type AdStatus = 'PENDING_PAYMENT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
/** Not a persisted status — see `effectiveAdStatus()` in ads.service.ts. */
export type EffectiveAdStatus = AdStatus | 'EXPIRED';

/**
 * A seller-purchased ad placement (homepage center banner / secondary-page
 * sidebar). `startDate`/`endDate` stay null until an admin approves — the
 * seller only chooses a DURATION at checkout, so the paid window can't erode
 * while the ad sits in the review queue.
 */
@Entity('advertisements')
@Index('idx_ads_seller', ['sellerId'])
@Index('idx_ads_status', ['status'])
@Index('idx_ads_placement', ['placementLocation'])
export class Advertisement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sellerId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  /** Where the ad click sends the visitor — e.g. a shop or product page. */
  @Column({ type: 'varchar', length: 500 })
  targetUrl: string;

  @Column({ type: 'enum', enum: ['IMAGE', 'VIDEO'] })
  mediaType: AdMediaType;

  @Column({ type: 'varchar', length: 500 })
  mediaUrl: string;

  /** Client-measured runtime, VIDEO only — must be <= 15.00s. */
  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  videoDurationSeconds: number | null;

  @Column({ type: 'enum', enum: ['HOMEPAGE_CENTER', 'SECONDARY_SIDEBAR', 'BUNDLE_ALL'] })
  placementLocation: AdPlacementLocation;

  /** Set by approve() — the live window only starts once an admin signs off. */
  @Column({ type: 'timestamp', nullable: true })
  startDate: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date | null;

  @Column({ type: 'integer' })
  durationDays: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  totalPaidAmount: number;

  @Column({ type: 'char', length: 3, default: 'ZMW' })
  currency: string;

  @Column({
    type: 'enum',
    enum: ['PENDING_PAYMENT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
    default: 'PENDING_PAYMENT',
  })
  status: AdStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'uuid', nullable: true })
  approvedByAdminId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
