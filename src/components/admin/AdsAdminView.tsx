/**
 * Ad placements — admin pricing control + review queue.
 *
 * Same composition as SubscriptionManagerView (pricing form, save button)
 * plus a ReportsView-style pending queue with inline approve/reject. Primary
 * admin only: the tab carries no permission code and the backend routes are
 * undecorated, same pattern as Billing/Site Settings.
 */
import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Loader2, Megaphone, Clock, CheckCircle2, XCircle, Plus, Trash2, ExternalLink, Video } from 'lucide-react';
import {
  adminService,
  AdminAdPricing,
  AdminAdvertisement,
  AdAdminPlacementLocation,
} from '../../services/api/adminService';
import { StatTile } from './DashboardPrimitives';

const CARD =
  'bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)]';

const PLACEMENT_LABEL: Record<AdAdminPlacementLocation, string> = {
  HOMEPAGE_CENTER: 'Homepage Center',
  SECONDARY_SIDEBAR: 'Secondary Sidebar',
  CATEGORY_SIDEBAR: 'Category Sidebar',
  BUNDLE_ALL: 'Bundle (Both)',
};

export default function AdsAdminView() {
  const [pricing, setPricing] = useState<AdminAdPricing | null>(null);
  const [draft, setDraft] = useState<AdminAdPricing | null>(null);
  const [pending, setPending] = useState<AdminAdvertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, q] = await Promise.all([adminService.getAdPricing(), adminService.listPendingAds()]);
      if (!p) throw new Error('Empty response');
      setPricing(p);
      setDraft(p);
      setPending(q);
    } catch (e: any) {
      setError(e?.message || 'Failed to load ad placements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pricesDirty = !!pricing && !!draft && JSON.stringify(draft) !== JSON.stringify(pricing);

  const savePrices = async () => {
    if (!draft || saving) return;
    setSaving(true);
    try {
      const updated = await adminService.updateAdPricing(draft);
      if (updated) {
        setPricing(updated);
        setDraft(updated);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2500);
      }
    } catch (e: any) {
      alert(e?.message || 'Failed to save ad pricing.');
    } finally {
      setSaving(false);
    }
  };

  const approve = async (id: string) => {
    setBusyId(id);
    try {
      await adminService.approveAd(id);
      setPending((rows) => rows.filter((r) => r.id !== id));
    } catch (e: any) {
      alert(e?.message || 'Failed to approve this ad.');
    } finally {
      setBusyId(null);
    }
  };

  const confirmReject = async (id: string) => {
    setBusyId(id);
    try {
      await adminService.rejectAd(id, rejectReason.trim() || undefined);
      setPending((rows) => rows.filter((r) => r.id !== id));
      setRejectingId(null);
      setRejectReason('');
    } catch (e: any) {
      alert(e?.message || 'Failed to reject this ad.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading || !pricing || !draft) {
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

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#C9973A] mb-2">
            Platform / Monetization
          </p>
          <h1 className="font-serif text-[34px] sm:text-[40px] font-black text-[#1a1a2e] leading-none">
            Ads
          </h1>
          <p className="mt-3 text-[14px] text-slate-500 max-w-xl leading-relaxed">
            Set placement pricing and duration discounts, then review submitted ads before they go
            live on the homepage banner or page sidebars.
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

      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
        <StatTile label="Pending Review" value={pending.length} hint="Awaiting approve/reject" icon={Clock} tone="gold" />
        <StatTile
          label="Homepage Rate"
          value={`K${draft.baseRates.HOMEPAGE_CENTER ?? 0}/day`}
          hint="Base, before discounts"
          icon={Megaphone}
          tone="navy"
        />
      </div>

      {/* Pricing */}
      <div className={`${CARD} mb-6`}>
        <h3 className="text-[12px] font-black uppercase tracking-widest text-[#1a1a2e] mb-4">Base rates (ZMW/day)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {(Object.keys(PLACEMENT_LABEL) as AdAdminPlacementLocation[]).map((placement) => (
            <label key={placement} className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              {PLACEMENT_LABEL[placement]}
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[#C9973A] font-black text-[13px]">K</span>
                <input
                  type="number"
                  min={0}
                  value={draft.baseRates[placement] ?? 0}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, baseRates: { ...d.baseRates, [placement]: Math.max(0, Number(e.target.value) || 0) } } : d
                    )
                  }
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-[13px] font-bold text-[#1a1a2e] tracking-normal focus:outline-none focus:border-[#C9973A]"
                />
              </div>
            </label>
          ))}
        </div>

        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[12px] font-black uppercase tracking-widest text-[#1a1a2e]">Duration discount tiers</h3>
          <button
            onClick={() =>
              setDraft((d) => (d ? { ...d, discountTiers: [...d.discountTiers, { minDays: 30, discountPercentage: 10 }] } : d))
            }
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#C9973A] hover:text-[#b8852f]"
          >
            <Plus className="w-3 h-3" /> Add tier
          </button>
        </div>
        <div className="space-y-2">
          {draft.discountTiers.map((tier, i) => (
            <div key={i} className="flex items-center gap-2 p-3 rounded-xl border border-slate-100">
              <label className="flex-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Min days
                <input
                  type="number"
                  min={1}
                  value={tier.minDays}
                  onChange={(e) =>
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            discountTiers: d.discountTiers.map((t, idx) => (idx === i ? { ...t, minDays: Math.max(1, Number(e.target.value) || 1) } : t)),
                          }
                        : d
                    )
                  }
                  className="mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-200 text-[13px] font-bold text-[#1a1a2e] focus:outline-none focus:border-[#C9973A]"
                />
              </label>
              <label className="flex-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Discount %
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={tier.discountPercentage}
                  onChange={(e) =>
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            discountTiers: d.discountTiers.map((t, idx) => (idx === i ? { ...t, discountPercentage: Math.max(0, Number(e.target.value) || 0) } : t)),
                          }
                        : d
                    )
                  }
                  className="mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-200 text-[13px] font-bold text-[#1a1a2e] focus:outline-none focus:border-[#C9973A]"
                />
              </label>
              <button
                onClick={() => setDraft((d) => (d ? { ...d, discountTiers: d.discountTiers.filter((_, idx) => idx !== i) } : d))}
                className="mt-4 p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={savePrices}
            disabled={!pricesDirty || saving}
            className="px-6 py-3 bg-[#C9973A] text-white rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-[#b8852f] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Saving…' : 'Save pricing'}
          </button>
          {savedFlash && !pricesDirty && <span className="text-[11px] font-bold text-emerald-600">Pricing saved.</span>}
          {pricesDirty && !saving && <span className="text-[11px] font-bold text-slate-400">Unsaved changes</span>}
        </div>
      </div>

      {/* Review queue */}
      <div className={CARD}>
        <h3 className="text-[12px] font-black uppercase tracking-widest text-[#1a1a2e] mb-4">Pending review</h3>
        {pending.length === 0 ? (
          <p className="text-[13px] text-slate-400 py-6 text-center">Nothing waiting on review.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((ad) => (
              <div key={ad.id} className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl border border-slate-100">
                <div className="w-full sm:w-32 h-24 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                  {ad.mediaType === 'IMAGE' ? (
                    <img src={ad.mediaUrl} alt={ad.title} className="w-full h-full object-cover" />
                  ) : (
                    <video src={ad.mediaUrl} className="w-full h-full object-cover" controls />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm truncate">{ad.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {PLACEMENT_LABEL[ad.placementLocation]}
                        {ad.placementLocation === 'CATEGORY_SIDEBAR' && (
                          <> · targets {ad.targetCategoryId ?? 'all categories'}</>
                        )}
                        {' · '}K{ad.totalPaidAmount} · {ad.durationDays} days
                        {ad.mediaType === 'VIDEO' && ad.videoDurationSeconds != null && (
                          <span className="inline-flex items-center gap-1 ml-2"><Video className="w-3 h-3" />{ad.videoDurationSeconds.toFixed(1)}s</span>
                        )}
                      </p>
                      <a
                        href={ad.targetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1 mt-1 truncate max-w-full"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" /> {ad.targetUrl}
                      </a>
                    </div>
                  </div>

                  {rejectingId === ad.id ? (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Reason (inappropriate content, copyright, wrong formatting…)"
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[12px] focus:outline-none focus:border-rose-300"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setRejectingId(null); setRejectReason(''); }}
                          className="px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => confirmReject(ad.id)}
                          disabled={busyId === ad.id}
                          className="px-4 py-2 rounded-lg bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {busyId === ad.id && <Loader2 className="w-3 h-3 animate-spin" />}
                          Confirm reject
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => approve(ad.id)}
                        disabled={busyId === ad.id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-50"
                      >
                        {busyId === ad.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectingId(ad.id)}
                        disabled={busyId === ad.id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 disabled:opacity-50"
                      >
                        <XCircle className="w-3 h-3" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
