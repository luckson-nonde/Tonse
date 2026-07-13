import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Category, Archetype } from '../../categories/entities/category.entity';

/**
 * Tie-breaker order, used ONLY by `pickPrimary` for the rare caller
 * that genuinely needs a single archetype (e.g. calendar tone, page
 * title). The dashboard composer reads the full set instead.
 */
const PRIORITY: Archetype[] = [
  'EVENTS',
  'ENTERTAINMENT',
  'REPAIR',
  'WHOLESALE',
  'LENDING',
  'BOOKING',
  'RENTAL',
  'SERVICE',
  'RETAIL',
  'LABOUR',
];

@Injectable()
export class ArchetypeResolverService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  /**
   * Resolve a categoryIds array to the SET of distinct non-null
   * archetypes those categories belong to. Returns the full set —
   * callers that genuinely need a single archetype can run it through
   * `pickPrimary`, but the dashboard composer reads the full set so a
   * mixed-variant seller (e.g. mobile-phones-buy + mobile-phones-
   * repair) gets both RETAIL and REPAIR surfaces.
   */
  async resolve(categoryIds: string[]): Promise<Archetype[]> {
    if (!categoryIds || categoryIds.length === 0) return [];
    const rows = await this.categoryRepository.find({
      where: { id: In(categoryIds) },
      select: ['id', 'archetype'],
    });
    const set = new Set<Archetype>();
    for (const row of rows) {
      if (row.archetype) set.add(row.archetype);
    }
    return Array.from(set);
  }

  /**
   * Collapse an archetype set to a single dominant value via the
   * tie-breaker priority. Use sparingly — UI surfaces that take a set
   * (sidebar composition, leads/orders surfaces) should consume
   * `resolve` directly. This helper is only for cases where exactly
   * one archetype is needed (calendar visual tone, fallback labels).
   */
  pickPrimary(archetypes: Archetype[]): Archetype | null {
    if (!archetypes || archetypes.length === 0) return null;
    const present = new Set(archetypes);
    for (const candidate of PRIORITY) {
      if (present.has(candidate)) return candidate;
    }
    return null;
  }
}
