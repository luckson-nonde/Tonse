import { useCallback, useEffect, useState } from 'react';
import { Lock, ShieldCheck, CalendarClock, FlaskConical, Loader2 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import {
  getBillingSettings,
  getMySubscription,
  checkoutMySubscription,
} from '../services/api/billingService';
import { beginHostedPayment, paymentsService } from '../services/api/paymentsService';
import PaymentSheet, { type PaymentSheetSubmitPayload } from './PaymentSheet';
import PushPaymentWait from './PushPaymentWait';

/**
 * Full-screen subscription wall for shops (SELLER / SERVICE_PROVIDER).
 *
 * Self-gating and zero-prop (same idiom as BuyerVerificationBanner): mounted
 * unconditionally inside DashboardLayout, it renders nothing unless the admin
 * has monetization ON *and* the shop's monthly subscription is affirmatively
 * inactive. It FAILS OPEN — while status is loading or a fetch failed (null),
 * nothing is blocked: a false-positive wall that locks a paying shop out of
 * its own dashboard is worse than a missed one.
 *
 * Subscriptions are owner-keyed server-side (parentProviderId ?? user.id), so
 * staff accounts see the same wall as their owner and may pay on the shop's
 * behalf. z-[10000] sits above everything else in the app (current ceiling is
 * the z-[9999] modals).
 */
export default function SubscriptionPaywall() {
  const { user, logout } = useAuth();
  const isShop = user?.role === 'SELLER' || user?.role === 'SERVICE_PROVIDER';

  const [status, setStatus] = useState<{
    enabled: boolean;
    active: boolean;
    paidUntil: string | null;
    monthlyFee: number;
  } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{
    reference: string;
    provider?: string;
    instruction?: string;
  } | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [payError, setPayError] = useState('');

  const refresh = useCallback(async () => {
    if (!isShop) return;
    const [settings, subscription] = await Promise.all([
      getBillingSettings(),
      getMySubscription(),
    ]);
    // Only an affirmative subscription read may drive the wall — null means
    // "unknown" (fetch failed) and must not flip it on.
    if (subscription) {
      setStatus({
        enabled: settings.subscriptionsEnabled && subscription.enabled,
        active: subscription.active,
        paidUntil: subscription.paidUntil,
        monthlyFee: subscription.monthlyFee,
      });
    }
  }, [isShop]);

  useEffect(() => {
    refresh();
  }, [refresh, user?.id]);

  if (!isShop || !status || !status.enabled || status.active) return null;

  const expiredAt = status.paidUntil ? new Date(status.paidUntil) : null;
  const feeLabel = `K${status.monthlyFee.toFixed(2)}`;

  const handleSubmit = async (payload: PaymentSheetSubmitPayload) => {
    setBusy(true);
    setPayError('');
    try {
      // REAL payment: the server charges the current monthly fee and only a
      // PSP-verified success extends paidUntil.
      const result = await checkoutMySubscription({
        channel: payload.method === 'card' ? 'card' : 'mobile-money',
        phone: payload.phone,
        operator: payload.provider,
      });
      if (!result?.reference || result.status === 'failed') {
        throw new Error('Payment could not be started. Please try again.');
      }
      setSheetOpen(false);
      // Live card (and any mobile fallback): the provider's hosted page.
      if (beginHostedPayment(result, { label: 'Your shop subscription' })) return;
      // In-app: mobile push (dpo) or the sandbox pending card.
      setPending({
        reference: result.reference,
        provider: result.provider,
        instruction: result.instruction,
      });
    } catch (e: any) {
      setPayError(e?.message || 'Payment could not be started. Please try again.');
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const handleSimulateApproval = async () => {
    if (!pending) return;
    setSimulating(true);
    try {
      await paymentsService.simulateCheckout(pending.reference, 'successful');
      setPending(null);
      await refresh();
    } catch (e: any) {
      setPayError(e?.message || 'Could not confirm the payment. Please try again.');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-[#0f1023]/95 backdrop-blur-md">
        <div className="max-w-md w-full bg-white border border-slate-100 rounded-2xl p-6 sm:p-8 shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)] text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#fdf6e9] text-[#C9973A] flex items-center justify-center mb-5">
            <Lock className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#C9973A] mb-2">
            Subscription required
          </p>
          <h2 className="font-serif text-2xl font-bold text-[#1a1a2e] mb-3">
            {expiredAt ? 'Reactivate your shop' : 'Activate your shop'}
          </h2>
          <p className="text-[13px] text-slate-500 leading-relaxed mb-2">
            The monthly subscription keeps your shop visible to buyers, delivers new leads, and
            lets you send quotes.
          </p>
          {expiredAt && (
            <p className="text-[11px] font-bold text-rose-500 flex items-center justify-center gap-1.5 mb-2">
              <CalendarClock className="w-3.5 h-3.5" />
              Your subscription expired on {expiredAt.toLocaleDateString()}
            </p>
          )}
          {pending ? (
            <div className="mt-4 text-left">
              {pending.provider === 'dpo' ? (
                <PushPaymentWait
                  reference={pending.reference}
                  amountLabel={feeLabel}
                  instruction={pending.instruction}
                  onDone={(status) => {
                    setPending(null);
                    if (status === 'SUCCESSFUL') void refresh();
                    else setPayError('The payment was not completed. You can try again.');
                  }}
                  onCancel={() => setPending(null)}
                />
              ) : (
                <div className="rounded-2xl border border-[#e2e8f0] bg-slate-50 p-4 space-y-3">
                  <p className="text-[13px] font-black text-[#1a1a2e]">Awaiting approval</p>
                  <p className="text-[12px] text-slate-500 leading-relaxed">
                    In production you'd approve this on your phone. This environment runs on the
                    sandbox payment provider, so use the button below to simulate that approval.
                  </p>
                  <button
                    onClick={() => void handleSimulateApproval()}
                    disabled={simulating}
                    className="w-full py-3 rounded-xl bg-[#C9973A] text-white font-black uppercase tracking-widest text-[11px] hover:bg-[#b8852f] disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {simulating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FlaskConical className="w-3.5 h-3.5" />
                    )}
                    Simulate approval (sandbox)
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setSheetOpen(true)}
              className="mt-4 w-full py-3.5 bg-[#C9973A] text-white rounded-2xl font-black uppercase tracking-widest text-[12px] hover:bg-[#b8852f] transition-colors cursor-pointer"
            >
              Pay {feeLabel} / month
            </button>
          )}
          {payError && <p className="mt-3 text-[12px] font-bold text-rose-500">{payError}</p>}
          <p className="mt-4 text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3 h-3" /> Covers 30 days from today — instant activation
          </p>
          <button
            onClick={logout}
            className="mt-5 text-[11px] font-bold text-slate-400 hover:text-[#1a1a2e] underline underline-offset-2 transition-colors cursor-pointer"
          >
            Not now — log out
          </button>
        </div>
      </div>
      <PaymentSheet
        open={sheetOpen}
        onClose={() => !busy && setSheetOpen(false)}
        title="Shop Subscription"
        amountMode="fixed"
        fixedAmount={status.monthlyFee}
        defaultPhone={user?.phone ?? ''}
        methods={['mobile_money', 'card']}
        actionLabel={(amount) => `Pay K${amount.toFixed(2)}`}
        onSubmit={handleSubmit}
        busy={busy}
        context={[
          { label: 'Plan', value: 'Monthly shop subscription' },
          { label: 'Renews', value: '30 days from payment' },
        ]}
      />
    </>
  );
}
