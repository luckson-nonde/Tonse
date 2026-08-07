import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

/**
 * An admin-authored merchandising tile on the public landing page.
 *
 * These exist because the storefront grid has to look full on day one, before
 * anybody has sold anything. Once real direct-purchase sales land, best-selling
 * products take those slots over automatically and the tiles fall back to
 * filling whatever is left (see StorefrontService.getHome) — so a tile is a
 * placeholder that earns its slot only while the catalogue can't.
 *
 * Unlike an Advertisement, nobody pays for these and they never expire: they're
 * the platform's own shop window, not inventory sold to sellers.
 */
@Entity('promo_tiles')
@Index('idx_promo_tiles_active_sort', ['isActive', 'sortOrder'])
export class PromoTile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 160 })
  title: string;

  /** Second line — a price tease ("From ZMW 429"), a discount, a category. */
  @Column({ type: 'varchar', length: 200, nullable: true })
  subtitle: string | null;

  /** Uploaded via the `promo-tile` files category, so it's a /uploads/… path
   *  that the frontend must resolve against the API origin (uploadUrl()) —
   *  NOT a base64 data URL like products.images holds. */
  @Column({ type: 'varchar', length: 500 })
  imageUrl: string;

  /** Button copy. NULL renders no button, just a clickable tile. */
  @Column({ type: 'varchar', length: 40, nullable: true })
  ctaLabel: string | null;

  /**
   * Click target, resolved in this precedence: product → shop → category.
   *
   * A real FK with ON DELETE SET NULL, unlike the two below. Sellers can hard-
   * delete their own listings at any time (DELETE /products/:id) with no idea
   * an admin tile points at one; CASCADE would silently destroy the admin's
   * tile, RESTRICT would block the seller over an invisible object. SET NULL
   * scrubs the dangling pointer and the tile keeps working via its other
   * targets.
   */
  @Column({ type: 'uuid', nullable: true })
  targetProductId: string | null;

  @ManyToOne(() => Product, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'targetProductId' })
  targetProduct: Product | null;

  /** seller_profiles.id / service_provider_profiles.id — the `:id` in
   *  `/discover/:id`. No FK: the two profile tables have no common parent, so
   *  there's nothing to reference (same as Advertisement.shopProfileId). */
  @Column({ type: 'uuid', nullable: true })
  targetShopProfileId: string | null;

  /** Master category slug this tile is about, and where it lands when no
   *  product/shop target is set. Not an FK — category ids are catalog slugs
   *  (same as Advertisement.targetCategoryId). */
  @Column({ type: 'varchar', length: 100, nullable: true })
  targetCategoryId: string | null;

  /** Tile surface colour, e.g. the reference design's pastel bands. NULL
   *  falls back to the house cream card. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  backgroundColor: string | null;

  @Column({ type: 'integer', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
