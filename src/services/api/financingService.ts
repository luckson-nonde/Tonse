import { apiClient } from './client';

/**
 * Financed-checkout client — the "Pay via lending institution" flow.
 *
 * Buyer: open a financing request for a product quote they own, or cancel one
 * that hasn't funded. Lender: INITIATE disbursement — pay the principal into the
 * holding account through the PSP. Escrow funds only when that collection is
 * webhook-confirmed (server-side), so this call returns a pending state, not a
 * done deal.
 */
function payload<T>(res: any, fallback: T): T {
  return (res && 'data' in res ? res.data : res) ?? fallback;
}

export interface CreateFinancingRequestBody {
  productQuoteId: string;
  tenureMonths?: string | number;
  attributes?: Record<string, any>;
  /** Optional single-lender targeting (broadcast if omitted). */
  targetedLenderId?: string;
}

export const financingService = {
  /** Buyer opens a salary-backed financing request for a product quote. */
  async createRequest(body: CreateFinancingRequestBody): Promise<any> {
    const res = await apiClient.post('/financing/requests', body);
    return payload<any>(res, {});
  },

  /** Buyer cancels an in-flight financing request → back to normal payment. */
  async cancel(productQuoteId: string): Promise<any> {
    const res = await apiClient.post(`/financing/requests/${productQuoteId}/cancel`, {});
    return payload<any>(res, {});
  },

  /**
   * Lender initiates disbursement → pays the principal into the holding account
   * via the PSP. Returns `{ reference, status, amount, productQuoteId, instruction }`.
   * Escrow is funded only once the collection is confirmed, so callers should
   * treat a non-'successful' status as pending and poll `paymentStatus`.
   */
  async initiateDisbursement(
    loanQuoteId: string,
    body: { phone?: string; operator?: string } = {},
  ): Promise<any> {
    const res = await apiClient.post(`/financing/offers/${loanQuoteId}/initiate-disbursement`, body);
    return payload<any>(res, {});
  },

  /** Poll a disbursement (or any PSP collection) by reference. */
  async paymentStatus(reference: string): Promise<any> {
    const res = await apiClient.get(`/payments/checkout/${reference}`);
    return payload<any>(res, {});
  },
};

export default financingService;
