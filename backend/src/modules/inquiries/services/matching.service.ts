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

      // Per-inquiry quote count — drives the "X / Y slots remaining"
      // indicator on the lead card and stops the new-lead alert from
      // firing once the slot is full. Single batched COUNT(*).
      const quoteRows: Array<{ inquiryId: string; count: string }> =
        await this.inquiryRepository.query(
          `SELECT "inquiryId", COUNT(*)::int AS count
             FROM quotes
             WHERE "inquiryId" = ANY($1::uuid[])
             GROUP BY "inquiryId"`,
          [inquiryIds],
        );
      const quoteCountByInquiry = new Map<string, number>();
      for (const qr of quoteRows) {
        quoteCountByInquiry.set(qr.inquiryId, Number(qr.count));
      }
      for (const row of rows as any[]) {
        row.quoteCount = quoteCountByInquiry.get(row.id) ?? 0;
      }

      // Buyer name for the lead — resolved from buyer_profiles
      // (the users row has no name column in this schema). Without
      // this, the seller's lead detail panel renders "Unknown Buyer"
      // for every inquiry. Single batched query keyed by the unique
      // buyer-id set in this page of results.
      const buyerIds = Array.from(
        new Set((rows as any[]).map((r) => r.buyerId).filter(Boolean)),
      );
      if (buyerIds.length > 0) {
        const buyerRows: Array<{ userId: string; name: string }> =
          await this.inquiryRepository.query(
            `SELECT "userId", name FROM buyer_profiles WHERE "userId" = ANY($1::uuid[])`,
            [buyerIds],
          );
        const nameByUserId = new Map<string, string>();
        for (const br of buyerRows) {
          if (br.name) nameByUserId.set(br.userId, br.name);
        }
        for (const row of rows as any[]) {
          const name = nameByUserId.get(row.buyerId);
          if (name) row.buyerName = name;
        }
      }
    }

    this.logger.log(
      `Leads query: profile=${selector.type}/${selector.profileId} matchedCategories=[${matchedCategoryIds.length}] variant=${filters.variant ?? '(none)'} → ${rows.length} inquiries (total ${total})`,
    );

    return { data: rows, total, matchedCategoryIds };
  }
}
