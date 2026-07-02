import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { SellerProfileCategory } from '../entities/seller-profile-category.entity';
import { ServiceProviderProfileCategory } from '../entities/service-provider-profile-category.entity';
import { SellerProfileArchetype } from '../entities/seller-profile-archetype.entity';
import { ServiceProviderProfileArchetype } from '../entities/service-provider-profile-archetype.entity';
import { Archetype } from '../../categories/entities/category.entity';
import { ArchetypeResolverService } from './archetype-resolver.service';

/**
 * Profile Matching Service
 *
 * Owns the category/archetype junction tables that drive lead matching:
 *   seller_profile_categories / service_provider_profile_categories
 *   seller_profile_archetypes / service_provider_profile_archetypes
 *
 * Extracted from UsersService so profile-lifecycle logic and
 * matching-junction knowledge (which repo, which FK column, how the
 * archetype set is recomputed) are separate concerns.
 *
 * Write paths:
 *   - `setProfileCategories` — replace a profile's category set in its
 *     own transaction (used by UsersService.update()).
 *   - `writeCategoryJunctionRows` / `writeArchetypeJunctionRowsFromCategories`
 *     — manager-aware helpers that run inside a CALLER's transaction
 *     (used by UsersService.createProfileForRole so profile row +
 *     junction rows + activeProfileId stay one atomic unit).
 */
@Injectable()
export class ProfileMatchingService {
  private readonly logger = new Logger(ProfileMatchingService.name);

  constructor(
    @InjectRepository(SellerProfileCategory)
    private readonly sellerProfileCategoryRepository: Repository<SellerProfileCategory>,

    @InjectRepository(ServiceProviderProfileCategory)
    private readonly serviceProviderProfileCategoryRepository: Repository<ServiceProviderProfileCategory>,

    @InjectRepository(SellerProfileArchetype)
    private readonly sellerProfileArchetypeRepository: Repository<SellerProfileArchetype>,

    @InjectRepository(ServiceProviderProfileArchetype)
    private readonly serviceProviderProfileArchetypeRepository: Repository<ServiceProviderProfileArchetype>,

    private readonly archetypeResolver: ArchetypeResolverService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Resolve the profile-categories junction repo (and the FK column
   * name on it) for a given profile type. Centralised here so the
   * Phase: matching writes go through one place that knows about both
   * SELLER and SERVICE_PROVIDER variants.
   */
  private categoryJunctionFor(type: string): {
    repo: Repository<SellerProfileCategory | ServiceProviderProfileCategory>;
    profileColumn: 'sellerProfileId' | 'serviceProviderProfileId';
  } | null {
    if (type === 'SELLER') {
      return {
        repo: this.sellerProfileCategoryRepository as Repository<
          SellerProfileCategory | ServiceProviderProfileCategory
        >,
        profileColumn: 'sellerProfileId',
      };
    }
    if (type === 'SERVICE_PROVIDER') {
      return {
        repo: this.serviceProviderProfileCategoryRepository as Repository<
          SellerProfileCategory | ServiceProviderProfileCategory
        >,
        profileColumn: 'serviceProviderProfileId',
      };
    }
    return null;
  }

  /**
   * Sibling of categoryJunctionFor — picks the archetype-junction repo
   * for a given profile type. Both junctions move together in the same
   * transaction whenever categoryIds change, so they share one helper
   * shape.
   */
  private archetypeJunctionFor(type: string): {
    repo: Repository<SellerProfileArchetype | ServiceProviderProfileArchetype>;
    profileColumn: 'sellerProfileId' | 'serviceProviderProfileId';
  } | null {
    if (type === 'SELLER') {
      return {
        repo: this.sellerProfileArchetypeRepository as Repository<
          SellerProfileArchetype | ServiceProviderProfileArchetype
        >,
        profileColumn: 'sellerProfileId',
      };
    }
    if (type === 'SERVICE_PROVIDER') {
      return {
        repo: this.serviceProviderProfileArchetypeRepository as Repository<
          SellerProfileArchetype | ServiceProviderProfileArchetype
        >,
        profileColumn: 'serviceProviderProfileId',
      };
    }
    return null;
  }

  /**
   * Write category junction rows for a freshly-created profile INSIDE
   * the caller's transaction. Lifted verbatim from
   * UsersService.createProfileForRole's inline block so the profile
   * row, junction rows, archetype rows, and activeProfileId pointer
   * stay one atomic unit owned by the caller.
   */
  async writeCategoryJunctionRows(
    manager: EntityManager,
    profileType: string,
    profileId: string,
    categoryIds: string[],
  ): Promise<void> {
    const junction = this.categoryJunctionFor(profileType);
    if (!junction) return;
    const txJunction = manager.getRepository(junction.repo.target as any) as Repository<any>;
    const unique = Array.from(new Set(categoryIds));
    await txJunction.save(
      unique.map((cid) => ({
        [junction.profileColumn]: profileId,
        categoryId: cid,
      })),
    );
  }

  /**
   * Resolve the archetype set for `categoryIds` and write the
   * archetype junction rows INSIDE the caller's transaction. Returns
   * the resolved archetypes so the caller can expose them on the
   * in-memory profile object without a re-query (the
   * `(saved as any).archetypes = archetypes` side effect in
   * createProfileForRole).
   *
   * Multi-archetype: resolve returns the SET of archetypes, one row
   * per archetype goes into the archetype-junction table. Same
   * transaction as the categories junction so a partial failure can't
   * leave one half written.
   */
  async writeArchetypeJunctionRowsFromCategories(
    manager: EntityManager,
    profileType: string,
    profileId: string,
    categoryIds: string[],
  ): Promise<Archetype[]> {
    const archJunction = this.archetypeJunctionFor(profileType);
    if (!archJunction) return [];
    const txArchetypes = manager.getRepository(archJunction.repo.target as any) as Repository<any>;
    const unique = Array.from(new Set(categoryIds));
    const archetypes = await this.archetypeResolver.resolve(unique);
    if (archetypes.length > 0) {
      await txArchetypes.save(
        archetypes.map((a) => ({
          [archJunction.profileColumn]: profileId,
          archetype: a,
        })),
      );
    }
    return archetypes;
  }

  /**
   * Replace a profile's category set with a new one. Old junction rows
   * are deleted, new ones inserted, archetype recomputed — all inside
   * one transaction so a partial failure can't leave the profile with
   * a stale archetype or orphaned junction rows.
   */
  async setProfileCategories(
    profileType: string,
    profileId: string,
    categoryIds: string[],
  ): Promise<void> {
    const junction = this.categoryJunctionFor(profileType);
    const archJunction = this.archetypeJunctionFor(profileType);
    if (!junction) return;
    const unique = Array.from(new Set(categoryIds));
    await this.dataSource.transaction(async (manager) => {
      const txJunction = manager.getRepository(junction.repo.target as any) as Repository<any>;
      await txJunction.delete({ [junction.profileColumn]: profileId });
      if (unique.length > 0) {
        await txJunction.save(
          unique.map((cid) => ({
            [junction.profileColumn]: profileId,
            categoryId: cid,
          })),
        );
      }
      // Recompute the archetype set and rewrite the junction. Wipe
      // first so a category change that drops an archetype actually
      // removes the row.
      if (archJunction) {
        const txArchetypes = manager.getRepository(archJunction.repo.target as any) as Repository<any>;
        await txArchetypes.delete({ [archJunction.profileColumn]: profileId });
        const archetypes = await this.archetypeResolver.resolve(unique);
        if (archetypes.length > 0) {
          await txArchetypes.save(
            archetypes.map((a) => ({
              [archJunction.profileColumn]: profileId,
              archetype: a,
            })),
          );
        }
      }
    });
  }

  /** Read the category IDs the active profile is subscribed to. */
  async loadActiveProfileCategoryIds(user: User): Promise<string[]> {
    if (!user?.activeProfileId || !user?.activeProfileType) return [];
    const junction = this.categoryJunctionFor(user.activeProfileType);
    if (!junction) return [];
    const rows = await junction.repo.find({
      where: { [junction.profileColumn]: user.activeProfileId } as any,
      select: ['categoryId'] as any,
    });
    return rows.map((r: any) => r.categoryId);
  }

  /**
   * Read the archetype set the active profile serves by re-resolving
   * from the category junction. This always reflects the current
   * archetype values on the categories table (updated by the seeder on
   * every boot), so a seeder change (e.g. re-classifying event-venues
   * from BOOKING → EVENTS) takes effect for all existing users on the
   * next login without a separate migration.
   */
  async loadActiveProfileArchetypes(user: User): Promise<Archetype[]> {
    const categoryIds = await this.loadActiveProfileCategoryIds(user);
    if (categoryIds.length === 0) return [];
    return this.archetypeResolver.resolve(categoryIds);
  }
}
