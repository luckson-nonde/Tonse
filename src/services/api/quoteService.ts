/**
 * Quote API Service
 * Handles all quote-related API calls
 * Fetches quotes sent by providers in response to buyer inquiries
 */

import { apiClient } from './client';
import { robustParse } from '../../utils/jsonUtils';

export interface QuoteResponse {
  id: string;
  inquiryId: string;
  inquiryTitle: string;
  providerId: string;
  providerName: string;
  price: number;
  condition: string;
  message: string;
  status: string;
  expiryDuration?: string;
  isRead: boolean;
  isArchived: boolean;
  itemPrices?: any[];
  buyerContact?: any;
  collectionCode?: string;
  requirements?: any[];
  venueSpaceId?: string;
  venueSpaceName?: string;
  damageDeposit?: number;
  createdAt: string;
  updatedAt: string;
  inquiry?: any;
}

/**
 * Normalizes a quote from the backend, parsing all JSON strings
 */
function normalizeQuote(quote: any): QuoteResponse {
  if (!quote) return quote;

  return {
    ...quote,
    itemPrices: robustParse(quote.itemPrices, []),
    buyerContact: robustParse(quote.buyerContact, {}),
    requirements: robustParse(quote.requirements, []),
  };
}

/**
 * Fetch all quotes for the current user (buyer or provider)
 * Returns quotes the user is involved in (either as buyer or provider)
 */
export async function fetchUserQuotes(filters?: {
  inquiryId?: string;
  providerId?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<QuoteResponse[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.inquiryId) params.append('inquiryId', filters.inquiryId);
    if (filters?.providerId) params.append('providerId', filters.providerId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = `/quotes${queryString ? '?' + queryString : ''}`;

    const response = await apiClient.get<{ data: any[]; total: number }>(url);

    if (!response.data?.data) {
      return [];
    }

    const quotes = Array.isArray(response.data.data) ? response.data.data : [];
    return quotes.map(normalizeQuote);
  } catch (error) {
    console.error('Error fetching user quotes:', error);
    return [];
  }
}

/**
 * Fetch quotes for a specific inquiry (only for the inquiry's buyer)
 */
export async function fetchInquiryQuotes(inquiryId: string): Promise<QuoteResponse[]> {
  try {
    const response = await apiClient.get<any>(`/quotes/inquiry/${inquiryId}`);

    if (!Array.isArray(response.data)) {
      return [];
    }

    return response.data.map(normalizeQuote);
  } catch (error) {
    console.error('Error fetching inquiry quotes:', error);
    return [];
  }
}

/**
 * Fetch a single quote by ID (with authorization check on backend)
 */
export async function getQuote(quoteId: string): Promise<QuoteResponse> {
  try {
    const response = await apiClient.get<any>(`/quotes/${quoteId}`);

    if (!response.data) {
      throw new Error(response.message || 'Failed to fetch quote');
    }

    return normalizeQuote(response.data);
  } catch (error) {
    console.error('Error fetching quote:', error);
    throw error;
  }
}

/**
 * Update quote status (accept, reject, archive, etc.)
 */
export async function updateQuoteStatus(
  quoteId: string,
  status: 'ACCEPTED' | 'REJECTED' | 'ARCHIVED' | 'PENDING' | 'PAID' | 'COMPLETED' | 'HANDED_OVER'
): Promise<QuoteResponse> {
  try {
    const response = await apiClient.patch<any>(`/quotes/${quoteId}/status`, { status });

    if (!response.data) {
      throw new Error(response.message || 'Failed to update quote status');
    }

    return normalizeQuote(response.data);
  } catch (error) {
    console.error('Error updating quote status:', error);
    throw error;
  }
}

/**
 * Mark a quote as read by the buyer
 */
export async function markQuoteAsRead(quoteId: string): Promise<QuoteResponse> {
  try {
    const response = await apiClient.patch<any>(`/quotes/${quoteId}/read`, {});

    if (!response.data) {
      throw new Error(response.message || 'Failed to mark quote as read');
    }

    return normalizeQuote(response.data);
  } catch (error) {
    console.error('Error marking quote as read:', error);
    throw error;
  }
}

/**
 * Archive a quote
 */
export async function archiveQuote(quoteId: string): Promise<QuoteResponse> {
  try {
    const response = await apiClient.patch<any>(`/quotes/${quoteId}/archive`, {});

    if (!response.data) {
      throw new Error(response.message || 'Failed to archive quote');
    }

    return normalizeQuote(response.data);
  } catch (error) {
    console.error('Error archiving quote:', error);
    throw error;
  }
}
