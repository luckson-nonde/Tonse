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

export type AdPlacementLocation =
  | 'HOMEPAGE_CENTER'
  | 'SECONDARY_SIDEBAR'
  | 'CATEGORY_SIDEBAR'
  | 'BUNDLE_ALL';
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
  placementLocation: AdPlacementLocation;
  /** Master category slug this ad targets (CATEGORY_SIDEBAR only); null = all categories. */
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
  baseRates: Record<AdPlacementLocation, number>;
  discountTiers: AdDiscountTier[];
}

export interface CreateAdvertisementInput {
  title: string;
  targetUrl: string;
  mediaType: AdMediaType;
  mediaUrl: string;
  videoDurationSeconds?: number;
  placementLocation: AdPlacementLocation;
  /** Only sent for CATEGORY_SIDEBAR; omit to run across all categories. */
  targetCategoryId?: string;
  durationDays: number;
}

export interface AdCheckoutResult {
  reference: string;
  status: string;
  amount: string;
  fee: string;
  totalCharged: string;
  instruction?: string;
}

/** Best-matching discount tier for a duration — mirrors AdsService.priceFor
 *  so the create-ad form can show a live total before the server round-trip. */
export function calculateAdPrice(
  placementLocation: AdPlacementLocation,
  durationDays: number,
  rates: AdPricingRates,
): number {
  const baseRate = Number(rates.baseRates[placementLocation] ?? 0);
  const bestTier = [...rates.discountTiers]
    .filter((t) => durationDays >= t.minDays)
    .sort((a, b) => b.minDays - a.minDays)[0];
  const discount = bestTier ? bestTier.discountPercentage / 100 : 0;
  return Math.round(baseRate * durationDays * (1 - discount) * 100) / 100;
}

export const adsService = {
  async getPricingRates(): Promise<AdPricingRates> {
    const res = await apiClient.get('/ads/pricing-rates');
    return payload<AdPricingRates>(res, { baseRates: {} as any, discountTiers: [] });
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
