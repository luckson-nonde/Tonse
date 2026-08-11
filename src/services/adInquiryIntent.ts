/**
 * "I clicked that advert and I want to buy from THAT shop" — the one fact an
 * ad click carries into the inquiry funnel.
 *
 * An advert already names its advertiser, so a buyer who clicks one has
 * nothing left to search for or pick: they skip the public shop page, the
 * "Need a price?" card and the shops directory and land straight on
 * ProcessSelection with the advertiser pre-targeted (BuyerDashboard's
 * `send_inquiry_to_shop` entry point, reached without a shop card).
 *
 * It rides in localStorage rather than router state because the click may
 * bounce through /login (and register → /login?registered=1) before a buyer
 * session exists — the same reason pendingInquiry.ts does. Both are consumed
 * by Login.tsx on success; a guest quote DRAFT (pendingInquiry) wins, since
 * that one is already composed and only needs sending.
 */

const STORAGE_KEY = 'tonse_ad_inquiry_intent';

/** Fired on save so a BuyerDashboard that is ALREADY mounted (the ad rails
 *  live inside it — sidebar, dashboard banner, category rail) picks the
 *  intent up; a fresh mount after the login bounce reads storage instead. */
export const AD_INQUIRY_INTENT_EVENT = 'tonse:ad-inquiry-intent';

/** An unconsumed intent older than this is ignored — a click abandoned at the
 *  login screen must not hijack a dashboard visit hours later. */
const MAX_AGE_MS = 60 * 60 * 1000;

export interface AdInquiryIntent {
  /** The advertiser's public shop-profile id — `:id` in `/discover/:id`. */
  shopProfileId: string;
  /** Attribution, copied onto the inquiry so the seller sees which ad paid off. */
  adId?: string;
  adTitle?: string;
  savedAt: number;
}

export function saveAdInquiryIntent(entry: Omit<AdInquiryIntent, 'savedAt'>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...entry, savedAt: Date.now() }));
  } catch {
    // Storage unavailable (private mode, quota) — the click still opens the
    // funnel, it just won't survive a trip through the login screen.
  }
  try {
    window.dispatchEvent(new CustomEvent(AD_INQUIRY_INTENT_EVENT));
  } catch {
    // No window (SSR/tests) — the mount-time read still covers it.
  }
}

export function peekAdInquiryIntent(): AdInquiryIntent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdInquiryIntent;
    if (!parsed?.shopProfileId) return null;
    if (Date.now() - (parsed.savedAt ?? 0) > MAX_AGE_MS) {
      clearAdInquiryIntent();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Read-and-clear: the funnel is entered exactly once per ad click. */
export function takeAdInquiryIntent(): AdInquiryIntent | null {
  const intent = peekAdInquiryIntent();
  if (intent) clearAdInquiryIntent();
  return intent;
}

export function clearAdInquiryIntent(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Worst case a stale intent lingers until it ages out.
  }
}
