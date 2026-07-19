/**
 * User-facing reports (complaints) API. Any authenticated user can file a
 * report against another user; admins review them under /admin/reports
 * (see adminService.listReports / resolveReport).
 */

import { apiClient } from './client';

export const REPORT_CATEGORIES = [
  { value: 'SCAM_FRAUD', label: 'Scam or fraud' },
  { value: 'ABUSIVE_BEHAVIOR', label: 'Abusive behaviour' },
  { value: 'NO_SHOW', label: 'No-show / abandoned deal' },
  { value: 'FAKE_LISTING', label: 'Fake listing or false info' },
  { value: 'PAYMENT_DISPUTE', label: 'Payment dispute' },
  { value: 'OTHER', label: 'Something else' },
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number]['value'];

export interface SubmitReportPayload {
  reportedUserId: string;
  category: ReportCategory;
  description: string;
  contextType?: 'INQUIRY' | 'QUOTE' | 'ORDER';
  contextId?: string;
}

/** A report as returned by GET /reports/mine — the filer's own view,
 *  hydrated with both parties' display identity. */
export interface MyReport {
  id: string;
  reporterId: string;
  reportedUserId: string;
  category: ReportCategory;
  description: string;
  contextType: 'INQUIRY' | 'QUOTE' | 'ORDER' | null;
  contextId: string | null;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  resolutionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  reportedUserName: string | null;
  reportedUserDisplayId: string | null;
}

export const reportService = {
  async submit(payload: SubmitReportPayload) {
    const res = await apiClient.post('/reports', payload);
    return res.data ?? null;
  },

  /** The reports the signed-in user has filed (newest first). */
  async fetchMine(
    params: { page?: number; limit?: number } = {}
  ): Promise<{ data: MyReport[]; total: number }> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    const res = await apiClient.get<{ data: MyReport[]; total: number }>(
      `/reports/mine${qs ? `?${qs}` : ''}`
    );
    return res.data ?? { data: [], total: 0 };
  },
};
