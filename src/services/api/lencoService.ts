/**
 * Lenco API Service
 * Handles interactions with Lenco's financial API for collections and payments.
 */

const LENCO_API_BASE_URL = 'https://api.lenco.co/access/v2';
// No fallback key here on purpose — a payment-gateway bearer token must
// never live in a value that ships to the browser (this file calling
// Lenco directly from client-side code at all is itself a structural risk
// worth revisiting: these calls belong behind the NestJS backend, which
// would hold the real key server-side and never expose it). Without
// LENCO_API_KEY set, the request below still runs, Lenco correctly 401s
// it, and the existing catch surfaces "Mobile money is not yet configured".
const LENCO_API_KEY: string =
  (typeof process !== 'undefined' && (process as any).env?.LENCO_API_KEY) || '';

export interface LencoCollection {
  id: string;
  initiatedAt: string;
  completedAt: string | null;
  amount: string;
  fee: string | null;
  bearer: 'merchant' | 'customer';
  currency: string;
  reference: string | null;
  lencoReference: string;
  type: 'card' | 'mobile-money' | 'bank-account' | null;
  status: 'pending' | 'successful' | 'failed' | 'pay-offline' | '3ds-auth-required';
  source: 'banking-app' | 'api';
  reasonForFailure: string | null;
  settlementStatus: 'pending' | 'settled' | null;
  settlement: {
    id: string;
    amountSettled: string;
    currency: string;
    createdAt: string;
    settledAt: string | null;
    status: 'pending' | 'settled';
    type: 'instant' | 'next-day';
    accountId: string;
  } | null;
  mobileMoneyDetails: {
    country: string;
    phone: string;
    operator: string;
    accountName: string | null;
    operatorTransactionId: string | null;
  } | null;
  bankAccountDetails: any | null;
  cardDetails: any | null;
}

export interface LencoCollectionsResponse {
  status: boolean;
  message: string;
  data: LencoCollection[];
  meta: {
    total: number;
    pageCount: number;
    perPage: number;
    currentPage: number;
  };
}

export interface LencoCollectionsParams {
  page?: number;
  from?: string;
  to?: string;
  status?: 'pending' | 'successful' | 'failed' | 'pay-offline';
  type?: 'card' | 'mobile-money' | 'bank-account';
  country?: string;
}

export const lencoService = {
  /**
   * Fetches collections from Lenco API
   */
  getCollections: async (params: LencoCollectionsParams = {}): Promise<LencoCollectionsResponse> => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.from) queryParams.append('from', params.from);
    if (params.to) queryParams.append('to', params.to);
    if (params.status) queryParams.append('status', params.status);
    if (params.type) queryParams.append('type', params.type);
    if (params.country) queryParams.append('country', params.country);

    const url = `${LENCO_API_BASE_URL}/collections?${queryParams.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${LENCO_API_KEY}`,
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Lenco API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Lenco collections fetch failed:', error);
      throw error;
    }
  },

  /**
   * Fetches a specific collection by ID
   */
  getCollectionById: async (id: string): Promise<LencoCollectionsResponse> => {
    try {
      const response = await fetch(`${LENCO_API_BASE_URL}/collections/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${LENCO_API_KEY}`,
          'accept': 'application/json',
        },
      });
      return await response.json();
    } catch (error) {
      console.error('Lenco fetch by ID failed:', error);
      throw error;
    }
  },

  /**
   * Fetches a specific collection by reference
   */
  getCollectionByReference: async (reference: string): Promise<LencoCollectionsResponse> => {
    try {
      const response = await fetch(`${LENCO_API_BASE_URL}/collections/status/${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${LENCO_API_KEY}`,
          'accept': 'application/json',
        },
      });
      return await response.json();
    } catch (error) {
      console.error('Lenco fetch by reference failed:', error);
      throw error;
    }
  },

  /**
   * Initiates a Mobile Money collection
   */
  initiateMobileMoneyCollection: async (data: {
    amount: number;
    phone: string;
    operator: string;
    currency?: string;
    reference?: string;
  }) => {
    try {
      const response = await fetch(`${LENCO_API_BASE_URL}/collections/mobile-money`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LENCO_API_KEY}`,
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          currency: data.currency || 'ZMW',
          bearer: 'customer', // Merchant usually absorbs fee or passes to customer
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            'Mobile money payments are not configured. Set LENCO_API_KEY in your .env.local and restart the dev server, or pay with Wallet.'
          );
        }
        throw new Error(errorData.message || `Mobile money collection failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Lenco mobile-money collection failed:', error);
      throw error;
    }
  },

  /**
   * Initiates a Card collection
   */
  initiateCardCollection: async (data: any) => {
    // Similar implementation for card payments
    // (Omitted for brevity but structure remains the same)
  },

  /**
   * Helper to map Lenco status to TONSE dashboard status
   */
  mapStatus: (lencoStatus: string) => {
    switch (lencoStatus) {
      case 'successful': return 'COMPLETED';
      case 'pending': return 'PENDING';
      case 'failed': return 'FAILED';
      default: return 'PENDING';
    }
  }
};
