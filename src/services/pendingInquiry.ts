/**
 * Deferred-submit storage for a guest's "Request a Quote" draft.
 *
 * A visitor can fill out a targeted quote request on a public shop profile
 * before having an account. Submitting while logged out stashes the draft
 * here, sends them to /login (register funnels back to /login?registered=1,
 * which preserves this since it's plain localStorage, not React state), and
 * Login.tsx's post-success handler picks it back up and actually creates the
 * inquiry — "continuing at that particular step" instead of dropping the
 * composed request on the floor.
 */
import type { CreateInquiryPayload } from './api/inquiryService';

const STORAGE_KEY = 'tonse_pending_inquiry';

export interface PendingInquiryDraft {
  shopId: string;
  shopName: string;
  draft: CreateInquiryPayload;
  savedAt: number;
}

export function savePendingInquiry(entry: Omit<PendingInquiryDraft, 'savedAt'>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...entry, savedAt: Date.now() }));
  } catch {
    // Storage unavailable (private mode, quota) — the guest just re-enters
    // the form after logging in instead of resuming automatically.
  }
}

export function getPendingInquiry(): PendingInquiryDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingInquiryDraft) : null;
  } catch {
    return null;
  }
}

export function clearPendingInquiry(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do — worst case a stale draft lingers until overwritten.
  }
}
