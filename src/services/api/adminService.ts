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

export interface AdminAuditLog {
  id: string | number;
  userId?: string;
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
