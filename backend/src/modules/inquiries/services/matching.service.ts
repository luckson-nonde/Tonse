import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry } from '../entities/inquiry.entity';
import { CategoriesService } from '../../categories/categories.service';

interface LeadsFilters {
  status?: string;
  city?: string;
  province?: string;
  page?: number;
  limit?: number;
  /**
   * Restrict results to inquiries whose categories carry this archetype
   * (e.g. 'REPAIR' returns only repair-tagged leads). Used by the
   * variant toggle in ProviderLeadsView and by staff users whose
   * `assignedArchetype` is set. NULL / undefined = no restriction.
   */
  variant?: string;
}

interface ProfileSelector {
  type: 'SELLER' | 'SERVICE_PROVIDER';
  profileId: string;
}

/**
 * Server-side, ID-based, hierarchy-aware inquiry matching.
 *
 * Replaces the previous frontend-only path where every authenticated
 * user pulled every OPEN inquiry and filtered client-side via
 * `isRelatedCategory(userCat, leadCat)` — string parsing, no
 * hierarchy expansion, scaling problems, fragile.
 *
 * The query expands the seller's chosen categories down the tree via a
 * recursive CTE — a seller subscribed to parent 'electronics'
 * implicitly serves every descendant ('mobile-phones-buy',
 * 'laptops-buy', etc.). It then joins that expanded set against
 * `inquiry_categories`. Status / city / province come in as plain
 * predicates.
 *
 * Logged with (profileId, matchedCategoryIds[], inquiryCount) so the
 * next "I don't see leads" report is findable.
 */
@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    @InjectRepository(Inquiry)
    private readonly inquiryRepository: Repository<Inquiry>,
    private readonly categoriesService: CategoriesService,
  ) {}

  async findLeadsForProfile(
    selector: ProfileSelector,
    filters: LeadsFilters = {},
    /** When provided, each lead is hydrated with the caller's NEW_LEAD
     *  dispatch-notification id + Accept/Decline status. */
    callerUserId?: string,
  ): Promise<{ data: Inquiry[]; total: number; matchedCategoryIds: string[] }> {
    const junctionTable =
      selector.type === 'SELLER'
        ? 'seller_profile_categories'
        : 'service_provider_profile_categories';
    const profileColumn =
      selector.type === 'SELLER' ? 'sellerProfileId' : 'serviceProviderProfileId';

    // Pull just the matched category ids first — used for both the
    // result query and the observability log line.
    //
    // Two cases the seller's junction can be in:
    //
    //   1. Pure parent subscription — seller picked just "electronics"
    //      (no specific sub). They're a generalist; expand to every
    //      descendant so they match every electronics inquiry.
    //
    //   2. Parent + specific child — onboarding auto-adds the parent
    //      slug ("events") whenever a buyer or seller picks any sub
    //      ("event-decor"). The child is the seller's authoritative
    //      subscription; the parent is incidental. Without removing it
    //      from the seed, the recursive expansion sweeps in every
    //      sibling — a decor provider sees catering / planning /
    //      management / venues inquiries too. We drop those parents
    //      from the seed before recursing so the seller's actual
    //      choice wins.
    //
    // `effective_seeds` is the seller's junction MINUS any row that
    // has a child of itself in the same junction. Then the recursive
    // CTE expands only the leaves.
    const matchedRows: Array<{ id: string }> = await this.inquiryRepository.query(
      `
      WITH RECURSIVE
        seller_explicit AS (
          SELECT "categoryId" AS id FROM ${junctionTable} WHERE "${profileColumn}" = $1
        ),
        parents_with_specific_children AS (
          SELECT se.id FROM seller_explicit se
          WHERE EXISTS (
            SELECT 1 FROM categories child
            JOIN seller_explicit se2 ON se2.id = child.id
            WHERE child."parentId" = se.id
          )
        ),
        effective_seeds AS (
          SELECT id FROM seller_explicit
          EXCEPT
          SELECT id FROM parents_with_specific_children
        ),
        seller_cats AS (
          SELECT id FROM effective_seeds
          UNION
          SELECT c.id FROM categories c
          JOIN seller_cats sc ON c."parentId" = sc.id
        )
      SELECT id FROM seller_cats
      `,
      [selector.profileId],
    );
    let matchedCategoryIds = matchedRows.map((r) => r.id);

    // Admin category control: never surface leads for a category (or a sub
    // whose parent) an admin has switched off. The seller keeps their saved
    // subscription — it just stops producing matches while disabled.
    const disabled = await this.categoriesService.getEffectiveDisabledIds();
    if (disabled.size > 0) {
      matchedCategoryIds = matchedCategoryIds.filter((id) => !disabled.has(id));
    }

    if (matchedCategoryIds.length === 0) {
      this.logger.log(
        `Leads query: profile=${selector.type}/${selector.profileId} matchedCategories=[] → 0 inquiries (none selected or all disabled)`,
      );
      return { data: [], total: 0, matchedCategoryIds: [] };
    }

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const offset = (page - 1) * limit;

    // Build the leads query against a fresh parameter slot map. $1 is the
    // matchedCategoryIds array; status / city / province / pagination
    // get the next slots in order. (Earlier this had two pre-computed
    // `where` clauses with their own placeholder cursor that referenced
    // $2 = status, but after we re-shaped the params to put
    // matchedCategoryIds at $2, $2 inside `where` was suddenly the
    // array — Postgres exploded with `inquiries_status_enum =
    // character varying[]`.)
    const params: any[] = [matchedCategoryIds];
    let p = 1;

    const status = filters.status || 'OPEN';
    let where = ` AND i.status = $${++p}::inquiries_status_enum`;
    params.push(status);

    if (filters.city) {
      where += ` AND i.city = $${++p}`;
      params.push(filters.city);
    }
    if (filters.province) {
      where += ` AND i.province = $${++p}`;
      params.push(filters.province);
    }

    // Variant filter — narrow to inquiries whose category carries the
    // requested archetype. The inner sub-select joins inquiry_categories
    // → categories to read archetype, so we keep this in the existing
    // sub-select rather than splatting a JOIN into the outer query.
    let variantSubquery = `
      SELECT DISTINCT ic."inquiryId" FROM inquiry_categories ic
      WHERE ic."categoryId" = ANY($1::varchar[])
    `;
    if (filters.variant) {
      const variantPlaceholder = `$${++p}`;
      params.push(filters.variant);
      variantSubquery = `
        SELECT DISTINCT ic."inquiryId" FROM inquiry_categories ic
        JOIN categories c ON c.id = ic."categoryId"
        WHERE ic."categoryId" = ANY($1::varchar[])
          AND c.archetype = ${variantPlaceholder}::categories_archetype_enum
      `;
    }

    const limitPlaceholder = `$${++p}`;
    const offsetPlaceholder = `$${++p}`;

    // SELECT DISTINCT i.* would have Postgres compare JSON columns
    // (items / preferences / attributes) for equality and explode with
    // "could not identify an equality operator for type json". The
    // dedup happens in a sub-select on i.id alone instead.
    const inquirySql = `
      SELECT i.* FROM inquiries i
      WHERE i.id IN (${variantSubquery})
      ${where}
      ORDER BY i."createdAt" DESC
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `;
    const countSql = `
      SELECT COUNT(*)::int AS count FROM inquiries i
      WHERE i.id IN (${variantSubquery})
      ${where}
    `;

    const dataParams = [...params, limit, offset];

    const [rows, countRows] = await Promise.all([
      this.inquiryRepository.query(inquirySql, dataParams),
      this.inquiryRepository.query(countSql, params),
    ]);
    const total = countRows[0]?.count || 0;

    // Hydrate each row with its categoryIds + a legacy display string so
    // the seller-side schema lookup (`getCategorySchema(lead.category)`)
    // resolves to the correct per-category form schema. Without this
    // the frontend falls back to GENERIC_FALLBACK_SCHEMA and leaks only
    // brand/quantity/urgency from repair inquiries, hiding deviceType,
    // primarySymptom, deviceState, incidentReport and symptoms.
    if (rows.length > 0) {
      const inquiryIds = rows.map((r: any) => r.id);
      const catRows: Array<{
        inquiryId: string;
        categoryId: string;
        categoryName: string;
      }> = await this.inquiryRepository.query(
        `SELECT ic."inquiryId", ic."categoryId", c.name AS "categoryName"
           FROM inquiry_categories ic
           JOIN categories c ON c.id = ic."categoryId"
           WHERE ic."inquiryId" = ANY($1::uuid[])`,
        [inquiryIds],
      );
      const idIndex = new Map<string, string[]>();
      const nameIndex = new Map<string, string[]>();
      for (const cr of catRows) {
        if (!idIndex.has(cr.inquiryId)) idIndex.set(cr.inquiryId, []);
        if (!nameIndex.has(cr.inquiryId)) nameIndex.set(cr.inquiryId, []);
        idIndex.get(cr.inquiryId)!.push(cr.categoryId);
        nameIndex.get(cr.inquiryId)!.push(cr.categoryName);
      }
      for (const row of rows as any[]) {
        row.categoryIds = idIndex.get(row.id) || [];
        row.category = (nameIndex.get(row.id) || []).join(', ');
      }

      // Per-inquiry quote counts split by slot tier — `quoteCount` keeps its
      // original meaning (PRIMARY quotes; drives the "X / Y slots" UI) and
      // `reserveCount` powers the overflow-reserve UX ("Quote (reserve N/Y)")
      // once the primary batch is full. Single batched query.
      const quoteRows: Array<{ inquiryId: string; primary: number; reserve: number }> =
        await this.inquiryRepository.query(
          `SELECT "inquiryId",
                  COUNT(*) FILTER (WHERE "slotTier" = 'PRIMARY')::int AS primary,
                  COUNT(*) FILTER (WHERE "slotTier" = 'RESERVE')::int AS reserve
             FROM quotes
             WHERE "inquiryId" = ANY($1::uuid[])
             GROUP BY "inquiryId"`,
          [inquiryIds],
        );
      const quoteCountByInquiry = new Map<string, { primary: number; reserve: number }>();
      for (const qr of quoteRows) {
        quoteCountByInquiry.set(qr.inquiryId, {
          primary: Number(qr.primary),
          reserve: Number(qr.reserve),
        });
      }
      for (const row of rows as any[]) {
        const counts = quoteCountByInquiry.get(row.id);
        row.quoteCount = counts?.primary ?? 0;
        row.reserveCount = counts?.reserve ?? 0;
      }

      // Dispatch-notification state for THIS caller — the frontend uses
      // `notificationId` to PATCH Accept/Decline and `notificationStatus`
      // to suppress re-alerting leads the provider already DECLINED, even
      // when the lead arrived via the poll fallback instead of SSE.
      if (callerUserId) {
        const notifRows: Array<{ id: string; inquiryId: string; status: string }> =
          await this.inquiryRepository.query(
            `SELECT id, "inquiryId", status
               FROM notifications
               WHERE "userId" = $1 AND type = 'NEW_LEAD' AND "inquiryId" = ANY($2::uuid[])`,
            [callerUserId, inquiryIds],
          );
        const notifByInquiry = new Map<string, { id: string; status: string }>();
        for (const nr of notifRows) notifByInquiry.set(nr.inquiryId, nr);
        for (const row of rows as any[]) {
          const n = notifByInquiry.get(row.id);
          if (n) {
            row.notificationId = n.id;
            row.notificationStatus = n.status;
          }
        }
      }

      // Buyer name + verification status for the lead — resolved from
      // buyer_profiles (the users row has no name column in this schema).
      // Without this, the seller's lead detail panel renders "Unknown
      // Buyer" for every inquiry. verificationStatus lets the seller see
      // an "unverified buyer" badge — unapproved buyers can still send
      // inquiries, they just carry the badge until an admin approves them.
      // Single batched query keyed by the unique buyer-id set in this
      // page of results.
      const buyerIds = Array.from(
        new Set((rows as any[]).map((r) => r.buyerId).filter(Boolean)),
      );
      if (buyerIds.length > 0) {
        const buyerRows: Array<{
          userId: string;
          name: string;
          verificationStatus: string;
        }> = await this.inquiryRepository.query(
          `SELECT "userId", name, "verificationStatus" FROM buyer_profiles WHERE "userId" = ANY($1::uuid[])`,
          [buyerIds],
        );
        const nameByUserId = new Map<string, string>();
        const statusByUserId = new Map<string, string>();
        for (const br of buyerRows) {
          if (br.name) nameByUserId.set(br.userId, br.name);
          if (br.verificationStatus) statusByUserId.set(br.userId, br.verificationStatus);
        }
        for (const row of rows as any[]) {
          const name = nameByUserId.get(row.buyerId);
          if (name) row.buyerName = name;
          const status = statusByUserId.get(row.buyerId);
          if (status) row.buyerVerificationStatus = status;
        }
      }
    }

    this.logger.log(
      `Leads query: profile=${selector.type}/${selector.profileId} matchedCategories=[${matchedCategoryIds.length}] variant=${filters.variant ?? '(none)'} → ${rows.length} inquiries (total ${total})`,
    );

    return { data: rows, total, matchedCategoryIds };
  }

  /**
   * REVERSE matching — the dispatch direction: given a new inquiry, which
   * provider userIds should be alerted? Mirror image of findLeadsForProfile:
   * instead of expanding a profile's subscriptions DOWN the category tree to
   * find inquiries, expand the inquiry's categories UP to their ancestors and
   * intersect with each profile's EFFECTIVE subscription set.
   *
   * "Effective" reuses the child-shadows-parent rule from the forward query
   * (matching.service.ts effective_seeds): onboarding auto-adds the parent
   * slug whenever a specific sub is picked, so a provider who only serves
   * `laptops-buy` still carries an incidental `electronics` row — without
   * the shadow-exclusion they'd be over-notified for every electronics sub.
   *
   * Geo scope: notify when the profile has no city set OR it matches the
   * inquiry's city (same permissive default the pull side exposes via its
   * optional city filter).
   */
  async findMatchedProviderUserIdsForInquiry(
    inquiryId: string,
    city: string | null,
  ): Promise<string[]> {
    const rows: Array<{ userId: string }> = await this.inquiryRepository.query(
      `
      WITH RECURSIVE
        inquiry_cats AS (
          SELECT "categoryId" AS id FROM inquiry_categories WHERE "inquiryId" = $1
        ),
        ancestors AS (
          SELECT id FROM inquiry_cats
          UNION
          SELECT c."parentId" FROM categories c
          JOIN ancestors a ON c.id = a.id
          WHERE c."parentId" IS NOT NULL
        ),
        seller_explicit AS (
          SELECT "sellerProfileId" AS "profileId", "categoryId" AS id
          FROM seller_profile_categories
        ),
        seller_shadowed AS (
          SELECT se."profileId", se.id FROM seller_explicit se
          WHERE EXISTS (
            SELECT 1 FROM categories child
            JOIN seller_explicit se2
              ON se2."profileId" = se."profileId" AND se2.id = child.id
            WHERE child."parentId" = se.id
          )
        ),
        seller_effective AS (
          SELECT "profileId", id FROM seller_explicit
          EXCEPT
          SELECT "profileId", id FROM seller_shadowed
        ),
        sp_explicit AS (
          SELECT "serviceProviderProfileId" AS "profileId", "categoryId" AS id
          FROM service_provider_profile_categories
        ),
        sp_shadowed AS (
          SELECT spe."profileId", spe.id FROM sp_explicit spe
          WHERE EXISTS (
            SELECT 1 FROM categories child
            JOIN sp_explicit spe2
              ON spe2."profileId" = spe."profileId" AND spe2.id = child.id
            WHERE child."parentId" = spe.id
          )
        ),
        sp_effective AS (
          SELECT "profileId", id FROM sp_explicit
          EXCEPT
          SELECT "profileId", id FROM sp_shadowed
        )
      SELECT DISTINCT sp."userId"
        FROM seller_effective se
        JOIN seller_profiles sp ON sp.id = se."profileId"
        WHERE se.id IN (SELECT id FROM ancestors)
          AND (sp.city IS NULL OR $2::varchar IS NULL OR sp.city = $2)
      UNION
      SELECT DISTINCT pp."userId"
        FROM sp_effective spe
        JOIN service_provider_profiles pp ON pp.id = spe."profileId"
        WHERE spe.id IN (SELECT id FROM ancestors)
          AND (pp.city IS NULL OR $2::varchar IS NULL OR pp.city = $2)
      `,
      [inquiryId, city],
    );
    return rows.map((r) => r.userId);
  }
}
