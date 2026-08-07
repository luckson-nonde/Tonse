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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
