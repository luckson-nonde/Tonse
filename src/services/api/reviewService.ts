/**
 * Shop reviews API. A buyer can rate a shop once per DELIVERED/COMPLETED
 * order (the server enforces the order gate); the aggregates flow into
 * the shop directory cards and the shop profile.
 *
 * sellerUserId is the provider's users.id (ShopResult.sellerId) — NOT the
 * profile row id (ShopResult.id). Same trap as the Report feature.
 */

import { apiClient } from './client';

export interface ShopReview {
  id: string;
  reviewerUserId: string;
  orderId: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  reviewerName?: string | null;
}

export const reviewService = {
  async submit(
    sellerUserId: string,
    payload: { orderId: string; rating: number; comment?: string }
  ): Promise<ShopReview | null> {
    const res = await apiClient.post<ShopReview>(`/shops/${sellerUserId}/reviews`, payload);
    return res.data ?? null;
  },

  async fetchForShop(
    sellerUserId: string,
    params: { page?: number; limit?: number } = {}
  ): Promise<{ data: ShopReview[]; total: number; average: number }> {
    const search = new URLSearchParams();
    if (params.page) search.set('page', String(params.page));
    if (params.limit) search.set('limit', String(params.limit));
    const qs = search.toString();
    const res = await apiClient.get<{ data: ShopReview[]; total: number; average: number }>(
      `/shops/${sellerUserId}/reviews${qs ? `?${qs}` : ''}`
    );
    return res.data ?? { data: [], total: 0, average: 0 };
  },
};
