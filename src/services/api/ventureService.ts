import { apiClient } from './client';

/**
 * Client for the backend `/venture-account/*` surface — a shop's real,
 * ledger-backed balance: money released from completed sales (net of
 * commission) plus direct deposits. Withdrawal-to-real-money is a future
 * phase. The backend wraps responses as `{ statusCode, message, data }`.
 */
function payload<T>(res: any, fallback: T): T {
  return (res && 'data' in res ? res.data : res) ?? fallback;
}

export interface VentureJournalEntry {
  id: string;
  reference: string;
  type: string;
  currency: string;
  quoteId: string | null;
  orderId: string | null;
  description: string | null;
  actorLabel: string | null;
  memo: Record<string, any> | null;
  postedAt: string;
  amount: string;
}

export interface VentureHistoryPage {
  data: VentureJournalEntry[];
  total: number;
}

export interface VentureDepositResult {
  reference: string;
  status: string;
  amount: string;
  fee: string;
  totalCharged: string;
  /** Which adapter answered ('sandbox' | 'dpo') — picks the pending UI:
   *  simulate button vs the approve-on-phone polling card. */
  provider?: string;
  instruction?: string;
  /** Set by hosted-page providers (DPO) — the payer MUST be sent here or
   *  nothing is collected. Absent on the sandbox provider. */
  redirectUrl?: string;
}

export const ventureService = {
  /** Current venture-account balance (net of commission), '0.00' if never funded. */
  async getBalance(): Promise<string> {
    const res = await apiClient.get('/venture-account/balance');
    return payload<{ balance: string }>(res, { balance: '0.00' }).balance;
  },

  /** Paginated journal history — one row per real escrow release so far. */
  async getHistory(params: { page?: number; limit?: number } = {}): Promise<VentureHistoryPage> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    const res = await apiClient.get(`/venture-account/history${qs ? `?${qs}` : ''}`);
    return payload<VentureHistoryPage>(res, { data: [], total: 0 });
  },

  /** Start a direct deposit into the caller's own venture account. */
  async initiateDeposit(dto: { amount: string; phone?: string; operator?: string }): Promise<VentureDepositResult> {
    const res = await apiClient.post('/venture-account/deposit', { ...dto, channel: 'mobile-money' });
    return payload<VentureDepositResult>(res, {} as VentureDepositResult);
  },

  /** Poll a deposit's PSP status (shared with the quote-checkout flow — the
   *  endpoint is reference-generic, not quote-specific). */
  async getDepositStatus(reference: string): Promise<VentureDepositResult & { quoteId: string | null }> {
    const res = await apiClient.get(`/payments/checkout/${encodeURIComponent(reference)}`);
    return payload(res, {} as VentureDepositResult & { quoteId: string | null });
  },

  /** Sandbox-only: stand in for the depositor approving on their phone. */
  async simulateDeposit(reference: string, outcome: 'successful' | 'failed' = 'successful'): Promise<{ handled: boolean }> {
    const res = await apiClient.post(`/payments/checkout/${encodeURIComponent(reference)}/simulate`, { outcome });
    return payload(res, { handled: false });
  },
};
