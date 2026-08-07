import { apiClient } from './client';

/**
 * Client for the public `/storefront/*` surface — the merchandised landing
 * page: a Top Categories row and one grid of cards.
 *
 * The card grid deliberately arrives PRE-MERGED. The backend decides whether a
 * slot is filled by a best-selling product or an admin promo tile (best-sellers
 * claim slots first, tiles top up the rest), so the page never re-implements
 * that rule — it just renders `cards` in order.
 */
function payload<T>(res: any, fallback: T): T {
  return (res && 'data' in res ? res.data : res) ?? fallback;
}

export interface StorefrontCategory {
  id: string;
  name: string;
  productCount: number;
  shopCount: number;
}

export interface StorefrontCard {
  kind: 'PRODUCT' | 'PROMO';
  id: string;
  title: string;
  subtitle: string | null;
  /** PRODUCT: a base64 data URL, render as-is. PROMO: an `/uploads/…` path
   *  that must go through `uploadUrl()`. */
  imageUrl: string | null;
  price: number | null;
  badge: string | null;
  ctaLabel: string | null;
  backgroundColor: string | null;
  /** In-app path — feed it straight to `navigate()`. */
  href: string;
}

/** PROMO = nothing has sold yet, MIXED = some slots are real best-sellers,
 *  BESTSELLERS = the whole grid is earning its place. Descriptive only. */
export type StorefrontMode = 'PROMO' | 'MIXED' | 'BESTSELLERS';

export interface StorefrontHome {
  categories: StorefrontCategory[];
  cards: StorefrontCard[];
  mode: StorefrontMode;
}

const EMPTY_HOME: StorefrontHome = { categories: [], cards: [], mode: 'PROMO' };

export const storefrontService = {
  /** Public — no auth. Fails soft to an empty storefront: the landing page
   *  must still render its hero and shop rails if this endpoint is down. */
  async getHome(): Promise<StorefrontHome> {
    try {
      const res = await apiClient.get('/storefront/home', { swr: true });
      return payload<StorefrontHome>(res, EMPTY_HOME);
    } catch {
      return EMPTY_HOME;
    }
  },
};
