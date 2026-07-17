import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * A buyer marking a shop/provider as a favorite ("♥") so they can find it
 * again quickly under Browse Shops → Favorites. Per-(user, shop) row.
 *
 * `shopId` is the directory card id — i.e. `ShopResult.id`, which is the
 * seller/service-provider PROFILE id surfaced by ShopsService.findAll (NOT
 * the owner's users.id, and NOT a `shops` table row). Loose uuid columns,
 * no FK relations — same convention as shop_reviews / audit_logs, so a
 * favorite survives either side being deleted.
 */
@Entity('shop_favorites')
@Index('idx_shop_favorites_user', ['userId'])
// One row per (buyer, shop): the DB is the authority, so favoriting twice is
// idempotent (the service swallows the unique-violation).
@Index('idx_shop_favorites_user_shop_unique', ['userId', 'shopId'], {
  unique: true,
})
export class ShopFavorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The buyer's users.id (taken from the JWT, never the request body). */
  @Column({ type: 'uuid' })
  userId: string;

  /** The favorited shop card id — ShopResult.id (a provider profile id). */
  @Column({ type: 'uuid' })
  shopId: string;

  @CreateDateColumn()
  createdAt: Date;
}
