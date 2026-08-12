/**
 * "I tapped Apply on that job posting, but I wasn't signed in yet" — the one
 * fact a guest Apply click carries into the login screen.
 *
 * Deliberately NOT shaped like `pendingInquiry.ts` (a full, resubmittable
 * draft): `ApplyModal` requires uploading a document via an auth-gated
 * endpoint, so a guest cannot compose a submittable application before
 * authenticating — there is no draft to resubmit. This mirrors
 * `adInquiryIntent.ts`'s lighter philosophy instead: nothing is composed
 * yet, signing in just resumes the funnel — `Login.tsx` reads this and sends
 * the visitor back to the job posting (now authenticated) to tap Apply
 * again, rather than attempting to auto-submit anything.
 *
 * Rides in localStorage rather than router state because the click may
 * bounce through /login (and register → /login?registered=1) before a
 * session exists.
 */

const STORAGE_KEY = 'tonse_pending_job_application';

/** An unconsumed intent older than this is ignored — a click abandoned at
 *  the login screen must not hijack an unrelated visit hours later. */
const MAX_AGE_MS = 60 * 60 * 1000;

export interface PendingJobApplicationIntent {
  jobPostingId: string;
  jobTitle: string;
  savedAt: number;
}

export function saveJobApplicationIntent(
  entry: Omit<PendingJobApplicationIntent, 'savedAt'>,
): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...entry, savedAt: Date.now() }));
  } catch {
    // Storage unavailable (private mode, quota) — the visitor still reaches
    // login, it just won't bounce back to the job automatically.
  }
}

export function peekJobApplicationIntent(): PendingJobApplicationIntent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingJobApplicationIntent;
    if (!parsed?.jobPostingId) return null;
    if (Date.now() - (parsed.savedAt ?? 0) > MAX_AGE_MS) {
      clearJobApplicationIntent();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearJobApplicationIntent(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Worst case a stale intent lingers until it ages out.
  }
}
