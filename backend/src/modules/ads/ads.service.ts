import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { AdSettings, AdDiscountTier } from './entities/ad-settings.entity';
import {
  Advertisement,
  AdPlacementLocation,
  EffectiveAdStatus,
  ON_PAGE_PLACEMENTS,
} from './entities/advertisement.entity';
import { AdPopupImpression } from './entities/ad-popup-impression.entity';
import { CreateAdvertisementDto } from './dto/create-advertisement.dto';
import { UpdateAdSettingsDto } from './dto/update-ad-settings.dto';
import { LedgerService } from '../ledger/ledger.service';
import { ACCOUNT } from '../ledger/ledger-accounts';
import { toNgwee } from '../../common/money/money';

/** ONE rate for every ON-PAGE placement: a banner ad is priced on how many
 *  DAYS it runs, never on how many of them it appears in, so ticking more
 *  on-page placements is free. Pop-ups are the exception — see below. */
const DEFAULT_BASE_RATE_PER_DAY = 8;

/** Pop-ups interrupt the screen, so they are the premium product and carry
 *  their own (higher) daily rate — see AdSettings.popupRatePerDay. */
const DEFAULT_POPUP_RATE_PER_DAY = 25;

/** True when this ad is the interrupting Spotlight pop-up rather than an
 *  on-page banner. Drives which daily rate applies. */
export function isPopupAd(placements: AdPlacementLocation[] | null | undefined): boolean {
  return (placements ?? []).includes('POPUP');
}

const DEFAULT_DISCOUNT_TIERS: AdDiscountTier[] = [
  { minDays: 30, discountPercentage: 15 },
  { minDays: 180, discountPercentage: 20 },
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parse a `yyyy-MM-dd` (what DateTimePicker's date mode emits) into a local
 *  Date at the given edge of that day. Built from parts rather than
 *  `new Date(str)` — the latter parses a bare date as UTC midnight, which
 *  lands on the previous day for anyone behind UTC. */
function parseDayBoundary(value: string, edge: 'start' | 'end'): Date {
  const [y, m, d] = value.split('-').map(Number);
  return edge === 'start'
    ? new Date(y, m - 1, d, 0, 0, 0, 0)
    : new Date(y, m - 1, d, 23, 59, 59, 999);
}

/** Whole days between two day-starts. */
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

/** APPROVED but past its window reads as EXPIRED — never persisted, computed
 *  on every read (same "stored-only" convention as billing subscriptions). */
export function effectiveAdStatus(ad: Advertisement): EffectiveAdStatus {
  if (ad.status === 'APPROVED' && ad.endDate && ad.endDate.getTime() < Date.now()) {
    return 'EXPIRED';
  }
  return ad.status;
}

@Injectable()
export class AdsService {
  constructor(
    @InjectRepository(AdSettings)
    private readonly settingsRepository: Repository<AdSettings>,
    @InjectRepository(Advertisement)
    private readonly ads: Repository<Advertisement>,
    @InjectRepository(AdPopupImpression)
    private readonly popupImpressions: Repository<AdPopupImpression>,
    private readonly ledger: LedgerService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * The seller's public shop-profile row id — what `/discover/:id` takes.
   * Queried by userId rather than read off `users.activeProfileId`, because a
   * seller who has switched to their personal/buyer persona has a BUYER row
   * pointed at there, and an ad must always link to their SHOP.
   */
  private async resolveShopProfileId(sellerId: string): Promise<string | null> {
    const [row] = await this.dataSource.query(
      `SELECT id FROM seller_profiles WHERE "userId" = $1
       UNION ALL
       SELECT id FROM service_provider_profiles WHERE "userId" = $1
       LIMIT 1`,
      [sellerId],
    );
    return row?.id ?? null;
  }

  async getOrCreateSettings(): Promise<AdSettings> {
    const existing = await this.settingsRepository.find({ take: 1 });
    if (existing.length > 0) return existing[0];
    return this.settingsRepository.save(
      this.settingsRepository.create({
        baseRatePerDay: DEFAULT_BASE_RATE_PER_DAY,
        discountTiers: DEFAULT_DISCOUNT_TIERS,
      }),
    );
  }

  async getPricingRatesPublic() {
    const settings = await this.getOrCreateSettings();
    return {
      // Coerced: pg hands decimals back as strings, and the frontend multiplies
      // this straight into a running total.
      baseRatePerDay: Number(settings.baseRatePerDay ?? DEFAULT_BASE_RATE_PER_DAY),
      discountTiers: settings.discountTiers?.length ? settings.discountTiers : DEFAULT_DISCOUNT_TIERS,
      // Pop-up ("Spotlight") — its own premium rate, same coercion rule.
      popupEnabled: settings.popupEnabled ?? true,
      popupRatePerDay: Number(settings.popupRatePerDay ?? DEFAULT_POPUP_RATE_PER_DAY),
      popupMaxPerSession: Number(settings.popupMaxPerSession ?? 1),
      popupMinMinutesBetween: Number(settings.popupMinMinutesBetween ?? 360),
    };
  }

  async updatePricingSettings(dto: UpdateAdSettingsDto): Promise<AdSettings> {
    const settings = await this.getOrCreateSettings();
    if (dto.baseRatePerDay !== undefined) settings.baseRatePerDay = dto.baseRatePerDay;
    if (dto.discountTiers !== undefined) settings.discountTiers = dto.discountTiers;
    if (dto.popupEnabled !== undefined) settings.popupEnabled = dto.popupEnabled;
    if (dto.popupRatePerDay !== undefined) settings.popupRatePerDay = dto.popupRatePerDay;
    if (dto.popupMaxPerSession !== undefined) settings.popupMaxPerSession = dto.popupMaxPerSession;
    if (dto.popupMinMinutesBetween !== undefined) {
      settings.popupMinMinutesBetween = dto.popupMinMinutesBetween;
    }
    return this.settingsRepository.save(settings);
  }

  /** `ratePerDay * days * (1 - bestTierDiscount)`, ZMW rounded to 2dp.
   *  The best tier is the largest minDays the duration actually clears.
   *  Placement COUNT is deliberately not a factor; placement KIND is — a
   *  pop-up bills at the premium rate (see calculatePrice). */
  private priceFor(durationDays: number, ratePerDay: number, tiers: AdDiscountTier[]): number {
    const bestTier = [...tiers]
      .filter((t) => durationDays >= t.minDays)
      .sort((a, b) => b.minDays - a.minDays)[0];
    const discount = bestTier ? bestTier.discountPercentage / 100 : 0;
    const total = ratePerDay * durationDays * (1 - discount);
    return Math.round(total * 100) / 100;
  }

  /** Placement-aware: pop-ups bill at `popupRatePerDay`, everything else at
   *  `baseRatePerDay`. Safe to pass an empty/omitted list — that's a banner. */
  async calculatePrice(
    durationDays: number,
    placements: AdPlacementLocation[] = [],
  ): Promise<number> {
    const rates = await this.getPricingRatesPublic();
    const ratePerDay = isPopupAd(placements) ? rates.popupRatePerDay : rates.baseRatePerDay;
    return this.priceFor(durationDays, ratePerDay, rates.discountTiers);
  }

  async createDraftAd(sellerId: string, dto: CreateAdvertisementDto): Promise<Advertisement> {
    if (dto.mediaType === 'VIDEO' && (dto.videoDurationSeconds ?? 0) > 15) {
      throw new BadRequestException('Video length exceeds the 15-second maximum limit.');
    }

    // A pop-up is a DIFFERENT PRODUCT at a different price, and an ad row
    // carries exactly one price — so it cannot also be a banner. Rejecting the
    // mix here (rather than silently charging one rate for both) is what keeps
    // "what you were quoted" and "what you bought" the same thing.
    if (isPopupAd(dto.placements)) {
      const alsoOnPage = dto.placements.filter((p) => ON_PAGE_PLACEMENTS.includes(p));
      if (alsoOnPage.length > 0) {
        throw new BadRequestException(
          'A Spotlight pop-up is booked on its own — create a separate ad for on-page placements.',
        );
      }
      const { popupEnabled } = await this.getPricingRatesPublic();
      if (!popupEnabled) {
        throw new BadRequestException('Spotlight pop-up ads are not available at the moment.');
      }
    }

    const startDate = parseDayBoundary(dto.startDate, 'start');
    const endDate = parseDayBoundary(dto.endDate, 'end');
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Start and end dates must be real calendar dates.');
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate.getTime() < today.getTime()) {
      throw new BadRequestException('The start date cannot be in the past.');
    }
    if (endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException('The end date must be on or after the start date.');
    }

    // Inclusive: the 10th to the 10th is one full day of advertising.
    const durationDays = daysBetween(startDate, parseDayBoundary(dto.endDate, 'start')) + 1;
    const totalPaidAmount = await this.calculatePrice(durationDays, dto.placements);

    const ad = this.ads.create({
      sellerId,
      title: dto.title,
      // Where the click lands: this seller's own shop quote form.
      shopProfileId: await this.resolveShopProfileId(sellerId),
      mediaType: dto.mediaType,
      mediaUrl: dto.mediaUrl,
      videoDurationSeconds: dto.mediaType === 'VIDEO' ? dto.videoDurationSeconds ?? null : null,
      placements: dto.placements,
      // Targeting only applies to the category rail; ignore it otherwise so a
      // homepage-only ad can't be silently scoped to one category.
      targetCategoryId: dto.placements.includes('CATEGORY_SIDEBAR')
        ? dto.targetCategoryId ?? null
        : null,
      startDate,
      endDate,
      durationDays,
      totalPaidAmount,
      currency: 'ZMW',
      status: 'PENDING_PAYMENT',
    });
    return this.ads.save(ad);
  }

  /**
   * The few fields a buyer landing from an ad needs — deliberately NOT the
   * whole row: this is unauthenticated, so pricing and payment status stay
   * private. 404s rather than leaking the existence of another seller's draft.
   */
  async getPublicAd(id: string): Promise<{ id: string; title: string; sellerId: string; shopProfileId: string | null }> {
    const ad = await this.ads.findOne({ where: { id } });
    if (!ad) throw new NotFoundException('Advertisement not found');
    return { id: ad.id, title: ad.title, sellerId: ad.sellerId, shopProfileId: ad.shopProfileId };
  }

  async listMyAds(sellerId: string): Promise<Array<Advertisement & { effectiveStatus: EffectiveAdStatus }>> {
    const rows = await this.ads.find({ where: { sellerId }, order: { createdAt: 'DESC' } });
    return rows.map((ad) => ({ ...ad, effectiveStatus: effectiveAdStatus(ad) }));
  }

  /** Pay for a PENDING_PAYMENT ad straight out of the seller's venture
   *  balance — an internal transfer, so no PSP round-trip is needed. */
  async payFromBalance(sellerId: string, adId: string): Promise<Advertisement> {
    const ad = await this.ads.findOne({ where: { id: adId } });
    if (!ad) throw new NotFoundException('Advertisement not found');
    if (ad.sellerId !== sellerId) throw new ForbiddenException('This ad is not yours to pay for');
    if (ad.status !== 'PENDING_PAYMENT') {
      throw new ConflictException(`This ad can't be paid from status ${ad.status}`);
    }

    const balance = await this.ledger.sellerBalance(sellerId);
    if (Number(balance) < Number(ad.totalPaidAmount)) {
      throw new BadRequestException('Insufficient account balance');
    }

    const amountNgwee = toNgwee(String(ad.totalPaidAmount));
    await this.ledger.postJournal({
      type: 'AD_PURCHASE',
      idempotencyKey: `ad-balance-payment:${ad.id}`,
      currency: ad.currency,
      description: `Advertisement placement purchase — ${ad.title}`,
      memo: { adId: ad.id, source: 'VENTURE_BALANCE' },
      lines: [
        { accountCode: ACCOUNT.SELLER_PAYABLE, direction: 'DEBIT', amountNgwee, counterpartyId: sellerId },
        { accountCode: ACCOUNT.AD_REVENUE, direction: 'CREDIT', amountNgwee },
      ],
    });

    ad.status = 'PENDING_APPROVAL';
    return this.ads.save(ad);
  }

  async listPending(): Promise<Advertisement[]> {
    return this.ads.find({ where: { status: 'PENDING_APPROVAL' }, order: { createdAt: 'ASC' } });
  }

  async approve(id: string, adminId: string): Promise<Advertisement> {
    const ad = await this.ads.findOne({ where: { id } });
    if (!ad) throw new NotFoundException('Advertisement not found');
    if (ad.status !== 'PENDING_APPROVAL') {
      throw new ConflictException(`Only a pending-approval ad can be approved (currently ${ad.status})`);
    }
    // Honour the seller's chosen window when it's still ahead of us; if review
    // ran past their start date, slide the whole window forward so they keep
    // every day they paid for. A slow queue must never cost the seller time.
    const now = new Date();
    const requestedStart = ad.startDate ?? now;
    const start = requestedStart.getTime() > now.getTime() ? requestedStart : now;
    const end = new Date(start.getTime() + ad.durationDays * MS_PER_DAY);

    ad.status = 'APPROVED';
    ad.startDate = start;
    ad.endDate = end;
    ad.approvedByAdminId = adminId;
    ad.rejectionReason = null;
    return this.ads.save(ad);
  }

  /** Rejects a paid ad AND credits the seller's venture balance back — the
   *  "refunded/credited" half of the spec, done as a straight ledger credit
   *  rather than a real PSP refund (payments are simulated in this app). */
  async reject(id: string, adminId: string, reason: string): Promise<Advertisement> {
    const ad = await this.ads.findOne({ where: { id } });
    if (!ad) throw new NotFoundException('Advertisement not found');
    if (ad.status !== 'PENDING_APPROVAL') {
      throw new ConflictException(`Only a pending-approval ad can be rejected (currently ${ad.status})`);
    }

    const amountNgwee = toNgwee(String(ad.totalPaidAmount));
    await this.ledger.postJournal({
      type: 'AD_REJECTED_REFUND',
      idempotencyKey: `ad-reject-refund:${ad.id}`,
      currency: ad.currency,
      description: `Advertisement rejected — refunded to venture balance: ${ad.title}`,
      memo: { adId: ad.id, reason },
      lines: [
        { accountCode: ACCOUNT.AD_REVENUE, direction: 'DEBIT', amountNgwee },
        { accountCode: ACCOUNT.SELLER_PAYABLE, direction: 'CREDIT', amountNgwee, counterpartyId: ad.sellerId },
      ],
    });

    ad.status = 'REJECTED';
    ad.rejectionReason = reason || 'No reason provided';
    ad.approvedByAdminId = adminId;
    return this.ads.save(ad);
  }

  /**
   * Public read for the homepage / secondary-page / category-rail carousels —
   * APPROVED ads currently inside their live window whose `placements` list
   * includes this slot.
   *
   * The placement match is a JS filter on the loaded rows, not SQL: json
   * arrays in this codebase are always filtered after load (see the invariant
   * in jobs.service.ts). Live ads are a small set — the date/status predicates
   * do the real narrowing in SQL first.
   *
   * `categoryId` narrows the CATEGORY_SIDEBAR rail to what the buyer is
   * actually browsing: ads targeting that category, plus untargeted ones
   * (targetCategoryId NULL) so the rail is never empty in a category no one
   * has bought yet. Targeted ads are returned FIRST — they paid for this
   * audience, so they lead the rotation.
   */
  async getActiveAdsForPlacement(
    placementLocation: AdPlacementLocation,
    categoryId?: string,
  ): Promise<Advertisement[]> {
    const now = new Date();
    const liveRows = await this.ads.find({
      where: { status: 'APPROVED', startDate: LessThanOrEqual(now), endDate: MoreThanOrEqual(now) },
    });

    const rows = liveRows.filter((a) => (a.placements ?? []).includes(placementLocation));
    if (placementLocation !== 'CATEGORY_SIDEBAR') return rows;

    const targeted = rows.filter((a) => !!categoryId && a.targetCategoryId === categoryId);
    const untargeted = rows.filter((a) => !a.targetCategoryId);
    return [...targeted, ...untargeted];
  }

  // ── Spotlight pop-ups ──────────────────────────────────────────────────

  /**
   * Pick the ONE pop-up to show this viewer right now — or nothing.
   *
   * Three rules, in order:
   *   1. RATIONING. If this viewer has already been shown `popupMaxPerSession`
   *      pop-ups inside the last `popupMinMinutesBetween` minutes, return null.
   *      This is the whole "don't be annoying" guarantee and it is enforced
   *      server-side, so clearing browser storage cannot buy more.
   *   2. RELEVANCE. A pop-up targeting the category the viewer is actually
   *      browsing beats an untargeted one. Untargeted ads stay eligible, so a
   *      category nobody bought still shows something.
   *   3. FAIRNESS. Among equals, show whichever this viewer saw LEAST recently
   *      (never-seen first), tie-broken by fewest impressions overall so a
   *      brand-new advertiser catches up instead of starving behind an
   *      incumbent. That is the round-robin.
   *
   * Recording the impression here — at hand-out — is what makes both the
   * rationing and the rotation real. See AdPopupImpression for the trade-off.
   */
  async pickPopupForViewer(
    viewerKey: string,
    categoryId?: string,
  ): Promise<Advertisement | null> {
    const key = (viewerKey || '').trim().slice(0, 64);
    if (!key) return null;

    const rates = await this.getPricingRatesPublic();
    if (!rates.popupEnabled) return null;

    // 1. Rationing.
    const windowStart = new Date(Date.now() - rates.popupMinMinutesBetween * 60 * 1000);
    const shownRecently = await this.popupImpressions.count({
      where: { viewerKey: key, shownAt: MoreThanOrEqual(windowStart) },
    });
    if (shownRecently >= rates.popupMaxPerSession) return null;

    const now = new Date();
    const live = await this.ads.find({
      where: { status: 'APPROVED', startDate: LessThanOrEqual(now), endDate: MoreThanOrEqual(now) },
    });
    // json column → filter in JS, never in SQL (repo invariant).
    const candidates = live.filter((a) => isPopupAd(a.placements));
    if (candidates.length === 0) return null;

    // 2. Relevance: targeted-at-this-category first, else the untargeted pool.
    const targeted = categoryId
      ? candidates.filter((a) => a.targetCategoryId === categoryId)
      : [];
    const pool = targeted.length > 0
      ? targeted
      : candidates.filter((a) => !a.targetCategoryId || !categoryId);
    const finalPool = pool.length > 0 ? pool : candidates;

    // 3. Fairness, decided in one indexed query over a small id set.
    const ids = finalPool.map((a) => a.id);
    const [ranked]: Array<{ adId: string }> = await this.dataSource.query(
      `SELECT a.id AS "adId",
              MAX(i."shownAt") FILTER (WHERE i."viewerKey" = $1) AS "lastSeen",
              COUNT(i.id) AS "totalShown"
         FROM advertisements a
         LEFT JOIN ad_popup_impressions i ON i."adId" = a.id
        WHERE a.id = ANY($2::uuid[])
        GROUP BY a.id
        ORDER BY "lastSeen" ASC NULLS FIRST, "totalShown" ASC, a."createdAt" ASC
        LIMIT 1`,
      [key, ids],
    );
    const chosen = finalPool.find((a) => a.id === ranked?.adId) ?? finalPool[0];

    await this.popupImpressions.save(
      this.popupImpressions.create({ adId: chosen.id, viewerKey: key }),
    );
    return chosen;
  }

  /** Attribute a click to this viewer's most recent impression of the ad.
   *  Best-effort: a missing impression row must never fail the navigation. */
  async recordPopupClick(adId: string, viewerKey: string): Promise<void> {
    const key = (viewerKey || '').trim().slice(0, 64);
    if (!key) return;
    const [latest] = await this.popupImpressions.find({
      where: { adId, viewerKey: key },
      order: { shownAt: 'DESC' },
      take: 1,
    });
    if (!latest || latest.clickedAt) return;
    latest.clickedAt = new Date();
    await this.popupImpressions.save(latest);
  }

  /** Impressions only answer "recently" — anything older is cost without
   *  value. Called from the boot sweep. Returns rows removed. */
  async prunePopupImpressions(olderThanDays = 30): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * MS_PER_DAY);
    const res = await this.popupImpressions
      .createQueryBuilder()
      .delete()
      .where('"shownAt" < :cutoff', { cutoff })
      .execute();
    return res.affected ?? 0;
  }
}
