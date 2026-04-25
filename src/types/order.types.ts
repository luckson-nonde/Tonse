// Order types
export interface Order {
  id: string;
  quoteId: string;
  buyerId: string;
  sellerId: string;
  orderNumber: string;
  totalAmount: number;
  deliveryFee?: number;
  status: OrderStatus;
  shippingAddress?: string;
  items: OrderItem[];
  trackingNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface OrderFilter {
  status?: OrderStatus;
  page?: number;
  limit?: number;
}
