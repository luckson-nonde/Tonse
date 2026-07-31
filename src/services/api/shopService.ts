import { apiClient } from './client';

export interface ShopResult {
  id: string;
  sellerId: string;
  name: string;
  description: string;
  logo?: string;
  coverImage?: string;
  location: string;
  city?: string;
  province?: string;
  rating: number;
  reviewCount: number;
  followerCount: number;
  contactInfo?: Record<string, any>;
  socialLinks?: Record<string, string>;
  isActive: boolean;
  createdAt: string;
  /** Category IDs this provider serves (e.g. 'mobile-phones-repair') */
  categoryIds?: string[];
  /** Human-readable category names for display */
  categoryNames?: string[];
  /** Archetypes across this provider's categories (RETAIL, REPAIR, …) —
   *  powers the directory's "Select Service Type" filter. */
  archetypes?: string[];
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED' | 'INCOMPLETE';
  shopType?: 'SELLER' | 'SERVICE_PROVIDER';
  /** True when the shop has ≥1 active product listed. Gates the "Send
   *  Purchase Order" affordance — only shops with a catalog show it. */
  hasProducts?: boolean;
}

export interface ShopProfile extends Omit<ShopResult, 'socialLinks'> {
  companyName?: string;
  personalName?: string;
  email?: string;
  phone?: string;
  area?: string;
  socialLinks?: string;
  verifiedAt?: string;
  hasTpin?: boolean;
  subRole?: string;
  quoteStats?: { total: number; completed: number; active: number };
  recentActivity?: Array<{ inquiryTitle: string; price: number; status: string; createdAt: string }>;
}

export async function getShopProfile(profileId: string): Promise<ShopProfile | null> {
  try {
    const res = await apiClient.get<ShopProfile>(`/shops/${profileId}/profile`);
    return res.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchShops(filters: {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{ data: ShopResult[]; total: number }> {
  const params = new URLSearchParams({ isActive: 'true', limit: String(filters.limit ?? 50) });
  if (filters.search) params.set('search', filters.search);
  if (filters.category) params.set('category', filters.category);
  if (filters.page) params.set('page', String(filters.page));
  const res = await apiClient.get<{ data: ShopResult[]; total: number }>(`/shops?${params}`);
  return res.data ?? { data: [], total: 0 };
}

// ── Shop catalog (products a buyer can build a Purchase Order from) ──────

export interface ShopProduct {
  id: string;
  sellerId: string;
  name: string;
  description: string;
  category: string;
  subCategory?: string;
  /** Listed price — null/absent means "Price on request". Decimal columns
   *  arrive as strings from TypeORM; coerce before math. */
  price?: number | string | null;
  stock?: number;
  images?: string[];
  /** Optional promo/demo video for the listing. */
  youtubeUrl?: string | null;
  brand?: string;
  condition?: string;
  isActive?: boolean;
}

/** Every product in a shop's catalog (newest first). `sellerId` is the shop
 *  owner's users.id — ShopProfile.sellerId, NOT the profile row id. */
export async function fetchShopProducts(sellerId: string): Promise<ShopProduct[]> {
  try {
    const res = await apiClient.get<ShopProduct[]>(`/products/seller/${sellerId}`);
    const list = Array.isArray(res.data) ? res.data : [];
    return list.filter((p) => p.isActive !== false);
  } catch {
    return [];
  }
}

// ── Direct purchase (Buy Now on a priced, in-stock listing) ──────────────

export interface DirectOrderReceipt {
  quoteId: string;
  inquiryId: string;
  orderNumber: string;
  collectionCode: string;
  totalAmount: number;
  quantity: number;
  remainingStock: number;
}

/**
 * Buy a listing outright — the backend derives the amount from the listing,
 * decrements stock atomically, and lands a PAID order on the normal
 * escrow/collection rails. 409 = sold out / not enough stock.
 */
export async function buyProduct(productId: string, quantity: number): Promise<DirectOrderReceipt> {
  const res = await apiClient.post<DirectOrderReceipt>(`/products/${productId}/buy`, { quantity });
  return res.data!;
}

// ── Favorites (Browse Shops → Favorites) ────────────────────────────────
// Persisted per-user on the backend (shop_favorites). Keyed by ShopResult.id.

/** Ids of the shops the current buyer has favorited (most-recent first). */
export async function fetchFavoriteShopIds(): Promise<string[]> {
  try {
    const res = await apiClient.get<{ shopIds: string[] }>('/shops/me/favorites');
    return res.data?.shopIds ?? [];
  } catch {
    return [];
  }
}

/** Favorite a shop. Idempotent server-side (unique (userId, shopId) index). */
export async function favoriteShop(shopId: string): Promise<void> {
  await apiClient.post(`/shops/${shopId}/favorite`);
}

/** Remove a shop from the buyer's favorites. */
export async function unfavoriteShop(shopId: string): Promise<void> {
  await apiClient.delete(`/shops/${shopId}/favorite`);
}
