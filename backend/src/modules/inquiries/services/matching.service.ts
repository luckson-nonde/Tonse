import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry } from '../entities/inquiry.entity';

interface LeadsFilters {
  status?: string;
  city?: string;
  province?: string;
  page?: number;
  limit?: number;
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
    const matchedRows: Array<{ id: string }> = await this.inquiryRepository.query(
      `
      WITH RECURSIVE seller_cats AS (
        SELECT "categoryId" AS id FROM ${junctionTable} WHERE "${profileColumn}" = $1
        UNION
        SELECT c.id FROM categories c
        JOIN seller_cats sc ON c."parentId" = sc.id
      )
      SELECT id FROM seller_cats
      `,
      [selector.profileId],
    );
    const matchedCategoryIds = matchedRows.map((r) => r.id);

    if (matchedCategoryIds.length === 0) {
      this.logger.log(
        `Leads query: profile=${selector.type}/${selector.profileId} matchedCategories=[] → 0 inquiries (no categories selected)`,
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

    const limitPlaceholder = `$${++p}`;
    const offsetPlaceholder = `$${++p}`;

    // SELECT DISTINCT i.* would have Postgres compare JSON columns
    // (items / preferences / attributes) for equality and explode with
    // "could not identify an equality operator for type json". The
    // dedup happens in a sub-select on i.id alone instead.
    const inquirySql = `
      SELECT i.* FROM inquiries i
      WHERE i.id IN (
        SELECT DISTINCT ic."inquiryId" FROM inquiry_categories ic
        WHERE ic."categoryId" = ANY($1::varchar[])
      )
      ${where}
      ORDER BY i."createdAt" DESC
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `;
    const countSql = `
      SELECT COUNT(*)::int AS count FROM inquiries i
      WHERE i.id IN (
        SELECT DISTINCT ic."inquiryId" FROM inquiry_categories ic
        WHERE ic."categoryId" = ANY($1::varchar[])
      )
      ${where}
    `;

    const dataParams = [...params, limit, offset];

    const [rows, countRows] = await Promise.all([
      this.inquiryRepository.query(inquirySql, dataParams),
      this.inquiryRepository.query(countSql, params),
    ]);
    const total = countRows[0]?.count || 0;

    this.logger.log(
      `Leads query: profile=${selector.type}/${selector.profileId} matchedCategories=[${matchedCategoryIds.length}] → ${rows.length} inquiries (total ${total})`,
    );

    return { data: rows, total, matchedCategoryIds };
  }
}
