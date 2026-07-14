import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * A buyer's rating of a shop/provider, earned through a real trade: the
 * server only accepts a review when the reviewer has an order with that
 * provider in DELIVERED or COMPLETED status. Aggregated (AVG + COUNT)
 * into the shop directory cards and the shop profile.
 *
 * Loose uuid columns, no FK relations — same convention as audit_logs /
 * user_reports, so a review survives account deletion on either side.
 */
@Entity('shop_reviews')
@Index('idx_shop_reviews_provider', ['providerUserId'])
@Index('idx_shop_reviews_reviewer', ['reviewerUserId'])
@Index('idx_shop_reviews_order', ['orderId'])
// One review per (buyer, order): the DB is the authority; the service's
// friendly 409 pre-check is just better UX for the common case.
@Index('idx_shop_reviews_reviewer_order_unique', ['reviewerUserId', 'orderId'], {
  unique: true,
})
export class ShopReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Seller/provider's users.id — matches ShopResult.sellerId (NOT the profile row id). */
  @Column({ type: 'uuid' })
  providerUserId: string;

  @Column({ type: 'uuid' })
  reviewerUserId: string;

  @Column({ type: 'uuid' })
  orderId: string;

  /** 1–5 stars. */
  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
