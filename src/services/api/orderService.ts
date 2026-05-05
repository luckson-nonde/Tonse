import { apiClient } from './client';

export interface OrderRecord {
  id: string;
  quoteId: string;
  buyerId: string;
  sellerId: string;
  orderNumber: string;
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderPayload {
  quoteId: string;
  buyerId: string;
  sellerId: string;
  totalAmount: number;
  notes?: string;
}

export async function createOrder(payload: CreateOrderPayload) {
  const res = await apiClient.post<OrderRecord>('/orders', payload);
  return res.data;
}

export async function fetchBuyerOrders(buyerId: string): Promise<OrderRecord[]> {
  const res = await apiClient.get<OrderRecord[]>(`/orders/buyer/${buyerId}`);
  return res.data ?? [];
}
