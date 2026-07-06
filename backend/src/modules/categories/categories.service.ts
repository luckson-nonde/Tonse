import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Category } from './entities/category.entity';

export interface CategoryStatus {
  id: string;
  parentId: string | null;
  isActive: boolean;
}

export interface AdminCategoryNode {
  id: string;
  name: string;
  parentId: string | null;
  isActive: boolean;
  archetype: string;
  nature: string;
  /** Providers (sellers + service providers) subscribed to this exact id. */
  providerCount: number;
  /** Inquiries tagged with this exact id. */
  inquiryCount: number;
  children: AdminCategoryNode[];
}

/**
 * Owns reads/writes of the category catalog's availability state. The
 * taxonomy rows themselves are seeded by CategoriesSeederService; this
 * service layers the admin on/off switch (`isActive`) on top.
 *
 * Effective-availability rule (the catalog is a strict 2-level tree):
 * a category is available iff it is active AND — for a subcategory — its
 * parent is also active. So disabling a parent hides its whole branch
 * without mutating any child row.
 */
@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly dataSource: DataSource,
  ) {}

  /** Minimal on/off snapshot for the public status endpoint. */
  async getStatus(): Promise<CategoryStatus[]> {
    const rows = await this.categoryRepository.find({
      select: ['id', 'parentId', 'isActive'],
      order: { parentId: 'ASC', name: 'ASC' },
    });
    return rows.map((r) => ({ id: r.id, parentId: r.parentId, isActive: r.isActive }));
  }

  /**
   * The set of ids that are effectively unavailable — either the row itself
   * is inactive, or (for a subcategory) its parent is inactive. Used by the
   * lead-matching filter and the new-inquiry guard.
   */
  async getEffectiveDisabledIds(): Promise<Set<string>> {
    const rows = await this.categoryRepository.find({
      select: ['id', 'parentId', 'isActive'],
    });
    const activeById = new Map(rows.map((r) => [r.id, r.isActive]));
    const disabled = new Set<string>();
    for (const r of rows) {
      const parentActive = r.parentId == null ? true : activeById.get(r.parentId) !== false;
      if (r.isActive === false || !parentActive) disabled.add(r.id);
    }
    return disabled;
  }

  /** True when the given category id is effectively available. */
  async isEffectivelyActive(id: string): Promise<boolean> {
    const disabled = await this.getEffectiveDisabledIds();
    return !disabled.has(id);
  }

  /** Overview tile: how many categories exist and how many are switched on. */
  async countsForOverview(): Promise<{ total: number; active: number }> {
    const total = await this.categoryRepository.count();
    const active = await this.categoryRepository.count({ where: { isActive: true } });
    return { total, active };
  }

  /**
   * Full catalog for the admin Category Control screen — parents with their
   * children nested, each annotated with usage counts so the admin can see
   * the blast radius before disabling something.
   */
  async listForAdmin(): Promise<AdminCategoryNode[]> {
    const rows = await this.categoryRepository.find({
      order: { name: 'ASC' },
    });

    const [providerCounts, inquiryCounts] = await Promise.all([
      this.countByCategory([
        'seller_profile_categories',
        'service_provider_profile_categories',
      ]),
      this.countByCategory(['inquiry_categories']),
    ]);

    const toNode = (r: Category): AdminCategoryNode => ({
      id: r.id,
      name: r.name,
      parentId: r.parentId,
      isActive: r.isActive,
      archetype: r.archetype,
      nature: r.nature,
      providerCount: providerCounts.get(r.id) ?? 0,
      inquiryCount: inquiryCounts.get(r.id) ?? 0,
      children: [],
    });

    const parents = rows.filter((r) => r.parentId == null).map(toNode);
    const byId = new Map(parents.map((p) => [p.id, p]));
    for (const r of rows) {
      if (r.parentId == null) continue;
      const parent = byId.get(r.parentId);
      if (parent) parent.children.push(toNode(r));
    }
    return parents;
  }

  /** Flip a single category/subcategory on or off. */
  async setActive(id: string, isActive: boolean): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category '${id}' not found`);
    }
    await this.categoryRepository.update({ id }, { isActive });
    this.logger.log(`Category '${id}' set isActive=${isActive}`);
    return this.categoryRepository.findOne({ where: { id } });
  }

  /**
   * SUM of rows per categoryId across the given junction tables. Kept as a
   * raw query because these are pure junctions (no entity worth a repo).
   */
  private async countByCategory(tables: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    for (const table of tables) {
      const rows: Array<{ categoryId: string; count: string }> = await this.dataSource.query(
        `SELECT "categoryId", COUNT(*)::int AS count FROM "${table}" GROUP BY "categoryId"`,
      );
      for (const row of rows) {
        counts.set(row.categoryId, (counts.get(row.categoryId) ?? 0) + Number(row.count));
      }
    }
    return counts;
  }
}
