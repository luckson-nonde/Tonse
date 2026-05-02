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
  itemPrices?: any; // Stringified or array
  dynamicFields?: any; // Stringified or object
  delivery?: any; // Stringified or object
  processType?: 'EXPRESS' | 'STANDARD';
  
  quoteType?: 'ORIGINAL' | 'REVISION';
  parentQuoteId?: string;
  
  // Category-specific fields (flattened for convenience)
  securityDeposit?: number;
  maxCapacity?: number;
  numberOfWorkers?: number;
  availabilityDate?: string | Date;
  rateUnit?: string;
  cleaningFee?: number;
  damageDeposit?: number;
  venueSpaceId?: number;
  venueSpaceName?: string;
  
  createdAt: Date | string;
  updatedAt: Date | string;
}

export enum QuoteStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
  COMPLETED = 'COMPLETED',
  SUPERSEDED = 'SUPERSEDED',
}

export interface QuoteFilter {
  inquiryId?: string;
  status?: QuoteStatus;
  page?: number;
  limit?: number;
}
