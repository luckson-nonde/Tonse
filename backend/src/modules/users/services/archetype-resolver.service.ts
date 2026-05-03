import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Category, Archetype } from '../../categories/entities/category.entity';

/**
 * Pick the dominant archetype across a set of categories. Higher
 * priority wins. Tie-breaker: stable enum order.
 *
 * Priority: EVENTS > ENTERTAINMENT > REPAIR > RENTAL > BOOKING >
 * RETAIL > LABOUR > SERVICE.
 *
 * The reasoning: "an Electronics seller who also picked Event Venues"
 * is fundamentally an events business — the events surface (booking
 * calendar, venue inventory) is non-trivial, the retail surface
 * collapses to a single nav item. Better to surface the heavier
 * surface and trim the lighter one than the reverse.
 */
const PRIORITY: Archetype[] = [
  'EVENTS',
  'ENTERTAINMENT',
  'REPAIR',
  'RENTAL',
  'BOOKING',
  'RETAIL',
  'LABOUR',
  'SERVICE',
];

@Injectable()
export class ArchetypeResolverService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  /**
   * Look up the categories by id and return the dominant archetype.
   * Returns null when there are no categories or none match (caller
   * decides whether that maps to a default UI variant).
   */
  async resolve(categoryIds: string[]): Promise<Archetype | null> {
    if (!categoryIds || categoryIds.length === 0) return null;
    const rows = await this.categoryRepository.find({
      where: { id: In(categoryIds) },
      select: ['id', 'archetype'],
    });
    if (rows.length === 0) return null;
    const present = new Set(rows.map((r) => r.archetype));
    for (const candidate of PRIORITY) {
      if (present.has(candidate)) return candidate;
    }
    return null;
  }
}
