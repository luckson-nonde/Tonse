import { apiClient } from './client';

export interface CreateOrderPayload {
  quoteId: string;
  buyerId: string;
  sellerId: string;
  totalAmount: number;
  notes?: string;
}

export async function createOrder(payload: CreateOrderPayload) {
  const res = await apiClient.post<{ id: string; status: string }>('/orders', payload);
  return res.data;
}
