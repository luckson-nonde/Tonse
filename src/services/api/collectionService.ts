import { apiClient } from './client';
import { Quote } from '../../types';

/**
 * Client for the backend `/collection/*` surface — the parcel handover flow.
 *
 * All routes are guarded by MANAGE_COLLECTIONS and scoped server-side to the
 * caller's shop (`parentProviderId ?? id`), so both the owner and a Collection
 * Officer hit the same endpoints and only ever see/act on their shop's parcels.
 * The backend wraps responses as `{ statusCode, message, data }`.
 */
function payload<T>(res: any, fallback: T): T {
  return (res && 'data' in res ? res.data : res) ?? fallback;
}

export const collectionService = {
  /** Parcels awaiting collection/pickup (status PAID or AWAITING_PICKUP). */
  async listQueue(): Promise<Quote[]> {
    const res = await apiClient.get('/collection/queue');
    return payload<Quote[]>(res, []);
  },

  /** Recently completed handovers. */
  async listRecent(): Promise<Quote[]> {
    const res = await apiClient.get('/collection/recent');
    return payload<Quote[]>(res, []);
  },

  /** Find a parcel by its buyer collection code; null if not found. */
  async lookupByCode(code: string): Promise<Quote | null> {
    try {
      const res = await apiClient.get(`/collection/lookup?code=${encodeURIComponent(code)}`);
      return payload<Quote | null>(res, null);
    } catch {
      return null;
    }
  },

  /** Buyer identity confirmed → AWAITING_PICKUP. */
  async verify(quoteId: string): Promise<Quote> {
    const res = await apiClient.patch(`/collection/${quoteId}/verify`, {});
    return payload<Quote>(res, {} as Quote);
  },

  /** Handover confirmed → COMPLETED + escrow release (server-authoritative). */
  async complete(quoteId: string): Promise<Quote> {
    const res = await apiClient.patch(`/collection/${quoteId}/complete`, {});
    return payload<Quote>(res, {} as Quote);
  },
};
