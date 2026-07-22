import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import {
  Copy,
  LogOut,
  Link2,
  Trophy,
  UserPlus,
  MessageSquare,
  Handshake,
  Target,
  Loader2,
  LayoutDashboard,
  UserRound,
  ShieldCheck,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import {
  promoterService,
  type PromoterDashboard as PromoterDashboardData,
  type PromoterFunnel,
  type PromoterMe,
  type SocialLink,
} from '../services/api/promoterService';
import { useNotificationStream } from '../hooks/useNotificationStream';
import { StatTile, FunnelStagesCard } from '../components/admin/DashboardPrimitives';
import MilestoneUnlockedAlert, {
  type MilestoneUnlockedPayload,
} from '../components/MilestoneUnlockedAlert';
import Notification from '../components/Notification';
import CompactIdentityCapture from '../components/CompactIdentityCapture';
import SocialLinksEditor, { cleanSocialLinks } from '../components/promoter/SocialLinksEditor';
import DocumentUpload from '../components/promoter/DocumentUpload';

const POLL_MS = 15000;

type PromoterTab = 'dashboard' | 'profile';

const TABS: { id: PromoterTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'profile', label: 'My Profile', icon: UserRound },
];

/**
 * Promoter Studio — /promoter/:tab. Same shell pattern as AdminDashboard:
 * navy sidebar drives the :tab param, content renders the selected view.
 *
 *   dashboard — referral link, live funnel, milestone progress (PULL on
 *               load + 15s poll, PUSH via SSE tickers).
 *   profile   — the identity the artist submitted at signup (bio, social
 *               platforms, ID document, live selfie) + verification status;
 *               editable, with identity re-uploads dropping back to PENDING.
 */
export default function PromoterDashboard() {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const activeTab: PromoterTab = (TABS.find((t) => t.id === tab)?.id ?? 'dashboard') as PromoterTab;

  const [me, setMe] = useState<PromoterMe | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    promoterService.getMe().then(setMe).catch(() => undefined);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f5f2ed] flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-[260px] shrink-0 bg-[#0f1023] text-white sticky top-0 h-screen">
        <div className="px-7 py-7 border-b border-white/5">
          <p className="font-serif text-[20px] font-black tracking-tight">
            <span className="text-white">TON</span>
            <span className="text-[#C9973A]">SE</span>
          </p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.32em] text-[#C9973A]">
            Promoter Studio
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => navigate(`/promoter/${t.id}`)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold transition-all ${
                  isActive
                    ? 'bg-[#C9973A] text-white shadow-[0_8px_20px_-8px_rgba(201,151,58,0.55)]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {t.label}
                {t.id === 'profile' && me && me.verificationStatus !== 'VERIFIED' && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-amber-400" title="Verification pending" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-4 pb-6 space-y-3">
          <div className="rounded-xl bg-white/5 px-4 py-3">
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-white/40 mb-1">
              Signed in as
            </p>
            <p className="text-[13px] font-bold text-white truncate">{me?.name ?? user?.name}</p>
            <p className="text-[11px] text-white/40 truncate">{me?.email ?? user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden bg-[#0f1023] text-white px-5 py-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-serif text-[17px] font-black tracking-tight">
              <span className="text-white">TON</span>
              <span className="text-[#C9973A]">SE</span>
            </p>
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#C9973A]">
              Promoter Studio
            </p>
          </div>
          <select
            value={activeTab}
            onChange={(e) => navigate(`/promoter/${e.target.value}`)}
            className="bg-white/10 text-white text-[13px] font-bold rounded-lg px-3 py-2 focus:outline-none"
          >
            {TABS.map((t) => (
              <option key={t.id} value={t.id} className="text-[#1a1a2e]">
                {t.label}
              </option>
            ))}
          </select>
          <button onClick={handleLogout} aria-label="Sign out" className="text-white/60 hover:text-white">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <main className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
          {/* Same idiom as AdminDashboard: the shell stays mounted, the tab
              content transitions (unique key per tab → enter animation plays). */}
          <PageTransition transitionKey={activeTab}>
            {activeTab === 'dashboard' && <DashboardView userId={user?.id} setToast={setToast} />}
            {activeTab === 'profile' && <ProfileView me={me} setMe={setMe} setToast={setToast} />}
          </PageTransition>
        </main>
      </div>

      <Notification
        message={toast?.message ?? ''}
        type={toast?.type ?? 'success'}
        isVisible={!!toast}
        onClose={() => setToast(null)}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Dashboard view — referral link, live funnel, milestone progress
// ──────────────────────────────────────────────────────────────────────────

function DashboardView({
  userId,
  setToast,
}: {
  userId?: string;
  setToast: (t: { message: string; type: 'success' | 'error' }) => void;
}) {
  const [data, setData] = useState<PromoterDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlockAlert, setUnlockAlert] = useState<MilestoneUnlockedPayload | null>(null);

  const load = useCallback(async () => {
    try {
      const fresh = await promoterService.getDashboard();
      if (fresh) {
        setData(fresh);
        setError(null);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load your dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  useNotificationStream(userId, {
    onReferralProgress: (funnel: PromoterFunnel) =>
      setData((prev) => (prev ? { ...prev, funnel } : prev)),
    onMilestoneUnlocked: (p) => {
      setUnlockAlert({
        milestoneTitle: p.milestoneTitle ?? p.title ?? 'Milestone reached',
        sharesAwarded: Number(p.sharesAwarded ?? 0),
        totalEquityShares: Number(p.totalEquityShares ?? 0),
      });
      load();
    },
    onMilestoneUpdated: () => load(),
    onReconnect: () => load(),
  });

  const copyLink = async () => {
    if (!data?.referralUrl) return;
    try {
      await navigator.clipboard.writeText(data.referralUrl);
      setToast({ message: 'Referral link copied!', type: 'success' });
    } catch {
      setToast({ message: "Couldn't copy — long-press the link instead.", type: 'error' });
    }
  };

  const funnel = data?.funnel ?? { registrations: 0, inquiries: 0, tradesComplete: 0 };
  const rate = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : null);
  const milestone = data?.activeMilestone ?? null;

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="p-5 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-2xl font-medium">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Referral link */}
      <section className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#fdf6e9]/60 text-[#C9973A] flex items-center justify-center">
            <Link2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[12px] font-black uppercase tracking-widest text-[#1a1a2e]">
              Your referral link
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Everyone who signs up through it is tracked below — code{' '}
              <span className="font-black text-[#C9973A]">{data?.referralCode}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            readOnly
            value={data?.referralUrl ?? ''}
            onFocus={(e) => e.target.select()}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 text-[13px] font-medium text-[#1a1a2e] focus:outline-none focus:border-[#C9973A]/50"
          />
          <button
            onClick={copyLink}
            className="shrink-0 flex items-center justify-center gap-2 px-6 py-3 bg-[#C9973A] hover:bg-[#b8852f] rounded-xl text-[13px] font-bold text-white transition-all active:scale-95"
          >
            <Copy className="w-4 h-4" />
            Copy link
          </button>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatTile
          label="Total Equity Shares"
          value={data?.totalEquityShares ?? 0}
          icon={Trophy}
          tone="gold"
          hint="Earned across all milestones"
        />
        <StatTile label="Registrations" value={funnel.registrations} icon={UserPlus} hint="Signed up via your link" />
        <StatTile label="Completed Inquiries" value={funnel.inquiries} icon={MessageSquare} hint="Went on to request quotes" />
        <StatTile label="Completed Trades" value={funnel.tradesComplete} icon={Handshake} hint="Closed a deal on ProQuote" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <FunnelStagesCard
          title="Your referral funnel"
          stages={[
            { label: 'Registrations', value: funnel.registrations, conv: null },
            { label: 'Completed Inquiries', value: funnel.inquiries, conv: rate(funnel.inquiries, funnel.registrations) },
            { label: 'Completed Trades', value: funnel.tradesComplete, conv: rate(funnel.tradesComplete, funnel.inquiries) },
          ]}
        />

        {/* Active milestone */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-[#fdf6e9]/60 text-[#C9973A] flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <h3 className="text-[12px] font-black uppercase tracking-widest text-[#1a1a2e]">
              Active milestone
            </h3>
          </div>

          {milestone ? (
            <>
              <p className="text-[14px] font-bold text-[#1a1a2e] leading-snug">{milestone.title}</p>
              <p className="mt-1 text-[12px] text-slate-400 font-medium">
                Reach {milestone.required}{' '}
                {milestone.targetStage === 'inquiry' ? 'completed inquiries' : 'completed trades'} to unlock{' '}
                <span className="font-black text-[#C9973A]">
                  {milestone.equitySharesReward} equity shares
                </span>
              </p>
              <div className="mt-5 flex items-center justify-between text-[12px] font-bold mb-1.5">
                <span className="text-[#1a1a2e]/75">
                  {milestone.current} / {milestone.required}
                </span>
                <span className="text-[#C9973A]">{milestone.pct}%</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#C9973A] to-[#e0b45f] transition-[width] duration-700"
                  style={{ width: `${milestone.pct}%` }}
                />
              </div>
            </>
          ) : (
            <p className="text-[13px] text-slate-400 font-medium py-4">
              {data?.unlockedMilestones.length
                ? "You've unlocked every live milestone — new goals appear here the moment they're published."
                : 'No live milestones right now — new goals appear here the moment they’re published.'}
            </p>
          )}

          {!!data?.unlockedMilestones.length && (
            <ul className="mt-6 pt-5 border-t border-slate-100 space-y-2.5">
              {data.unlockedMilestones.map((m) => (
                <li key={m.id} className="flex items-center justify-between text-[12px] font-bold">
                  <span className="flex items-center gap-2 text-[#1a1a2e]/75">
                    <Trophy className="w-3.5 h-3.5 text-[#C9973A]" />
                    {m.title}
                  </span>
                  <span className="text-[#C9973A]">+{m.sharesAwarded} shares</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <MilestoneUnlockedAlert payload={unlockAlert} onDismiss={() => setUnlockAlert(null)} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Profile view — identity, socials, documents, verification status
// ──────────────────────────────────────────────────────────────────────────

function VerificationBanner({ me }: { me: PromoterMe }) {
  if (me.verificationStatus === 'VERIFIED') {
    return (
      <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        <div>
          <p className="text-[13px] font-bold text-emerald-700">Identity verified</p>
          <p className="text-[12px] text-emerald-600/80 font-medium">
            Your documents were reviewed and approved by the ProQuote team.
          </p>
        </div>
      </div>
    );
  }
  if (me.verificationStatus === 'REJECTED') {
    return (
      <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-100 rounded-2xl">
        <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
        <div>
          <p className="text-[13px] font-bold text-rose-600">Verification rejected</p>
          <p className="text-[12px] text-rose-500/90 font-medium">
            {me.rejectionReason || 'Re-upload a clearer ID document and selfie, then save to resubmit.'}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
      <Clock className="w-5 h-5 text-amber-500 shrink-0" />
      <div>
        <p className="text-[13px] font-bold text-amber-700">Verification pending</p>
        <p className="text-[12px] text-amber-600/80 font-medium">
          The ProQuote team is reviewing your ID and selfie — you can keep promoting meanwhile.
        </p>
      </div>
    </div>
  );
}

function ProfileView({
  me,
  setMe,
  setToast,
}: {
  me: PromoterMe | null;
  setMe: (m: PromoterMe) => void;
  setToast: (t: { message: string; type: 'success' | 'error' }) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [selfie, setSelfie] = useState('');
  const [idDocument, setIdDocument] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!me || hydrated) return;
    setName(me.name ?? '');
    setPhone(me.phone ?? '');
    setBio(me.bio ?? '');
    setSocialLinks(me.socialLinks?.length ? me.socialLinks : [{ platform: 'Instagram', url: '' }]);
    setSelfie(me.selfie ?? '');
    setIdDocument(me.idDocument ?? '');
    setHydrated(true);
  }, [me, hydrated]);

  if (!me) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const links = cleanSocialLinks(socialLinks);
    if (!links.length) {
      setToast({ message: 'Add at least one social platform you run.', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const fresh = await promoterService.updateMe({
        name: name.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        socialLinks: links,
        // Only resend identity images if they changed — an unchanged resend
        // would needlessly drop verification back to PENDING.
        ...(selfie && selfie !== me.selfie ? { selfie } : {}),
        ...(idDocument && idDocument !== me.idDocument ? { idDocument } : {}),
      });
      if (fresh) setMe(fresh);
      setToast({ message: 'Profile saved.', type: 'success' });
    } catch (err: any) {
      setToast({ message: err?.message || 'Failed to save profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-[#1a1a2e] focus:outline-none focus:border-[#C9973A]/60';

  return (
    <form onSubmit={save} className="space-y-6">
      <VerificationBanner me={me} />

      {/* Personal info */}
      <section className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)]">
        <h3 className="text-[12px] font-black uppercase tracking-widest text-[#1a1a2e] mb-4">
          Personal info
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1.5">
              Full name / Stage name
            </label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1.5">
              Phone
            </label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1.5">
              Email (login — contact support to change)
            </label>
            <input value={me.email} readOnly disabled className={`${inputCls} bg-slate-50/60 text-slate-400`} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1.5">
              Artist bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Who you are, what you perform, where your audience is…"
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>
      </section>

      {/* Socials */}
      <section className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)]">
        <h3 className="text-[12px] font-black uppercase tracking-widest text-[#1a1a2e] mb-1">
          Platforms you run
        </h3>
        <p className="text-[11px] text-slate-400 font-medium mb-4">
          The audiences you'll be promoting ProQuote to — at least one required.
        </p>
        <SocialLinksEditor value={socialLinks} onChange={setSocialLinks} />
      </section>

      {/* Identity documents */}
      <section className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)]">
        <h3 className="text-[12px] font-black uppercase tracking-widest text-[#1a1a2e] mb-1">
          Identity documents
        </h3>
        <p className="text-[11px] text-slate-400 font-medium mb-4">
          Reviewed by the ProQuote team only — replacing either resubmits you for verification.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
              ID document
            </label>
            <DocumentUpload value={idDocument} onChange={setIdDocument} />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
              Live selfie
            </label>
            <CompactIdentityCapture value={selfie} onCapture={setSelfie} />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-8 py-3.5 bg-[#C9973A] hover:bg-[#b8852f] disabled:opacity-60 rounded-full font-sans text-[15px] font-semibold text-white tracking-[0.02em] shadow-[0_4px_16px_rgba(201,151,58,0.35)] transition-all active:scale-95"
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </form>
  );
}
