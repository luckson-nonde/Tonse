import { useCallback, useEffect, useState } from 'react';
import { Lock, ShieldCheck, CalendarClock } from 'lucide-react';
import { useAuth } from '../AuthContext';
import {
  getBillingSettings,
  getMySubscription,
  payMySubscription,
} from '../services/api/billingService';
import PaymentSheet, { type PaymentSheetSubmitPayload } from './PaymentSheet';

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
    try {
      // Simulated PSP delay — the backend records success immediately.
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await payMySubscription({
        amount: payload.amount,
        method: payload.method,
        provider: payload.provider,
        phone: payload.phone,
      });
      await refresh();
      setSheetOpen(false);
    } finally {
      setBusy(false);
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
          <button
            onClick={() => setSheetOpen(true)}
            className="mt-4 w-full py-3.5 bg-[#C9973A] text-white rounded-2xl font-black uppercase tracking-widest text-[12px] hover:bg-[#b8852f] transition-colors cursor-pointer"
          >
            Pay {feeLabel} / month
          </button>
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
