import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AdPlacementLocation } from './advertisement.entity';

/** One duration discount tier: durations >= minDays get discountPercentage off. */
export interface AdDiscountTier {
  minDays: number;
  discountPercentage: number;
}

/**
 * Ad pricing — effectively a single row (get-or-create), same pattern as
 * BillingSettings/SiteSettings. Admin-edited from the "Ads" tab.
 *
 * `baseRates` has NO db-level default — json column defaults are unreliable
 * under TypeORM synchronize. AdsService.getOrCreateSettings() populates it
 * when the row is created.
 */
@Entity('ad_settings')
export class AdSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'json', nullable: true })
  baseRates: Record<AdPlacementLocation, number> | null;

  @Column({ type: 'json', nullable: true })
  discountTiers: AdDiscountTier[] | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
