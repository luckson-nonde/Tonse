import { apiClient } from './client';

/**
 * Financed-checkout client — the "Pay via lending institution" flow.
 *
 * Buyer: open a financing request for a product quote they own, or cancel one
 * that hasn't funded. Lender: confirm the off-platform disbursement, which funds
 * the product order's escrow (mirrors CheckoutService.fundEscrowFromExternal).
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

  /** Lender confirms disbursement → funds the financed product order's escrow. */
  async confirmDisbursement(loanQuoteId: string): Promise<any> {
    const res = await apiClient.post(`/financing/offers/${loanQuoteId}/confirm-disbursement`, {});
    return payload<any>(res, {});
  },
};

export default financingService;
