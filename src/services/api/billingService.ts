/**
 * Billing API service — platform monetization switch + prices.
 *
 * One admin-owned singleton (billing_settings) drives two things:
 *   - the buyer per-inquiry quotation fee (tiered by quote count), and
 *   - the shop monthly subscription (SubscriptionPaywall).
 *
 * Fail-safe directions are ASYMMETRIC on purpose:
 *   - getBillingSettings falls back to the historical PAID defaults, so a
 *     fetch hiccup can never accidentally waive fees platform-wide;
 *   - getMySubscription returns null on failure ("unknown"), and the
 *     paywall treats null as "don't block" — a hiccup must never lock a
 *     legitimate shop out of its own dashboard.
 *
 * Local types only — do NOT reuse `Transaction` from src/types.ts (its
 * status union predates the real backend Payment enum).
 */

import { apiClient } from './client';

export interface QuoteTier {
  count: number;
  price: number;
}

export interface BillingSettingsPublic {
  subscriptionsEnabled: boolean;
  quoteTiers: QuoteTier[];
  targetedInquiryFee: number;
  monthlyFee: number;
  /** Job-board posting fee (independent switch). Display-only on the client —
   *  the server decides whether a new posting parks at PENDING_PAYMENT. */
  jobPostingFeeEnabled: boolean;
  jobPostingFee: number;
}

export interface MySubscriptionStatus {
  enabled: boolean;
  active: boolean;
  paidUntil: string | null;
  monthlyFee: number;
}

/** Mirror of the backend seed — the tiers InquiryPreferences hardcoded before. */
export const DEFAULT_QUOTE_TIERS: QuoteTier[] = [
  { count: 5, price: 10 },
  { count: 10, price: 15 },
  { count: 20, price: 20 },
  { count: 30, price: 25 },
  { count: 40, price: 30 },
  { count: 50, price: 35 },
  { count: 60, price: 40 },
  { count: 70, price: 45 },
];

const FALLBACK_SETTINGS: BillingSettingsPublic = {
  subscriptionsEnabled: true, // fail toward today's paid behaviour
  quoteTiers: DEFAULT_QUOTE_TIERS,
  targetedInquiryFee: 10,
  monthlyFee: 100,
  // Fails toward FREE display on purpose: this pair only powers "you'll pay
  // K__" notices — the server alone decides whether a posting needs payment,
  // so a fetch hiccup must not scare posters with a fee that may be off.
  jobPostingFeeEnabled: false,
  jobPostingFee: 50,
};

const CACHE_TTL_MS = 60_000;
let cached: BillingSettingsPublic | null = null;
let cachedAt = 0;
let inflight: Promise<BillingSettingsPublic> | null = null;

export async function getBillingSettings(force = false): Promise<BillingSettingsPublic> {
  if (!force && cached && Date.now() - cachedAt < CACHE_TTL_MS) return cached;
  if (inflight) return inflight;
  inflight = apiClient
    .get<BillingSettingsPublic>('/billing/settings')
    .then((res) => {
      const settings = res.data ?? FALLBACK_SETTINGS;
      cached = settings;
      cachedAt = Date.now();
      return settings;
    })
    .catch(() => cached ?? FALLBACK_SETTINGS)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** null = fetch failed / unknown. Callers must NOT read null as "not paying". */
export async function getMySubscription(): Promise<MySubscriptionStatus | null> {
  try {
    const res = await apiClient.get<MySubscriptionStatus>('/billing/subscription/me');
    return res.data ?? null;
  } catch {
    return null;
  }
}

/** Simulated renewal — backend charges the CURRENT monthly fee regardless of `amount`. */
export async function payMySubscription(payload: {
  amount: number;
  method: string;
  provider?: string;
  phone?: string;
}): Promise<MySubscriptionStatus> {
  const res = await apiClient.post<MySubscriptionStatus>('/billing/subscription/pay', payload);
  if (!res.data) throw new Error('Payment did not return a subscription status — please refresh.');
  return res.data;
}
