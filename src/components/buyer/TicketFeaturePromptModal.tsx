import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Ticket, Link2, Wallet, Loader2 } from 'lucide-react';
import { recordConsent } from '../../services/api/consentService';

/** Consent key persisting the buyer's decision on the ticket-selling feature.
 *  granted=true → the "Sell Event Tickets" tab appears; granted=false → the
 *  feature stays hidden and the prompt never shows again. */
export const SELL_TICKETS_FEATURE_KEY = 'sell_tickets_feature';

/** Fired after the decision is stored so DashboardLayout refetches consents
 *  and the sidebar updates without a reload. */
export const FEATURE_CONSENTS_CHANGED_EVENT = 'tonse:feature-consents-changed';

interface TicketFeaturePromptModalProps {
  open: boolean;
  /** Called with the buyer's decision once it has been stored. */
  onDecided: (accepted: boolean) => void;
}

/**
 * One-time opt-in offer shown right after a buyer publishes an events-family
 * inquiry (venue, decor, catering…): they're organising an event, so offer
 * the ticket-selling tool. Accept → the "Sell Event Tickets" tab joins their
 * sidebar; decline → it never appears and we never ask again. The decision is
 * durable (consents store), so it follows the account across devices.
 */
export default function TicketFeaturePromptModal({ open, onDecided }: TicketFeaturePromptModalProps) {
  const [saving, setSaving] = useState<null | 'yes' | 'no'>(null);

  const decide = async (accepted: boolean) => {
    if (saving) return;
    setSaving(accepted ? 'yes' : 'no');
    // Best-effort by design (recordConsent never throws) — the sidebar reacts
    // to the event either way; a transient failure just re-prompts next time.
    await recordConsent(SELL_TICKETS_FEATURE_KEY, accepted, 'feature-prompt');
    window.dispatchEvent(new Event(FEATURE_CONSENTS_CHANGED_EVENT));
    setSaving(null);
    onDecided(accepted);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 px-5"
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ticket-feature-title"
            className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#fdf6e9] border border-[#ecd9b3] flex items-center justify-center mb-4">
              <Ticket className="w-6 h-6 text-[#C9973A]" />
            </div>

            <h2 id="ticket-feature-title" className="font-serif font-semibold text-[1.35rem] text-[#1B3068] leading-tight">
              Planning an event? Sell your tickets here.
            </h2>
            <p className="mt-2.5 text-[13.5px] text-slate-500 leading-relaxed">
              Since you're organising an event, you can sell tickets for it right on Nyuwe — no
              extra apps, no account needed for your buyers.
            </p>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <Ticket className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
                <p className="text-[12.5px] text-slate-600">
                  Create your event with ticket types and prices — Standard, VIP, anything.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <Link2 className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
                <p className="text-[12.5px] text-slate-600">
                  Share one link — anyone who opens it can buy a ticket instantly.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <Wallet className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
                <p className="text-[12.5px] text-slate-600">
                  Every sale lands in your Financial Account automatically.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={() => decide(true)}
                disabled={saving !== null}
                className="flex-1 rounded-2xl bg-[#C9973A] text-white font-bold text-[13px] px-5 py-3 hover:bg-[#a97c27] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving === 'yes' && <Loader2 className="w-4 h-4 animate-spin" />}
                Yes, add it to my dashboard
              </button>
              <button
                onClick={() => decide(false)}
                disabled={saving !== null}
                className="flex-1 rounded-2xl border border-slate-200 text-slate-500 font-bold text-[13px] px-5 py-3 hover:bg-slate-50 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving === 'no' && <Loader2 className="w-4 h-4 animate-spin" />}
                No thanks
              </button>
            </div>
            <p className="mt-3 text-[11px] text-slate-400 text-center">
              Your choice is saved — we won't ask again.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
