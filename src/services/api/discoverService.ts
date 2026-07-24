/**
 * Public shop-directory reads for the /discover landing page.
 *
 * Deliberately bypasses `db.shops` (the Table shim in database.ts): that
 * shim is typed against the legacy `Shop` interface (numeric id, singular
 * `category`, `isVerified` boolean) which doesn't match what
 * GET /shops / GET /shops/:id/profile actually return (string profile ids,
 * `categoryIds`/`categoryNames` arrays, `verificationStatus` string, etc —
 * see ShopsService.findAll/findProfile). Both endpoints are already
 * unauthenticated, so no auth wiring is needed here.
 */
import { apiClient } from './client';

export interface DiscoverShop {
  id: string;
  sellerId: string;
  name: string;
  location: string;
  city?: string | null;
  province?: string | null;
  logo?: string | null;
  coverImage?: string | null;
  rating: number;
  reviewCount: number;
  categoryIds: string[];
  categoryNames: string[];
  archetypes?: string[];
  shopType: 'SELLER' | 'SERVICE_PROVIDER';
  verificationStatus?: string | null;
  hasProducts: boolean;
  createdAt: string;
}

export interface DiscoverShopProfile {
  id: string;
  sellerId: string;
  name: string;
  companyName?: string | null;
  personalName?: string | null;
  email?: string | null;
  phone?: string | null;
  logo?: string | null;
  coverImage?: string | null;
  city?: string | null;
  province?: string | null;
  area?: string | null;
  location: string;
  socialLinks?: Record<string, string> | null;
  verificationStatus?: string | null;
  verifiedAt?: string | null;
  hasTpin: boolean;
  subRole?: string | null;
  createdAt: string;
  shopType: 'SELLER' | 'SERVICE_PROVIDER';
  rating: number;
  reviewCount: number;
  categoryIds: string[];
  categoryNames: string[];
  hasProducts: boolean;
  quoteStats: { total: number; completed: number; active: number };
  recentActivity: { inquiryTitle: string; price: number; status: string; createdAt: string }[];
}

export interface DiscoverProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  images: string[];
  category?: string;
  stock?: number;
}

export async function fetchDiscoverShops(
  params: { search?: string; limit?: number } = {}
): Promise<DiscoverShop[]> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  query.set('limit', String(params.limit ?? 60));
  const res = await apiClient.get<{ data: DiscoverShop[]; total: number }>(
    `/shops?${query.toString()}`,
    { swr: true }
  );
  return res.data?.data ?? [];
}

export async function fetchDiscoverShopProfile(id: string): Promise<DiscoverShopProfile | null> {
  const res = await apiClient.get<DiscoverShopProfile>(`/shops/${id}/profile`, { swr: true });
  return res.data ?? null;
}

/** Decimal columns come back as strings from TypeORM — coerce before display/math. */
export function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function fetchDiscoverShopProducts(sellerId: string): Promise<DiscoverProduct[]> {
  const res = await apiClient.get<DiscoverProduct[]>(
    `/products/seller/${sellerId}`,
    { swr: true }
  );
  return res.data ?? [];
}

export interface DiscoverReview {
  id: string;
  reviewerUserId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export async function fetchDiscoverShopReviews(
  sellerId: string
): Promise<{ data: DiscoverReview[]; total: number; average: number }> {
  const res = await apiClient.get<{ data: DiscoverReview[]; total: number; average: number }>(
    `/shops/${sellerId}/reviews?limit=10`,
    { swr: true }
  );
  return res.data ?? { data: [], total: 0, average: 0 };
}
