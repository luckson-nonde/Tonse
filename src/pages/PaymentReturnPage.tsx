import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import Button from '../components/Button';
import {
  clearHostedPaymentHandoff,
  paymentsService,
  readHostedPaymentHandoff,
} from '../services/api/paymentsService';
import { ticketsService } from '../services/api/ticketsService';

type Outcome = 'checking' | 'paid' | 'pending' | 'failed' | 'cancelled' | 'unknown';

/** DPO can take a moment to finish settling after it redirects the payer. */
const MAX_ATTEMPTS = 4;
const RETRY_MS = 2500;

/**
 * Where the payer lands after DPO's hosted page.
 *
 * This screen reports an outcome, it never decides one. It asks the server to
 * re-verify with the provider; the server posts to the ledger only if DPO says
 * the money is really there. A payer who edits the URL, replays it, or arrives
 * without ever paying gets "not paid yet" — nothing here can mint escrow.
 *
 * Reached two ways: DPO's RedirectURL (payment attempted, `CompanyRef` in the
 * query) and its BackURL (payer backed out, `cancelled=1`).
 */
export default function PaymentReturnPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const handoff = useRef(readHostedPaymentHandoff()).current;
  // DPO echoes our reference back as CompanyRef. The stashed hand-off is the
  // fallback for a payer whose sessionStorage survived but whose query didn't.
  const reference = params.get('CompanyRef') || handoff?.reference || '';
  const wasCancelled = params.get('cancelled') === '1';
  const returnTo = handoff?.returnTo || '/';

  const [outcome, setOutcome] = useState<Outcome>(
    wasCancelled ? 'cancelled' : reference ? 'checking' : 'unknown',
  );
  const [error, setError] = useState('');
  const attempts = useRef(0);

  const check = useCallback(async () => {
    if (!reference) return;
    try {
      // Guest ticket payments (TPF-…) verify via the public tickets endpoint —
      // the payer has no account, so the JWT-gated verify would 401 them.
      const result = reference.startsWith('TPF-')
        ? await ticketsService.verifyTicketPayment(reference)
        : await paymentsService.verifyReturn(reference);
      if (result.status === 'SUCCESSFUL') {
        setOutcome('paid');
        clearHostedPaymentHandoff();
        return;
      }
      if (result.status === 'FAILED') {
        setOutcome('failed');
        clearHostedPaymentHandoff();
        return;
      }
      attempts.current += 1;
      if (attempts.current < MAX_ATTEMPTS) {
        setTimeout(check, RETRY_MS);
      } else {
        // Still unconfirmed. NOT a failure — DPO's own notification may land
        // later and settle it, so say so rather than declaring it dead.
        setOutcome('pending');
      }
    } catch (e: any) {
      setError(e?.message || 'We could not confirm this payment.');
      setOutcome('pending');
    }
  }, [reference]);

  useEffect(() => {
    if (outcome === 'checking') void check();
    // `check` is stable for a given reference and re-running would restart the
    // retry chain, so this deliberately keys on the initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy: Record<Outcome, { title: string; body: string }> = {
    checking: {
      title: 'Confirming your payment',
      body: 'Checking with the payment provider. This usually takes a few seconds.',
    },
    paid: {
      title: 'Payment confirmed',
      body: handoff?.label
        ? `${handoff.label} is paid for. You can carry on.`
        : 'Your payment went through. You can carry on.',
    },
    pending: {
      title: 'Payment not confirmed yet',
      body:
        'The provider has not confirmed this payment. If money left your account it will ' +
        'settle shortly — this page is safe to close, and the status will update on its own.',
    },
    failed: {
      title: 'Payment did not go through',
      body: 'Nothing was charged. You can start the payment again when you are ready.',
    },
    cancelled: {
      title: 'Payment cancelled',
      body: 'You backed out before paying, so nothing was charged.',
    },
    unknown: {
      title: "We can't identify this payment",
      body: 'This link is missing its payment reference. Open the item you were paying for and check its status there.',
    },
  };

  const icon = {
    checking: <Loader2 className="w-7 h-7 animate-spin text-slate-400" />,
    paid: <CheckCircle2 className="w-7 h-7 text-emerald-600" />,
    pending: <Clock className="w-7 h-7 text-amber-600" />,
    failed: <XCircle className="w-7 h-7 text-red-600" />,
    cancelled: <XCircle className="w-7 h-7 text-slate-400" />,
    unknown: <XCircle className="w-7 h-7 text-slate-400" />,
  }[outcome];

  const tone = {
    checking: 'bg-slate-100',
    paid: 'bg-emerald-100',
    pending: 'bg-amber-100',
    failed: 'bg-red-100',
    cancelled: 'bg-slate-100',
    unknown: 'bg-slate-100',
  }[outcome];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {/* Opaque border, never border-…/NN — translucent strokes on rounded
          cards smear on Mali GPUs (see the android-gpu-ghosting playbook). */}
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-sm border border-[#e8e5df] space-y-5">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${tone}`}>
          {icon}
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-serif font-bold text-slate-900">{copy[outcome].title}</h1>
          <p className="text-[13px] text-slate-500 leading-relaxed">{copy[outcome].body}</p>
          {error && <p className="text-[12px] text-red-600">{error}</p>}
        </div>

        {reference && (
          <p className="text-[11px] font-mono text-slate-400 break-all">Reference {reference}</p>
        )}

        {outcome !== 'checking' && (
          <div className="flex gap-2 pt-1">
            {outcome === 'pending' && (
              <button
                type="button"
                onClick={() => {
                  attempts.current = 0;
                  setError('');
                  setOutcome('checking');
                  void check();
                }}
                className="flex-1 py-3 rounded-2xl text-slate-500 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all"
              >
                Check again
              </button>
            )}
            <Button
              onClick={() => {
                clearHostedPaymentHandoff();
                navigate(returnTo, { replace: true });
              }}
              className="flex-[1.5] py-3 rounded-2xl font-black uppercase tracking-widest text-[10px]"
            >
              Continue
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
