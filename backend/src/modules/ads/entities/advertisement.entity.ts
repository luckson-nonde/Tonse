import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type AdMediaType = 'IMAGE' | 'VIDEO';
/** BUNDLE_ALL is retired — one ad now carries a LIST of placements, which is
 *  what "bundle" was working around. The migration expands legacy bundle rows
 *  into all three real placements. */
export type AdPlacementLocation = 'HOMEPAGE_CENTER' | 'SECONDARY_SIDEBAR' | 'CATEGORY_SIDEBAR';

export const AD_PLACEMENTS: AdPlacementLocation[] = [
  'HOMEPAGE_CENTER',
  'SECONDARY_SIDEBAR',
  'CATEGORY_SIDEBAR',
];
export type AdStatus = 'PENDING_PAYMENT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
/** Not a persisted status — see `effectiveAdStatus()` in ads.service.ts. */
export type EffectiveAdStatus = AdStatus | 'EXPIRED';

/**
 * A seller-purchased ad campaign: one creative, one paid window, and one or
 * more places it appears. The seller picks the start/end dates themselves, so
 * `startDate`/`endDate` are set at CREATION — but `approve()` shifts the whole
 * window forward if review ran past the requested start, so a slow queue can
 * never cost the seller days they paid for.
 *
 * No index on `placements`: it's a json array, and this codebase deliberately
 * JS-filters json/array columns after load rather than reaching for SQL
 * containment (see the invariant in jobs.service.ts).
 */
@Entity('advertisements')
@Index('idx_ads_seller', ['sellerId'])
@Index('idx_ads_status', ['status'])
@Index('idx_ads_target_category', ['targetCategoryId'])
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

  /** Every place this ad runs. At least one; costs the same either way —
   *  price is a function of DAYS only, never of where it appears. */
  @Column({ type: 'json' })
  placements: AdPlacementLocation[];

  /**
   * Master category slug this ad targets (e.g. 'electronics', 'loans') —
   * only meaningful when CATEGORY_SIDEBAR is among its placements, where the
   * buyer browsing that category sees it. NULL means untargeted: it runs on EVERY category
   * page, so the rail still has something to show in a category nobody has
   * bought yet. Not an FK — category ids are slugs living in the frontend
   * catalog, same as audit_logs' category entries.
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  targetCategoryId: string | null;

  /** Seller-chosen window, stored at creation. Start-of-day for `startDate`,
   *  end-of-day for `endDate` so the ad runs through its final day.
   *  `approve()` may shift both forward together — see the class doc. */
  @Column({ type: 'timestamp', nullable: true })
  startDate: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date | null;

  /** Derived server-side from the dates (inclusive count), never client-sent —
   *  it's what the price is computed from. */
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
