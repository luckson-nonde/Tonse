// Inquiry types
export interface Inquiry {
  id: string;
  title: string;
  description: string;
  buyerId: string;
  category: string;
  location: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  items: InquiryItem[];
  preferences?: Record<string, any>;
  status: InquiryStatus;
  currentStage: InquiryStage;
  viewCount: number;
  isLabour: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InquiryItem {
  id: string;
  title: string;
  description: string;
  quantity: number;
  specifications?: Record<string, any>;
}

export enum InquiryStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum InquiryStage {
  QUOTATION = 'quotation',
  PURCHASE_ORDER = 'purchase_order',
  ORDER_CONFIRMATION = 'order_confirmation',
  DELIVERY = 'delivery_order',
  COMPLETED = 'completed',
}

export interface InquiryFilter {
  category?: string;
  status?: InquiryStatus;
  location?: string;
  page?: number;
  limit?: number;
}
