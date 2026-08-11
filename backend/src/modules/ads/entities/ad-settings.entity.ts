import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
/** One duration discount tier: durations >= minDays get discountPercentage off. */
export interface AdDiscountTier {
  minDays: number;
  discountPercentage: number;
}

/**
 * Ad pricing — effectively a single row (get-or-create), same pattern as
 * BillingSettings/SiteSettings. Admin-edited from the "Ads" tab.
 *
 * ONE rate for every placement, by design: what an ad costs is a function of
 * how many DAYS it runs, not where it appears. Sellers can therefore tick as
 * many placements as they like without changing the price.
 *
 * `discountTiers` has NO db-level default — json column defaults are unreliable
 * under TypeORM synchronize. AdsService.getOrCreateSettings() populates it
 * when the row is created.
 */
@Entity('ad_settings')
export class AdSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 8 })
  baseRatePerDay: number;

  @Column({ type: 'json', nullable: true })
  discountTiers: AdDiscountTier[] | null;

  // ── Pop-up ("Spotlight") ads ─────────────────────────────────────────
  // A separate, premium product: it interrupts the screen, so it is priced
  // on its own per-day rate and rationed by the two frequency knobs below.

  /** Master switch. OFF stops NEW pop-up ads being created AND stops any
   *  being served — the admin's brake if pop-ups prove annoying. */
  @Column({ type: 'boolean', default: true })
  popupEnabled: boolean;

  /** ZMW per day for a pop-up campaign. Duration discount tiers still apply. */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 25 })
  popupRatePerDay: number;

  /** How many pop-ups one viewer may see inside the window below. */
  @Column({ type: 'integer', default: 1 })
  popupMaxPerSession: number;

  /** The window that `popupMaxPerSession` is counted over, in minutes.
   *  Default 360 (6h) ≈ "about once a session" for a typical visitor. */
  @Column({ type: 'integer', default: 360 })
  popupMinMinutesBetween: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
