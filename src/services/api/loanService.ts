import { apiClient } from './client';
import { fetchLeadsForMe } from './inquiryService';

/**
 * Lender-side loan client. Loan REQUESTS are the lender's matched leads
 * (a lender only subscribes to `loans`, so every lead is a loan request).
 * Loan OFFERS go through the guarded /loans surface (MANAGE_LOANS), so a Loan
 * Officer never needs the MANAGE_QUOTES-gated /quotes endpoints.
 */
function payload<T>(res: any, fallback: T): T {
  return (res && 'data' in res ? res.data : res) ?? fallback;
}

export const loanService = {
  /** Incoming loan requests (matched leads). */
  async listRequests(filters: { status?: string } = {}): Promise<any[]> {
    return fetchLeadsForMe(filters);
  },

  /** Offers this lender has made (incl. accepted / declined). */
  async listOffers(): Promise<any[]> {
    const res = await apiClient.get('/loans/offers');
    return payload<any[]>(res, []);
  },

  /** Make a loan offer on a request. */
  async makeOffer(body: Record<string, any>): Promise<any> {
    const res = await apiClient.post('/loans/offer', body);
    return payload<any>(res, {});
  },

  /** Decline a request with a reason. */
  async decline(body: Record<string, any>): Promise<any> {
    const res = await apiClient.post('/loans/decline', body);
    return payload<any>(res, {});
  },

  /** Revise an existing offer. */
  async revise(id: string, body: Record<string, any>): Promise<any> {
    const res = await apiClient.patch(`/loans/offers/${id}`, body);
    return payload<any>(res, {});
  },

  /** Advance an accepted loan's lifecycle stage
   *  (CONTACTED / VERIFIED / DISBURSED / COMPLETED). */
  async advanceStage(id: string, stage: string): Promise<any> {
    const res = await apiClient.patch(`/loans/offers/${id}/stage`, { stage });
    return payload<any>(res, {});
  },
};
