import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Shop } from './entities/shop.entity';
import { ShopFavorite } from './entities/shop-favorite.entity';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';

@Injectable()
export class ShopsService {
  constructor(
    @InjectRepository(Shop)
    private shopsRepository: Repository<Shop>,
    @InjectRepository(ShopFavorite)
    private favoritesRepository: Repository<ShopFavorite>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  // ── Favorites (Browse Shops → Favorites) ─────────────────────────────
  // A buyer marks a shop card as a favorite. `shopId` is ShopResult.id (the
  // provider profile id shown in the directory). Idempotent: the unique
  // (userId, shopId) index makes a repeat POST a no-op.

  async favoriteShop(userId: string, shopId: string): Promise<{ favorited: true }> {
    await this.favoritesRepository
      .createQueryBuilder()
      .insert()
      .values({ userId, shopId })
      .orIgnore() // ON CONFLICT DO NOTHING — safe to favorite twice
      .execute();
    return { favorited: true };
  }

  async unfavoriteShop(userId: string, shopId: string): Promise<void> {
    await this.favoritesRepository.delete({ userId, shopId });
  }

  async listFavoriteShopIds(userId: string): Promise<string[]> {
    const rows = await this.favoritesRepository.find({
      where: { userId },
      select: ['shopId'],
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) => r.shopId);
  }

  async create(createShopDto: CreateShopDto): Promise<Shop> {
    const shop = this.shopsRepository.create(createShopDto);
    return this.shopsRepository.save(shop);
  }

  /**
   * Returns a discoverable list of all registered shops/providers.
   *
   * Priority: dedicated `shops` rows first (providers who explicitly set
   * up a shop profile), then falls through to synthesising cards from
   * `seller_profiles` and `service_provider_profiles` for every provider
   * who hasn't created a shop row yet.
   *
   * Supports: `search` (name + location ILIKE), `category` (category ID),
   * `page`, `limit`.
   */
  async findAll(filters: any = {}): Promise<{ data: any[]; total: number }> {
    const search: string | null = filters.search || null;
    const category: string | null = filters.category || null;
    const page = Math.max(parseInt(filters.page) || 1, 1);
    const limit = Math.min(parseInt(filters.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const params: any[] = [];

    // Build dynamic WHERE clauses — same param indices for both the
    // data query and the count query (count query omits the trailing
    // LIMIT / OFFSET params).
    let searchClause = '';
    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      searchClause = `AND (p.display_name ILIKE $${idx} OR p.location ILIKE $${idx})`;
    }

    let categoryClause = '';
    if (category) {
      params.push(category);
      const idx = params.length;
      categoryClause = `AND EXISTS (
        SELECT 1 FROM (
          SELECT "sellerProfileId" AS pid, "categoryId" AS cid
            FROM seller_profile_categories
          UNION ALL
          SELECT "serviceProviderProfileId" AS pid, "categoryId" AS cid
            FROM service_provider_profile_categories
        ) _cj WHERE _cj.pid = p.profile_id AND _cj.cid = $${idx}
      )`;
    }

    // Save param count before appending LIMIT/OFFSET so the count query
    // can reuse the same slice.
    const countParamCount = params.length;

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const providersCTE = `
      WITH providers AS (
        SELECT
          sp.id                                                      AS profile_id,
          u.id                                                       AS seller_id,
          COALESCE(NULLIF(sp."companyName",''), NULLIF(sp.name,''), NULLIF(sp.phone,''), 'Unnamed Provider') AS display_name,
          CASE
            WHEN sp.city    IS NOT NULL AND sp.province IS NOT NULL
              THEN sp.city || ', ' || sp.province
            WHEN sp.city    IS NOT NULL THEN sp.city
            WHEN sp.province IS NOT NULL THEN sp.province
            ELSE 'Zambia'
          END                                                        AS location,
          sp.city,
          sp.province,
          -- Browse cards are BUSINESS-branded only: sp.logo is the shop's
          -- brand mark (uploaded in account settings). profilePicture is
          -- the OWNER'S photo and belongs on the shop profile page
          -- (findProfile), never here. Card falls back to a monogram
          -- when no logo has been uploaded yet.
          sp.logo                                                    AS logo,
          sp."coverImage"                                            AS cover_image,
          sp."verificationStatus"::text                              AS verification_status,
          sp."createdAt",
          'SELLER'                                                   AS shop_type
        FROM users u
        JOIN seller_profiles sp ON sp."userId" = u.id
        WHERE u.role = 'SELLER'

        UNION ALL

        SELECT
          spp.id                                                       AS profile_id,
          u.id                                                         AS seller_id,
          COALESCE(NULLIF(spp."companyName",''), NULLIF(spp.name,''), NULLIF(spp.phone,''), 'Unnamed Provider') AS display_name,
          CASE
            WHEN spp.city    IS NOT NULL AND spp.province IS NOT NULL
              THEN spp.city || ', ' || spp.province
            WHEN spp.city    IS NOT NULL THEN spp.city
            WHEN spp.province IS NOT NULL THEN spp.province
            ELSE 'Zambia'
          END                                                          AS location,
          spp.city,
          spp.province,
          spp.logo                                                     AS logo,
          spp."coverImage"                                             AS cover_image,
          spp."verificationStatus"::text                               AS verification_status,
          spp."createdAt",
          'SERVICE_PROVIDER'                                           AS shop_type
        FROM users u
        JOIN service_provider_profiles spp ON spp."userId" = u.id
        WHERE u.role = 'SERVICE_PROVIDER'
      ),
      cat_junctions AS (
        SELECT "sellerProfileId"          AS profile_id, "categoryId" AS category_id
          FROM seller_profile_categories
        UNION ALL
        SELECT "serviceProviderProfileId" AS profile_id, "categoryId" AS category_id
          FROM service_provider_profile_categories
      ),
      review_agg AS (
        -- Pre-aggregated BEFORE joining: a naive LEFT JOIN shop_reviews in
        -- the grouped query below would fan out per category row and
        -- corrupt COUNT. ::float8 / ::int casts are load-bearing — pg
        -- returns numeric/bigint as strings and the frontend calls
        -- shop.rating.toFixed(1).
        SELECT
          sr."providerUserId"                       AS provider_user_id,
          ROUND(AVG(sr.rating)::numeric, 2)::float8 AS avg_rating,
          COUNT(*)::int                             AS review_count
        FROM shop_reviews sr
        GROUP BY sr."providerUserId"
      )
    `;

    const dataQuery = `
      ${providersCTE}
      SELECT
        p.profile_id                                                          AS id,
        p.seller_id                                                           AS "sellerId",
        p.display_name                                                        AS name,
        ''                                                                    AS description,
        p.logo,
        p.location,
        p.city,
        p.province,
        COALESCE(MAX(ra.avg_rating), 0)                                       AS rating,
        COALESCE(MAX(ra.review_count), 0)::int                                AS "reviewCount",
        0                                                                     AS "followerCount",
        TRUE                                                                  AS "isActive",
        p."createdAt",
        p.shop_type                                                           AS "shopType",
        p.verification_status                                                 AS "verificationStatus",
        COALESCE(p.cover_image, MAX(cov.first_image))                         AS "coverImage",
        COALESCE(
          array_agg(DISTINCT cj.category_id) FILTER (WHERE cj.category_id IS NOT NULL),
          '{}'
        )                                                                     AS "categoryIds",
        COALESCE(
          array_agg(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL),
          '{}'
        )                                                                     AS "categoryNames",
        COALESCE(
          array_agg(DISTINCT c.archetype::text) FILTER (WHERE c.archetype IS NOT NULL),
          '{}'
        )                                                                     AS archetypes
      FROM providers p
      LEFT JOIN cat_junctions   cj ON cj.profile_id = p.profile_id
      LEFT JOIN categories       c  ON c.id          = cj.category_id
      LEFT JOIN review_agg      ra ON ra.provider_user_id = p.seller_id
      LEFT JOIN LATERAL (
        SELECT split_part(pr.images, ',', 1) AS first_image
        FROM products pr
        WHERE pr."sellerId" = p.seller_id
          AND pr."isActive" = true
          AND pr.images IS NOT NULL AND pr.images <> ''
        ORDER BY pr."createdAt" DESC
        LIMIT 1
      ) cov ON true
      WHERE 1=1
      ${searchClause}
      ${categoryClause}
      GROUP BY p.profile_id, p.seller_id, p.display_name, p.location,
               p.city, p.province, p.logo, p.cover_image, p."createdAt",
               p.shop_type, p.verification_status
      ORDER BY p."createdAt" DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const countQuery = `
      ${providersCTE}
      SELECT COUNT(*) AS total
      FROM providers p
      WHERE 1=1
      ${searchClause}
      ${categoryClause}
    `;

    const countParams = params.slice(0, countParamCount);

    const [rows, countResult] = await Promise.all([
      this.dataSource.query(dataQuery, params),
      this.dataSource.query(countQuery, countParams),
    ]);

    return {
      data: rows,
      total: parseInt(countResult[0]?.total ?? '0', 10),
    };
  }

  async findOne(id: string): Promise<Shop> {
    return this.shopsRepository.findOne({ where: { id } });
  }

  /**
   * Full provider profile for the shop-profile page.
   * `profileId` is a seller_profiles.id or service_provider_profiles.id —
   * the same value returned as `id` by findAll().
   */
  async findProfile(profileId: string): Promise<any> {
    const profileQuery = `
      WITH profile_data AS (
        SELECT
          sp.id                                                        AS profile_id,
          u.id                                                         AS seller_id,
          COALESCE(NULLIF(sp."companyName",''), NULLIF(sp.name,''), 'Unnamed Provider') AS display_name,
          NULLIF(sp."companyName",'')                                  AS company_name,
          NULLIF(sp.name,'')                                           AS personal_name,
          sp.email,
          sp.phone,
          sp."profilePicture"                                          AS logo,
          sp.city,
          sp.province,
          sp.area,
          sp."socialLinks"                                             AS social_links,
          sp."verificationStatus"::text                                AS verification_status,
          sp."verifiedAt"                                              AS verified_at,
          (sp.tpin IS NOT NULL AND sp.tpin != '')                      AS has_tpin,
          sp."subRole"                                                 AS sub_role,
          sp."createdAt"                                               AS created_at,
          'SELLER'                                                     AS shop_type
        FROM seller_profiles sp
        JOIN users u ON u.id = sp."userId"
        WHERE sp.id = $1

        UNION ALL

        SELECT
          spp.id                                                       AS profile_id,
          u.id                                                         AS seller_id,
          COALESCE(NULLIF(spp."companyName",''), NULLIF(spp.name,''), 'Unnamed Provider') AS display_name,
          NULLIF(spp."companyName",'')                                 AS company_name,
          NULLIF(spp.name,'')                                          AS personal_name,
          spp.email,
          spp.phone,
          spp."profilePicture"                                         AS logo,
          spp.city,
          spp.province,
          spp.area,
          spp."socialLinks"                                            AS social_links,
          spp."verificationStatus"::text                               AS verification_status,
          spp."verifiedAt"                                             AS verified_at,
          (spp.tpin IS NOT NULL AND spp.tpin != '')                    AS has_tpin,
          spp."subRole"                                                AS sub_role,
          spp."createdAt"                                              AS created_at,
          'SERVICE_PROVIDER'                                           AS shop_type
        FROM service_provider_profiles spp
        JOIN users u ON u.id = spp."userId"
        WHERE spp.id = $1
      ),
      cat_junctions AS (
        SELECT "sellerProfileId"          AS profile_id, "categoryId" AS category_id
          FROM seller_profile_categories
        UNION ALL
        SELECT "serviceProviderProfileId" AS profile_id, "categoryId" AS category_id
          FROM service_provider_profile_categories
      ),
      review_agg AS (
        -- Same shape as findAll's: pre-aggregated so the category fan-out
        -- can't corrupt COUNT; casts keep pg from returning strings.
        SELECT
          sr."providerUserId"                       AS provider_user_id,
          ROUND(AVG(sr.rating)::numeric, 2)::float8 AS avg_rating,
          COUNT(*)::int                             AS review_count
        FROM shop_reviews sr
        GROUP BY sr."providerUserId"
      )
      SELECT
        p.profile_id                                                   AS id,
        p.seller_id                                                    AS "sellerId",
        p.display_name                                                 AS name,
        p.company_name                                                 AS "companyName",
        p.personal_name                                                AS "personalName",
        p.email,
        p.phone,
        p.logo,
        p.city,
        p.province,
        p.area,
        CASE
          WHEN p.city IS NOT NULL AND p.province IS NOT NULL
            THEN p.city || ', ' || p.province
          WHEN p.city IS NOT NULL THEN p.city
          WHEN p.province IS NOT NULL THEN p.province
          ELSE 'Zambia'
        END                                                            AS location,
        p.social_links                                                 AS "socialLinks",
        p.verification_status                                          AS "verificationStatus",
        p.verified_at                                                  AS "verifiedAt",
        p.has_tpin                                                     AS "hasTpin",
        p.sub_role                                                     AS "subRole",
        p.created_at                                                   AS "createdAt",
        p.shop_type                                                    AS "shopType",
        COALESCE(MAX(ra.avg_rating), 0)                                AS rating,
        COALESCE(MAX(ra.review_count), 0)::int                         AS "reviewCount",
        COALESCE(
          array_agg(DISTINCT cj.category_id) FILTER (WHERE cj.category_id IS NOT NULL),
          '{}'
        )                                                              AS "categoryIds",
        COALESCE(
          array_agg(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL),
          '{}'
        )                                                              AS "categoryNames"
      FROM profile_data p
      LEFT JOIN cat_junctions cj ON cj.profile_id = p.profile_id
      LEFT JOIN categories     c  ON c.id          = cj.category_id
      LEFT JOIN review_agg    ra ON ra.provider_user_id = p.seller_id
      GROUP BY p.profile_id, p.seller_id, p.display_name, p.company_name,
               p.personal_name, p.email, p.phone, p.logo, p.city, p.province,
               p.area, p.social_links, p.verification_status, p.verified_at,
               p.has_tpin, p.sub_role, p.created_at, p.shop_type
      LIMIT 1
    `;

    const profileRows = await this.dataSource.query(profileQuery, [profileId]);
    if (!profileRows.length) return null;

    const profile = profileRows[0];

    const [statsRows, activityRows] = await Promise.all([
      this.dataSource.query(
        `SELECT
           COUNT(*)                                                      AS total_quotes,
           COUNT(*) FILTER (WHERE status IN ('COMPLETED','PAID'))        AS completed_quotes,
           COUNT(*) FILTER (WHERE status IN ('PENDING','ACCEPTED'))      AS active_quotes
         FROM quotes WHERE "providerId" = $1`,
        [profile.sellerId],
      ),
      this.dataSource.query(
        `SELECT "inquiryTitle", price, status, "createdAt"
         FROM quotes
         WHERE "providerId" = $1
         ORDER BY "createdAt" DESC
         LIMIT 12`,
        [profile.sellerId],
      ),
    ]);

    const s = statsRows[0] ?? { total_quotes: 0, completed_quotes: 0, active_quotes: 0 };
    return {
      ...profile,
      quoteStats: {
        total:     parseInt(s.total_quotes,     10),
        completed: parseInt(s.completed_quotes, 10),
        active:    parseInt(s.active_quotes,    10),
      },
      recentActivity: activityRows,
    };
  }

  async update(id: string, updateShopDto: UpdateShopDto): Promise<Shop> {
    await this.shopsRepository.update(id, updateShopDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.shopsRepository.delete(id);
  }

  async findBySellerId(sellerId: string): Promise<Shop> {
    return this.shopsRepository.findOne({ where: { sellerId } });
  }

  async updateRating(id: string, rating: number, reviewCount: number): Promise<Shop> {
    await this.shopsRepository.update(id, { rating, reviewCount });
    return this.findOne(id);
  }

  async incrementFollowerCount(id: string): Promise<Shop> {
    const shop = await this.findOne(id);
    if (shop) {
      await this.shopsRepository.update(id, { followerCount: shop.followerCount + 1 });
    }
    return this.findOne(id);
  }

  async decrementFollowerCount(id: string): Promise<Shop> {
    const shop = await this.findOne(id);
    if (shop && shop.followerCount > 0) {
      await this.shopsRepository.update(id, { followerCount: shop.followerCount - 1 });
    }
    return this.findOne(id);
  }
}
