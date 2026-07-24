import { apiClient } from './client';

/** Shape of the related inquiry surfaced by the backend's order endpoints
 *  when relations are eager-loaded. We only depend on the buyer-supplied
 *  date attributes, the title, and the categories, so other fields stay
 *  loosely typed. */
export interface OrderInquirySnapshot {
  id: string;
  title?: string;
  categories?: string[];
  attributes?: Record<string, any>;
}

export interface OrderQuoteSnapshot {
  id: string;
  inquiryId?: string;
  inquiry?: OrderInquirySnapshot;
  /** Denormalized at quote creation — reliable seller display name. */
  providerName?: string;
  /** The real collection-flow status (PAID → PENDING_COLLECTION →
   *  AWAITING_PICKUP → COMPLETED/HANDED_OVER, driven by CollectionService's
   *  QR-code flow) — already eager-loaded by the backend's order endpoints
   *  (`relations: ['quote', ...]`), just not declared here until now. This
   *  is the field that actually tells you whether an order's item has been
   *  collected; `OrderRecord.status` never advances past its default
   *  `PENDING` in the live app. */
  status?: string;
}

export interface OrderUserSnapshot {
  id: string;
  fullName?: string;
  businessName?: string;
  email?: string;
}

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
  /** Populated when the backend eager-loads relations (buyer/seller order
   *  endpoints do this so the gig calendar can read the inquiry's
   *  buyer-indicated event date without a second roundtrip). */
  quote?: OrderQuoteSnapshot;
  buyer?: OrderUserSnapshot;
  seller?: OrderUserSnapshot;
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

export async function fetchSellerOrders(sellerId: string): Promise<OrderRecord[]> {
  const res = await apiClient.get<OrderRecord[]>(`/orders/seller/${sellerId}`);
  return res.data ?? [];
}
