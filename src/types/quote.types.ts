// Quote types
export interface Quote {
  id: string;
  inquiryId: string;
  inquiryTitle: string;
  providerId: string;
  providerName: string;
  price: number;
  condition: string;
  message: string;
  status: QuoteStatus;
  expiryDuration?: string;
  isRead: boolean;
  itemPrices?: Record<string, number>[];
  createdAt: Date;
  updatedAt: Date;
}

export enum QuoteStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
  COMPLETED = 'COMPLETED',
}

export interface QuoteFilter {
  inquiryId?: string;
  status?: QuoteStatus;
  page?: number;
  limit?: number;
}
