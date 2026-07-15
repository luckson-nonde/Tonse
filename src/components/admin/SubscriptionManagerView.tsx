/**
 * Subscription Manager — the platform monetization control room.
 *
 * One master switch (billing_settings.subscriptionsEnabled) governs both
 * revenue streams at once:
 *   OFF → buyers publish inquiries and receive quotes for FREE, and shops
 *         owe no monthly fee (no paywall anywhere);
 *   ON  → buyers pay the tiered quotation fee below, and every shop
 *         (seller or service provider) must keep the monthly subscription
 *         paid or their dashboard is blocked by SubscriptionPaywall.
 *
 * Prices are admin-editable here: per-tier quotation fees (counts are the
 * platform invariant — only prices change), the "This Shop Only" targeted
 * fee, and the shop monthly fee. The switch saves immediately (optimistic,
 * MilestonesView-style revert on failure); prices save via the button.
 * Primary-admin-only: the tab carries no permission code and the backend
 * routes are undecorated, so sub-admins never see or reach it.
 */
import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Loader2, CreditCard, Users, Wallet, Layers } from 'lucide-react';
import {
  adminService,
  AdminBillingSettings,
} from '../../services/api/adminService';
import { StatTile, Switch } from './DashboardPrimitives';

const CARD =
  'bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)]';

export default function SubscriptionManagerView() {
  const [settings, setSettings] = useState<AdminBillingSettings | null>(null);
  const [draft, setDraft] = useState<AdminBillingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglePending, setTogglePending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fresh = await adminService.getBillingSettings();
      if (!fresh) throw new Error('Empty response');
      setSettings(fresh);
      setDraft(fresh);
    } catch (e: any) {
      setError(e?.message || 'Failed to load billing settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pricesDirty =
    !!settings &&
    !!draft &&
    (draft.targetedInquiryFee !== settings.targetedInquiryFee ||
      draft.monthlyFee !== settings.monthlyFee ||
      JSON.stringify(draft.quoteTiers) !== JSON.stringify(settings.quoteTiers));

  /** Sync server truth in; optionally preserve unsaved draft price edits. */
  const applyServer = (updated: AdminBillingSettings, keepDraftPrices: boolean) => {
    setSettings(updated);
    setDraft((d) =>
      keepDraftPrices && d
        ? {
            ...updated,
            quoteTiers: d.quoteTiers,
            targetedInquiryFee: d.targetedInquiryFee,
            monthlyFee: d.monthlyFee,
          }
        : updated
    );
  };

  // Optimistic master switch — flip locally, revert + alert if the save fails
  // (same reconcile shape as MilestonesView.toggleActive).
  const toggleEnabled = async () => {
    if (!settings || togglePending) return;
    const next = !settings.subscriptionsEnabled;
    setTogglePending(true);
    setSettings((s) => (s ? { ...s, subscriptionsEnabled: next } : s));
    try {
      const updated = await adminService.updateBillingSettings({ subscriptionsEnabled: next });
      if (updated) applyServer(updated, pricesDirty);
    } catch (e: any) {
      setSettings((s) => (s ? { ...s, subscriptionsEnabled: !next } : s));
      alert(e?.message || 'Failed to update the monetization switch.');
    } finally {
      setTogglePending(false);
    }
  };

  const savePrices = async () => {
    if (!draft || saving) return;
    setSaving(true);
    try {
      const updated = await adminService.updateBillingSettings({
        quoteTiers: draft.quoteTiers,
        targetedInquiryFee: draft.targetedInquiryFee,
        monthlyFee: draft.monthlyFee,
      });
      if (updated) {
        applyServer(updated, false);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2500);
      }
    } catch (e: any) {
      alert(e?.message || 'Failed to save prices.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings || !draft) {
    return (
      <div className="py-24 flex flex-col items-center gap-4 text-slate-400">
        {error ? (
          <>
            <p className="text-[13px] font-bold text-rose-500">{error}</p>
            <button
              onClick={load}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-[#1a1a2e] hover:border-[#C9973A]/40 transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try again
            </button>
          </>
        ) : (
          <Loader2 className="w-8 h-8 animate-spin text-[#C9973A]" />
        )}
      </div>
    );
  }

  const enabled = settings.subscriptionsEnabled;

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#C9973A] mb-2">
            Platform / Monetization
          </p>
          <h1 className="font-serif text-[34px] sm:text-[40px] font-black text-[#1a1a2e] leading-none">
            Subscriptions
          </h1>
          <p className="mt-3 text-[14px] text-slate-500 max-w-xl leading-relaxed">
            One switch controls the whole platform's monetization. When it's off, buyers get
            their quotes for free and shops pay no monthly charges. When it's on, buyers pay the
            quotation fees below and every shop must keep its monthly subscription active.
          </p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-[#1a1a2e] hover:border-[#C9973A]/40 transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
        <StatTile
          label="Monetization"
          value={enabled ? 'ON' : 'OFF'}
          hint={enabled ? 'Fees are being charged' : 'Everything is free'}
          icon={CreditCard}
          tone={enabled ? 'gold' : 'default'}
        />
        <StatTile
          label="Active Subscriptions"
          value={settings.activeSubscriberCount}
          hint="Shops paid up this month"
          icon={Users}
          tone="navy"
        />
        <StatTile
          label="Monthly Shop Fee"
          value={`K${settings.monthlyFee}`}
          hint="Per shop, every 30 days"
          icon={Wallet}
          tone="amber"
        />
      </div>

      {/* Master switch */}
      <div className={`${CARD} mb-6 flex items-center justify-between gap-4`}>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-[#1a1a2e]">Platform monetization</p>
          <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
            {enabled
              ? 'ON — buyers pay the quotation fee per inquiry, and shops without an active subscription see a full paywall.'
              : 'OFF — buyers receive quotes for free and shops pay no monthly charges.'}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {togglePending && <Loader2 className="w-4 h-4 animate-spin text-[#C9973A]" />}
          <Switch
            checked={enabled}
            disabled={togglePending}
            onChange={toggleEnabled}
            title="Toggle platform monetization"
          />
        </div>
      </div>

      {/* Prices */}
      <div className={CARD}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-full bg-[rgba(201,151,58,0.08)] flex items-center justify-center">
            <Layers className="w-4 h-4 text-[#C9973A]" />
          </div>
          <h3 className="text-[12px] font-black uppercase tracking-widest text-[#1a1a2e]">
            Quotation fee tiers
          </h3>
        </div>
        <p className="text-[12px] text-slate-500 mb-4 leading-relaxed">
          What a buyer pays to receive up to N quotes on one inquiry. Quote counts are fixed —
          set the price for each tier.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {draft.quoteTiers.map((tier, index) => (
            <div key={tier.count} className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-400">{tier.count} quotes</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[#C9973A] font-black text-[13px]">K</span>
                <input
                  type="number"
                  min={0}
                  value={tier.price}
                  onChange={(e) => {
                    const price = Math.max(0, Number(e.target.value) || 0);
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            quoteTiers: d.quoteTiers.map((t, i) =>
                              i === index ? { ...t, price } : t
                            ),
                          }
                        : d
                    );
                  }}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-[13px] font-bold text-[#1a1a2e] focus:outline-none focus:border-[#C9973A]"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 pt-5 border-t border-slate-100">
          <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            "This Shop Only" fee (K)
            <input
              type="number"
              min={0}
              value={draft.targetedInquiryFee}
              onChange={(e) =>
                setDraft((d) =>
                  d ? { ...d, targetedInquiryFee: Math.max(0, Number(e.target.value) || 0) } : d
                )
              }
              className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-slate-200 text-[13px] font-bold text-[#1a1a2e] tracking-normal focus:outline-none focus:border-[#C9973A]"
            />
            <span className="block mt-1 text-[10px] font-medium normal-case tracking-normal text-slate-400">
              Flat fee when a buyer sends an inquiry directly to one shop.
            </span>
          </label>
          <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Monthly shop subscription (K)
            <input
              type="number"
              min={0}
              value={draft.monthlyFee}
              onChange={(e) =>
                setDraft((d) =>
                  d ? { ...d, monthlyFee: Math.max(0, Number(e.target.value) || 0) } : d
                )
              }
              className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-slate-200 text-[13px] font-bold text-[#1a1a2e] tracking-normal focus:outline-none focus:border-[#C9973A]"
            />
            <span className="block mt-1 text-[10px] font-medium normal-case tracking-normal text-slate-400">
              What every shop pays for 30 days of dashboard access while monetization is on.
            </span>
          </label>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={savePrices}
            disabled={!pricesDirty || saving}
            className="px-6 py-3 bg-[#C9973A] text-white rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-[#b8852f] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Saving…' : 'Save prices'}
          </button>
          {savedFlash && !pricesDirty && (
            <span className="text-[11px] font-bold text-emerald-600">Prices saved.</span>
          )}
          {pricesDirty && !saving && (
            <span className="text-[11px] font-bold text-slate-400">Unsaved changes</span>
          )}
        </div>
      </div>
    </>
  );
}
