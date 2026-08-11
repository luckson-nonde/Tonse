import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/** One buyer quotation-fee tier: pay `price` ZMW to receive up to `count` quotes. */
export interface QuoteTier {
  count: number;
  price: number;
}

/**
 * Platform monetization settings — effectively a single row (get-or-create),
 * same pattern as PromoterSetting. Admin-edited from the "Subscriptions" tab.
 *
 * `subscriptionsEnabled` is the master switch for the WHOLE monetization
 * layer: OFF means buyers publish inquiries free (no service fee) AND shops
 * owe no monthly fee (no paywall). Defaults to false so a deploy never
 * paywalls existing shops before an admin deliberately turns it on.
 *
 * `quoteTiers` has NO db-level default — json column defaults are unreliable
 * under TypeORM synchronize (formatting diffs re-trigger ALTERs every boot).
 * BillingService.getOrCreateSettings() populates it when the row is created.
 */
@Entity('billing_settings')
export class BillingSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'boolean', default: false })
  subscriptionsEnabled: boolean;

  @Column({ type: 'json', nullable: true })
  quoteTiers: QuoteTier[] | null;

  /** Flat fee for a "This Shop Only" targeted inquiry (1 quote). */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 10 })
  targetedInquiryFee: number;

  /** Monthly subscription every shop (SELLER / SERVICE_PROVIDER) owes when enabled. */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 100 })
  monthlyFee: number;

  /**
   * Job-board posting fee — its own switch, deliberately independent of
   * `subscriptionsEnabled`: the job board can charge while the rest of the
   * platform is free (or vice versa). OFF by default so a deploy never
   * starts charging posters before an admin deliberately turns it on.
   */
  @Column({ type: 'boolean', default: false })
  jobPostingFeeEnabled: boolean;

  /** Flat fee (ZMW) to publish one job posting, charged before admin review. */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 50 })
  jobPostingFee: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
