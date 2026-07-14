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

export const reportService = {
  async submit(payload: SubmitReportPayload) {
    const res = await apiClient.post('/reports', payload);
    return res.data ?? null;
  },
};
