import { Entity, PrimaryColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { SellerProfile } from './seller-profile.entity';
import { Category } from '../../categories/entities/category.entity';

/**
 * Junction row between a seller profile and a category the seller serves.
 * Composite PK so (sellerProfileId, categoryId) is naturally unique.
 * Replaces the simple-array `seller_profiles.categories` column.
 *
 * Hierarchy expansion happens query-side via a recursive CTE — a seller
 * who subscribes to parent 'electronics' implicitly serves every
 * descendant ('mobile-phones-buy', 'laptops-buy', etc.).
 */
@Entity('seller_profile_categories')
@Index('idx_seller_profile_categories_category', ['categoryId'])
export class SellerProfileCategory {
  @PrimaryColumn({ type: 'uuid' })
  sellerProfileId: string;

  @PrimaryColumn({ type: 'varchar', length: 64 })
  categoryId: string;

  @ManyToOne(() => SellerProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sellerProfileId' })
  sellerProfile: SellerProfile;

  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category: Category;
}
