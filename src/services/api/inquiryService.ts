/**
 * Inquiry API Service
 * Handles all inquiry-related API calls
 * NOTE: All data is persisted in PostgreSQL backend only - NO IndexedDB
 */

import { apiClient } from './client';
import { robustParse } from '../../utils/jsonUtils';

export interface CreateInquiryPayload {
  title: string;
  description: string;
  items: string; // JSON string
  category: string;
  location: string;
  latitude: number;
  longitude: number;
  radius: number;
  status: string;
  preferences: string; // JSON string
  attributes: string; // JSON string
  processType: string;
}

export interface InquiryResponse {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  latitude: number;
  longitude: number;
  radius: number;
  status: string;
  buyerId: string;
  createdAt: string;
  updatedAt: string;
  preferences?: any;
  attributes?: any;
  items?: any[];
  processType?: string;
  // Optional fields for display purposes
  buyerName?: string;
  viewCount?: number;
  entertainmentData?: any;
  repairData?: any;
}

/**
 * Normalizes an inquiry from the backend, parsing all JSON strings
 */
function normalizeInquiry(inquiry: any): InquiryResponse {
  if (!inquiry) return inquiry;
  
  return {
    ...inquiry,
    preferences: robustParse(inquiry.preferences, {}),
    attributes: robustParse(inquiry.attributes, {}),
    items: robustParse(inquiry.items, []),
    entertainmentData: robustParse(inquiry.entertainmentData, null),
    repairData: robustParse(inquiry.repairData, null),
  };
}

/**
 * Create a new inquiry via PostgreSQL backend
 */
export async function createInquiry(payload: CreateInquiryPayload): Promise<InquiryResponse> {
  try {
    const response = await apiClient.post<any>('/inquiries', payload);

    if (!response.data) {
      throw new Error(response.message || 'Failed to create inquiry');
    }

    return normalizeInquiry(response.data);
  } catch (error) {
    console.error('Error creating inquiry:', error);
    throw error;
  }
}

/**
 * Fetch all inquiries for current user from PostgreSQL backend
 */
export async function fetchUserInquiries(userId: string): Promise<InquiryResponse[]> {
  try {
    const response = await apiClient.get<{ data: any[]; total: number }>('/inquiries');

    if (!response.data?.data) {
      return [];
    }

    const leads = Array.isArray(response.data.data) ? response.data.data : [];
    return leads.map(normalizeInquiry);
  } catch (error) {
    console.error('Error fetching user inquiries:', error);
    return [];
  }
}

/**
 * Fetch all open inquiries (for providers viewing leads)
 */
export async function fetchOpenInquiries(): Promise<InquiryResponse[]> {
  try {
    const response = await apiClient.get<{ data: any[]; total: number }>(
      '/inquiries?status=OPEN'
    );

    if (!response.data?.data) {
      return [];
    }

    const leads = Array.isArray(response.data.data) ? response.data.data : [];
    return leads.map(normalizeInquiry);
  } catch (error) {
    console.error('Error fetching open inquiries:', error);
    return [];
  }
}

/**
 * Fetch a single inquiry by ID
 */
export async function getInquiry(inquiryId: string): Promise<InquiryResponse> {
  try {
    const response = await apiClient.get<any>(`/inquiries/${inquiryId}`);

    if (!response.data) {
      throw new Error(response.message || 'Failed to fetch inquiry');
    }

    return normalizeInquiry(response.data);
  } catch (error) {
    console.error('Error fetching inquiry:', error);
    throw error;
  }
}

/**
 * Update an inquiry status
 */
export async function updateInquiryStatus(
  inquiryId: string,
  status: string
): Promise<InquiryResponse> {
  try {
    const response = await apiClient.patch<any>(`/inquiries/${inquiryId}`, { status });

    if (!response.data) {
      throw new Error(response.message || 'Failed to update inquiry');
    }

    return normalizeInquiry(response.data);
  } catch (error) {
    console.error('Error updating inquiry:', error);
    throw error;
  }
}

/**
 * Delete an inquiry
 */
export async function deleteInquiry(inquiryId: string): Promise<void> {
  try {
    await apiClient.delete(`/inquiries/${inquiryId}`);
  } catch (error) {
    console.error('Error deleting inquiry:', error);
    throw error;
  }
}

/**
 * Records a "provider opened this inquiry" view event.
 *
 * Backend ignores the call when the viewer is a buyer/admin or the inquiry
 * owner — see `InquiriesController.recordView`. So it's safe to call even
 * for non-provider routes; the server is the source of truth for whether to
 * actually count it.
 *
 * Returns the post-increment view count (or the unchanged count if the
 * server decided not to count this hit). Errors are swallowed because view
 * tracking is best-effort and shouldn't block the UI.
 */
export async function recordInquiryView(
  inquiryId: string | number
): Promise<{ viewCount: number; counted: boolean } | null> {
  try {
    const response = await apiClient.post<{ viewCount: number; counted: boolean }>(
      `/inquiries/${inquiryId}/view`
    );
    if (!response.data) return null;
    return {
      viewCount: Number(response.data.viewCount ?? 0),
      counted: Boolean(response.data.counted),
    };
  } catch (error) {
    console.warn('recordInquiryView failed (non-fatal):', error);
    return null;
  }
}


export interface CreateInquiryPayload {
  title: string;
  description: string;
  items: string; // JSON string
  category: string;
  location: string;
  latitude: number;
  longitude: number;
  radius: number;
  status: string;
  preferences: string; // JSON string
  attributes: string; // JSON string
  processType: string;
}
