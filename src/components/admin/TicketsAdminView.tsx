/**
 * Event ticketing — admin commission control.
 *
 * The pricing-form half of AdsAdminView, without a review queue: ticket
 * events are NOT approval-gated (an event is the seller's own page, unlike
 * an ad occupying platform real estate), so the only admin lever is the
 * platform's cut of each sale. Primary admin only: the tab carries no
 * permission code and the backend routes are undecorated, same pattern as
 * Billing / Site Settings / Ads.
 */
import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Loader2, Ticket, Percent } from 'lucide-react';
import { adminService, AdminTicketSettings } from '../../services/api/adminService';
import { StatTile } from './DashboardPrimitives';

const CARD =
  'bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)]';

export default function TicketsAdminView() {
  const [settings, setSettings] = useState<AdminTicketSettings | null>(null);
  const [draft, setDraft] = useState<AdminTicketSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await adminService.getTicketSettings();
      if (!s) throw new Error('Empty response');
      setSettings(s);
      setDraft(s);
    } catch (e: any) {
      setError(e?.message || 'Failed to load ticket settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = !!settings && !!draft && JSON.stringify(draft) !== JSON.stringify(settings);

  const save = async () => {
    if (!draft || saving) return;
    setSaving(true);
    try {
      const updated = await adminService.updateTicketSettings(draft);
      if (updated) {
        setSettings(updated);
        setDraft(updated);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2500);
      }
    } catch (e: any) {
      alert(e?.message || 'Failed to save ticket settings.');
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

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#C9973A] mb-2">
            Platform / Monetization
          </p>
          <h1 className="font-serif text-[34px] sm:text-[40px] font-black text-[#1a1a2e] leading-none">
            Tickets
          </h1>
          <p className="mt-3 text-[14px] text-slate-500 max-w-xl leading-relaxed">
            Events-category sellers sell tickets through public share links. The platform keeps this
            commission on every sale; the rest is credited to the seller's venture balance the moment
            a ticket is paid for.
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
        <StatTile
          label="Commission"
          value={`${draft.commissionPercent ?? 0}%`}
          hint="Per ticket sale"
          icon={Percent}
          tone="gold"
        />
        <StatTile
          label="Seller keeps"
          value={`${Math.max(0, 100 - (draft.commissionPercent ?? 0))}%`}
          hint="Credited to venture balance"
          icon={Ticket}
          tone="navy"
        />
      </div>

      {/* Commission form */}
      <div className={CARD}>
        <h3 className="text-[12px] font-black uppercase tracking-widest text-[#1a1a2e] mb-1">
          Platform commission
        </h3>
        <p className="text-[12px] text-slate-500 mb-4 leading-relaxed">
          Changing the rate only affects sales from this moment on — the commission on every past
          sale was stamped onto its order at payment time.
        </p>
        <label className="block max-w-xs text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-5">
          Commission %
          <div className="flex items-center gap-1.5 mt-1.5">
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={draft.commissionPercent ?? 0}
              onChange={(e) =>
                setDraft((d) =>
                  d
                    ? { ...d, commissionPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) }
                    : d,
                )
              }
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-[13px] font-bold text-[#1a1a2e] tracking-normal focus:outline-none focus:border-[#C9973A]"
            />
            <span className="text-[#C9973A] font-black text-[13px]">%</span>
          </div>
        </label>

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="px-6 py-3 bg-[#C9973A] text-white rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-[#b8852f] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Saving…' : 'Save commission'}
          </button>
          {savedFlash && !dirty && <span className="text-[11px] font-bold text-emerald-600">Saved.</span>}
          {dirty && !saving && <span className="text-[11px] font-bold text-slate-400">Unsaved changes</span>}
        </div>
      </div>
    </>
  );
}
