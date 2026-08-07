import { apiClient } from './client';

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

export type AdPlacementLocation = 'HOMEPAGE_CENTER' | 'SECONDARY_SIDEBAR' | 'CATEGORY_SIDEBAR';

export const AD_PLACEMENTS: AdPlacementLocation[] = [
  'HOMEPAGE_CENTER',
  'SECONDARY_SIDEBAR',
  'CATEGORY_SIDEBAR',
];
export type AdMediaType = 'IMAGE' | 'VIDEO';
export type AdStatus = 'PENDING_PAYMENT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
export type EffectiveAdStatus = AdStatus | 'EXPIRED';

export interface Advertisement {
  id: string;
  sellerId: string;
  title: string;
  targetUrl: string;
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
  /** ZMW per day, whatever the placement — price scales with days only. */
  baseRatePerDay: number;
  discountTiers: AdDiscountTier[];
}

export interface CreateAdvertisementInput {
  title: string;
  targetUrl: string;
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
  instruction?: string;
}

/** Mirrors AdsService.priceFor so the create-ad form can show a live total
 *  before the server round-trip. Deliberately takes no placement argument —
 *  cost is a function of days alone. The server still recomputes. */
export function calculateAdPrice(durationDays: number, rates: AdPricingRates): number {
  const bestTier = [...rates.discountTiers]
    .filter((t) => durationDays >= t.minDays)
    .sort((a, b) => b.minDays - a.minDays)[0];
  const discount = bestTier ? bestTier.discountPercentage / 100 : 0;
  return Math.round(Number(rates.baseRatePerDay) * durationDays * (1 - discount) * 100) / 100;
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
