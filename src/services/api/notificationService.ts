/**
 * Notification API service — REST side of the Uber-dispatch system.
 * The live half is useNotificationStream (SSE); these calls cover
 * catch-up after reconnects, unread badges, and Accept/Decline writes.
 */

import { apiClient } from './client';

export interface NotificationRecord {
  id: string;
  userId: string;
  type:
    | 'NEW_LEAD'
    | 'QUOTE_RECEIVED'
    | 'RESERVE_RELEASED'
    | 'MILESTONE_UNLOCKED'
    | 'REPORT_FILED'
    | 'REPORT_RECEIVED'
    | 'JOB_ASSIGNED'
    | 'JOB_EVIDENCE_ADDED'
    | 'ORDER_PAID';
  inquiryId?: string;
  quoteId?: string;
  title: string;
  data?: Record<string, any>;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'DECLINED';
  isRead: boolean;
  createdAt: string;
}

/** Tier-1 events created after `since` — reconnect backfill. */
export async function fetchNotificationCatchUp(since: string): Promise<NotificationRecord[]> {
  try {
    const res = await apiClient.get<NotificationRecord[]>(
      `/notifications/catch-up?since=${encodeURIComponent(since)}`,
    );
    return Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    console.warn('notification catch-up failed (non-fatal):', e);
    return [];
  }
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  try {
    const res = await apiClient.get<{ count: number }>('/notifications/unread-count');
    return Number(res.data?.count ?? 0);
  } catch {
    return 0;
  }
}

export async function fetchMyNotifications(limit = 50): Promise<NotificationRecord[]> {
  try {
    const res = await apiClient.get<NotificationRecord[]>(`/notifications?limit=${limit}`);
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
}

/** Provider Accept (ACKNOWLEDGED) / Decline (DECLINED) on a NEW_LEAD.
 *  ACK also ticks the buyer's live "providers accepted" counter. */
export async function updateNotificationStatus(
  id: string,
  status: 'ACKNOWLEDGED' | 'DECLINED',
): Promise<void> {
  try {
    await apiClient.patch(`/notifications/${id}/status`, { status });
  } catch (e) {
    console.warn(`notification ${status} failed (non-fatal):`, e);
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  try {
    await apiClient.patch('/notifications/mark-all-read', {});
  } catch {
    /* non-fatal */
  }
}

/** Buyer surfaces the reserve quote batch on an inquiry. */
export async function releaseReserveQuotes(inquiryId: string): Promise<void> {
  await apiClient.patch(`/inquiries/${inquiryId}/release-reserve`, {});
}
