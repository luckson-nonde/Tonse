/**
 * Promoter API Service — the referral programme's frontend data layer.
 *
 * Thin wrappers over the backend `/promoter/*` endpoints (see
 * backend/src/modules/referrals). Same envelope-unwrapping convention as
 * adminService: apiClient returns `{ data?: T, ... }`, these helpers return
 * plain payloads.
 */

import { apiClient } from './client';

export interface SocialLink {
  platform: string;
  url: string;
  handle?: string;
}

export type PromoterVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface PromoterSignupRequest {
  name: string;
  email: string;
  password: string;
  /** Shared privately with NDA'd artists — validated server-side. */
  inviteKey: string;
  phone?: string;
  bio?: string;
  /** Platforms the artist runs — at least one required. */
  socialLinks: SocialLink[];
  /** Live selfie (base64 data URL) — required identity proof. */
  selfie: string;
  /** ID document photo/scan (base64 data URL) — required. */
  idDocument: string;
}

export interface PromoterSignupResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    displayId: string;
    email: string;
    name: string;
    role: string;
  };
  referralCode: string;
  referralUrl: string;
}

export interface PromoterMe {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  referralCode: string;
  referralUrl: string;
  createdAt: string;
  bio: string | null;
  socialLinks: SocialLink[];
  selfie: string | null;
  idDocument: string | null;
  verificationStatus: PromoterVerificationStatus;
  rejectionReason: string | null;
}

export interface UpdatePromoterProfileRequest {
  name?: string;
  phone?: string;
  bio?: string;
  socialLinks?: SocialLink[];
  /** Re-submitting selfie/ID document resets verification to PENDING. */
  selfie?: string;
  idDocument?: string;
}

export interface PromoterFunnel {
  registrations: number;
  inquiries: number;
  tradesComplete: number;
}

export interface PromoterDashboard {
  funnel: PromoterFunnel;
  referralCode: string;
  referralUrl: string;
  activeMilestone: {
    id: string;
    title: string;
    targetStage: 'inquiry' | 'trade_complete';
    current: number;
    required: number;
    pct: number;
    equitySharesReward: number;
  } | null;
  totalEquityShares: number;
  unlockedMilestones: Array<{
    id: string;
    title: string;
    sharesAwarded: number;
    awardedAt: string;
  }>;
}

export const promoterService = {
  async signup(payload: PromoterSignupRequest): Promise<PromoterSignupResponse> {
    const res = await apiClient.post<PromoterSignupResponse>('/promoter/signup', payload);
    return (res.data ?? res) as PromoterSignupResponse;
  },

  async getMe(): Promise<PromoterMe | null> {
    const res = await apiClient.get<PromoterMe>('/promoter/me');
    return res.data ?? null;
  },

  async updateMe(payload: UpdatePromoterProfileRequest): Promise<PromoterMe | null> {
    const res = await apiClient.patch<PromoterMe>('/promoter/me', payload);
    return res.data ?? null;
  },

  async getDashboard(): Promise<PromoterDashboard | null> {
    const res = await apiClient.get<PromoterDashboard>('/promoter/dashboard');
    return res.data ?? null;
  },
};

export default promoterService;
