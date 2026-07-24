/**
 * Landing Page Manager — the public /discover switch.
 *
 * One master switch (site_settings.landingPageEnabled) governs whether an
 * unauthenticated visitor lands on the public shop directory ("/discover")
 * instead of being sent straight to /login:
 *   OFF → today's behaviour, unchanged — "/" always goes to /login for a
 *         guest, and /discover itself redirects away.
 *   ON  → guests browse shop cards + shop profiles at /discover before
 *         ever creating an account; logged-in users can still reach it
 *         via the profile menu's "Browse Shops" link.
 *
 * Same optimistic toggle shape as SubscriptionManagerView.toggleEnabled —
 * flip locally, revert + alert on failure. Undecorated backend routes make
 * this primary-admin-only, so sub-admins never see this tab.
 */
import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Loader2, Globe, ExternalLink } from 'lucide-react';
import { adminService, AdminSiteSettings } from '../../services/api/adminService';
import { StatTile, Switch } from './DashboardPrimitives';

const CARD =
  'bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)]';

export default function LandingPageSettingsView() {
  const [settings, setSettings] = useState<AdminSiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglePending, setTogglePending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fresh = await adminService.getSiteSettings();
      if (!fresh) throw new Error('Empty response');
      setSettings(fresh);
    } catch (e: any) {
      setError(e?.message || 'Failed to load landing page settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Optimistic master switch — flip locally, revert + alert if the save fails
  // (same reconcile shape as SubscriptionManagerView.toggleEnabled).
  const toggleEnabled = async () => {
    if (!settings || togglePending) return;
    const next = !settings.landingPageEnabled;
    setTogglePending(true);
    setSettings((s) => (s ? { ...s, landingPageEnabled: next } : s));
    try {
      const updated = await adminService.updateSiteSettings({ landingPageEnabled: next });
      if (updated) setSettings(updated);
    } catch (e: any) {
      setSettings((s) => (s ? { ...s, landingPageEnabled: !next } : s));
      alert(e?.message || 'Failed to update the landing page switch.');
    } finally {
      setTogglePending(false);
    }
  };

  if (loading || !settings) {
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

  const enabled = settings.landingPageEnabled;

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#C9973A] mb-2">
            Platform / Public Access
          </p>
          <h1 className="font-serif text-[34px] sm:text-[40px] font-black text-[#1a1a2e] leading-none">
            Landing Page
          </h1>
          <p className="mt-3 text-[14px] text-slate-500 max-w-xl leading-relaxed">
            Controls whether a visitor without an account can browse the public shop directory at
            "/discover" before signing up. Off means a guest always lands on the login page, exactly
            like today.
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

      {/* Stat tile */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
        <StatTile
          label="Public Discover Page"
          value={enabled ? 'ON' : 'OFF'}
          hint={enabled ? 'Guests can browse before registering' : 'Guests go straight to login'}
          icon={Globe}
          tone={enabled ? 'gold' : 'default'}
        />
      </div>

      {/* Master switch */}
      <div className={`${CARD} mb-6 flex items-center justify-between gap-4`}>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-[#1a1a2e]">Public shop directory</p>
          <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
            {enabled
              ? 'ON — unauthenticated visitors see the shop directory at "/" and can open individual shop profiles without an account.'
              : 'OFF — every visitor is sent straight to /login, exactly like the platform behaves today.'}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {togglePending && <Loader2 className="w-4 h-4 animate-spin text-[#C9973A]" />}
          <Switch
            checked={enabled}
            disabled={togglePending}
            onChange={toggleEnabled}
            title="Toggle the public landing page"
          />
        </div>
      </div>

      {enabled && (
        <a
          href="/discover"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-xl text-[12px] font-bold text-[#1a1a2e] hover:border-[#C9973A]/40 transition-all"
        >
          <ExternalLink className="w-4 h-4 text-[#C9973A]" />
          View the public page
        </a>
      )}
    </>
  );
}
