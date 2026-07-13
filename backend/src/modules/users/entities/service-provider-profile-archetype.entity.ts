import { Entity, PrimaryColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ServiceProviderProfile } from './service-provider-profile.entity';
import { Archetype } from '../../categories/entities/category.entity';

/**
 * Symmetric to SellerProfileArchetype — one row per archetype the
 * service-provider profile serves. Composite PK on
 * (serviceProviderProfileId, archetype). Recomputed in the same
 * transaction as the categories junction by ArchetypeResolverService.
 */
@Entity('service_provider_profile_archetypes')
@Index('idx_sp_profile_archetypes_archetype', ['archetype'])
export class ServiceProviderProfileArchetype {
  @PrimaryColumn({ type: 'uuid' })
  serviceProviderProfileId: string;

  @PrimaryColumn({
    type: 'enum',
    enum: ['RETAIL', 'RENTAL', 'BOOKING', 'LABOUR', 'REPAIR', 'SERVICE', 'EVENTS', 'ENTERTAINMENT', 'WHOLESALE', 'LENDING'],
  })
  archetype: Archetype;

  @ManyToOne(() => ServiceProviderProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'serviceProviderProfileId' })
  serviceProviderProfile: ServiceProviderProfile;
}
