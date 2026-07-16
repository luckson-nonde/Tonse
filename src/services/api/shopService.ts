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
