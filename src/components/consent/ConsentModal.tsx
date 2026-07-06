import React, { useEffect, useId, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ArrowLeft } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import {
  resolveConsentConfig,
  DEFAULT_PRIVACY_BODY,
  DEFAULT_CONSENT_LABEL,
  type ConsentConfig,
} from './consentConfigs';

interface ConsentModalProps {
  open: boolean;
  /** Key into consentConfigs; ignored if `config` is passed directly. */
  configKey?: string;
  /** Direct config override (takes precedence over `configKey`). */
  config?: ConsentConfig;
  /** Consent granted — unlock the form + focus its first field. */
  onConsent: () => void;
  /** "Go Back" / Escape — return to the previous step or route. */
  onBack: () => void;
  /**
   * `'pane'` (default) dims only the right form column on desktop (≥lg) so the
   * marketing showcase stays visible; `'screen'` dims the whole viewport
   * (mobile, and forms with no split layout).
   */
  scope?: 'pane' | 'screen';
}

/**
 * Universal Consent & Information Modal.
 *
 * A reusable, premium consent gate shown before a user interacts with any form
 * that collects protected personal/business information. Explains *why* the
 * information is needed, reassures on privacy, and captures explicit consent.
 * Configurable per form via `configKey` (see consentConfigs.ts); the chrome,
 * animation, and behaviour stay identical everywhere.
 */
export default function ConsentModal({
  open,
  configKey = '',
  config,
  onConsent,
  onBack,
  scope = 'pane',
}: ConsentModalProps) {
  const resolved = config ?? resolveConsentConfig(configKey);
  const Icon = resolved.icon ?? Lock;

  const [agreed, setAgreed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useFocusTrap(open, cardRef, { onEscape: onBack });

  // Reset the checkbox whenever the modal (re)opens for a new step.
  useEffect(() => {
    if (open) setAgreed(false);
  }, [open, configKey]);

  // Lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    onConsent();
  };

  // Overlay coverage: on desktop, `pane` scope starts at 42% from the left so
  // the AuthSplitLayout showcase (lg:w-[42%]) stays uncovered and interactive.
  const overlayClass =
    scope === 'pane'
      ? 'fixed inset-0 lg:left-[42%] z-[200] flex items-center justify-center p-4 sm:p-6'
      : 'fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="consent-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.28, delay: 0, ease: 'easeOut' } }}
          transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
          className={overlayClass}
          // Soft, warm navy dim + blur — never a harsh black wash. The user
          // should still recognise the screen underneath.
          style={{ backgroundColor: 'rgba(20, 37, 80, 0.34)', backdropFilter: 'blur(6px)' }}
          aria-hidden={false}
        >
          <motion.div
            ref={cardRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.26, delay: 0, ease: 'easeIn' } }}
            transition={{ duration: 0.45, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[500px] max-h-[92vh] overflow-y-auto tonse-scrollbar bg-brand-white rounded-[28px] border border-[#e8e0d0]/70 shadow-[0_30px_80px_-24px_rgba(20,37,80,0.45)]"
          >
            <form onSubmit={handleContinue} className="p-6 sm:p-8">
              {/* Header */}
              <div className="flex flex-col items-start">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#fdf6e9] to-[#f5ead0] text-[#C9973A] flex items-center justify-center shadow-[inset_0_1px_2px_rgba(201,151,58,0.35)]">
                  <Icon className="w-7 h-7" strokeWidth={1.75} />
                </div>
                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.28em] text-[#C9973A]">
                  Before We Continue
                </p>
                <h2
                  id={titleId}
                  className="mt-2 font-serif text-[24px] sm:text-[27px] font-bold text-brand-dark leading-[1.15]"
                >
                  {resolved.whyTitle}
                </h2>
                <p id={descId} className="mt-2 text-[13.5px] text-[#1a1612]/60 leading-relaxed">
                  We'd like to explain why we collect this information.
                </p>
              </div>

              {/* Why body */}
              <p className="mt-5 text-[14px] text-[#1a1612]/80 leading-relaxed">
                {resolved.whyBody}
              </p>

              {/* Trust card */}
              <div className="mt-5 flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-br from-[#fdf6e9]/80 to-[#fdf6e9]/30 border border-[#C9973A]/20">
                <div className="w-9 h-9 rounded-xl bg-[#C9973A] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#C9973A]/30">
                  <Lock className="w-4 h-4" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#C9973A]">
                    Your Privacy Matters
                  </p>
                  <p className="mt-1 text-[12.5px] text-[#1a1612]/70 leading-relaxed">
                    {resolved.privacyBody ?? DEFAULT_PRIVACY_BODY}
                  </p>
                </div>
              </div>

              {/* Consent checkbox */}
              <div className="mt-5 flex items-start gap-3">
                <input
                  type="checkbox"
                  id={`${titleId}-consent`}
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="sr-only"
                />
                <label
                  htmlFor={`${titleId}-consent`}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all shrink-0 mt-0.5 ${
                    agreed
                      ? 'bg-[#C9973A] border-[#C9973A]'
                      : 'bg-white border-[#d6c8a8] hover:border-[#C9973A]'
                  }`}
                >
                  {agreed && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={4}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </label>
                <label
                  htmlFor={`${titleId}-consent`}
                  className="text-[12px] text-[#1a1612]/70 leading-relaxed cursor-pointer flex-1"
                >
                  {resolved.consentLabel ?? DEFAULT_CONSENT_LABEL}
                </label>
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={onBack}
                  className="sm:flex-1 h-[52px] rounded-2xl border-2 border-[#e8e0d0] text-[#1a1612]/70 text-[12px] font-bold uppercase tracking-[0.16em] flex items-center justify-center gap-2 hover:border-[#d6c8a8] hover:bg-[#faf6ee] active:scale-[0.98] transition-all"
                >
                  <ArrowLeft className="w-4 h-4" strokeWidth={2} />
                  Go Back
                </button>
                <button
                  type="submit"
                  disabled={!agreed}
                  className="sm:flex-[1.4] h-[52px] rounded-2xl text-[12px] font-bold uppercase tracking-[0.18em] text-white flex items-center justify-center gap-2 bg-gradient-to-b from-[#D5A547] to-[#C9973A] shadow-[0_12px_28px_-8px_rgba(201,151,58,0.5)] hover:from-[#C9973A] hover:to-[#B08432] active:scale-[0.98] transition-all disabled:from-[#e8e4dc] disabled:to-[#e0dccf] disabled:text-[#1a1612]/35 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  I Understand &amp; Continue
                  <span className="text-base leading-none">→</span>
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
