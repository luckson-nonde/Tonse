import { apiClient, uploadUrl } from './client';

/**
 * Client for the backend `/ads/*` surface — seller-purchased ad placements
 * (homepage center banner / secondary-page sidebar). Checkout reuses the
 * same PSP-collection engine as venture deposits: `checkoutAd` returns a
 * reference, then `getPaymentStatus`/`simulatePayment` poll/confirm it via
 * the generic `/payments/checkout/*` endpoints (see ventureService.ts for
 * the identical pattern). The backend wraps responses as
 * `{ statusCode, message, data }`.
 */
function payload<T>(res: any, fallback: T): T {
  return (res && 'data' in res ? res.data : res) ?? fallback;
}

/**
 * Make a stored ad media path renderable. New ads save an absolute URL, but
 * rows created before that fix hold a bare "/uploads/…". Kept as a named
 * re-export so the ad call sites read in their own vocabulary; the logic is
 * shared with promo tiles and anything else serving from /uploads.
 */
export const adMediaUrl = uploadUrl;

export type AdPlacementLocation =
  | 'HOMEPAGE_CENTER'
  | 'SECONDARY_SIDEBAR'
  | 'CATEGORY_SIDEBAR'
  | 'POPUP';

/** On-page placements — the ones that share one price and can be combined. */
export const AD_PLACEMENTS: AdPlacementLocation[] = [
  'HOMEPAGE_CENTER',
  'SECONDARY_SIDEBAR',
  'CATEGORY_SIDEBAR',
];

/** The Spotlight pop-up is a separate product at its own daily rate, so it is
 *  booked ALONE — the server rejects an ad that mixes it with the above. */
export const POPUP_PLACEMENT: AdPlacementLocation = 'POPUP';

export const isPopupPlacement = (placements: AdPlacementLocation[]): boolean =>
  placements.includes('POPUP');
export type AdMediaType = 'IMAGE' | 'VIDEO';
export type AdStatus = 'PENDING_PAYMENT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
export type EffectiveAdStatus = AdStatus | 'EXPIRED';

export interface Advertisement {
  id: string;
  sellerId: string;
  title: string;
  /** The seller's public shop-profile id — the `:id` in `/discover/:id`, where
   *  a click lands. Resolved server-side; sellers never type a URL. */
  shopProfileId: string | null;
  mediaType: AdMediaType;
  mediaUrl: string;
  videoDurationSeconds: number | null;
  /** Every place this ad runs — costs the same however many are ticked. */
  placements: AdPlacementLocation[];
  /** Master category slug this ad targets (category rail only); null = all categories. */
  targetCategoryId: string | null;
  startDate: string | null;
  endDate: string | null;
  durationDays: number;
  totalPaidAmount: number;
  currency: string;
  status: AdStatus;
  effectiveStatus?: EffectiveAdStatus;
  rejectionReason: string | null;
  approvedByAdminId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdDiscountTier {
  minDays: number;
  discountPercentage: number;
}

export interface AdPricingRates {
  /** ZMW per day for any ON-PAGE placement — price scales with days only. */
  baseRatePerDay: number;
  discountTiers: AdDiscountTier[];
  /** Whether the Spotlight pop-up product is on sale / being served at all. */
  popupEnabled?: boolean;
  /** ZMW per day for a Spotlight pop-up — the premium, interrupting product. */
  popupRatePerDay?: number;
  /** How many pop-ups one viewer may see inside popupMinMinutesBetween. */
  popupMaxPerSession?: number;
  popupMinMinutesBetween?: number;
}

/** Minimal public view of one ad — what the shop page shows a buyer who
 *  arrived by clicking it. */
export interface PublicAd {
  id: string;
  title: string;
  sellerId: string;
  shopProfileId: string | null;
}

export interface CreateAdvertisementInput {
  title: string;
  mediaType: AdMediaType;
  mediaUrl: string;
  videoDurationSeconds?: number;
  /** At least one. Ticking more costs nothing extra. */
  placements: AdPlacementLocation[];
  /** Only used when the category rail is among the placements; omit for all categories. */
  targetCategoryId?: string;
  /** Inclusive campaign window, `yyyy-MM-dd`. The server derives durationDays
   *  from these and recomputes the price — neither is client-supplied. */
  startDate: string;
  endDate: string;
}

export interface AdCheckoutResult {
  reference: string;
  status: string;
  amount: string;
  fee: string;
  totalCharged: string;
  /** Which adapter answered ('sandbox' | 'dpo') — picks the pending UI:
   *  simulate button vs the approve-on-phone polling card. */
  provider?: string;
  instruction?: string;
  /** Set by hosted-page providers (DPO) — the payer MUST be sent here or
   *  nothing is collected. Absent on the sandbox provider. */
  redirectUrl?: string;
}

/** Mirrors AdsService.priceFor so the create-ad form can show a live total
 *  before the server round-trip. Placement COUNT still doesn't matter, but
 *  KIND does: a Spotlight pop-up bills at its own premium daily rate. The
 *  server recomputes either way — this is only the preview. */
export function calculateAdPrice(
  durationDays: number,
  rates: AdPricingRates,
  placements: AdPlacementLocation[] = [],
): number {
  const bestTier = [...rates.discountTiers]
    .filter((t) => durationDays >= t.minDays)
    .sort((a, b) => b.minDays - a.minDays)[0];
  const discount = bestTier ? bestTier.discountPercentage / 100 : 0;
  const ratePerDay = isPopupPlacement(placements)
    ? Number(rates.popupRatePerDay ?? 0)
    : Number(rates.baseRatePerDay);
  return Math.round(ratePerDay * durationDays * (1 - discount) * 100) / 100;
}

/** Inclusive day count between two `yyyy-MM-dd` strings — the 10th to the
 *  10th is one day. Mirrors the server's derivation. */
export function countAdDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  return days > 0 ? days : 0;
}

export const adsService = {
  async getPricingRates(): Promise<AdPricingRates> {
    const res = await apiClient.get('/ads/pricing-rates');
    return payload<AdPricingRates>(res, { baseRatePerDay: 0, discountTiers: [] });
  },

  /** Public — no auth required. Empty array means "show the fallback banner".
   *  `categoryId` targets the CATEGORY_SIDEBAR rail at the category the buyer
   *  is browsing; ignored by the other placements. */
  async getActiveAds(placement: AdPlacementLocation, categoryId?: string): Promise<Advertisement[]> {
    const query = new URLSearchParams({ placement });
    if (categoryId) query.set('category', categoryId);
    const res = await apiClient.get(`/ads/active?${query.toString()}`);
    return payload<Advertisement[]>(res, []);
  },

  /**
   * Public — the ONE Spotlight pop-up this viewer should see right now, or
   * null when they've had their fill (server-side frequency cap) or nothing
   * is running. `viewer` is the account id when signed in, otherwise the
   * browser's anonymous key: guests are the audience, so they must be
   * rationed too. Never throws — a pop-up is the least important thing on
   * screen and must never surface an error to a shopper.
   */
  async getPopupAd(viewer: string, categoryId?: string): Promise<Advertisement | null> {
    try {
      const query = new URLSearchParams({ viewer });
      if (categoryId) query.set('category', categoryId);
      const res = await apiClient.get(`/ads/popup?${query.toString()}`);
      return payload<{ ad: Advertisement | null }>(res, { ad: null }).ad ?? null;
    } catch {
      return null;
    }
  },

  /** Attribution only — fire-and-forget, never blocks the click-through. */
  async recordPopupClick(adId: string, viewer: string): Promise<void> {
    try {
      await apiClient.post(`/ads/popup/${encodeURIComponent(adId)}/click`, { viewer });
    } catch {
      // Losing one attribution row must never cost the buyer their click.
    }
  },

  /** Public — the ad a buyer just clicked, so the shop page can name it. */
  async getPublicAd(id: string): Promise<PublicAd | null> {
    try {
      const res = await apiClient.get(`/ads/${encodeURIComponent(id)}`);
      return payload<PublicAd | null>(res, null);
    } catch {
      // A dead or removed ad id must never block the quote form.
      return null;
    }
  },

  async createAd(dto: CreateAdvertisementInput): Promise<Advertisement> {
    const res = await apiClient.post('/ads/create', dto);
    return payload<Advertisement>(res, {} as Advertisement);
  },

  async getMyAds(): Promise<Advertisement[]> {
    const res = await apiClient.get('/ads/my-ads');
    return payload<Advertisement[]>(res, []);
  },

  /** Start a PSP collection (mobile money / card) for a PENDING_PAYMENT ad. */
  async checkoutAd(adId: string, dto: { channel?: 'mobile-money' | 'card'; phone?: string; operator?: string }): Promise<AdCheckoutResult> {
    const res = await apiClient.post(`/ads/${encodeURIComponent(adId)}/checkout`, dto);
    return payload<AdCheckoutResult>(res, {} as AdCheckoutResult);
  },

  /** Pay straight out of the seller's venture balance — instant, no PSP round-trip. */
  async payFromBalance(adId: string): Promise<Advertisement> {
    const res = await apiClient.post(`/ads/${encodeURIComponent(adId)}/pay-from-balance`);
    return payload<Advertisement>(res, {} as Advertisement);
  },

  /** Poll a checkout's PSP status — the endpoint is reference-generic (shared
   *  with venture deposits / quote checkout). */
  async getPaymentStatus(reference: string): Promise<AdCheckoutResult> {
    const res = await apiClient.get(`/payments/checkout/${encodeURIComponent(reference)}`);
    return payload<AdCheckoutResult>(res, {} as AdCheckoutResult);
  },

  /** Sandbox-only: stand in for the seller approving on their phone. */
  async simulatePayment(reference: string, outcome: 'successful' | 'failed' = 'successful'): Promise<{ handled: boolean }> {
    const res = await apiClient.post(`/payments/checkout/${encodeURIComponent(reference)}/simulate`, { outcome });
    return payload(res, { handled: false });
  },
};
