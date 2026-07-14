import { Entity, PrimaryColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { SellerProfile } from './seller-profile.entity';
import { Archetype } from '../../categories/entities/category.entity';

/**
 * Junction row pinning each archetype a seller profile serves. A seller
 * who picks both `mobile-phones-buy` (RETAIL) and `mobile-phones-repair`
 * (REPAIR) ends up with two rows here — one per archetype.
 *
 * Replaces the previous `seller_profiles.archetype` single-value column.
 * The dominant-archetype-only model collapsed mixed-variant sellers to
 * a single dashboard surface; this table lets the dashboard composer
 * read the full set.
 *
 * Composite PK on (sellerProfileId, archetype) so each pair is naturally
 * unique. Recomputed in the same transaction as
 * `seller_profile_categories` writes by ArchetypeResolverService.
 */
@Entity('seller_profile_archetypes')
@Index('idx_seller_profile_archetypes_archetype', ['archetype'])
export class SellerProfileArchetype {
  @PrimaryColumn({ type: 'uuid' })
  sellerProfileId: string;

  @PrimaryColumn({
    type: 'enum',
    enum: ['RETAIL', 'RENTAL', 'BOOKING', 'LABOUR', 'REPAIR', 'SERVICE', 'EVENTS', 'ENTERTAINMENT', 'WHOLESALE', 'LENDING'],
  })
  archetype: Archetype;

  @ManyToOne(() => SellerProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sellerProfileId' })
  sellerProfile: SellerProfile;
}
