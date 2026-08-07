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
import { User } from '../../users/entities/user.entity';

@Entity('products')
@Index('idx_products_seller_id', ['sellerId'])
@Index('idx_products_category', ['category'])
@Index('idx_products_name', ['name'])
@Index('idx_products_created_at', ['createdAt'])
@Index('idx_products_seller_category', ['sellerId', 'category'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sellerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  subCategory: string;

  // Nullable — a priceless listing is a real "Price on request" state that
  // routes buyers into the quote/booking flow instead of Buy Now.
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  price: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  originalPrice: number;

  @Column({ type: 'integer', default: 0 })
  stock: number;

  // json, NOT simple-array: base64 data-URL images contain commas, which the
  // comma-joined simple-array storage corrupted on read.
  @Column({ type: 'json', default: () => "'[]'" })
  images: string[];

  // Optional promo/demo video for the listing (PortfolioItem precedent).
  @Column({ type: 'varchar', length: 500, nullable: true })
  youtubeUrl: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  condition: string;

  @Column({ type: 'json', nullable: true })
  attributes: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'integer', default: 0 })
  viewCount: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ type: 'integer', default: 0 })
  reviewCount: number;

  /**
   * Units sold through direct purchase (`POST /products/:id/buy`), bumped
   * atomically inside DirectOrderService's own locked transaction. This is
   * the ONLY sales signal the schema can carry: the normal inquiry → quote →
   * order flow never references a product row, so a negotiated sale is
   * unattributable to a listing. Ranks the landing-page storefront.
   *
   * Denormalized like viewCount/rating/reviewCount above, which carries the
   * usual obligation: when a cancel/refund flow lands, it must decrement here
   * too (no such path exists today — see collection.service.ts).
   */
  @Column({ type: 'integer', default: 0 })
  salesCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
