import { useCallback, useEffect, useState } from 'react';

/**
 * Session-scoped consent gate for the Universal Consent Modal.
 *
 * Shows the modal once per browser-tab session per `stepKey`: revisiting the
 * same step in the session doesn't re-prompt, while a different step key gets
 * its own prompt. Backed by `sessionStorage` so consent auto-clears when the
 * tab closes (true "once per session" semantics). Keys follow the `tonse:`
 * namespace convention used across the app (see useOnboardingDraft.ts).
 */
const KEY_PREFIX = 'tonse:consent:';

function hasConsented(stepKey: string): boolean {
  if (typeof window === 'undefined') return true; // SSR / no-DOM: never prompt
  try {
    return window.sessionStorage.getItem(KEY_PREFIX + stepKey) === 'granted';
  } catch {
    return false;
  }
}

export interface ConsentGate {
  /** True while the consent modal should be shown for this step. */
  needsConsent: boolean;
  /** Record consent for the session and close the modal. */
  grant: () => void;
  /** Close the modal without recording consent (caller navigates back). */
  dismiss: () => void;
}

export function useConsentGate(stepKey: string | undefined | null): ConsentGate {
  const active = !!stepKey;
  const [open, setOpen] = useState<boolean>(() => (active ? !hasConsented(stepKey!) : false));

  // Re-evaluate if the step key changes without a remount.
  useEffect(() => {
    setOpen(active ? !hasConsented(stepKey!) : false);
  }, [stepKey, active]);

  const grant = useCallback(() => {
    if (active && typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(KEY_PREFIX + stepKey!, 'granted');
      } catch {
        /* quota / privacy mode — still close the gate for this render */
      }
    }
    setOpen(false);
  }, [active, stepKey]);

  const dismiss = useCallback(() => setOpen(false), []);

  return { needsConsent: active && open, grant, dismiss };
}

export default useConsentGate;
