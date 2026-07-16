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
  /** Acting admin (primary or User Manager) — id + displayId label. */
  staffId?: string;
  staffName?: string;
  status?: string;
  reason?: string;
  createdAt?: string;
  timestamp?: number;
  [key: string]: any;
}

/** Restricted sub-admin account created by the primary admin. */
export interface AdminManagerUser {
  id: string;
  displayId?: string;
  name?: string;
  email?: string;
  phone?: string | null;
  permissions?: string[];
  isActive?: boolean;
  mustChangePassword?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
  [key: string]: any;
}

export type AdminReportStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED';

/** User-submitted complaint, hydrated with both parties' identity. */
export interface AdminReport {
  id: string;
  reporterId: string;
  reporterName?: string | null;
  reporterDisplayId?: string | null;
  reporterRole?: string | null;
  reportedUserId: string;
  reportedUserName?: string | null;
  reportedUserDisplayId?: string | null;
  reportedUserRole?: string | null;
  category: string;
  description: string;
  contextType?: 'INQUIRY' | 'QUOTE' | 'ORDER' | null;
  contextId?: string | null;
  status: AdminReportStatus;
  resolutionNote?: string | null;
  resolvedByAdminId?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
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

  // ───── Promoter programme (milestones + oversight) ────────────────────────

  async getMilestones(): Promise<AdminMilestone[]> {
    const res = await apiClient.get<AdminMilestone[]>('/admin/milestones');
    return res.data ?? [];
  },

  async createMilestone(payload: AdminMilestoneInput): Promise<AdminMilestone | null> {
    const res = await apiClient.post<AdminMilestone>('/admin/milestones', payload);
    return res.data ?? null;
  },

  async updateMilestone(
    id: string,
    payload: Partial<AdminMilestoneInput>,
  ): Promise<AdminMilestone | null> {
    const res = await apiClient.patch<AdminMilestone>(`/admin/milestones/${id}`, payload);
    return res.data ?? null;
  },

  /** 409s if the milestone already paid out shares — deactivate instead. */
  async deleteMilestone(id: string): Promise<void> {
    await apiClient.delete(`/admin/milestones/${id}`);
  },

  async getPromoters(): Promise<AdminPromoter[]> {
    const res = await apiClient.get<AdminPromoter[]>('/admin/promoters');
    return res.data ?? [];
  },

  async getPromoterDetail(id: string): Promise<AdminPromoterDetail | null> {
    const res = await apiClient.get<AdminPromoterDetail>(`/admin/promoters/${id}`);
    return res.data ?? null;
  },

  async setPromoterVerification(
    id: string,
    status: 'VERIFIED' | 'REJECTED',
    reason?: string,
  ): Promise<AdminPromoterDetail | null> {
    const res = await apiClient.patch<AdminPromoterDetail>(`/admin/promoters/${id}/verification`, {
      status,
      ...(reason ? { reason } : {}),
    });
    return res.data ?? null;
  },

  /** Current invite key + the unlisted /promote signup URL to share. */
  async getPromoterInvite(): Promise<PromoterInvite | null> {
    const res = await apiClient.get<PromoterInvite>('/admin/promoter-invite');
    return res.data ?? null;
  },

  /** Mint a fresh invite key — the old one stops working immediately. */
  async rotatePromoterInvite(): Promise<PromoterInvite | null> {
    const res = await apiClient.post<PromoterInvite>('/admin/promoter-invite/rotate');
    return res.data ?? null;
  },

  // ───── User Managers (restricted sub-admins) — primary admin only ─────────

  async listManagers(): Promise<AdminManagerUser[]> {
    const res = await apiClient.get<AdminManagerUser[]>('/admin/managers');
    return res.data ?? [];
  },

  /** generatedPassword is returned ONCE — show it to the admin immediately. */
  async createManager(payload: {
    name: string;
    email: string;
    phone?: string;
    permissions: string[];
  }): Promise<{ user: AdminManagerUser; generatedPassword: string } | null> {
    const res = await apiClient.post<{ user: AdminManagerUser; generatedPassword: string }>(
      '/admin/managers',
      payload
    );
    return res.data ?? null;
  },

  async updateManager(
    id: string,
    payload: { permissions?: string[]; isActive?: boolean; name?: string; phone?: string }
  ): Promise<AdminManagerUser | null> {
    const res = await apiClient.patch<AdminManagerUser>(`/admin/managers/${id}`, payload);
    return res.data ?? null;
  },

  async deleteManager(id: string): Promise<{ success: boolean } | null> {
    const res = await apiClient.delete<{ success: boolean }>(`/admin/managers/${id}`);
    return res.data ?? null;
  },

  // ───── User reports (complaints) ───────────────────────────────────────────

  async listReports(
    params: Record<string, any> = {}
  ): Promise<PaginatedResponse<AdminReport>> {
    const res = await apiClient.get<PaginatedResponse<AdminReport>>(
      `/admin/reports${buildQuery(params)}`
    );
    return res.data ?? emptyPage<AdminReport>();
  },

  async resolveReport(
    id: string,
    payload: { status: 'RESOLVED' | 'DISMISSED'; resolutionNote?: string }
  ): Promise<AdminReport | null> {
    const res = await apiClient.patch<AdminReport>(`/admin/reports/${id}`, payload);
    return res.data ?? null;
  },
};

export interface PromoterInvite {
  /** null ⇒ programme switched off (no admin key, no env fallback). */
  inviteKey: string | null;
  signupUrl: string;
  /** null ⇒ key still comes from the env fallback, never rotated in the UI. */
  rotatedAt: string | null;
}

export interface AdminMilestone {
  id: string;
  title: string;
  targetStage: 'inquiry' | 'trade_complete';
  requiredCount: number;
  equitySharesReward: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type AdminMilestoneInput = Pick<
  AdminMilestone,
  'title' | 'targetStage' | 'requiredCount' | 'equitySharesReward'
> & { isActive?: boolean };

export interface AdminPromoter {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  isActive: boolean;
  createdAt?: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  funnel: { registrations: number; inquiries: number; tradesComplete: number };
  totalEquityShares: number;
}

/** Full identity detail for the review modal — selfie + document included. */
export interface AdminPromoterDetail extends Omit<AdminPromoter, 'isActive'> {
  phone: string | null;
  bio: string | null;
  socialLinks: Array<{ platform: string; url: string; handle?: string }>;
  selfie: string | null;
  idDocument: string | null;
  rejectionReason: string | null;
  referralUrl: string;
}

/**
 * Roles eligible for the verification badge. Only admins are excluded —
 * buyers are verified too (they keep full access while pending; sellers
 * just see an "unverified" badge on their inquiries).
 * Mirrors the backend constant in `AdminService.VERIFIABLE_ROLES`.
 */
export const VERIFIABLE_ROLES = [
  'BUYER',
  'SELLER',
  'SUPPLIER',
  'SERVICE_PROVIDER',
  'ENTERTAINMENT',
  'EVENTS',
  'LABOUR',
] as const;

export type VerifiableRole = (typeof VERIFIABLE_ROLES)[number];
