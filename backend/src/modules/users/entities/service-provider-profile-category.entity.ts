import { Entity, PrimaryColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ServiceProviderProfile } from './service-provider-profile.entity';
import { Category } from '../../categories/entities/category.entity';

/**
 * Junction row between a service-provider profile and a category they
 * serve. Symmetric to seller_profile_categories. Composite PK on
 * (serviceProviderProfileId, categoryId).
 */
@Entity('service_provider_profile_categories')
@Index('idx_sp_profile_categories_category', ['categoryId'])
export class ServiceProviderProfileCategory {
  @PrimaryColumn({ type: 'uuid' })
  serviceProviderProfileId: string;

  @PrimaryColumn({ type: 'varchar', length: 64 })
  categoryId: string;

  @ManyToOne(() => ServiceProviderProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'serviceProviderProfileId' })
  serviceProviderProfile: ServiceProviderProfile;

  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category: Category;
}
