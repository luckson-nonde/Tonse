import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PromoTile } from './entities/promo-tile.entity';
import { CreatePromoTileDto } from './dto/create-promo-tile.dto';
import { ReorderPromoTilesDto, UpdatePromoTileDto } from './dto/update-promo-tile.dto';
import { STOREFRONT_CATEGORY_LIMIT, STOREFRONT_GRID_SIZE } from './storefront.constants';

/** One master category as the Top Categories row renders it. */
export interface StorefrontCategory {
  id: string;
  name: string;
  productCount: number;
  shopCount: number;
}

/**
 * A single slot in the storefront grid. Deliberately a NORMALIZED union rather
 * than two response arrays: the backend owns which source fills each slot, so
 * the page renders one grid with one card component and never re-implements
 * the switch. Fields are hand-picked — never spread an entity into a public
 * payload.
 */
export interface StorefrontCard {
  kind: 'PRODUCT' | 'PROMO';
  id: string;
  title: string;
  subtitle: string | null;
  /** Products carry a base64 data URL here; promo tiles carry an uploads path
   *  the client must resolve against the API origin. */
  imageUrl: string | null;
  price: number | null;
  badge: string | null;
  ctaLabel: string | null;
  backgroundColor: string | null;
  href: string;
}

export type StorefrontMode = 'PROMO' | 'MIXED' | 'BESTSELLERS';

export interface StorefrontHome {
  categories: StorefrontCategory[];
  cards: StorefrontCard[];
  mode: StorefrontMode;
}

/** What the admin tile editor shows when picking a product to point a tile at. */
export interface PickerProduct {
  id: string;
  name: string;
  price: number | null;
  imageUrl: string | null;
  sellerName: string;
  shopProfileId: string | null;
  salesCount: number;
}

/**
 * Providers rolled up to the MASTER category ids they serve.
 *
 * Two things here are load-bearing and easy to get wrong:
 *  - COALESCE(c."parentId", c.id): a seller can subscribe DIRECTLY to a master
 *    category (CategorySelection pushes a self-parented row when a category has
 *    nothing to drill into), so joining on parentId alone silently drops them.
 *  - parentProviderId IS NULL: employee accounts (technician, collection
 *    officer, …) carry their owner's role and a profile row but are staff, not
 *    shops — the same exclusion shops.service.ts makes.
 */
const PROVIDER_MASTER_CTE = `
  WITH eligible_profiles AS (
    SELECT sp.id AS profile_id, sp."userId" AS seller_id, 'SELLER' AS kind
      FROM seller_profiles sp
      JOIN users u ON u.id = sp."userId"
     WHERE u."parentProviderId" IS NULL
    UNION ALL
    SELECT spp.id AS profile_id, spp."userId" AS seller_id, 'SERVICE_PROVIDER' AS kind
      FROM service_provider_profiles spp
      JOIN users u ON u.id = spp."userId"
     WHERE u."parentProviderId" IS NULL
  ),
  provider_master AS (
    SELECT DISTINCT ep.seller_id, COALESCE(c."parentId", c.id) AS master_id
      FROM eligible_profiles ep
      JOIN seller_profile_categories spc ON spc."sellerProfileId" = ep.profile_id
      JOIN categories c ON c.id = spc."categoryId"
     WHERE ep.kind = 'SELLER'
    UNION
    SELECT DISTINCT ep.seller_id, COALESCE(c."parentId", c.id) AS master_id
      FROM eligible_profiles ep
      JOIN service_provider_profile_categories sppc
        ON sppc."serviceProviderProfileId" = ep.profile_id
      JOIN categories c ON c.id = sppc."categoryId"
     WHERE ep.kind = 'SERVICE_PROVIDER'
  )
`;

/**
 * Resolves a seller's public shop-profile id (the `:id` in `/discover/:id`).
 * UNION ALL + LIMIT 1 rather than two LEFT JOINs, so a user holding more than
 * one profile row can't fan a product into duplicate rows.
 */
const SHOP_PROFILE_LATERAL = `
  LEFT JOIN LATERAL (
    SELECT id FROM seller_profiles            WHERE "userId" = p."sellerId"
    UNION ALL
    SELECT id FROM service_provider_profiles  WHERE "userId" = p."sellerId"
    LIMIT 1
  ) prof ON TRUE
`;

@Injectable()
export class StorefrontService {
  constructor(
    @InjectRepository(PromoTile)
    private readonly tiles: Repository<PromoTile>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // ─────────────────────────── public landing page ───────────────────────────

  /**
   * Everything the public storefront needs, in one call.
   *
   * The switch the owner asked for lives here and nowhere else: best-selling
   * products claim slots first, admin promo tiles fill whatever is left. No
   * stored "are we selling yet?" flag — that would be a second source of truth
   * able to disagree with salesCount. The per-slot top-up already renders every
   * intermediate state correctly, so `mode` is purely descriptive output.
   */
  async getHome(): Promise<StorefrontHome> {
    const bestsellers = await this.getBestsellerCards(STOREFRONT_GRID_SIZE);
    const remaining = STOREFRONT_GRID_SIZE - bestsellers.length;
    const tiles = remaining > 0 ? await this.getTileCards(remaining) : [];

    const mode: StorefrontMode =
      bestsellers.length === 0 ? 'PROMO' : remaining > 0 ? 'MIXED' : 'BESTSELLERS';

    return {
      categories: await this.getCategoryCounts(),
      cards: [...bestsellers, ...tiles],
      mode,
    };
  }

  /**
   * Master categories that actually have a shop behind them, richest first.
   * Empty categories are omitted deliberately — a tile that leads to an empty
   * directory is a dead end, and the page's existing rails already only show
   * groups present in the data.
   */
  private async getCategoryCounts(): Promise<StorefrontCategory[]> {
    const rows: Array<{
      id: string;
      name: string;
      productCount: string | number;
      shopCount: string | number;
    }> = await this.dataSource.query(
      `
      ${PROVIDER_MASTER_CTE}
      SELECT
        m.id                          AS id,
        m.name                        AS name,
        COALESCE(pc.product_count, 0) AS "productCount",
        COALESCE(sc.shop_count, 0)    AS "shopCount"
      FROM categories m
      LEFT JOIN (
        SELECT master_id, COUNT(DISTINCT seller_id)::int AS shop_count
          FROM provider_master GROUP BY master_id
      ) sc ON sc.master_id = m.id
      LEFT JOIN (
        -- A product inherits its SELLER's categories (products.category is a
        -- free-text field sellers type, not a taxonomy id), so a multi-category
        -- seller's listings count under each master they serve. Same trade
        -- shops.service.ts already makes for its category filter.
        SELECT pm.master_id, COUNT(DISTINCT p.id)::int AS product_count
          FROM provider_master pm
          JOIN products p ON p."sellerId" = pm.seller_id AND p."isActive" = true
         GROUP BY pm.master_id
      ) pc ON pc.master_id = m.id
      WHERE m."parentId" IS NULL
        AND m."isActive" = true
        AND COALESCE(sc.shop_count, 0) > 0
      ORDER BY COALESCE(pc.product_count, 0) DESC, COALESCE(sc.shop_count, 0) DESC, m.name ASC
      LIMIT $1
      `,
      [STOREFRONT_CATEGORY_LIMIT],
    );

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      productCount: Number(r.productCount) || 0,
      shopCount: Number(r.shopCount) || 0,
    }));
  }

  /**
   * Top sellers by units moved. `salesCount` itself is never returned — the
   * ranking is public, the raw numbers aren't (and "1 sold" would undersell a
   * young catalogue anyway).
   */
  private async getBestsellerCards(limit: number): Promise<StorefrontCard[]> {
    const rows: Array<{
      id: string;
      name: string;
      price: string | null;
      firstImage: string | null;
      shopProfileId: string | null;
    }> = await this.dataSource.query(
      `
      SELECT
        p.id,
        p.name,
        p.price,
        NULLIF(p.images->>0, '') AS "firstImage",
        prof.id                  AS "shopProfileId"
      FROM products p
      ${SHOP_PROFILE_LATERAL}
      WHERE p."isActive" = true AND p."salesCount" > 0
      -- id ASC keeps ties stable across requests, so the grid doesn't reshuffle
      ORDER BY p."salesCount" DESC, p.id ASC
      LIMIT $1
      `,
      [limit],
    );

    return rows.map((r) => ({
      kind: 'PRODUCT' as const,
      id: r.id,
      title: r.name,
      subtitle: null,
      imageUrl: r.firstImage,
      // pg hands decimals back as strings; coerce here so the client never has to.
      price: r.price == null ? null : Number(r.price),
      badge: 'Best seller',
      ctaLabel: null,
      backgroundColor: null,
      href: r.shopProfileId ? `/discover/${r.shopProfileId}?product=${r.id}` : '/discover',
    }));
  }

  /**
   * Admin-authored tiles, ordered, resolving each one's click destination.
   * A tile whose product target was hard-deleted by its seller arrives here
   * with targetProductId already NULL (FK ON DELETE SET NULL) and falls through
   * to its shop/category target.
   */
  private async getTileCards(limit: number): Promise<StorefrontCard[]> {
    const rows: Array<{
      id: string;
      title: string;
      subtitle: string | null;
      imageUrl: string;
      ctaLabel: string | null;
      backgroundColor: string | null;
      targetProductId: string | null;
      targetShopProfileId: string | null;
      targetCategoryId: string | null;
      productShopProfileId: string | null;
    }> = await this.dataSource.query(
      `
      SELECT
        t.id, t.title, t.subtitle, t."imageUrl", t."ctaLabel", t."backgroundColor",
        t."targetProductId", t."targetShopProfileId", t."targetCategoryId",
        prof.id AS "productShopProfileId"
      FROM promo_tiles t
      LEFT JOIN products p ON p.id = t."targetProductId" AND p."isActive" = true
      ${SHOP_PROFILE_LATERAL}
      WHERE t."isActive" = true
      ORDER BY t."sortOrder" ASC, t."createdAt" ASC
      LIMIT $1
      `,
      [limit],
    );

    return rows.map((r) => ({
      kind: 'PROMO' as const,
      id: r.id,
      title: r.title,
      subtitle: r.subtitle,
      imageUrl: r.imageUrl,
      price: null,
      badge: null,
      ctaLabel: r.ctaLabel,
      backgroundColor: r.backgroundColor,
      href: this.tileHref(r),
    }));
  }

  /** Target precedence: product → shop → category → the directory itself. */
  private tileHref(row: {
    targetProductId: string | null;
    targetShopProfileId: string | null;
    targetCategoryId: string | null;
    productShopProfileId: string | null;
  }): string {
    if (row.targetProductId && row.productShopProfileId) {
      return `/discover/${row.productShopProfileId}?product=${row.targetProductId}`;
    }
    if (row.targetShopProfileId) return `/discover/${row.targetShopProfileId}`;
    if (row.targetCategoryId) return `/discover?category=${encodeURIComponent(row.targetCategoryId)}`;
    return '/discover';
  }

  // ──────────────────────────────── admin ────────────────────────────────

  /** Every tile, active or not, in the order the editor lists them. */
  async listTiles(): Promise<PromoTile[]> {
    return this.tiles.find({ order: { sortOrder: 'ASC', createdAt: 'ASC' } });
  }

  async createTile(dto: CreatePromoTileDto): Promise<PromoTile> {
    // New tiles land at the end unless positioned explicitly.
    const sortOrder = dto.sortOrder ?? (await this.nextSortOrder());
    return this.tiles.save(this.tiles.create({ ...dto, sortOrder }));
  }

  async updateTile(id: string, dto: UpdatePromoTileDto): Promise<PromoTile> {
    const tile = await this.tiles.findOne({ where: { id } });
    if (!tile) throw new NotFoundException('Promo tile not found');
    Object.assign(tile, dto);
    return this.tiles.save(tile);
  }

  async deleteTile(id: string): Promise<{ deleted: true }> {
    const result = await this.tiles.delete(id);
    if (!result.affected) throw new NotFoundException('Promo tile not found');
    return { deleted: true };
  }

  async reorderTiles(dto: ReorderPromoTilesDto): Promise<PromoTile[]> {
    await this.dataSource.transaction(async (m) => {
      for (const { id, sortOrder } of dto.tiles) {
        await m.getRepository(PromoTile).update(id, { sortOrder });
      }
    });
    return this.listTiles();
  }

  private async nextSortOrder(): Promise<number> {
    const [row]: Array<{ max: number | null }> = await this.dataSource.query(
      'SELECT MAX("sortOrder") AS max FROM promo_tiles',
    );
    return (row?.max ?? -1) + 1;
  }

  /**
   * Product picker for the tile editor.
   *
   * `category` filters on the REAL taxonomy (via the seller's subscriptions),
   * not on `products.category` — that column is a free-text box the seller
   * types into, so filtering on it would mean something different here than
   * everywhere else in this feature.
   */
  async searchProductsForPicker(params: {
    search?: string;
    category?: string;
    limit?: number;
  }): Promise<PickerProduct[]> {
    const limit = Math.min(Math.max(Number(params.limit) || 40, 1), 100);
    const sqlParams: any[] = [];
    let searchClause = '';
    let categoryClause = '';

    if (params.search?.trim()) {
      sqlParams.push(`%${params.search.trim()}%`);
      searchClause = `AND p.name ILIKE $${sqlParams.length}`;
    }
    if (params.category?.trim()) {
      sqlParams.push(params.category.trim());
      categoryClause = `AND EXISTS (
        SELECT 1 FROM provider_master pm
         WHERE pm.seller_id = p."sellerId" AND pm.master_id = $${sqlParams.length}
      )`;
    }
    sqlParams.push(limit);

    const rows: Array<{
      id: string;
      name: string;
      price: string | null;
      firstImage: string | null;
      sellerName: string | null;
      shopProfileId: string | null;
      salesCount: number | string;
    }> = await this.dataSource.query(
      `
      ${PROVIDER_MASTER_CTE}
      SELECT
        p.id,
        p.name,
        p.price,
        NULLIF(p.images->>0, '') AS "firstImage",
        u.name                   AS "sellerName",
        prof.id                  AS "shopProfileId",
        p."salesCount"
      FROM products p
      JOIN users u ON u.id = p."sellerId"
      ${SHOP_PROFILE_LATERAL}
      WHERE p."isActive" = true
      ${searchClause}
      ${categoryClause}
      ORDER BY p."salesCount" DESC, p."createdAt" DESC
      LIMIT $${sqlParams.length}
      `,
      sqlParams,
    );

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      price: r.price == null ? null : Number(r.price),
      imageUrl: r.firstImage,
      sellerName: r.sellerName || 'Unnamed shop',
      shopProfileId: r.shopProfileId,
      salesCount: Number(r.salesCount) || 0,
    }));
  }
}
