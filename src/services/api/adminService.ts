/**
 * Admin API Service
 *
 * Thin wrappers over the backend `/admin/*` endpoints. Every call goes through
 * `apiClient` which returns `{ data?: T, message?, statusCode? }` — these
 * helpers unwrap that envelope so dashboard code can work with plain payloads.
 */

import { apiClient } from './client';

export interface AdminStats {
  users: { total: number; byRole: Record<string, number>; recentSignups7d?: number };
  inquiries: { total: number; byStatus: Record<string, number> };
  quotes: { total: number; byStatus: Record<string, number>; paidVolumeZmw: number };
  payments: { total: number; byStatus: Record<string, number>; totalCollectedZmw: number };
  /** Size of the pending verification queue (across verifiable roles). */
  pendingVerifications?: number;
  /** Inquiry → Quote → Paid conversion counts. */
  funnel?: { inquiries: number; quotes: number; paidQuotes: number };
  /** Category availability health. */
  categories?: { total: number; active: number };
  generatedAt: string;
}

export interface AdminCategoryNode {
  id: string;
  name: string;
  parentId: string | null;
  isActive: boolean;
  archetype: string;
  nature: string;
  providerCount: number;
  inquiryCount: number;
  children: AdminCategoryNode[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export interface AdminUser {
  id: string;
  displayId?: string;
  name?: string;
  primaryEmail?: string;
  phone?: string;
  role?: string;
  isActive?: boolean;
  verificationStatus?: string;
  createdAt?: string;
  lastLoginAt?: string;
  [key: string]: any;
}

export interface AdminInquiry {
  id: string;
  title: string;
  description?: string;
  category?: string;
  status?: string;
  processType?: string;
  buyerId?: string;
  buyerName?: string;
  location?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface AdminQuote {
  id: string;
  inquiryId?: string;
  inquiryTitle?: string;
  providerId?: string;
  providerName?: string;
  price?: number;
  status?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface AdminTransaction {
  id: string;
  userId?: string;
  amount?: number;
  type?: string;
  status?: string;
  reference?: string;
  createdAt?: string;
  [key: string]: any;
}

/** A ledger control account plus its live balance. */
export interface LedgerAccountBalance {
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'REVENUE' | 'EXPENSE';
  normalSide: 'DEBIT' | 'CREDIT';
  balance: string;
  description?: string;
}

/** Debits vs credits per account. `balanced: false` means a broken ledger. */
export interface TrialBalance {
  rows: Array<{ accountCode: string; debit: string; credit: string; balance: string }>;
  totalDebit: string;
  totalCredit: string;
  balanced: boolean;
}

/** One money event. `amount` is the journal's debit total. */
export interface LedgerJournalRow {
  id: string;
  reference: string;
  type: string;
  currency: string;
  amount: string;
  quoteId?: string;
  orderId?: string;
  description?: string;
  actorLabel?: string;
  memo?: Record<string, any>;
  postedAt?: string;
}

export interface EscrowPositionRow {
  quoteId: string;
  inquiryTitle?: string;
  status?: string;
  providerId?: string;
  providerName?: string;
  buyerId?: string;
  createdAt?: string;
  ledgerBalance: string;
  quotePrice: string;
  /** PHANTOM = quote says escrow, ledger has nothing (pre-cutover, no money was
   *  ever collected). LEAK = ledger holds money the quote no longer reflects. */
  driftReason?: 'PHANTOM' | 'LEAK' | null;
}

export interface EscrowPositions {
  positions: EscrowPositionRow[];
  summary: {
    openPositions: number;
    totalHeldZmw: string;
    phantomCount: number;
    phantomValueZmw: string;
    leakCount: number;
  };
}

export interface AdminAuditLog {
  id: string | number;
  userId?: string;
  /** Human-readable actor captured at write time (e.g. "USER-KVBDUK (BUYER)"). */
  actorLabel?: string;
  ipAddress?: string;
  userAgent?: string;
  action?: string;
  entityType?: string;
  entityId?: string | number;
  details?: any;
  createdAt?: string;
  timestamp?: number;
  [key: string]: any;
}

const buildQuery = (params: Record<string, any>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
};

const emptyPage = <T>(): PaginatedResponse<T> => ({ data: [], total: 0 });

export const adminService = {
  async getStats(): Promise<AdminStats | null> {
    const res = await apiClient.get<AdminStats>('/admin/stats');
    return res.data ?? null;
  },

  async listUsers(params: Record<string, any> = {}): Promise<PaginatedResponse<AdminUser>> {
    const res = await apiClient.get<PaginatedResponse<AdminUser>>(
      `/admin/users${buildQuery(params)}`
    );
    return res.data ?? emptyPage<AdminUser>();
  },

  async suspendUser(id: string): Promise<AdminUser | null> {
    const res = await apiClient.patch<AdminUser>(`/admin/users/${id}/suspend`);
    return res.data ?? null;
  },

  async unsuspendUser(id: string): Promise<AdminUser | null> {
    const res = await apiClient.patch<AdminUser>(`/admin/users/${id}/unsuspend`);
    return res.data ?? null;
  },

  async deleteUser(id: string): Promise<{ id: string; deleted: boolean } | null> {
    const res = await apiClient.delete<{ id: string; deleted: boolean }>(`/admin/users/${id}`);
    return res.data ?? null;
  },

  async listInquiries(
    params: Record<string, any> = {}
  ): Promise<PaginatedResponse<AdminInquiry>> {
    const res = await apiClient.get<PaginatedResponse<AdminInquiry>>(
      `/admin/inquiries${buildQuery(params)}`
    );
    return res.data ?? emptyPage<AdminInquiry>();
  },

  async listQuotes(params: Record<string, any> = {}): Promise<PaginatedResponse<AdminQuote>> {
    const res = await apiClient.get<PaginatedResponse<AdminQuote>>(
      `/admin/quotes${buildQuery(params)}`
    );
    return res.data ?? emptyPage<AdminQuote>();
  },

  async listTransactions(
    params: Record<string, any> = {}
  ): Promise<PaginatedResponse<AdminTransaction>> {
    const res = await apiClient.get<PaginatedResponse<AdminTransaction>>(
      `/admin/transactions${buildQuery(params)}`
    );
    return res.data ?? emptyPage<AdminTransaction>();
  },

  // ───── Ledger & escrow ────────────────────────────────────────────────
  // The double-entry mirror of money the PSP custodies. `listTransactions`
  // above reads the frozen legacy `payments` table; these are authoritative.

  async getLedgerAccounts(): Promise<LedgerAccountBalance[]> {
    const res = await apiClient.get<LedgerAccountBalance[]>('/admin/ledger/accounts');
    return res.data ?? [];
  },

  async getTrialBalance(): Promise<TrialBalance | null> {
    const res = await apiClient.get<TrialBalance>('/admin/ledger/trial-balance');
    return res.data ?? null;
  },

  async listJournals(params: Record<string, any> = {}): Promise<PaginatedResponse<LedgerJournalRow>> {
    const res = await apiClient.get<PaginatedResponse<LedgerJournalRow>>(
      `/admin/ledger/journals${buildQuery(params)}`
    );
    return res.data ?? emptyPage<LedgerJournalRow>();
  },

  async getJournal(id: string): Promise<any | null> {
    const res = await apiClient.get<any>(`/admin/ledger/journals/${id}`);
    return res.data ?? null;
  },

  async getEscrowPositions(): Promise<EscrowPositions | null> {
    const res = await apiClient.get<EscrowPositions>('/admin/escrow/positions');
    return res.data ?? null;
  },

  async listAudit(params: Record<string, any> = {}): Promise<PaginatedResponse<AdminAuditLog>> {
    const res = await apiClient.get<PaginatedResponse<AdminAuditLog>>(
      `/admin/audit${buildQuery(params)}`
    );
    return res.data ?? emptyPage<AdminAuditLog>();
  },

  // ───── Verification queue ─────────────────────────────────────────────────

  async listVerifications(
    params: Record<string, any> = {}
  ): Promise<PaginatedResponse<AdminUser>> {
    const res = await apiClient.get<PaginatedResponse<AdminUser>>(
      `/admin/verifications${buildQuery(params)}`
    );
    return res.data ?? emptyPage<AdminUser>();
  },

  async getUserDetail(id: string): Promise<AdminUser | null> {
    const res = await apiClient.get<AdminUser>(`/admin/users/${id}`);
    return res.data ?? null;
  },

  async verifyUser(id: string): Promise<AdminUser | null> {
    const res = await apiClient.patch<AdminUser>(`/admin/users/${id}/verify`);
    return res.data ?? null;
  },

  async rejectUser(id: string, reason?: string): Promise<AdminUser | null> {
    const res = await apiClient.patch<AdminUser>(`/admin/users/${id}/reject`, { reason });
    return res.data ?? null;
  },

  // ───── Category control ───────────────────────────────────────────────────

  async getCategories(): Promise<AdminCategoryNode[]> {
    const res = await apiClient.get<AdminCategoryNode[]>('/admin/categories');
    return res.data ?? [];
  },

  async setCategoryActive(id: string, isActive: boolean): Promise<AdminCategoryNode | null> {
    const res = await apiClient.patch<AdminCategoryNode>(`/admin/categories/${id}`, { isActive });
    return res.data ?? null;
  },
};

/**
 * Roles eligible for the verification badge. Buyers and admins are excluded.
 * Mirrors the backend constant in `AdminService.VERIFIABLE_ROLES`.
 */
export const VERIFIABLE_ROLES = [
  'SELLER',
  'SUPPLIER',
  'SERVICE_PROVIDER',
  'ENTERTAINMENT',
  'EVENTS',
  'LABOUR',
] as const;

export type VerifiableRole = (typeof VERIFIABLE_ROLES)[number];
