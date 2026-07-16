import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Quote } from './entities/quote.entity';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { InquiriesService } from '../inquiries/inquiries.service';
import { Inquiry } from '../inquiries/entities/inquiry.entity';
import { MatchingService } from '../inquiries/services/matching.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FunnelTrackingService } from '../referrals/services/funnel-tracking.service';

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(
    @InjectRepository(Quote)
    private quotesRepository: Repository<Quote>,
    private readonly inquiriesService: InquiriesService,
    private readonly matchingService: MatchingService,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
    private readonly funnelTrackingService: FunnelTrackingService,
  ) {}

  private parseJsonFields(data: any): any {
    const parsed = { ...data };
    const jsonFields = ['itemPrices', 'buyerContact', 'requirements', 'dynamicFields', 'delivery'];

    jsonFields.forEach((field) => {
      if (parsed[field] && typeof parsed[field] === 'string') {
        try {
          parsed[field] = JSON.parse(parsed[field]);
        } catch (e) {
          // If parsing fails, leave as is
        }
      }
    });

    return parsed;
  }

  /**
   * Tiered, capacity-enforced quote creation (the "real counter"):
   *
   *   PRIMARY slots  = inquiry.maxQuotes  (visible to the buyer at once)
   *   RESERVE slots  = inquiry.maxQuotes  (captured but hidden until the
   *                    buyer releases them — the overflow fallback)
   *   beyond both    → 409, the lead is genuinely full.
   *
   * The parent inquiry row is locked (SELECT … FOR UPDATE) so two providers
   * racing for the last slot — the EXPRESS maxQuotes=1 case — serialize:
   * exactly one wins the slot, the loser gets a clean 409 or lands in
   * reserve. The QUOTED status flip now lives in the SAME transaction
   * (previously a separate best-effort write).
   *
   * `opts.skipInquiryTransition` (loan DECLINE path): a decline is not an
   * offer, so it must NOT flip the request to QUOTED — that would hide it
   * from every other lender and mislead the borrower.
   *
   * Post-commit, fire-and-forget: live counter events to every matched
   * provider + a durable QUOTE_RECEIVED to the buyer. Dispatch failure
   * never fails the create — the poll fallback self-heals counters.
   */
  async create(
    createQuoteDto: CreateQuoteDto,
    opts: { skipInquiryTransition?: boolean } = {},
  ): Promise<Quote> {
    const parsedDto = this.parseJsonFields(createQuoteDto);

    const result = await this.dataSource.transaction(async (manager) => {
      const inquiry = await manager
        .getRepository(Inquiry)
        .createQueryBuilder('i')
        .setLock('pessimistic_write')
        .where('i.id = :id', { id: parsedDto.inquiryId })
        .getOne();
      if (!inquiry) throw new NotFoundException('Inquiry not found');

      const maxQuotes = inquiry.maxQuotes ?? 3;
      const counts: Array<{ tier: string; count: string }> = await manager.query(
        `SELECT "slotTier" AS tier, COUNT(*)::int AS count
           FROM quotes WHERE "inquiryId" = $1 GROUP BY "slotTier"`,
        [inquiry.id],
      );
      let primaryCount = 0;
      let reserveCount = 0;
      for (const c of counts) {
        if (c.tier === 'PRIMARY') primaryCount = Number(c.count);
        else if (c.tier === 'RESERVE') reserveCount = Number(c.count);
      }

      let slotTier: 'PRIMARY' | 'RESERVE';
      if (primaryCount < maxQuotes) slotTier = 'PRIMARY';
      else if (reserveCount < maxQuotes) slotTier = 'RESERVE';
      else {
        throw new ConflictException(
          "This lead's quote slots are full — the buyer has all the quotes they asked for (plus a full reserve).",
        );
      }

      const quote = manager.getRepository(Quote).create({ ...parsedDto, slotTier });
      const saved = (await manager.getRepository(Quote).save(quote)) as unknown as Quote;
      // Loan DECLINEs skip the QUOTED flip (see doc comment above) — the
      // decline quote still lands, but the request stays visible to lenders.
      if (!opts.skipInquiryTransition) {
        await manager.getRepository(Inquiry).update(inquiry.id, { status: 'QUOTED' });
      }

      return {
        quote: saved,
        inquiry,
        primaryCount: primaryCount + (slotTier === 'PRIMARY' ? 1 : 0),
        reserveCount: reserveCount + (slotTier === 'RESERVE' ? 1 : 0),
        maxQuotes,
      };
    });

    this.dispatchQuoteNotifications(result).catch((e) =>
      this.logger.error(
        `Quote-notify dispatch failed for quote ${result.quote.id}: ${(e as Error).message}`,
      ),
    );

    return result.quote;
  }

  /** Live counter fan-out (Tier-2) + durable buyer notification (Tier-1). */
  private async dispatchQuoteNotifications(ctx: {
    quote: Quote;
    inquiry: Inquiry;
    primaryCount: number;
    reserveCount: number;
    maxQuotes: number;
  }): Promise<void> {
    const { quote, inquiry, primaryCount, reserveCount, maxQuotes } = ctx;
    const providerIds = await this.matchingService.findMatchedProviderUserIdsForInquiry(
      inquiry.id,
      inquiry.city ?? null,
    );
    this.notificationsService.broadcastEphemeral(providerIds, 'QUOTE_COUNT_UPDATE', {
      inquiryId: inquiry.id,
      quoteCount: primaryCount,
      reserveCount,
      maxQuotes,
      reserveCap: maxQuotes,
    });
    if (primaryCount >= maxQuotes && reserveCount >= maxQuotes) {
      this.notificationsService.broadcastEphemeral(providerIds, 'LEAD_FULL', {
        inquiryId: inquiry.id,
      });
    }
    await this.notificationsService.notifyUsers([inquiry.buyerId], 'QUOTE_RECEIVED', () => ({
      title:
        quote.slotTier === 'RESERVE'
          ? `A reserve quote arrived on "${inquiry.title}"`
          : `New quote on "${inquiry.title}"`,
      inquiryId: inquiry.id,
      quoteId: quote.id,
      data: {
        price: quote.price,
        providerName: quote.providerName,
        slotTier: quote.slotTier,
        quoteCount: primaryCount,
        maxQuotes,
      },
    }));
  }

  async findAll(filters: any = {}): Promise<{ data: Quote[]; total: number }> {
    const queryBuilder = this.quotesRepository
      .createQueryBuilder('quote')
      .leftJoinAndSelect('quote.inquiry', 'inquiry');

    // DATA ISOLATION: Filter by user (buyer or provider)
    if (filters.userId) {
      queryBuilder.andWhere('(quote.providerId = :userId OR inquiry.buyerId = :userId)', {
        userId: filters.userId,
      });
      // Reserve visibility: unreleased RESERVE quotes are hidden from the
      // BUYER (that's the whole point of the reserve pool) but always
      // visible to their own provider (badged "In reserve" client-side).
      queryBuilder.andWhere(
        `NOT (quote.slotTier = 'RESERVE' AND inquiry.reserveReleasedAt IS NULL AND quote.providerId != :userId)`,
        { userId: filters.userId },
      );
    }

    if (filters.inquiryId) {
      queryBuilder.andWhere('quote.inquiryId = :inquiryId', {
        inquiryId: filters.inquiryId,
      });
    }

    if (filters.providerId) {
      queryBuilder.andWhere('quote.providerId = :providerId', {
        providerId: filters.providerId,
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('quote.status = :status', { status: filters.status });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(quote.providerName ILIKE :search OR quote.inquiryTitle ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    queryBuilder.skip((page - 1) * limit).take(limit);

    const sortField = filters.sort || 'createdAt';
    const sortOrder = filters.order || 'DESC';
    queryBuilder.orderBy(`quote.${sortField}`, sortOrder);

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  async findOne(id: string): Promise<Quote> {
    return this.quotesRepository.findOne({
      where: { id },
      relations: ['inquiry'], // Load inquiry to check buyerId
    });
  }

  async update(id: string, updateQuoteDto: UpdateQuoteDto): Promise<Quote> {
    const parsedDto = this.parseJsonFields(updateQuoteDto);
    await this.quotesRepository.update(id, parsedDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.quotesRepository.delete(id);
  }

  async findByInquiry(inquiryId: string, userId: string): Promise<Quote[]> {
    // This will be used by controller that validates user is the buyer
    const quotes = await this.quotesRepository.find({
      where: { inquiryId },
      relations: ['inquiry'],
      order: { createdAt: 'DESC' },
    });
    // Reserve visibility: hide unreleased RESERVE quotes from everyone but
    // the provider who wrote them. Once inquiry.reserveReleasedAt is set,
    // the reserve batch surfaces to the buyer.
    return quotes.filter(
      (q) =>
        q.slotTier !== 'RESERVE' ||
        !!(q.inquiry as any)?.reserveReleasedAt ||
        q.providerId === userId,
    );
  }

  async findByProvider(providerId: string): Promise<Quote[]> {
    return this.quotesRepository.find({
      where: { providerId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(id: string, status: string): Promise<Quote> {
    await this.quotesRepository.update(id, { status });
    const updated = await this.findOne(id);

    // Reserve auto-release: the buyer "didn't find the required item" —
    // every PRIMARY quote is now passed over (rejected/archived/superseded)
    // while unreleased RESERVE quotes exist → surface the reserve batch
    // without making the buyer hunt for a button. Fire-and-forget.
    if (updated?.inquiryId && ['REJECTED', 'ARCHIVED'].includes(status)) {
      this.maybeAutoReleaseReserve(updated.inquiryId).catch((e) =>
        this.logger.warn(
          `Reserve auto-release check failed for inquiry ${updated.inquiryId}: ${(e as Error).message}`,
        ),
      );
    }

    // Referral funnel (service/collection-trade path — no order row exists):
    // a completed/handed-over quote is that provider's trade_complete.
    // Fire-and-forget, never fails the status write.
    if (updated?.providerId && ['COMPLETED', 'HANDED_OVER'].includes(status)) {
      void this.funnelTrackingService
        .advanceStage(updated.providerId, 'trade_complete', { type: 'quote', id: updated.id })
        .catch((e) =>
          this.logger.warn(
            `Referral funnel advance failed for quote ${updated.id}: ${(e as Error).message}`,
          ),
        );
    }
    return updated;
  }

  private async maybeAutoReleaseReserve(inquiryId: string): Promise<void> {
    const rows: Array<{ activePrimary: number; reserve: number; released: boolean }> =
      await this.quotesRepository.query(
        `SELECT
           COUNT(*) FILTER (
             WHERE q."slotTier" = 'PRIMARY'
               AND q.status NOT IN ('REJECTED','ARCHIVED','SUPERSEDED')
           )::int AS "activePrimary",
           COUNT(*) FILTER (WHERE q."slotTier" = 'RESERVE')::int AS reserve,
           (i."reserveReleasedAt" IS NOT NULL) AS released
         FROM inquiries i
         LEFT JOIN quotes q ON q."inquiryId" = i.id
         WHERE i.id = $1
         GROUP BY i."reserveReleasedAt"`,
        [inquiryId],
      );
    const r = rows[0];
    if (!r || r.released || Number(r.reserve) === 0 || Number(r.activePrimary) > 0) return;
    await this.inquiriesService.releaseReserve(inquiryId, null);
  }

  async markAsRead(id: string): Promise<Quote> {
    await this.quotesRepository.update(id, { isRead: true });
    return this.findOne(id);
  }

  /**
   * Merge a buyer counter-offer into the quote's dynamicFields (loan
   * negotiation lives here — no new status enum). Read-modify-write so we keep
   * the lender's original terms alongside the counter.
   */
  async saveCounter(id: string, counter: any): Promise<Quote> {
    const quote = await this.findOne(id);
    const dynamicFields = { ...(quote?.dynamicFields || {}), counter };
    await this.quotesRepository.update(id, { dynamicFields });
    return this.findOne(id);
  }

  /** Shallow-merge a patch into the quote's dynamicFields (e.g. loan
   *  lifecycle acknowledgements). Preserves everything else. */
  async patchDynamicFields(id: string, patch: Record<string, any>): Promise<Quote> {
    const quote = await this.findOne(id);
    const dynamicFields = { ...(quote?.dynamicFields || {}), ...patch };
    await this.quotesRepository.update(id, { dynamicFields });
    return this.findOne(id);
  }

  async archive(id: string): Promise<Quote> {
    await this.quotesRepository.update(id, { isArchived: true });
    return this.findOne(id);
  }
}
