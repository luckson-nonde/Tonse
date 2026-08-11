import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Smartphone, XCircle } from 'lucide-react';
import { paymentsService } from '../services/api/paymentsService';

/**
 * "Approve on your phone" — the waiting card for DPO's in-app mobile-money
 * push (ChargeTokenMobile). The payer never leaves the app: the charge is
 * pushed to their handset, and this card polls the server's verify endpoint
 * until DPO confirms the outcome.
 *
 * Polling calls verifyReturn (POST …/verify), NOT the passive status read —
 * verify makes the server re-ask DPO and settle on a yes, so the flow works
 * even before the DPO portal's Payment Notification URL is configured. The
 * endpoint is idempotent and race-safe against the notification by design.
 *
 * Neutral styling so it sits inside both the light cards (My Job Posts) and
 * the dark payment panels (Advertise, Venture account).
 */
export default function PushPaymentWait({
  reference,
  amountLabel,
  instruction,
  onDone,
  onCancel,
}: {
  reference: string;
  /** e.g. "ZMW 48.00" — shown so the payer knows what they're approving. */
  amountLabel: string;
  /** DPO's per-network instruction (USSD steps etc.), when it sent one. */
  instruction?: string;
  onDone: (status: 'SUCCESSFUL' | 'FAILED') => void;
  onCancel?: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [outcome, setOutcome] = useState<'SUCCESSFUL' | 'FAILED' | null>(null);
  const [slow, setSlow] = useState(false);
  // onDone fires exactly once, whichever of the poll loop / manual check wins.
  const doneRef = useRef(false);

  const finish = (status: 'SUCCESSFUL' | 'FAILED') => {
    if (doneRef.current) return;
    doneRef.current = true;
    setOutcome(status);
    // Let the payer SEE the outcome before the caller swaps the view.
    setTimeout(() => onDone(status), 1600);
  };

  const check = async () => {
    setChecking(true);
    try {
      const res = await paymentsService.verifyReturn(reference);
      if (res.status === 'SUCCESSFUL') finish('SUCCESSFUL');
      else if (res.status === 'FAILED') finish('FAILED');
    } catch {
      // Transient — the next tick tries again.
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    doneRef.current = false;
    const interval = setInterval(() => {
      if (!doneRef.current) void check();
    }, 6000);
    // After 90s the prompt has usually expired on the handset — keep polling,
    // but tell the payer what to do instead of leaving a silent spinner.
    const slowTimer = setTimeout(() => setSlow(true), 90000);
    return () => {
      clearInterval(interval);
      clearTimeout(slowTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  if (outcome === 'SUCCESSFUL') {
    return (
      <div className="rounded-2xl border border-[#6ee7b7] bg-emerald-50 p-5 flex items-center gap-3">
        <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-black text-emerald-800">Payment received</p>
          <p className="text-[12px] text-emerald-700">Thank you — finishing up…</p>
        </div>
      </div>
    );
  }

  if (outcome === 'FAILED') {
    return (
      <div className="rounded-2xl border border-[#fda4af] bg-rose-50 p-5 flex items-center gap-3">
        <XCircle className="w-8 h-8 text-rose-500 shrink-0" />
        <div>
          <p className="text-sm font-black text-rose-700">Payment didn't go through</p>
          <p className="text-[12px] text-rose-600">
            It may have been declined or cancelled on the phone. You can try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-[#fdf6e9] border border-[#f0dfc0] flex items-center justify-center shrink-0">
          <Smartphone className="w-5 h-5 text-[#C9973A]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-[#1a1a2e]">Approve on your phone</p>
          <p className="text-[12px] text-slate-500">
            We've sent a payment request of <span className="font-bold text-slate-700">{amountLabel}</span> to
            your phone. Enter your mobile money PIN to approve it.
          </p>
        </div>
      </div>

      {instruction && (
        <p className="text-[12px] text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 whitespace-pre-wrap">
          {instruction}
        </p>
      )}

      <div className="flex items-center gap-2 text-[12px] font-bold text-slate-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C9973A]" />
        Waiting for your approval — this updates by itself.
      </div>

      {slow && (
        <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
          Prompt not on your phone, or did it expire? Dial your provider's approvals menu
          (e.g. MTN *115#, Airtel *778#) to approve pending requests — or cancel and try again.
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={checking}
          onClick={() => void check()}
          className="flex-1 px-4 py-2.5 rounded-xl bg-[#C9973A] hover:bg-[#b8852f] text-white text-[12px] font-bold transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {checking && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          I've approved — check now
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-[#e2e8f0] bg-white text-slate-500 text-[12px] font-bold hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
