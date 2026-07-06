import React, { useRef } from 'react';
import { useConsentGate } from '../hooks/useConsentGate';
import ConsentModal from './consent/ConsentModal';

interface RegistrationStepShellProps {
  /** Optional advisory banner rendered above the form on every breakpoint —
   *  used by the Location step's "Be at your shop" notice. */
  advisory?: React.ReactNode;
  /** The step's actual form body. */
  children: React.ReactNode;
  /**
   * When set, the Universal Consent Modal gates this step: it appears once per
   * session before the form becomes interactive, explaining why the step's
   * information is collected. Key into `consentConfigs` (e.g. 'identity').
   */
  consentKey?: string;
  /** "Go Back" in the consent modal — should return to the previous step/route. */
  onConsentBack?: () => void;
}

/**
 * Full-width registration step wrapper.
 *
 * Previously this rendered a fixed 340–380px "Why this matters" context aside
 * beside the form. Nested inside AuthSplitLayout's 42/58 split, that second
 * column starved the form card to ~110–310px on laptops and its viewport-based
 * field grid overflowed (labels overlapping icons). The explainer now lives in
 * the Universal Consent Modal instead, so the form card spans the full pane —
 * which both fixes that responsive break and gives the step a single, clean
 * column on every breakpoint.
 */
export default function RegistrationStepShell({
  advisory,
  children,
  consentKey,
  onConsentBack,
}: RegistrationStepShellProps) {
  const gate = useConsentGate(consentKey);
  const cardRef = useRef<HTMLDivElement>(null);

  // Per spec: once consent is granted, move focus to the form's first field.
  // Delayed past the modal's exit (~280ms) so the focus-trap's focus-restore
  // on teardown doesn't clobber it.
  const focusFirstField = () => {
    window.setTimeout(() => {
      const el = cardRef.current?.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not(.sr-only), select, textarea, button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      el?.focus();
    }, 320);
  };

  return (
    <div className="relative w-full">
      {advisory && <div className="mb-5">{advisory}</div>}
      <div
        ref={cardRef}
        className="@container bg-white border border-[#e8e0d0]/60 rounded-[28px] p-5 sm:p-6 md:p-8 xl:p-10 shadow-[0_4px_24px_-8px_rgba(26,26,46,0.08)]"
      >
        {children}
      </div>

      {consentKey && (
        <ConsentModal
          open={gate.needsConsent}
          configKey={consentKey}
          scope="pane"
          onConsent={() => {
            gate.grant();
            focusFirstField();
          }}
          onBack={() => {
            gate.dismiss();
            onConsentBack?.();
          }}
        />
      )}
    </div>
  );
}
