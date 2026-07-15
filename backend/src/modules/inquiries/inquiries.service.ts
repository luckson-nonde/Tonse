import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Inquiry } from './entities/inquiry.entity';
import { InquiryCategory } from './entities/inquiry-category.entity';
import { CreateInquiryDto, UpdateInquiryDto } from './dto';
import { DisplayIdUtil } from '../../utils/display-id.util';
import { CategoriesService } from '../categories/categories.service';
import { MatchingService } from './services/matching.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FunnelTrackingService } from '../referrals/services/funnel-tracking.service';
import { resolveSortField, resolveSortOrder } from '../../utils/safe-sort.util';

const SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'title', 'status', 'viewCount', 'maxQuotes', 'responseDeadlineAt'] as const;

@Injectable()
export class InquiriesService {
  private readonly logger = new Logger(InquiriesService.name);

  constructor(
    @InjectRepository(Inquiry)
    private readonly inquiriesRepository: Repository<Inquiry>,
    @InjectRepository(InquiryCategory)
    private readonly inquiryCategoriesRepository: Repository<InquiryCategory>,
    private readonly dataSource: DataSource,
    private readonly categoriesService: CategoriesService,
    private readonly matchingService: MatchingService,
    private readonly notificationsService: NotificationsService,
    private readonly funnelTrackingService: FunnelTrackingService,
  ) {}

  /**
   * The frontend sends items/preferences/attributes as JSON *strings*
   * (the DTO validates them with @IsJSON). TypeORM's `json` column type
   * re-stringifies whatever value it is given, so persisting the raw
   * string double-encodes the data (string-wrapped JSON in Postgres —
   * the defect the frontend's robustParse() papers over). Parse to real
   * objects before create/save, same as QuotesService.parseJsonFields.
   */
  private parseJsonFields<T extends object>(data: T): T {
    const parsed: any = { ...data };
    const jsonFields = ['items', 'preferences', 'attributes'];

    jsonFields.forEach((field) => {
      if (parsed[field] && typeof parsed[field] === 'string') {
        try {
          parsed[field] = JSON.parse(parsed[field]);
        } catch (e) {
          // If parsing fails, leave as is
        }
      }
    });

    return parsed as T;
  }

  /**
   * Insert the inquiry plus its `inquiry_categories` rows in a single
   * transaction. categoryIds is the *new* shape (Phase: matching); the
   * legacy `category: string` is gone — write paths must now provide
   * an array of stable category ids (e.g. 'mobile-phones-buy').
   */
  async create(createInquiryDto: CreateInquiryDto): Promise<Inquiry> {
    const { categoryIds, ...rest } = this.parseJsonFields(createInquiryDto);

    // Admin category control: a buyer can't open an inquiry against a
    // category (or subcategory) an admin has switched off. "Effectively
    // disabled" also covers subs whose parent was turned off.
    const requestedIds = Array.from(new Set(categoryIds ?? []));
    if (requestedIds.length > 0) {
      const disabled = await this.categoriesService.getEffectiveDisabledIds();
      const blocked = requestedIds.filter((id) => disabled.has(id));
      if (blocked.length > 0) {
        throw new BadRequestException(
          `The following categories are not currently available: ${blocked.join(', ')}`
        );
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const inquiryRepo = manager.getRepository(Inquiry);
      const junctionRepo = manager.getRepository(InquiryCategory);

      // Default the response window + slot count if the buyer didn't
      // pick. EXPRESS = 1h / 1 quote (first-quote-wins); STANDARD = 24h
      // / 3 quotes (compare-then-pick). Both fields are user-overridable
      // via the DTO when we expose the controls in the inquiry form.
      const isExpress = rest.processType === 'EXPRESS';
      const defaults: Partial<Inquiry> = {};
      if (rest.maxQuotes == null) {
        defaults.maxQuotes = isExpress ? 1 : 3;
      }
      if (rest.responseDeadlineAt == null) {
        const now = Date.now();
        const windowMs = isExpress ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        defaults.responseDeadlineAt = new Date(now + windowMs);
      }

      const inquiry = inquiryRepo.create({ ...defaults, ...rest });
      let saved = await inquiryRepo.save(inquiry);
      saved.displayId = DisplayIdUtil.generateDisplayId(saved.id);
      saved = await inquiryRepo.save(saved);

      const uniqueIds = Array.from(new Set(categoryIds));
      if (uniqueIds.length > 0) {
        await junctionRepo.save(
          uniqueIds.map((categoryId) =>
            junctionRepo.create({ inquiryId: saved.id, categoryId }),
          ),
        );
      }
      return saved;
    }).then((saved) => {
      // Uber-dispatch: alert every matched provider the moment the inquiry
      // lands. Post-commit (transaction resolved above), fire-and-forget —
      // dispatch failure must never fail the buyer's 201, and the provider
      // side's poll fallback is the safety net.
      this.dispatchNewLeadNotifications(saved).catch((e) =>
        this.logger.error(
          `NEW_LEAD dispatch failed for inquiry ${saved.id}: ${(e as Error).message}`,
        ),
      );
      // Referral funnel: a referred buyer's first inquiry advances their
      // conversion row (repeat inquiries no-op via the guarded UPDATE).
      // Same fire-and-forget contract — never fails the buyer's 201.
      void this.funnelTrackingService
        .advanceStage(saved.buyerId, 'inquiry', { type: 'inquiry', id: saved.id })
        .catch((e) =>
          this.logger.error(
            `Referral funnel advance failed for inquiry ${saved.id}: ${(e as Error).message}`,
          ),
        );
      return saved;
    });
  }

  /** Reverse-match the fresh inquiry to provider userIds and push the
   *  durable NEW_LEAD notification that drives the incoming-request alert. */
  private async dispatchNewLeadNotifications(inquiry: Inquiry): Promise<void> {
    const providerIds = await this.matchingService.findMatchedProviderUserIdsForInquiry(
      inquiry.id,
      inquiry.city ?? null,
    );
    // Never dispatch the buyer's own request back at them (a user can hold
    // both buyer and provider profiles).
    const audience = providerIds.filter((id) => id !== inquiry.buyerId);
    if (audience.length === 0) return;
    await this.notificationsService.notifyUsers(audience, 'NEW_LEAD', () => ({
      title: inquiry.title,
      inquiryId: inquiry.id,
      // Snapshot: enough for IncomingLeadAlert to render without a
      // follow-up GET (the alert shows title/location/slots/deadline).
      data: {
        id: inquiry.id,
        title: inquiry.title,
        description: inquiry.description,
        location: inquiry.location,
        city: inquiry.city,
        province: inquiry.province,
        processType: inquiry.processType,
        maxQuotes: inquiry.maxQuotes,
        responseDeadlineAt: inquiry.responseDeadlineAt,
        isLabour: inquiry.isLabour,
        labourGroup: inquiry.labourGroup,
        labourSubType: inquiry.labourSubType,
        createdAt: inquiry.createdAt,
        quoteCount: 0,
        reserveCount: 0,
      },
    }));
  }

  /**
   * Surface the RESERVE quote batch to the buyer. Two callers:
   *   - PATCH /inquiries/:id/release-reserve (explicit buyer action;
   *     requesterId enforced as the inquiry owner)
   *   - QuotesService.maybeAutoReleaseReserve (system; requesterId null)
   * Idempotent: releasing twice is a no-op.
   */
  async releaseReserve(inquiryId: string, requesterId: string | null): Promise<Inquiry> {
    const inquiry = await this.inquiriesRepository.findOne({ where: { id: inquiryId } });
    if (!inquiry) throw new NotFoundException('Inquiry not found');
    if (requesterId && inquiry.buyerId !== requesterId) {
      throw new ForbiddenException('Only the inquiry owner can release reserved quotes');
    }
    if (inquiry.reserveReleasedAt) return inquiry;

    const reserveRows: Array<{ providerId: string; count: string }> =
      await this.inquiriesRepository.query(
        `SELECT "providerId", COUNT(*)::int AS count
           FROM quotes WHERE "inquiryId" = $1 AND "slotTier" = 'RESERVE'
           GROUP BY "providerId"`,
        [inquiryId],
      );
    const reserveCount = reserveRows.reduce((s, r) => s + Number(r.count), 0);
    if (reserveCount === 0 && requesterId) {
      throw new BadRequestException('No reserved quotes to release yet');
    }

    inquiry.reserveReleasedAt = new Date();
    const saved = await this.inquiriesRepository.save(inquiry);

    // Tier-1 both ways: reserve providers learn they're now in play; the
    // buyer learns the extra batch landed. Fire-and-forget.
    void this.notificationsService
      .notifyUsers(
        reserveRows.map((r) => r.providerId),
        'RESERVE_RELEASED',
        () => ({
          title: `Your reserved quote on "${inquiry.title}" is now visible to the buyer`,
          inquiryId: inquiry.id,
          data: { inquiryTitle: inquiry.title },
        }),
      )
      .catch((e) => this.logger.warn(`RESERVE_RELEASED dispatch failed: ${(e as Error).message}`));
    if (reserveCount > 0) {
      void this.notificationsService
        .notifyUsers([inquiry.buyerId], 'QUOTE_RECEIVED', () => ({
          title: `${reserveCount} reserved quote${reserveCount === 1 ? '' : 's'} added to "${inquiry.title}"`,
          inquiryId: inquiry.id,
          data: { reserveReleased: true, reserveCount },
        }))
        .catch((e) => this.logger.warn(`Reserve-release buyer notify failed: ${(e as Error).message}`));
    }
    return saved;
  }

  async findAll(filters: any = {}): Promise<{ data: Inquiry[]; total: number }> {
    const queryBuilder = this.inquiriesRepository.createQueryBuilder('inquiry');

    // Apply filters
    if (filters.buyerId) {
      queryBuilder.andWhere('inquiry.buyerId = :buyerId', { buyerId: filters.buyerId });
    }

    if (filters.status) {
      queryBuilder.andWhere('inquiry.status = :status', { status: filters.status });
    }

    // Phase: matching dropped the legacy `category` exact-equality filter
    // — server-side category-aware leads now flow through MatchingService
    // (`GET /inquiries/leads/me`). findAll still serves "list my inquiries"
    // for buyers via the buyerId filter.

    if (filters.search) {
      queryBuilder.andWhere('(inquiry.title ILIKE :search OR inquiry.description ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    // Sorting
    const sortField = resolveSortField(filters.sort, SORTABLE_FIELDS, 'createdAt');
    const sortOrder = resolveSortOrder(filters.order);
    queryBuilder.orderBy(`inquiry.${sortField}`, sortOrder);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<Inquiry> {
    return await this.inquiriesRepository.findOne({
      where: { id },
    });
  }

  /**
   * Update an inquiry. When `categoryIds` is provided, the existing
   * junction rows are replaced atomically — old set deleted, new set
   * inserted, all in one transaction. Plain field updates (status,
   * title, etc.) write through directly.
   */
  async update(id: string, updateInquiryDto: UpdateInquiryDto): Promise<Inquiry> {
    const { categoryIds, ...rest } = this.parseJsonFields(
      updateInquiryDto,
    ) as UpdateInquiryDto & {
      categoryIds?: string[];
    };
    if (categoryIds === undefined) {
      if (Object.keys(rest).length > 0) {
        await this.inquiriesRepository.update(id, rest);
      }
      return this.findOne(id);
    }
    return this.dataSource.transaction(async (manager) => {
      if (Object.keys(rest).length > 0) {
        await manager.getRepository(Inquiry).update(id, rest);
      }
      const junction = manager.getRepository(InquiryCategory);
      await junction.delete({ inquiryId: id });
      const uniqueIds = Array.from(new Set(categoryIds));
      if (uniqueIds.length > 0) {
        await junction.save(
          uniqueIds.map((categoryId) =>
            junction.create({ inquiryId: id, categoryId }),
          ),
        );
      }
      return manager.getRepository(Inquiry).findOne({ where: { id } });
    });
  }

  /** Read the category IDs attached to an inquiry. Used by the buyer
   *  list view so the UI can re-hydrate selections. */
  async findCategoryIds(inquiryId: string): Promise<string[]> {
    const rows = await this.inquiryCategoriesRepository.find({
      where: { inquiryId },
      select: ['categoryId'],
    });
    return rows.map((r) => r.categoryId);
  }

  async remove(id: string): Promise<void> {
    await this.inquiriesRepository.delete(id);
  }

  async findByBuyerId(buyerId: string): Promise<Inquiry[]> {
    const inquiries = await this.inquiriesRepository.find({
      where: { buyerId },
      order: { createdAt: 'DESC' },
    });
    const withCats = await this.hydrateCategoryFields(inquiries);
    const hydrated = await this.hydrateBuyerInfo(withCats);

    // Dispatch telemetry for the buyer's cards: "X providers accepted ·
    // Y/Z quoted", plus how many overflow quotes sit in reserve (drives the
    // "Show reserved quotes (N)" affordance). Two batched queries.
    if (hydrated.length > 0) {
      const ids = hydrated.map((i) => i.id);
      const quoteRows: Array<{ inquiryId: string; primary: number; reserve: number }> =
        await this.inquiriesRepository.query(
          `SELECT "inquiryId",
                  COUNT(*) FILTER (WHERE "slotTier" = 'PRIMARY')::int AS primary,
                  COUNT(*) FILTER (WHERE "slotTier" = 'RESERVE')::int AS reserve
             FROM quotes WHERE "inquiryId" = ANY($1::uuid[]) GROUP BY "inquiryId"`,
          [ids],
        );
      const acceptRows: Array<{ inquiryId: string; accepted: number }> =
        await this.inquiriesRepository.query(
          `SELECT "inquiryId", COUNT(*)::int AS accepted
             FROM notifications
             WHERE "inquiryId" = ANY($1::uuid[]) AND type = 'NEW_LEAD' AND status = 'ACKNOWLEDGED'
             GROUP BY "inquiryId"`,
          [ids],
        );
      const quotesBy = new Map(quoteRows.map((r) => [r.inquiryId, r]));
      const acceptedBy = new Map(acceptRows.map((r) => [r.inquiryId, Number(r.accepted)]));
      for (const row of hydrated as any[]) {
        const q = quotesBy.get(row.id);
        const released = !!row.reserveReleasedAt;
        // quoteCount = what the buyer can SEE (primary + released reserve);
        // reserveCount = quotes still held back.
        row.quoteCount = (q ? Number(q.primary) : 0) + (released && q ? Number(q.reserve) : 0);
        row.reserveCount = released || !q ? 0 : Number(q.reserve);
        row.acceptedCount = acceptedBy.get(row.id) ?? 0;
      }
    }
    return hydrated;
  }

  /**
   * Decorate a list of inquiries with `categoryIds` (the canonical
   * stable ids from the inquiry_categories junction) and `category`
   * (a comma-joined display name for legacy callers that still read
   * the legacy field). Mirrors what MatchingService does for the
   * seller-side leads endpoint — without it, buyer-side surfaces
   * (InquiryCard, BuyerDashboard) crash on `inquiry.category.X` since
   * the legacy column was dropped when matching moved to junction-
   * backed categories.
   */
  private async hydrateCategoryFields(inquiries: Inquiry[]): Promise<Inquiry[]> {
    if (inquiries.length === 0) return inquiries;
    const inquiryIds = inquiries.map((i) => i.id);
    const rows: Array<{
      inquiryId: string;
      categoryId: string;
      categoryName: string;
    }> = await this.inquiriesRepository.query(
      `SELECT ic."inquiryId", ic."categoryId", c.name AS "categoryName"
         FROM inquiry_categories ic
         JOIN categories c ON c.id = ic."categoryId"
         WHERE ic."inquiryId" = ANY($1::uuid[])`,
      [inquiryIds],
    );
    const idIndex = new Map<string, string[]>();
    const nameIndex = new Map<string, string[]>();
    for (const r of rows) {
      if (!idIndex.has(r.inquiryId)) idIndex.set(r.inquiryId, []);
      if (!nameIndex.has(r.inquiryId)) nameIndex.set(r.inquiryId, []);
      idIndex.get(r.inquiryId)!.push(r.categoryId);
      nameIndex.get(r.inquiryId)!.push(r.categoryName);
    }
    return inquiries.map((inq) => {
      (inq as any).categoryIds = idIndex.get(inq.id) || [];
      (inq as any).category = (nameIndex.get(inq.id) || []).join(', ');
      return inq;
    });
  }

  /**
   * Decorate inquiries with `buyerName` resolved from `buyer_profiles`
   * (where the human-readable name actually lives — `users` row has
   * no name column in this schema). The buyer-detail panel was
   * rendering "Unknown Buyer" for every inquiry because the inquiry
   * row alone has only `buyerId`. Batched into a single query against
   * the unique buyer-id set.
   */
  private async hydrateBuyerInfo(inquiries: Inquiry[]): Promise<Inquiry[]> {
    if (inquiries.length === 0) return inquiries;
    const buyerIds = Array.from(new Set(inquiries.map((i) => i.buyerId).filter(Boolean)));
    if (buyerIds.length === 0) return inquiries;
    const rows: Array<{ userId: string; name: string }> = await this.inquiriesRepository.query(
      `SELECT "userId", name FROM buyer_profiles WHERE "userId" = ANY($1::uuid[])`,
      [buyerIds],
    );
    const nameByUserId = new Map<string, string>();
    for (const r of rows) {
      if (r.name) nameByUserId.set(r.userId, r.name);
    }
    return inquiries.map((inq) => {
      const name = nameByUserId.get(inq.buyerId);
      if (name) (inq as any).buyerName = name;
      return inq;
    });
  }

  async updateStatus(id: string, status: string): Promise<Inquiry> {
    return await this.update(id, { status } as UpdateInquiryDto);
  }

  /**
   * Atomically bumps the view counter. The frontend fires this when a
   * provider expands an inquiry detail in their leads feed. Atomic UPDATE
   * avoids the read/write race that a `findOne` + `+1` + `update` would have
   * if multiple providers click at the same instant.
   *
   * Returns the post-increment value so the caller can echo it back to the
   * client without a follow-up SELECT.
   */
  async incrementViewCount(id: string): Promise<number> {
    const result = await this.inquiriesRepository
      .createQueryBuilder()
      .update(Inquiry)
      .set({ viewCount: () => '"viewCount" + 1' })
      .where('id = :id', { id })
      .returning('"viewCount"')
      .execute();

    const row = (result.raw && (result.raw[0] as { viewCount: number })) || null;
    return row ? Number(row.viewCount) : 0;
  }

  async findByDisplayId(displayId: string): Promise<Inquiry> {
    return await this.inquiriesRepository.findOne({
      where: { displayId },
    });
  }
}
