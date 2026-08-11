/**
 * "This person is looking for something" — the signal the Spotlight pop-up
 * waits for.
 *
 * A pop-up that fires on a timer is spam. One that fires the moment someone
 * tells us what they're shopping for is a relevant offer, so the trigger is
 * an EVENT the funnel emits rather than a poll: BuyerDashboard fires it when
 * a category is chosen, DiscoverPage when a guest browses one. SpotlightAd is
 * the only listener.
 *
 * Same window-CustomEvent convention as the rest of the app (see
 * scheduleSelection.ts and adInquiryIntent.ts) — no emitter library, no
 * context provider: a global widget mounted once in App.tsx can't be reached
 * by props from inside the funnel, and threading a callback through every
 * step would couple the funnel to advertising.
 */

export const SPOTLIGHT_INTENT_EVENT = 'tonse:shopping-intent';

export interface ShoppingIntent {
  /** The MASTER category slug being shopped ('electronics'), when known —
   *  what a pop-up can be targeted at. Absent is fine: untargeted pop-ups
   *  still qualify, so the pool is never empty. */
  categoryId?: string;
}

/** Tell the Spotlight someone just showed buying intent. Safe to call from
 *  anywhere; no listener simply means nothing happens. */
export function emitShoppingIntent(detail: ShoppingIntent = {}): void {
  try {
    window.dispatchEvent(new CustomEvent(SPOTLIGHT_INTENT_EVENT, { detail }));
  } catch {
    // No window (SSR/tests) — nothing to show anyway.
  }
}

/** Subscribe; returns the unsubscribe. Mirrors subscribeToScheduleDate. */
export function subscribeToShoppingIntent(
  cb: (intent: ShoppingIntent) => void,
): () => void {
  const handler = (e: Event) => cb(((e as CustomEvent).detail ?? {}) as ShoppingIntent);
  window.addEventListener(SPOTLIGHT_INTENT_EVENT, handler);
  return () => window.removeEventListener(SPOTLIGHT_INTENT_EVENT, handler);
}

const VIEWER_KEY_STORAGE = 'tonse_viewer_key';

/**
 * A stable id for THIS browser, so a guest can be frequency-capped the same
 * way an account holder is. Signed-in callers pass their user id instead —
 * capping should follow the person, not the device, when we know who they are.
 *
 * Deliberately not a fingerprint: clearing storage resets the cap, which is a
 * price worth paying for not tracking people covertly.
 */
export function getViewerKey(userId?: string | null): string {
  if (userId) return userId;
  try {
    const existing = localStorage.getItem(VIEWER_KEY_STORAGE);
    if (existing) return existing;
    const fresh =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(VIEWER_KEY_STORAGE, fresh);
    return fresh;
  } catch {
    // Private mode: a per-page-load key still works, it just caps less well.
    return `anon-ephemeral-${Math.random().toString(36).slice(2, 10)}`;
  }
}
