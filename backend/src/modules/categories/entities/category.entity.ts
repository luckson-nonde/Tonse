import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type Archetype =
  | 'RETAIL'
  | 'RENTAL'
  | 'BOOKING'
  | 'LABOUR'
  | 'REPAIR'
  | 'SERVICE'
  | 'EVENTS'
  | 'ENTERTAINMENT'
  | 'WHOLESALE'
  | 'LENDING';

export type CategoryNature = 'PRODUCT' | 'SERVICE' | 'BOTH';
export type ActionVariant = 'BUY_NEW' | 'REPAIR' | null;

/**
 * Category catalog row.
 *
 * The TS file `src/services/categories.ts` (`CATEGORIES_DB`) is the
 * editable source of truth for the taxonomy — adding a category is a
 * single TS edit. Every backend boot the `CategoriesSeederService`
 * reads `backend/src/modules/categories/catalog.json` (extracted from
 * the TS source by `backend/scripts/extract-catalog.cjs`) and upserts
 * rows here.
 *
 * IDs match the TS catalog ids exactly: 'electronics', 'mobile-phones-
 * buy', 'events', 'dj-live-bands', etc. Stable IDs are what makes
 * everything downstream work — junction tables, recursive ancestry
 * queries, archetype resolution.
 */
@Entity('categories')
@Index('idx_categories_parent', ['parentId'])
@Index('idx_categories_archetype', ['archetype'])
export class Category {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  parentId: string | null;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentId' })
  parent: Category | null;

  /**
   * UI archetype this category drives. The dominant archetype across a
   * seller's selected categories is cached on `seller_profiles.archetype`
   * (and `service_provider_profiles.archetype`) and used to vary
   * dashboard labels / sidebar items / stat tiles.
   *
   * Priority order when resolving across multiple categories (highest
   * wins): EVENTS > ENTERTAINMENT > REPAIR > RENTAL > BOOKING > RETAIL >
   * LABOUR > SERVICE.
   */
  @Column({
    type: 'enum',
    enum: ['RETAIL', 'RENTAL', 'BOOKING', 'LABOUR', 'REPAIR', 'SERVICE', 'EVENTS', 'ENTERTAINMENT', 'WHOLESALE', 'LENDING'],
    default: 'RETAIL',
  })
  archetype: Archetype;

  @Column({
    type: 'enum',
    enum: ['PRODUCT', 'SERVICE', 'BOTH'],
    default: 'PRODUCT',
  })
  nature: CategoryNature;

  /**
   * Sub-category action — null on parent rows and on subs that don't
   * carry a "(Buy New)" / "(Repair)" suffix.
   */
  @Column({
    type: 'enum',
    enum: ['BUY_NEW', 'REPAIR'],
    nullable: true,
  })
  actionVariant: ActionVariant;

  /**
   * Admin availability switch. `true` = available across the platform.
   * When an admin flips this to `false` the category (or subcategory)
   * disappears from every buyer/seller picker + marketplace browse, new
   * inquiries against it are rejected, and it stops matching to sellers'
   * leads. Existing inquiries/quotes/orders and saved subscriptions are
   * left intact.
   *
   * NOTE: the boot seeder (`CategoriesSeederService`) intentionally never
   * writes this column, so an admin toggle survives every restart. New
   * rows added to the catalog default to available.
   */
  @Column({ type: 'boolean', default: true })
  @Index('idx_categories_active')
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
