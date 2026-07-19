/**
 * Inquiry API Service
 * Handles all inquiry-related API calls
 * NOTE: All data is persisted in PostgreSQL backend only - NO IndexedDB
 */

import { apiClient, type QueueableOptions } from './client';
import { robustParse } from '../../utils/jsonUtils';

export interface CreateInquiryPayload {
  title: string;
  description: string;
  items: string; // JSON string
  /**
   * Stable category IDs from the catalog (e.g. 'mobile-phones-buy').
   * Replaces the old comma-joined display-name string. Each id lands
   * as its own row in `inquiry_categories`; matching expands ancestry
   * server-side, so a seller subscribed to parent 'electronics'
   * matches a 'mobile-phones-buy' inquiry without any string parsing.
   */
  categoryIds: string[];
  /** Human-readable "City, Province" for display. */
  location: string;
  /** Province + city are the matching scope. The city is the destination
   *  the inquiry resolves against; without coords below, the backend
   *  broadcasts to every provider in this city. */
  province?: string;
  city?: string;
  /** Optional coordinate refinement. When set, the backend narrows
   *  matching to providers within `radius` km of the point. */
  latitude?: number;
  longitude?: number;
  radius?: number;
  status: string;
  preferences: string; // JSON string
  attributes: string; // JSON string
  processType: string;
  /** When set, the inquiry is sent to this specific provider only
   *  (targeted flow). Backend strips unknown fields via whitelist
   *  validator; storage + matching enforcement is a future phase. */
  targetedProviderId?: string;
  /** Labour / machinery-hire context (create-inquiry.dto accepts all
   *  three). Matching itself rides categoryIds — these give the lead
   *  its labour/machinery identity so provider cards and the quote-form
   *  generator (HIRE vs LABOUR template) see what kind of request it is. */
  isLabour?: boolean;
  /** Track (e.g. 'CONSTRUCTION') or 'MACHINERY_HIRE' for equipment. */
  labourGroup?: string;
  /** The specific trade / equipment id (e.g. 'carpenter', 'excavator'). */
  labourSubType?: string;
}

export interface InquiryResponse {
  id: string;
  title: string;
  description: string;
  /** Legacy display string. Phase: matching split this into a real
   *  many-to-many `categoryIds` set; kept here for older surfaces that
   *  still display the comma-joined string. New code should read
   *  `categoryIds` and look up names via CATEGORIES_DB. */
  category?: string;
  /** Stable category IDs the inquiry is tagged with. */
  categoryIds?: string[];
  location: string;
  province?: string;
  city?: string;
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
  // Optional fields for display purposes / archival behaviour
  buyerName?: string;
  viewCount?: number;
  entertainmentData?: any;
  repairData?: any;
  archivedBy?: string[];
  deletedBy?: string[];
  /** When set, only this provider may see / quote this inquiry
   *  (broadcast vs targeted distinction). */
  targetedProviderId?: string;
  /** Number of quotes the buyer wants. Drives slots-remaining UI. */
  maxQuotes?: number;
  /** Hard deadline for providers to respond. ISO timestamp. */
  responseDeadlineAt?: string;
  /** Quotes already submitted on this inquiry. Drives slot-depletion
   *  indicator. Hydrated by the matching service. */
  quoteCount?: number;
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
export async function createInquiry(
  payload: CreateInquiryPayload,
  queueable?: QueueableOptions
): Promise<InquiryResponse> {
  try {
    const response = await apiClient.post<any>('/inquiries', payload, { queueable });

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
 * Fetch a buyer's authored inquiries.
 *
 * Despite the broad name, this only makes sense for BUYERS — sellers
 * don't author inquiries; they MATCH them via category subscription
 * (`fetchLeadsForMe` is the right call for that). The previous
 * implementation called bare `GET /inquiries`, which the backend
 * returned the entire inquiries table for any non-BUYER caller —
 * silently making this function a "fetch every open inquiry in the
 * system" leak. We now hit the explicit per-buyer endpoint, which
 * the backend gates on `buyerId === req.user.id`.
 */
export async function fetchUserInquiries(userId: string): Promise<InquiryResponse[]> {
  if (!userId) return [];
  try {
    const response = await apiClient.get<any[]>(`/inquiries/buyer/${userId}`);
    const data = response.data;
    if (!Array.isArray(data)) return [];
    return data.map(normalizeInquiry);
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
 * Server-side, ID-based, hierarchy-aware leads matching for the
 * authenticated provider. Replaces the previous "fetch every OPEN
 * inquiry then filter in the browser" pattern. The backend joins the
 * caller's seller/service-provider profile categories against
 * `inquiry_categories` with recursive ancestry expansion so a seller
 * subscribed to parent `'electronics'` matches an inquiry tagged
 * `'mobile-phones-buy'` with no client-side string parsing.
 */
export async function fetchLeadsForMe(filters?: {
  status?: string;
  city?: string;
  province?: string;
  page?: number;
  limit?: number;
  /**
   * Restrict to leads whose category carries this archetype (e.g.
   * 'REPAIR' returns only repair-tagged leads). Driven by the variant
   * toggle in ProviderLeadsView. Staff with assignedArchetype have
   * their value enforced server-side regardless of what's passed here.
   */
  variant?: string;
}): Promise<InquiryResponse[]> {
  try {
    const qs = new URLSearchParams();
    if (filters?.status) qs.set('status', filters.status);
    if (filters?.city) qs.set('city', filters.city);
    if (filters?.province) qs.set('province', filters.province);
    if (filters?.page) qs.set('page', String(filters.page));
    if (filters?.limit) qs.set('limit', String(filters.limit));
    if (filters?.variant) qs.set('variant', filters.variant);
    const url = qs.toString() ? `/inquiries/leads/me?${qs}` : '/inquiries/leads/me';

    const response = await apiClient.get<{
      data: any[];
      total: number;
      matchedCategoryIds: string[];
    }>(url);

    if (!response.data?.data) {
      return [];
    }
    const leads = Array.isArray(response.data.data) ? response.data.data : [];
    return leads.map(normalizeInquiry);
  } catch (error) {
    console.error('Error fetching matched leads:', error);
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
  } catch (error: any) {
    // A 404 means the row is already gone (stale UI cache, double-click,
    // or the user re-tried after a successful delete). Treat it as a
    // successful no-op so the caller can refresh its list without
    // surfacing a scary error to the buyer.
    const msg = String(error?.message || '').toLowerCase();
    if (msg.includes('not found') || msg.includes('404')) {
      return;
    }
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
