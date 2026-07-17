/**
 * PWA install-prompt plumbing (Android / desktop Chrome & Edge).
 *
 * Plain module (not a hook), mirroring pushService.ts: the browser fires
 * `beforeinstallprompt` exactly once, early — so main.tsx calls
 * initInstallPrompt() at module init to stash the deferred event, and
 * FloatingHub subscribes to re-render when installability changes.
 *
 * iOS never fires this event; its Add-to-Home-Screen path is the manual hint
 * in FloatingHub's push banner (isIosNonStandalone in pushService).
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch {
      /* subscriber errors are theirs */
    }
  });
}

/** Attach the one-shot listeners. Call once, as early as possible (main.tsx). */
export function initInstallPrompt(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    // Suppress Chrome's mini-infobar; we surface our own banner in FloatingHub.
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

/** Already running as an installed app (standalone window / A2HS)? */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (window.navigator as any).standalone === true
  );
}

/** A native install prompt is available right now. */
export function canPromptInstall(): boolean {
  return deferredPrompt !== null && !isStandalone();
}

/** Show the browser's install dialog (must be called from a user gesture). */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const evt = deferredPrompt;
  if (!evt) return 'unavailable';
  // One-shot: the event can't prompt twice, regardless of the outcome.
  deferredPrompt = null;
  try {
    await evt.prompt();
    const choice = await evt.userChoice;
    notify();
    return choice.outcome;
  } catch {
    notify();
    return 'unavailable';
  }
}

/** Re-render hook for components showing install UI. Returns unsubscribe. */
export function subscribeInstallable(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
