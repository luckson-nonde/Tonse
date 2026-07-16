/**
 * Admin Dashboard
 *
 * One self-contained page for the platform admin. Left sidebar nav drives the
 * `:tab` URL param, right side renders the selected view. Each view is a small
 * sub-component defined below — all data flows through `adminService` which
 * hits the role-gated `/admin/*` backend endpoints.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import PageTransition from '../../components/PageTransition';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  FileText,
  Wallet,
  History,
  ShieldCheck,
  ShieldQuestion,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShieldAlert,
  Trash2,
  RefreshCw,
  LogOut,
  Sparkles,
  TrendingUp,
  X,
  Check,
  XCircle,
  CheckCircle2,
  Image as ImageIcon,
  ExternalLink,
  SlidersHorizontal,
  ArrowUpRight,
  UserPlus,
  Clock,
  Layers,
  AlertTriangle,
  Store,
  Link2,
  KeyRound,
  Copy,
  Flag,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { ADMIN_PERMISSIONS } from '../../utils/rbac';
import TeamManagersView from '../../components/admin/TeamManagersView';
import ReportsView from '../../components/admin/ReportsView';
import SubscriptionManagerView from '../../components/admin/SubscriptionManagerView';
// StatTile / FunnelCard / Switch were extracted to DashboardPrimitives so the
// promoter dashboard shares them — same components, zero behavior change.
import { StatTile, FunnelCard, Switch } from '../../components/admin/DashboardPrimitives';
import {
  adminService,
  AdminStats,
  AdminUser,
  AdminInquiry,
  AdminQuote,
  AdminTransaction,
  AdminAuditLog,
  AdminCategoryNode,
  LedgerAccountBalance,
  LedgerJournalRow,
  TrialBalance,
  EscrowPositions,
  AdminMilestone,
  AdminMilestoneInput,
  AdminPromoter,
  AdminPromoterDetail,
  PromoterInvite,
  VERIFIABLE_ROLES,
} from '../../services/api/adminService';

type AdminTab =
  | 'overview'
  | 'users'
  | 'verifications'
  | 'reports'
  | 'categories'
  | 'subscriptions'
  | 'milestones'
  | 'inquiries'
  | 'quotes'
  | 'financial'
  | 'team'
  | 'audit';

/**
 * `permission` opens a tab to restricted sub-admins ("User Managers")
 * holding that code; tabs without one are primary-admin-only. The real
 * enforcement is server-side (AdminPermissionsGuard) — this only decides
 * what the sidebar shows.
 */
const TABS: {
  id: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
}[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users, permission: ADMIN_PERMISSIONS.USERS },
  {
    id: 'verifications',
    label: 'Verifications',
    icon: ShieldQuestion,
    permission: ADMIN_PERMISSIONS.VERIFICATIONS,
  },
  { id: 'reports', label: 'Reports', icon: Flag, permission: ADMIN_PERMISSIONS.REPORTS },
  { id: 'categories', label: 'Category Control', icon: SlidersHorizontal },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { id: 'milestones', label: 'Milestones', icon: Sparkles },
  { id: 'inquiries', label: 'Inquiries', icon: MessageSquare },
  { id: 'quotes', label: 'Quotes', icon: FileText },
  { id: 'financial', label: 'Financial', icon: Wallet },
  { id: 'team', label: 'Admin Team', icon: UserPlus },
  { id: 'audit', label: 'Audit Log', icon: History },
];

const PAGE_SIZE = 15;

// ──────────────────────────────────────────────────────────────────────────
// Page shell
// ──────────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const activeTab: AdminTab = (TABS.find((t) => t.id === tab)?.id ?? 'overview') as AdminTab;

  // Sub-admin ("User Manager") = ADMIN with a parent. They see only the
  // tabs their permission codes open; the primary admin sees everything.
  const isSubAdmin = !!user?.parentProviderId;
  const visibleTabs = useMemo(
    () =>
      isSubAdmin
        ? TABS.filter((t) => t.permission && (user?.permissions ?? []).includes(t.permission))
        : TABS,
    [isSubAdmin, user?.permissions]
  );

  // Defense-in-depth: a sub-admin typing /admin/financial (or landing on
  // the default /admin/overview) gets bounced to their first visible tab.
  // The backend 403s those endpoints regardless — this just avoids a
  // broken page.
  const tabVisible = visibleTabs.some((t) => t.id === activeTab);
  useEffect(() => {
    if (!tabVisible && visibleTabs.length > 0) {
      navigate(`/admin/${visibleTabs[0].id}`, { replace: true });
    }
  }, [tabVisible, visibleTabs, navigate]);

  return (
    <div className="min-h-screen bg-[#f5f2ed] flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-[260px] lg:w-[280px] shrink-0 bg-[#0f1023] text-white sticky top-0 h-screen">
        <div className="px-7 py-7 border-b border-white/5">
          <p className="font-serif text-[20px] font-black tracking-tight">
            <span className="text-white">TON</span>
            <span className="text-[#C9973A]">SE</span>
          </p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.32em] text-[#C9973A]">
            Admin Console
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {visibleTabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => navigate(`/admin/${t.id}`)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold transition-all ${
                  isActive
                    ? 'bg-[#C9973A] text-white shadow-[0_8px_20px_-8px_rgba(201,151,58,0.55)]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-5 border-t border-white/5 space-y-2">
          <div className="px-4 py-3 bg-white/5 rounded-xl">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#C9973A]">
              Signed in as
            </p>
            <p className="mt-1 text-[13px] font-bold truncate">{user?.name || 'Admin'}</p>
            <p className="text-[11px] text-white/45 truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => logout().then(() => navigate('/login'))}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[12px] font-bold text-white/55 hover:text-white hover:bg-white/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#0f1023] text-white px-4 py-3 flex items-center justify-between">
        <p className="font-serif text-[16px] font-black">
          <span className="text-white">TON</span>
          <span className="text-[#C9973A]">SE</span>
          <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-[#C9973A]">
            Admin
          </span>
        </p>
        <select
          value={activeTab}
          onChange={(e) => navigate(`/admin/${e.target.value}`)}
          className="bg-white/10 border border-white/15 text-white text-[12px] font-bold rounded-lg px-3 py-1.5 outline-none"
        >
          {visibleTabs.map((t) => (
            <option key={t.id} value={t.id} className="text-[#1a1a2e]">
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      <main className="flex-1 min-w-0 px-5 sm:px-8 lg:px-10 xl:px-14 pt-20 md:pt-10 pb-12 overflow-x-hidden">
        <div className="max-w-[1400px] mx-auto w-full">
          <PageTransition transitionKey={activeTab}>
            {activeTab === 'overview' && tabVisible && <OverviewView />}
            {activeTab === 'users' && tabVisible && <UsersView />}
            {activeTab === 'verifications' && tabVisible && <VerificationsView />}
            {activeTab === 'reports' && tabVisible && <ReportsView />}
            {activeTab === 'categories' && tabVisible && <CategoryControlView />}
            {activeTab === 'subscriptions' && tabVisible && <SubscriptionManagerView />}
            {activeTab === 'milestones' && tabVisible && <MilestonesView />}
            {activeTab === 'inquiries' && tabVisible && <InquiriesView />}
            {activeTab === 'quotes' && tabVisible && <QuotesView />}
            {activeTab === 'financial' && tabVisible && <FinancialView />}
            {activeTab === 'team' && tabVisible && <TeamManagersView />}
            {activeTab === 'audit' && tabVisible && <AuditView />}
          </PageTransition>
        </div>
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Shared primitives
// ──────────────────────────────────────────────────────────────────────────

function ViewHeader({
  eyebrow,
  title,
  subtitle,
  rightSlot,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#C9973A] mb-2">
          {eyebrow}
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1a1a2e] tracking-tight leading-tight mb-2">
          {title}
        </h1>
        <p className="text-[13px] sm:text-sm text-[#1a1a2e]/55 font-medium leading-relaxed max-w-xl">
          {subtitle}
        </p>
      </div>
      {rightSlot && <div className="shrink-0">{rightSlot}</div>}
    </div>
  );
}

function StatusPill({ value }: { value?: string }) {
  if (!value) return <span className="text-slate-300 text-[11px]">—</span>;
  const v = value.toUpperCase();
  const tone =
    v === 'OPEN' || v === 'ACTIVE' || v === 'PAID' || v === 'COMPLETED' || v === 'VERIFIED' || v === 'SUCCESS'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : v === 'PENDING' || v === 'PROCESSING' || v === 'QUOTED' || v === 'AWAITING_PICKUP'
        ? 'bg-amber-50 text-amber-700 border-amber-100'
        : v === 'CLOSED' || v === 'REJECTED' || v === 'SUSPENDED' || v === 'FAILED' || v === 'CANCELLED'
          ? 'bg-rose-50 text-rose-700 border-rose-100'
          : 'bg-slate-50 text-slate-600 border-slate-100';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-[0.1em] ${tone}`}
    >
      {value}
    </span>
  );
}

function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-1 pt-5 mt-5 border-t border-slate-100">
      <p className="text-[11px] font-bold text-slate-400">
        Page <span className="text-[#1a1a2e]">{page}</span> of {totalPages} · {total} total
      </p>
      <div className="flex gap-1.5">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function EmptyOrLoading({
  loading,
  error,
  empty,
  emptyLabel,
}: {
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyLabel: string;
}) {
  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#C9973A]" />
        <p className="text-[11px] font-bold uppercase tracking-widest">Loading…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-16 flex flex-col items-center gap-2 text-rose-500 text-[13px] font-medium">
        <ShieldAlert className="w-6 h-6" />
        <p>{error}</p>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="py-20 text-center text-slate-400 text-[13px] font-medium">{emptyLabel}</div>
    );
  }
  return null;
}

// Accepts strings too: ledger/escrow amounts come off Postgres `numeric` as
// exact decimal STRINGS, and must not be coerced to floats upstream.
const formatZmw = (n: number | string | undefined | null) => {
  const v = typeof n === 'string' ? Number(n) : n;
  return typeof v === 'number' && !Number.isNaN(v)
    ? `K${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : 'K0';
};

const formatDate = (s?: string | number) => {
  if (!s) return '—';
  const d = typeof s === 'number' ? new Date(s) : new Date(s);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatRelative = (s?: string | number) => {
  if (!s) return '';
  const d = typeof s === 'number' ? new Date(s) : new Date(s);
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// ──────────────────────────────────────────────────────────────────────────
// Overview view — stat tiles + role breakdown
// ──────────────────────────────────────────────────────────────────────────

function OverviewView() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activity, setActivity] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, audit] = await Promise.all([
        adminService.getStats(),
        adminService.listAudit({ page: 1, limit: 8 }).catch(() => ({ data: [], total: 0 })),
      ]);
      setStats(data);
      setActivity(audit.data ?? []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load platform stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const providers = stats
    ? (stats.users.byRole?.SELLER ?? 0) +
      (stats.users.byRole?.SUPPLIER ?? 0) +
      (stats.users.byRole?.SERVICE_PROVIDER ?? 0) +
      (stats.users.byRole?.ENTERTAINMENT ?? 0) +
      (stats.users.byRole?.EVENTS ?? 0)
    : 0;
  const openInquiries = stats?.inquiries.byStatus?.OPEN ?? 0;
  const pending = stats?.pendingVerifications ?? 0;
  const signups7d = stats?.users.recentSignups7d ?? 0;
  const catActive = stats?.categories?.active ?? 0;
  const catTotal = stats?.categories?.total ?? 0;

  return (
    <>
      <ViewHeader
        eyebrow="Section 01 / Command"
        title="Platform Overview"
        subtitle="Everything that needs your attention right now, plus how the marketplace is growing over time."
        rightSlot={
          <button
            onClick={load}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-[#1a1a2e] hover:border-[#C9973A]/40 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        }
      />

      <EmptyOrLoading loading={loading} error={error} empty={!stats} emptyLabel="No data yet." />

      {stats && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-10"
        >
          {/* Needs-attention banner */}
          {pending > 0 && (
            <button
              onClick={() => navigate('/admin/verifications')}
              className="w-full text-left flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 hover:bg-amber-100/70 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-black text-amber-900">
                  {pending} {pending === 1 ? 'account is' : 'accounts are'} waiting for verification
                </p>
                <p className="text-[12px] text-amber-700 font-medium">
                  Providers can't trade until you approve them — review the queue.
                </p>
              </div>
              <ArrowUpRight className="ml-auto w-5 h-5 text-amber-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          )}

          {/* Ops cockpit — clickable tiles */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
            <StatTile
              label="Total Users"
              value={stats.users.total}
              icon={Users}
              tone="gold"
              hint={`+${signups7d} this week`}
              onClick={() => navigate('/admin/users')}
            />
            <StatTile
              label="Buyers"
              value={stats.users.byRole?.BUYER ?? 0}
              icon={Users}
              onClick={() => navigate('/admin/users')}
            />
            <StatTile
              label="Providers"
              value={providers}
              icon={Store}
              onClick={() => navigate('/admin/users')}
            />
            <StatTile
              label="Open Inquiries"
              value={openInquiries}
              icon={MessageSquare}
              onClick={() => navigate('/admin/inquiries')}
            />
            <StatTile
              label="Pending Review"
              value={pending}
              icon={ShieldQuestion}
              tone={pending > 0 ? 'amber' : 'default'}
              badge={pending}
              onClick={() => navigate('/admin/verifications')}
            />
            <StatTile
              label="Collected"
              value={formatZmw(stats.payments.totalCollectedZmw)}
              icon={Wallet}
              tone="navy"
              hint={`${stats.payments.total} transactions`}
              onClick={() => navigate('/admin/financial')}
            />
          </div>

          {/* Quick actions + recent activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)]">
              <h3 className="text-[12px] font-black uppercase tracking-widest text-[#1a1a2e] mb-4">
                Quick actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <QuickAction
                  icon={ShieldQuestion}
                  label="Review verifications"
                  sublabel={pending > 0 ? `${pending} pending` : 'Queue clear'}
                  onClick={() => navigate('/admin/verifications')}
                />
                <QuickAction
                  icon={SlidersHorizontal}
                  label="Category control"
                  sublabel={`${catActive}/${catTotal} active`}
                  onClick={() => navigate('/admin/categories')}
                />
                <QuickAction
                  icon={MessageSquare}
                  label="View inquiries"
                  sublabel={`${openInquiries} open`}
                  onClick={() => navigate('/admin/inquiries')}
                />
                <QuickAction
                  icon={Wallet}
                  label="Financial ledger"
                  sublabel={formatZmw(stats.payments.totalCollectedZmw)}
                  onClick={() => navigate('/admin/financial')}
                />
              </div>
            </div>
            <RecentActivityCard activity={activity} />
          </div>

          {/* ── Section 02 — Growth & health ────────────────────────────── */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#C9973A] mb-4">
              Section 02 / Growth &amp; health
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-5">
              <StatTile label="New Signups (7d)" value={signups7d} icon={UserPlus} tone="gold" />
              <StatTile
                label="Quote Volume Paid"
                value={formatZmw(stats.quotes.paidVolumeZmw)}
                icon={TrendingUp}
                tone="navy"
              />
              <StatTile label="Total Quotes" value={stats.quotes.total} icon={FileText} />
              <StatTile
                label="Active Categories"
                value={`${catActive}/${catTotal}`}
                icon={Layers}
                hint={catTotal - catActive > 0 ? `${catTotal - catActive} switched off` : 'All live'}
                onClick={() => navigate('/admin/categories')}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
              <FunnelCard funnel={stats.funnel} />
              <BreakdownCard title="Users by Role" data={stats.users.byRole} icon={Users} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <BreakdownCard
                title="Inquiries by Status"
                data={stats.inquiries.byStatus}
                icon={MessageSquare}
              />
              <BreakdownCard
                title="Quotes by Status"
                data={stats.quotes.byStatus}
                icon={FileText}
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-400 font-medium text-center">
            Snapshot generated {new Date(stats.generatedAt).toLocaleString()}
          </p>
        </motion.div>
      )}
    </>
  );
}

function QuickAction({
  icon: Icon,
  label,
  sublabel,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sublabel: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-left hover:border-[#C9973A]/40 hover:bg-white transition-all group"
    >
      <div className="w-9 h-9 rounded-lg bg-[#fdf6e9] text-[#C9973A] flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[12px] font-bold text-[#1a1a2e] truncate">{label}</p>
        <p className="text-[11px] text-slate-400 font-medium truncate">{sublabel}</p>
      </div>
      <ArrowUpRight className="ml-auto w-4 h-4 text-slate-300 group-hover:text-[#C9973A] transition-colors shrink-0" />
    </button>
  );
}

function RecentActivityCard({ activity }: { activity: AdminAuditLog[] }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-[#fdf6e9]/60 text-[#C9973A] flex items-center justify-center">
          <Clock className="w-4 h-4" />
        </div>
        <h3 className="text-[12px] font-black uppercase tracking-widest text-[#1a1a2e]">
          Recent activity
        </h3>
      </div>
      {activity.length === 0 ? (
        <p className="text-[12px] text-slate-300 font-medium py-6 text-center">
          No recorded activity yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {activity.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#C9973A] mt-1.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-[#1a1a2e] leading-snug">
                  {(entry.action || 'EVENT').replace(/_/g, ' ')}
                  {entry.entityType && (
                    <span className="text-slate-400 font-medium"> · {entry.entityType}</span>
                  )}
                </p>
                {(entry as any).targetTitle && (
                  <p className="text-[11px] text-slate-500 truncate">{(entry as any).targetTitle}</p>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap shrink-0">
                {formatRelative(entry.createdAt || (entry.timestamp as any))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BreakdownCard({
  title,
  data,
  icon: Icon,
}: {
  title: string;
  data: Record<string, number>;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-[#fdf6e9]/60 text-[#C9973A] flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="text-[12px] font-black uppercase tracking-widest text-[#1a1a2e]">
          {title}
        </h3>
      </div>
      {entries.length === 0 ? (
        <p className="text-[12px] text-slate-300 font-medium">No data yet.</p>
      ) : (
        <ul className="space-y-3">
          {entries.map(([key, value]) => (
            <li key={key}>
              <div className="flex items-center justify-between text-[12px] font-bold mb-1.5">
                <span className="text-[#1a1a2e]/75 truncate">{key}</span>
                <span className="text-[#C9973A]">{value}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C9973A]"
                  style={{ width: `${(value / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Category control — switch categories / subcategories on & off platform-wide
// ──────────────────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────────────────
// Milestones — promoter programme goals (referral funnel → equity rewards)
// ──────────────────────────────────────────────────────────────────────────

const STAGE_LABEL: Record<AdminMilestone['targetStage'], string> = {
  inquiry: 'Completed Inquiries',
  trade_complete: 'Completed Trades',
};

function MilestonesView() {
  const [milestones, setMilestones] = useState<AdminMilestone[]>([]);
  const [promoters, setPromoters] = useState<AdminPromoter[]>([]);
  const [invite, setInvite] = useState<PromoterInvite | null>(null);
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState<'url' | 'key' | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AdminMilestoneInput>({
    title: '',
    targetStage: 'inquiry',
    requiredCount: 10,
    equitySharesReward: 50,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ms, ps, inv] = await Promise.all([
        adminService.getMilestones(),
        adminService.getPromoters(),
        adminService.getPromoterInvite(),
      ]);
      setMilestones(ms);
      setPromoters(ps);
      setInvite(inv);
    } catch (e: any) {
      setError(e?.message || 'Failed to load milestones');
    } finally {
      setLoading(false);
    }
  }, []);

  const copyInvite = async (what: 'url' | 'key') => {
    const value = what === 'url' ? invite?.signupUrl : invite?.inviteKey;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard blocked — the value is visible to select manually */
    }
  };

  const rotateInvite = async () => {
    if (
      !window.confirm(
        'Generate a new invite key? The current key stops working IMMEDIATELY — anyone holding it can no longer sign up until you share the new one.'
      )
    )
      return;
    setRotating(true);
    try {
      const fresh = await adminService.rotatePromoterInvite();
      if (fresh) setInvite(fresh);
    } catch (e: any) {
      alert(e?.message || 'Failed to rotate the invite key');
    } finally {
      setRotating(false);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  const createMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const created = await adminService.createMilestone({
        ...form,
        title: form.title.trim(),
        requiredCount: Math.max(1, Math.round(Number(form.requiredCount))),
        equitySharesReward: Math.max(0, Number(form.equitySharesReward)),
      });
      if (created) setMilestones((prev) => [created, ...prev]);
      setForm((f) => ({ ...f, title: '' }));
    } catch (err: any) {
      alert(err?.message || 'Failed to create milestone');
    } finally {
      setSaving(false);
    }
  };

  // Optimistic toggle — same reconcile-on-error shape as CategoryControlView.
  const toggleActive = async (m: AdminMilestone) => {
    const next = !m.isActive;
    setPendingId(m.id);
    setMilestones((prev) => prev.map((x) => (x.id === m.id ? { ...x, isActive: next } : x)));
    try {
      await adminService.updateMilestone(m.id, { isActive: next });
    } catch (e: any) {
      setMilestones((prev) => prev.map((x) => (x.id === m.id ? { ...x, isActive: !next } : x)));
      alert(e?.message || 'Failed to update milestone');
    } finally {
      setPendingId(null);
    }
  };

  const removeMilestone = async (m: AdminMilestone) => {
    if (!window.confirm(`Delete "${m.title}"? Milestones that already paid out can only be deactivated.`)) return;
    setPendingId(m.id);
    try {
      await adminService.deleteMilestone(m.id);
      setMilestones((prev) => prev.filter((x) => x.id !== m.id));
    } catch (e: any) {
      alert(e?.message || 'This milestone has already awarded shares — deactivate it instead.');
    } finally {
      setPendingId(null);
    }
  };

  const activeCount = milestones.filter((m) => m.isActive).length;
  const totalSharesGranted = promoters.reduce((acc, p) => acc + Number(p.totalEquityShares || 0), 0);

  const inputCls =
    'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-[#1a1a2e] focus:outline-none focus:border-[#C9973A]/60';

  return (
    <>
      <ViewHeader
        eyebrow="Section / Promoter programme"
        title="Milestones"
        subtitle="Configure the goals promoters race toward. Each milestone grants equity shares the moment a promoter's referral funnel crosses its threshold — awards fire automatically and push to their dashboards live. Editing a goal re-checks every promoter immediately."
        rightSlot={
          <button
            onClick={load}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-[#1a1a2e] hover:border-[#C9973A]/40 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        }
      />

      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
          <StatTile label="Live Milestones" value={`${activeCount}/${milestones.length}`} icon={Sparkles} tone="gold" />
          <StatTile label="Promoters" value={promoters.length} icon={Users} />
          <StatTile label="Shares Granted" value={totalSharesGranted} icon={TrendingUp} tone="navy" />
        </div>
      )}

      {/* Invite — the unlisted signup link + the key that gates it */}
      {!loading && !error && invite && (
        <div className="bg-[#0f1023] rounded-2xl p-5 sm:p-6 shadow-[0_10px_30px_-16px_rgba(15,16,35,0.7)] mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#C9973A]/15 text-[#C9973A] flex items-center justify-center">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[12px] font-black uppercase tracking-widest text-white">
                  Artist invite
                </h3>
                <p className="text-[11px] text-white/40 font-medium">
                  Share the link + key privately with NDA'd artists — the page is unlisted, the key is the gate.
                </p>
              </div>
            </div>
            <button
              onClick={rotateInvite}
              disabled={rotating}
              className="px-4 py-2.5 bg-[#C9973A] hover:bg-[#b8852f] disabled:opacity-60 rounded-xl text-[11px] font-bold uppercase tracking-widest text-white transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${rotating ? 'animate-spin' : ''}`} />
              {invite.inviteKey ? 'Generate new key' : 'Generate key'}
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex items-center gap-3">
              <Link2 className="w-4 h-4 text-[#C9973A] shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-[0.24em] text-white/40">Signup link</p>
                <p className="text-[13px] font-bold text-white truncate">{invite.signupUrl}</p>
              </div>
              <button
                onClick={() => copyInvite('url')}
                className="shrink-0 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors"
                title="Copy signup link"
              >
                {copied === 'url' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex items-center gap-3">
              <KeyRound className="w-4 h-4 text-[#C9973A] shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-[0.24em] text-white/40">
                  Invite key{invite.rotatedAt ? '' : ' · from server config'}
                </p>
                <p className="text-[13px] font-black text-[#C9973A] tracking-wider truncate">
                  {invite.inviteKey ?? 'Not set — signup is disabled'}
                </p>
              </div>
              {invite.inviteKey && (
                <button
                  onClick={() => copyInvite('key')}
                  className="shrink-0 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors"
                  title="Copy invite key"
                >
                  {copied === 'key' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create form */}
      <form
        onSubmit={createMilestone}
        className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)] mb-6"
      >
        <h3 className="text-[12px] font-black uppercase tracking-widest text-[#1a1a2e] mb-4">
          New milestone
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-[1fr_180px_120px_140px_auto] gap-3 items-end">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1.5">
              Title
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder='e.g. "First 20 completed inquiries"'
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1.5">
              Target stage
            </label>
            <select
              value={form.targetStage}
              onChange={(e) =>
                setForm((f) => ({ ...f, targetStage: e.target.value as AdminMilestone['targetStage'] }))
              }
              className={inputCls}
            >
              <option value="inquiry">Completed Inquiries</option>
              <option value="trade_complete">Completed Trades</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1.5">
              Required
            </label>
            <input
              type="number"
              min={1}
              value={form.requiredCount}
              onChange={(e) => setForm((f) => ({ ...f, requiredCount: Number(e.target.value) }))}
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1.5">
              Shares reward
            </label>
            <input
              type="number"
              min={0}
              value={form.equitySharesReward}
              onChange={(e) => setForm((f) => ({ ...f, equitySharesReward: Number(e.target.value) }))}
              required
              className={inputCls}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[#C9973A] hover:bg-[#b8852f] disabled:opacity-60 rounded-xl text-[12px] font-bold text-white transition-all active:scale-95 whitespace-nowrap"
          >
            {saving ? 'Adding…' : 'Add milestone'}
          </button>
        </div>
      </form>

      {/* Milestones list */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)] overflow-hidden mb-6">
        <EmptyOrLoading
          loading={loading}
          error={error}
          empty={!loading && !error && milestones.length === 0}
          emptyLabel="No milestones yet — add the first goal above."
        />
        {!loading && !error && milestones.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {milestones.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] font-bold ${m.isActive ? 'text-[#1a1a2e]' : 'text-slate-400 line-through'}`}>
                    {m.title}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    {m.requiredCount} × {STAGE_LABEL[m.targetStage]} →{' '}
                    <span className="font-black text-[#C9973A]">{m.equitySharesReward} shares</span>
                  </p>
                </div>
                <Switch
                  checked={m.isActive}
                  disabled={pendingId === m.id}
                  onChange={() => toggleActive(m)}
                  title={m.isActive ? 'Deactivate' : 'Activate'}
                />
                <button
                  onClick={() => removeMilestone(m)}
                  disabled={pendingId === m.id}
                  className="w-9 h-9 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 disabled:opacity-40 flex items-center justify-center transition-colors"
                  title="Delete (blocked once shares have been paid out)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Promoter oversight — identity review lives behind each row's Review button */}
      {!loading && !error && promoters.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <h3 className="text-[12px] font-black uppercase tracking-widest text-[#1a1a2e]">
              Promoters
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">
                  <th className="px-5 py-3">Promoter</th>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Identity</th>
                  <th className="px-5 py-3 text-right">Registrations</th>
                  <th className="px-5 py-3 text-right">Inquiries</th>
                  <th className="px-5 py-3 text-right">Trades</th>
                  <th className="px-5 py-3 text-right">Shares</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {promoters.map((p) => (
                  <tr key={p.id} className="text-[13px] font-medium text-[#1a1a2e]">
                    <td className="px-5 py-3.5">
                      <p className="font-bold">{p.name}</p>
                      <p className="text-[11px] text-slate-400">{p.email}</p>
                    </td>
                    <td className="px-5 py-3.5 font-black text-[#C9973A]">{p.referralCode}</td>
                    <td className="px-5 py-3.5">
                      <StatusPill value={p.verificationStatus} />
                    </td>
                    <td className="px-5 py-3.5 text-right">{p.funnel.registrations}</td>
                    <td className="px-5 py-3.5 text-right">{p.funnel.inquiries}</td>
                    <td className="px-5 py-3.5 text-right">{p.funnel.tradesComplete}</td>
                    <td className="px-5 py-3.5 text-right font-black">{p.totalEquityShares}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setReviewId(p.id)}
                        className="px-3.5 py-2 rounded-lg border border-slate-200 text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-[#1a1a2e] hover:border-[#C9973A]/40 transition-all"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reviewId && (
        <PromoterReviewModal
          promoterId={reviewId}
          onClose={() => setReviewId(null)}
          onDecision={(id, status) => {
            setPromoters((prev) =>
              prev.map((p) => (p.id === id ? { ...p, verificationStatus: status } : p))
            );
          }}
        />
      )}
    </>
  );
}

/**
 * Identity review: selfie + ID document side by side, the platforms the
 * artist claims to run, and the verify/reject decision. Detail (with the
 * base64 images) loads on open — never in the bulk list.
 */
function PromoterReviewModal({
  promoterId,
  onClose,
  onDecision,
}: {
  promoterId: string;
  onClose: () => void;
  onDecision: (id: string, status: 'VERIFIED' | 'REJECTED') => void;
}) {
  const [detail, setDetail] = useState<AdminPromoterDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deciding, setDeciding] = useState(false);

  useEffect(() => {
    adminService
      .getPromoterDetail(promoterId)
      .then(setDetail)
      .catch((e: any) => setError(e?.message || 'Failed to load promoter'));
  }, [promoterId]);

  const decide = async (status: 'VERIFIED' | 'REJECTED') => {
    let reason: string | undefined;
    if (status === 'REJECTED') {
      reason = window.prompt('Reason shown to the promoter (optional):') ?? undefined;
    }
    setDeciding(true);
    try {
      const fresh = await adminService.setPromoterVerification(promoterId, status, reason);
      if (fresh) setDetail(fresh);
      onDecision(promoterId, status);
    } catch (e: any) {
      alert(e?.message || 'Failed to update verification');
    } finally {
      setDeciding(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-8 bg-[#0f1023]/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-full overflow-y-auto bg-white rounded-3xl p-6 sm:p-8 shadow-[0_30px_80px_-20px_rgba(15,16,35,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C9973A] mb-1">
              Identity review
            </p>
            <h3 className="font-serif text-xl font-black text-[#1a1a2e]">
              {detail?.name ?? 'Loading…'}
            </h3>
            {detail && (
              <p className="text-[12px] text-slate-400 font-medium">
                {detail.email}
                {detail.phone ? ` · ${detail.phone}` : ''} · code{' '}
                <span className="font-black text-[#C9973A]">{detail.referralCode}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {detail && <StatusPill value={detail.verificationStatus} />}
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-[#1a1a2e] flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-xl font-medium">
            {error}
          </div>
        )}

        {!detail && !error && (
          <div className="py-16 flex justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}

        {detail && (
          <>
            {detail.bio && (
              <p className="text-[13px] text-[#1a1a2e]/70 font-medium leading-relaxed mb-5">
                {detail.bio}
              </p>
            )}

            {/* Identity images — face must match the document */}
            <div className="grid sm:grid-cols-2 gap-4 mb-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                  Live selfie
                </p>
                {detail.selfie ? (
                  <img
                    src={detail.selfie}
                    alt="Promoter selfie"
                    className="w-full aspect-square object-cover rounded-2xl border border-slate-100"
                  />
                ) : (
                  <div className="w-full aspect-square rounded-2xl border border-dashed border-slate-200 flex items-center justify-center text-[12px] text-slate-400 font-medium">
                    Not submitted
                  </div>
                )}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                  ID document
                </p>
                {detail.idDocument ? (
                  <img
                    src={detail.idDocument}
                    alt="ID document"
                    className="w-full aspect-square object-contain bg-slate-50 rounded-2xl border border-slate-100"
                  />
                ) : (
                  <div className="w-full aspect-square rounded-2xl border border-dashed border-slate-200 flex items-center justify-center text-[12px] text-slate-400 font-medium">
                    Not submitted
                  </div>
                )}
              </div>
            </div>

            {/* Platforms */}
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
              Platforms they run
            </p>
            {detail.socialLinks?.length ? (
              <ul className="space-y-1.5 mb-6">
                {detail.socialLinks.map((s, i) => (
                  <li key={i} className="flex items-center gap-2 text-[13px] font-medium">
                    <span className="font-bold text-[#1a1a2e] w-28 shrink-0">{s.platform}</span>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#C9973A] hover:underline underline-offset-2 truncate flex items-center gap-1"
                    >
                      {s.url}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12px] text-slate-400 font-medium mb-6">None submitted.</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => decide('REJECTED')}
                disabled={deciding}
                className="flex-1 py-3 rounded-xl border border-rose-200 text-[13px] font-bold text-rose-500 hover:bg-rose-50 disabled:opacity-50 transition-all"
              >
                Reject
              </button>
              <button
                onClick={() => decide('VERIFIED')}
                disabled={deciding}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-[13px] font-bold text-white disabled:opacity-50 transition-all"
              >
                Verify identity
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CategoryControlView() {
  const [nodes, setNodes] = useState<AdminCategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getCategories();
      setNodes(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Optimistic toggle: flip local state immediately, reconcile on error.
  const toggle = async (id: string, next: boolean) => {
    setPendingId(id);
    setNodes((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, isActive: next }
          : { ...p, children: p.children.map((c) => (c.id === id ? { ...c, isActive: next } : c)) }
      )
    );
    try {
      await adminService.setCategoryActive(id, next);
    } catch (e: any) {
      // Revert on failure.
      setNodes((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, isActive: !next }
            : {
                ...p,
                children: p.children.map((c) => (c.id === id ? { ...c, isActive: !next } : c)),
              }
        )
      );
      alert(e?.message || 'Failed to update category');
    } finally {
      setPendingId(null);
    }
  };

  const q = search.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!q) return nodes;
    return nodes
      .map((p) => {
        const parentHit = p.name.toLowerCase().includes(q);
        const kids = p.children.filter((c) => c.name.toLowerCase().includes(q));
        if (parentHit) return p; // whole branch
        if (kids.length > 0) return { ...p, children: kids };
        return null;
      })
      .filter(Boolean) as AdminCategoryNode[];
  }, [nodes, q]);

  const activeParents = nodes.filter((n) => n.isActive).length;
  const activeSubs = nodes.reduce(
    (acc, n) => acc + n.children.filter((c) => c.isActive && n.isActive).length,
    0
  );
  const totalSubs = nodes.reduce((acc, n) => acc + n.children.length, 0);

  return (
    <>
      <ViewHeader
        eyebrow="Section / Availability"
        title="Category Control"
        subtitle="Switch a category or a single subcategory off and it disappears from every buyer & seller picker, stops matching to leads, and blocks new inquiries. Existing deals are left untouched. Turning a parent off hides its whole branch."
        rightSlot={
          <button
            onClick={load}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-[#1a1a2e] hover:border-[#C9973A]/40 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        }
      />

      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
          <StatTile label="Active Categories" value={`${activeParents}/${nodes.length}`} icon={Layers} tone="gold" />
          <StatTile label="Active Subcategories" value={`${activeSubs}/${totalSubs}`} icon={SlidersHorizontal} />
          <StatTile
            label="Switched Off"
            value={nodes.length - activeParents + (totalSubs - activeSubs)}
            icon={XCircle}
            tone={nodes.length - activeParents + (totalSubs - activeSubs) > 0 ? 'amber' : 'default'}
          />
        </div>
      )}

      <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C9973A]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories or subcategories…"
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[13px] font-medium focus:bg-white focus:border-[#C9973A]/40 outline-none"
            />
          </div>
        </div>

        <EmptyOrLoading
          loading={loading}
          error={error}
          empty={visible.length === 0}
          emptyLabel="No categories match your search."
        />

        {!loading && !error && visible.length > 0 && (
          <div className="divide-y divide-slate-100">
            {visible.map((parent) => {
              const isOpen = expanded.has(parent.id) || q.length > 0;
              const parentOff = !parent.isActive;
              return (
                <div key={parent.id} className={parentOff ? 'bg-slate-50/40' : ''}>
                  {/* Parent row */}
                  <div className="flex items-center gap-3 px-5 py-4">
                    <button
                      onClick={() =>
                        setExpanded((prev) => {
                          const next = new Set(prev);
                          next.has(parent.id) ? next.delete(parent.id) : next.add(parent.id);
                          return next;
                        })
                      }
                      className="flex items-center gap-3 min-w-0 flex-1 text-left"
                    >
                      <ChevronRight
                        className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                          isOpen ? 'rotate-90' : ''
                        }`}
                      />
                      <div className="min-w-0">
                        <p
                          className={`font-bold text-[14px] truncate ${
                            parentOff ? 'text-slate-400 line-through' : 'text-[#1a1a2e]'
                          }`}
                        >
                          {parent.name}
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium truncate">
                          {parent.children.length} subcategories · {parent.providerCount} providers ·{' '}
                          {parent.inquiryCount} inquiries
                        </p>
                      </div>
                    </button>
                    {parentOff && (
                      <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-wider">
                        Branch hidden
                      </span>
                    )}
                    <Switch
                      checked={parent.isActive}
                      disabled={pendingId === parent.id}
                      onChange={() => toggle(parent.id, !parent.isActive)}
                      title={parent.isActive ? 'Switch category off' : 'Switch category on'}
                    />
                  </div>

                  {/* Subcategory rows */}
                  {isOpen && parent.children.length > 0 && (
                    <div className="pb-2">
                      {parent.children.map((child) => {
                        const childEffectiveOff = parentOff || !child.isActive;
                        return (
                          <div
                            key={child.id}
                            className="flex items-center gap-3 pl-12 pr-5 py-2.5 hover:bg-slate-50/60"
                          >
                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-[13px] font-semibold truncate ${
                                  childEffectiveOff ? 'text-slate-400' : 'text-[#1a1a2e]'
                                } ${!child.isActive ? 'line-through' : ''}`}
                              >
                                {child.name}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium truncate">
                                {child.providerCount} providers · {child.inquiryCount} inquiries
                                {parentOff && child.isActive && (
                                  <span className="text-rose-400"> · hidden by parent</span>
                                )}
                              </p>
                            </div>
                            <Switch
                              checked={child.isActive}
                              disabled={pendingId === child.id || parentOff}
                              onChange={() => toggle(child.id, !child.isActive)}
                              title={
                                parentOff
                                  ? 'Turn the parent category on first'
                                  : child.isActive
                                    ? 'Switch subcategory off'
                                    : 'Switch subcategory on'
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Users view — list + suspend / unsuspend / delete
// ──────────────────────────────────────────────────────────────────────────

function UsersView() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = { page, limit: PAGE_SIZE };
      if (roleFilter) params.role = roleFilter;
      if (activeFilter !== '') params.isActive = activeFilter;
      const res = await adminService.listUsers(params);
      let data = res.data ?? [];
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        data = data.filter(
          (u) =>
            (u.name && u.name.toLowerCase().includes(q)) ||
            (u.primaryEmail && u.primaryEmail.toLowerCase().includes(q)) ||
            (u.displayId && u.displayId.toLowerCase().includes(q))
        );
      }
      setUsers(data);
      setTotal(res.total ?? 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, activeFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  const onSuspend = async (id: string, current: boolean) => {
    if (
      !window.confirm(
        current
          ? 'Suspend this user? They will not be able to log in until reinstated.'
          : 'Reinstate this user?'
      )
    )
      return;
    setPendingId(id);
    try {
      if (current) await adminService.suspendUser(id);
      else await adminService.unsuspendUser(id);
      await load();
    } catch (e: any) {
      alert(e?.message || 'Action failed');
    } finally {
      setPendingId(null);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm('Delete this user permanently? This cannot be undone.')) return;
    setPendingId(id);
    try {
      await adminService.deleteUser(id);
      await load();
    } catch (e: any) {
      alert(e?.message || 'Delete failed');
    } finally {
      setPendingId(null);
    }
  };

  return (
    <>
      <ViewHeader
        eyebrow="Section 02 / People"
        title="Users"
        subtitle="Search, suspend, reinstate, or remove accounts. Suspended users can't log in until you reinstate them."
      />

      <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C9973A]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or display ID…"
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[13px] font-medium focus:bg-white focus:border-[#C9973A]/40 outline-none"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[12px] font-bold text-[#1a1a2e] outline-none"
          >
            <option value="">All roles</option>
            <option value="BUYER">Buyer</option>
            <option value="SELLER">Seller</option>
            <option value="SUPPLIER">Supplier</option>
            <option value="SERVICE_PROVIDER">Service Provider</option>
            <option value="ENTERTAINMENT">Entertainment</option>
            <option value="EVENTS">Events</option>
            <option value="LABOUR">Labour</option>
            <option value="ADMIN">Admin</option>
          </select>
          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[12px] font-bold text-[#1a1a2e] outline-none"
          >
            <option value="">All states</option>
            <option value="true">Active</option>
            <option value="false">Suspended</option>
          </select>
        </div>

        <EmptyOrLoading
          loading={loading}
          error={error}
          empty={users.length === 0}
          emptyLabel="No users match your filters."
        />

        {!loading && !error && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    User
                  </th>
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    Role
                  </th>
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    Status
                  </th>
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400 hidden sm:table-cell">
                    Joined
                  </th>
                  <th className="text-right px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isPending = pendingId === u.id;
                  const initials = (u.name || u.primaryEmail || '?')
                    .split(' ')
                    .map((s) => s[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/40">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#fdf6e9] to-[#f3e3bd] flex items-center justify-center text-[#C9973A] font-black text-[11px] shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[#1a1a2e] truncate">
                              {u.name || '—'}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {u.primaryEmail || u.displayId || u.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-md text-[10px] font-black uppercase tracking-[0.1em] text-[#1a1a2e]">
                          {u.role || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill
                          value={
                            u.isActive === false
                              ? 'SUSPENDED'
                              : u.verificationStatus || (u.isActive ? 'ACTIVE' : '—')
                          }
                        />
                      </td>
                      <td className="px-5 py-4 text-slate-500 hidden sm:table-cell">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onSuspend(u.id, u.isActive !== false)}
                            disabled={isPending || u.role === 'ADMIN'}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.1em] border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                              u.isActive === false
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100'
                            }`}
                            title={u.role === 'ADMIN' ? 'Admins cannot be suspended' : ''}
                          >
                            {u.isActive === false ? 'Reinstate' : 'Suspend'}
                          </button>
                          <button
                            onClick={() => onDelete(u.id)}
                            disabled={isPending || u.role === 'ADMIN'}
                            className="w-8 h-8 rounded-lg border border-rose-100 bg-rose-50 text-rose-500 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                            title={u.role === 'ADMIN' ? 'Admins cannot be deleted' : 'Delete user'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-5">
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Inquiries view
// ──────────────────────────────────────────────────────────────────────────

function InquiriesView() {
  const [items, setItems] = useState<AdminInquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = { page, limit: PAGE_SIZE };
      if (statusFilter) params.status = statusFilter;
      const res = await adminService.listInquiries(params);
      setItems(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <ViewHeader
        eyebrow="Section 03 / Demand"
        title="Inquiries"
        subtitle="Every buyer request flowing through the marketplace, regardless of who posted it."
      />
      <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-end">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[12px] font-bold text-[#1a1a2e] outline-none"
          >
            <option value="">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="QUOTED">Quoted</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
        <EmptyOrLoading
          loading={loading}
          error={error}
          empty={items.length === 0}
          emptyLabel="No inquiries found."
        />
        {!loading && !error && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    Title
                  </th>
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    Category
                  </th>
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    Process
                  </th>
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    Status
                  </th>
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400 hidden md:table-cell">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-b border-slate-50 hover:bg-slate-50/40">
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#1a1a2e] truncate max-w-[280px]">
                        {i.title || '—'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate max-w-[280px]">
                        {i.location || '—'}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-slate-600 truncate max-w-[200px]">
                      {i.category || '—'}
                    </td>
                    <td className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {i.processType || '—'}
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill value={i.status} />
                    </td>
                    <td className="px-5 py-4 text-slate-500 hidden md:table-cell">
                      {formatDate(i.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-5">
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Quotes view
// ──────────────────────────────────────────────────────────────────────────

function QuotesView() {
  const [items, setItems] = useState<AdminQuote[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = { page, limit: PAGE_SIZE };
      if (statusFilter) params.status = statusFilter;
      const res = await adminService.listQuotes(params);
      setItems(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to load quotes');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <ViewHeader
        eyebrow="Section 04 / Supply"
        title="Quotes"
        subtitle="Provider responses to buyer inquiries — pricing, status, and conversion at a glance."
      />
      <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-end">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[12px] font-bold text-[#1a1a2e] outline-none"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="PAID">Paid</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <EmptyOrLoading
          loading={loading}
          error={error}
          empty={items.length === 0}
          emptyLabel="No quotes found."
        />
        {!loading && !error && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    Inquiry
                  </th>
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    Provider
                  </th>
                  <th className="text-right px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    Price
                  </th>
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    Status
                  </th>
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400 hidden md:table-cell">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((q) => (
                  <tr key={q.id} className="border-b border-slate-50 hover:bg-slate-50/40">
                    <td className="px-5 py-4 font-bold text-[#1a1a2e] truncate max-w-[280px]">
                      {q.inquiryTitle || q.inquiryId || '—'}
                    </td>
                    <td className="px-5 py-4 text-slate-600 truncate max-w-[180px]">
                      {q.providerName || q.providerId || '—'}
                    </td>
                    <td className="px-5 py-4 text-right font-black text-[#C9973A]">
                      {formatZmw(q.price)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill value={q.status} />
                    </td>
                    <td className="px-5 py-4 text-slate-500 hidden md:table-cell">
                      {formatDate(q.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-5">
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Financial view
// ──────────────────────────────────────────────────────────────────────────

type FinanceTab = 'escrow' | 'ledger' | 'accounts' | 'legacy';

const FINANCE_TABS: Array<{ id: FinanceTab; label: string }> = [
  { id: 'escrow', label: 'Escrow' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'legacy', label: 'Legacy payments' },
];

/**
 * The money console. Escrow positions + the double-entry ledger are the
 * authoritative views; "Legacy payments" is the frozen pre-ledger `payments`
 * table, kept visible for history but no longer written to.
 */
function FinancialView() {
  const [tab, setTab] = useState<FinanceTab>('escrow');

  return (
    <>
      <ViewHeader
        eyebrow="Section 05 / Money"
        title="Financial"
        subtitle="What's held in escrow, every money event, and whether the books balance. Funds are custodied by the payment provider — this is TONSE's mirror of them."
      />

      <div className="flex gap-1.5 mb-6 p-1 bg-slate-100/70 rounded-xl w-fit">
        {FINANCE_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-[0.12em] transition-all ${
              tab === t.id
                ? 'bg-white text-[#1a1a2e] shadow-[0_4px_12px_-4px_rgba(15,23,42,0.12)]'
                : 'text-slate-400 hover:text-[#1a1a2e]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'escrow' && <EscrowTab />}
      {tab === 'ledger' && <LedgerTab />}
      {tab === 'accounts' && <AccountsTab />}
      {tab === 'legacy' && <LegacyPaymentsTab />}
    </>
  );
}

/** Open escrow positions + drift between the quote's story and the ledger's. */
function EscrowTab() {
  const [data, setData] = useState<EscrowPositions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        setData(await adminService.getEscrowPositions());
      } catch (e: any) {
        setError(e?.message || 'Failed to load escrow positions');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const s = data?.summary;
  const rows = data?.positions ?? [];

  return (
    <>
      {s && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <StatTile label="Held in escrow" value={formatZmw(s.totalHeldZmw)} icon={Wallet} tone="gold" />
          <StatTile label="Open positions" value={s.openPositions} icon={History} tone="navy" />
          <StatTile label="Phantom (no money)" value={s.phantomCount} icon={ShieldCheck} />
          <StatTile label="Leaks" value={s.leakCount} icon={TrendingUp} />
        </div>
      )}

      {!!s?.phantomCount && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-[13px] font-black text-amber-800">
            {s.phantomCount} position{s.phantomCount > 1 ? 's' : ''} ({formatZmw(s.phantomValueZmw)}) are
            phantom — no money was ever collected
          </p>
          <p className="mt-1.5 text-[12px] text-amber-700/90 leading-relaxed">
            These quotes were marked paid before real payment collection existed, so nothing was ever
            held for them. They are shown for reconciliation only — they must be voided, not released
            or refunded. The ledger deliberately starts at zero rather than inventing balances for them.
          </p>
        </div>
      )}

      <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
        <EmptyOrLoading
          loading={loading}
          error={error}
          empty={rows.length === 0}
          emptyLabel="Nothing is held in escrow."
        />
        {!loading && !error && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Deal', 'Seller', 'Quote', 'Held (ledger)', 'State', 'Since'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400 ${
                        i === 3 ? 'text-right' : 'text-left'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.quoteId} className="border-b border-slate-50 hover:bg-slate-50/40">
                    <td className="px-5 py-4 text-slate-700 truncate max-w-[200px]">
                      {r.inquiryTitle || '—'}
                      <span className="block font-mono text-[10px] text-slate-300">
                        #{String(r.quoteId).slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600 truncate max-w-[140px]">
                      {r.providerName || '—'}
                    </td>
                    <td className="px-5 py-4 text-slate-500">{formatZmw(r.quotePrice)}</td>
                    <td className="px-5 py-4 text-right font-black text-[#C9973A]">
                      {formatZmw(r.ledgerBalance)}
                    </td>
                    <td className="px-5 py-4">
                      {r.driftReason === 'PHANTOM' ? (
                        <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider">
                          Phantom
                        </span>
                      ) : r.driftReason === 'LEAK' ? (
                        <span className="px-2 py-1 rounded-md bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-wider">
                          Leak
                        </span>
                      ) : (
                        <StatusPill value={r.status} />
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-500">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/** Every money event, newest first, with its balanced lines on drill-in. */
function LedgerTab() {
  const [items, setItems] = useState<LedgerJournalRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tb, setTb] = useState<TrialBalance | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [j, t] = await Promise.all([
          adminService.listJournals({ page, limit: PAGE_SIZE }),
          adminService.getTrialBalance(),
        ]);
        setItems(j.data ?? []);
        setTotal(j.total ?? 0);
        setTb(t);
      } catch (e: any) {
        setError(e?.message || 'Failed to load the ledger');
      } finally {
        setLoading(false);
      }
    })();
  }, [page]);

  const drill = async (id: string) => {
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    setOpenId(id);
    setDetail(await adminService.getJournal(id));
  };

  return (
    <>
      {tb && (
        <div
          className={`mb-6 rounded-2xl border p-4 flex items-center gap-3 ${
            tb.balanced ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'
          }`}
        >
          <ShieldCheck className={`w-5 h-5 ${tb.balanced ? 'text-emerald-600' : 'text-rose-600'}`} />
          <div>
            <p className={`text-[13px] font-black ${tb.balanced ? 'text-emerald-800' : 'text-rose-800'}`}>
              {tb.balanced ? 'Books balance' : 'BOOKS DO NOT BALANCE'}
            </p>
            <p className={`text-[12px] ${tb.balanced ? 'text-emerald-700/90' : 'text-rose-700/90'}`}>
              Debits {formatZmw(tb.totalDebit)} · Credits {formatZmw(tb.totalCredit)}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
        <EmptyOrLoading
          loading={loading}
          error={error}
          empty={items.length === 0}
          emptyLabel="No money events yet — the ledger starts at zero and fills as payments are collected."
        />
        {!loading && !error && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Reference', 'Event', 'Amount', 'Actor', 'When'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400 ${
                        i === 2 ? 'text-right' : 'text-left'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((j) => (
                  <React.Fragment key={j.id}>
                    <tr
                      onClick={() => drill(j.id)}
                      className="border-b border-slate-50 hover:bg-slate-50/40 cursor-pointer"
                    >
                      <td className="px-5 py-4 font-mono text-[11px] text-slate-500">{j.reference}</td>
                      <td className="px-5 py-4 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        {j.type}
                      </td>
                      <td className="px-5 py-4 text-right font-black text-[#C9973A]">
                        {formatZmw(j.amount)}
                      </td>
                      <td className="px-5 py-4 text-slate-500 truncate max-w-[180px]">
                        {j.actorLabel || 'system'}
                      </td>
                      <td className="px-5 py-4 text-slate-500">{formatDate(j.postedAt)}</td>
                    </tr>
                    {openId === j.id && detail && (
                      <tr className="bg-slate-50/60">
                        <td colSpan={5} className="px-5 py-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                            Journal lines
                          </p>
                          <div className="space-y-1">
                            {(detail.entries ?? []).map((e: any, i: number) => (
                              <div key={i} className="flex items-center gap-3 text-[12px]">
                                <span
                                  className={`w-14 font-black uppercase text-[10px] ${
                                    e.direction === 'DEBIT' ? 'text-sky-600' : 'text-emerald-600'
                                  }`}
                                >
                                  {e.direction === 'DEBIT' ? 'Dr' : 'Cr'}
                                </span>
                                <span className="font-mono text-slate-600 flex-1">{e.accountCode}</span>
                                <span className="font-black text-slate-800">{formatZmw(e.amount)}</span>
                              </div>
                            ))}
                          </div>
                          {detail.memo && (
                            <p className="mt-3 text-[11px] text-slate-400 font-mono">
                              memo: {JSON.stringify(detail.memo)}
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-5">
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      </div>
    </>
  );
}

/** The chart of accounts and where the float sits. */
function AccountsTab() {
  const [rows, setRows] = useState<LedgerAccountBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        setRows(await adminService.getLedgerAccounts());
      } catch (e: any) {
        setError(e?.message || 'Failed to load accounts');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
      <EmptyOrLoading loading={loading} error={error} empty={rows.length === 0} emptyLabel="No accounts." />
      {!loading && !error && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['Account', 'Type', 'Balance'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400 ${
                      i === 2 ? 'text-right' : 'text-left'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.code} className="border-b border-slate-50 hover:bg-slate-50/40 align-top">
                  <td className="px-5 py-4">
                    <span className="font-bold text-slate-700">{a.name}</span>
                    <span className="block font-mono text-[10px] text-slate-300">{a.code}</span>
                    {a.description && (
                      <span className="block mt-1 text-[11px] text-slate-400 leading-relaxed max-w-[520px]">
                        {a.description}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {a.type}
                  </td>
                  <td className="px-5 py-4 text-right font-black text-slate-800">
                    {formatZmw(a.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** The frozen pre-ledger `payments` table — history only, no longer written. */
function LegacyPaymentsTab() {
  const [items, setItems] = useState<AdminTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const tx = await adminService.listTransactions({ page, limit: PAGE_SIZE });
        setItems(tx.data ?? []);
        setTotal(tx.total ?? 0);
      } catch (e: any) {
        setError(e?.message || 'Failed to load transactions');
      } finally {
        setLoading(false);
      }
    })();
  }, [page]);

  return (
    <>
      <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-[12px] text-slate-500 leading-relaxed">
          <span className="font-black text-slate-700">Frozen legacy record.</span> This is the old
          single-entry payments table, kept for history. New money events are recorded in the
          double-entry <span className="font-bold">Ledger</span> tab instead.
        </p>
      </div>
      <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
        <EmptyOrLoading
          loading={loading}
          error={error}
          empty={items.length === 0}
          emptyLabel="No legacy transactions."
        />
        {!loading && !error && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Reference', 'User', 'Type', 'Amount', 'Status', 'When'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400 ${
                        i === 3 ? 'text-right' : 'text-left'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/40">
                    <td className="px-5 py-4 font-mono text-[11px] text-slate-500 truncate max-w-[160px]">
                      {t.transactionId || t.externalReference || t.id}
                    </td>
                    <td className="px-5 py-4 text-slate-600 truncate max-w-[160px]">
                      {t.userId || '—'}
                    </td>
                    <td className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {t.type || '—'}
                    </td>
                    <td className="px-5 py-4 text-right font-black text-[#C9973A]">
                      {formatZmw(t.amount)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill value={t.status} />
                    </td>
                    <td className="px-5 py-4 text-slate-500">{formatDate(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-5">
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Audit view
// ──────────────────────────────────────────────────────────────────────────

function AuditView() {
  const [items, setItems] = useState<AdminAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = { page, limit: PAGE_SIZE };
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entityType = entityFilter;
      const res = await adminService.listAudit(params);
      setItems(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, entityFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const uniqueActions = useMemo(
    () => Array.from(new Set(items.map((i) => i.action).filter(Boolean))) as string[],
    [items]
  );
  const uniqueEntities = useMemo(
    () => Array.from(new Set(items.map((i) => i.entityType).filter(Boolean))) as string[],
    [items]
  );

  return (
    <>
      <ViewHeader
        eyebrow="Section 06 / Trail"
        title="Audit Log"
        subtitle="Every consequential action recorded by the platform — quote sent, collection started, identity changed."
      />
      <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            placeholder="Filter by action (e.g. QUOTE_SENT)…"
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[12px] font-medium focus:bg-white focus:border-[#C9973A]/40 outline-none"
            list="audit-actions"
          />
          <datalist id="audit-actions">
            {uniqueActions.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
          <input
            type="text"
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
            placeholder="Filter by entity type…"
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[12px] font-medium focus:bg-white focus:border-[#C9973A]/40 outline-none"
            list="audit-entities"
          />
          <datalist id="audit-entities">
            {uniqueEntities.map((e) => (
              <option key={e} value={e} />
            ))}
          </datalist>
        </div>

        <EmptyOrLoading
          loading={loading}
          error={error}
          empty={items.length === 0}
          emptyLabel="No audit entries match."
        />
        {!loading && !error && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    When
                  </th>
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    Action
                  </th>
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    Entity
                  </th>
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400 hidden md:table-cell">
                    User
                  </th>
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400 hidden md:table-cell">
                    Admin
                  </th>
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400 hidden lg:table-cell">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-50 hover:bg-slate-50/40">
                    <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                      {formatDate(entry.createdAt || entry.timestamp)}
                    </td>
                    <td className="px-5 py-4 font-bold text-[#1a1a2e]">{entry.action || '—'}</td>
                    <td className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {entry.entityType || '—'}{' '}
                      {entry.entityId && (
                        <span className="font-mono text-slate-300">#{String(entry.entityId).slice(0, 8)}</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-600 max-w-[200px] hidden md:table-cell">
                      {entry.actorLabel || entry.userId ? (
                        <div className="flex flex-col">
                          <span className="truncate font-medium text-slate-700">
                            {entry.actorLabel ||
                              `#${String(entry.userId).slice(0, 8)}`}
                          </span>
                          {entry.ipAddress && (
                            <span className="font-mono text-[10px] text-slate-400 truncate">
                              {entry.ipAddress}
                            </span>
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-600 truncate max-w-[140px] hidden md:table-cell font-mono text-[12px]">
                      {entry.staffName || '—'}
                    </td>
                    <td className="px-5 py-4 text-slate-500 truncate max-w-[280px] text-[12px] hidden lg:table-cell">
                      {typeof entry.details === 'string'
                        ? entry.details
                        : entry.details
                          ? JSON.stringify(entry.details)
                          : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-5">
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Verifications view — pending sellers / service-providers / labour
// ──────────────────────────────────────────────────────────────────────────

const ROLE_GROUP_LABELS: Record<string, string> = {
  ALL: 'All pending',
  BUYERS: 'Buyers',
  SHOPS: 'Shops',
  SERVICES: 'Service Providers',
  LABOUR: 'Labour',
};

const ROLES_IN_GROUP: Record<string, string[]> = {
  BUYERS: ['BUYER'],
  SHOPS: ['SELLER', 'SUPPLIER'],
  SERVICES: ['SERVICE_PROVIDER', 'ENTERTAINMENT', 'EVENTS'],
  LABOUR: ['LABOUR'],
};

function VerificationsView() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'VERIFIED' | 'REJECTED'>(
    'PENDING'
  );
  const [groupFilter, setGroupFilter] = useState<
    'ALL' | 'BUYERS' | 'SHOPS' | 'SERVICES' | 'LABOUR'
  >('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<AdminUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = { page, limit: PAGE_SIZE, status: statusFilter };
      const res = await adminService.listVerifications(params);
      let data = res.data ?? [];
      if (groupFilter !== 'ALL') {
        const allowedRoles = ROLES_IN_GROUP[groupFilter];
        data = data.filter((u) => allowedRoles.includes(u.role || ''));
      }
      setItems(data);
      setTotal(res.total ?? 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to load verification queue');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, groupFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleResolved = async () => {
    await load();
    setReviewing(null);
  };

  return (
    <>
      <ViewHeader
        eyebrow="Section 03 / Trust"
        title="Verifications"
        subtitle="Approve or reject the documents that buyers, shops, service providers, and labour submitted during onboarding. Unapproved buyers keep full access — sellers just see them marked as unverified."
        rightSlot={
          <button
            onClick={load}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-[#1a1a2e] hover:border-[#C9973A]/40 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        }
      />

      <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row gap-3">
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100/70 rounded-xl">
            {(['ALL', 'BUYERS', 'SHOPS', 'SERVICES', 'LABOUR'] as const).map((g) => (
              <button
                key={g}
                onClick={() => {
                  setGroupFilter(g);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-[0.12em] transition-all ${
                  groupFilter === g
                    ? 'bg-white text-[#1a1a2e] shadow-[0_2px_8px_-2px_rgba(15,23,42,0.1)]'
                    : 'text-slate-400 hover:text-[#1a1a2e]'
                }`}
              >
                {ROLE_GROUP_LABELS[g]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100/70 rounded-xl md:ml-auto">
            {(['PENDING', 'VERIFIED', 'REJECTED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-[0.12em] transition-all ${
                  statusFilter === s
                    ? 'bg-white text-[#1a1a2e] shadow-[0_2px_8px_-2px_rgba(15,23,42,0.1)]'
                    : 'text-slate-400 hover:text-[#1a1a2e]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <EmptyOrLoading
          loading={loading}
          error={error}
          empty={items.length === 0}
          emptyLabel={
            statusFilter === 'PENDING'
              ? 'No accounts waiting for review.'
              : `No ${statusFilter.toLowerCase()} accounts in this group.`
          }
        />

        {!loading && !error && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    Applicant
                  </th>
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    Role
                  </th>
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400 hidden sm:table-cell">
                    NRC
                  </th>
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400 hidden md:table-cell">
                    Submitted
                  </th>
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    Status
                  </th>
                  <th className="text-right px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => {
                  const initials = (u.name || u.primaryEmail || '?')
                    .split(' ')
                    .map((s) => s[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/40">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#fdf6e9] to-[#f3e3bd] flex items-center justify-center text-[#C9973A] font-black text-[11px] shrink-0 overflow-hidden">
                            {(u as any).profilePicture ? (
                              <img
                                src={(u as any).profilePicture}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              initials
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[#1a1a2e] truncate">{u.name || '—'}</p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {u.primaryEmail || u.displayId || u.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-md text-[10px] font-black uppercase tracking-[0.1em] text-[#1a1a2e]">
                          {u.role || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500 font-mono text-[12px] hidden sm:table-cell">
                        {(u as any).nrcNumber || '—'}
                      </td>
                      <td className="px-5 py-4 text-slate-500 hidden md:table-cell">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill value={u.verificationStatus} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end">
                          <button
                            onClick={() => setReviewing(u)}
                            className="px-4 py-2 bg-[#1a1a2e] text-white rounded-lg text-[10px] font-black uppercase tracking-[0.12em] hover:bg-[#0f1023] transition-all flex items-center gap-2"
                          >
                            Review
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-5">
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      </div>

      {reviewing && (
        <ReviewDrawer
          userSummary={reviewing}
          onClose={() => setReviewing(null)}
          onResolved={handleResolved}
        />
      )}
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Review drawer — full-screen panel with all submitted docs + actions
// ──────────────────────────────────────────────────────────────────────────

function ReviewDrawer({
  userSummary,
  onClose,
  onResolved,
}: {
  userSummary: AdminUser;
  onClose: () => void;
  onResolved: () => void;
}) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<'idle' | 'verifying' | 'rejecting'>('idle');
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await adminService.getUserDetail(userSummary.id);
      setUser(detail);
    } catch (e: any) {
      setError(e?.message || 'Failed to load applicant detail');
    } finally {
      setLoading(false);
    }
  }, [userSummary.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async () => {
    setActionState('verifying');
    try {
      await adminService.verifyUser(userSummary.id);
      onResolved();
    } catch (e: any) {
      alert(e?.message || 'Failed to verify');
      setActionState('idle');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please add a short reason so the user knows what to fix.');
      return;
    }
    setActionState('rejecting');
    try {
      await adminService.rejectUser(userSummary.id, rejectReason.trim());
      onResolved();
    } catch (e: any) {
      alert(e?.message || 'Failed to reject');
      setActionState('idle');
    }
  };

  // Phase 1+2: metadata jsonb is gone, every field is a typed column on the
  // user row. We alias `meta` to the user object so the existing `meta.X`
  // call sites keep working — companyName / tpin / incorporationCertUrl
  // / labourCategory etc. are all real columns now. Fields that haven't
  // been promoted (businessDocs, storePhotos) read as undefined and the
  // surrounding null-checks gate them out.
  const meta: Record<string, any> = (user as any) ?? {};
  const isLabour = !!(user as any)?.labourCategory;
  const isShopOrSupplier = (user?.role || '') === 'SELLER';
  const isService = (user?.role || '') === 'SERVICE_PROVIDER';
  const isLender = Array.isArray((user as any)?.archetypes)
    ? (user as any).archetypes.includes('LENDING')
    : false;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-stretch justify-end">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-3xl bg-[#f5f2ed] h-full overflow-y-auto"
      >
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-5 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C9973A] mb-0.5">
              Verification Review
            </p>
            <h3 className="font-serif text-[20px] font-bold text-[#1a1a2e] truncate">
              {userSummary.name || userSummary.primaryEmail || userSummary.id}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading && (
            <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#C9973A]" />
              <p className="text-[11px] font-bold uppercase tracking-widest">Loading dossier…</p>
            </div>
          )}

          {error && (
            <div className="py-12 flex flex-col items-center gap-2 text-rose-500 text-[13px] font-medium">
              <ShieldAlert className="w-6 h-6" />
              <p>{error}</p>
            </div>
          )}

          {user && !loading && (
            <>
              <ReviewSection title="Identity" eyebrow="Personal" icon={Users}>
                <ReviewGrid>
                  <ReviewField label="Display ID" value={user.displayId} mono />
                  <ReviewField label="Role" value={user.role} pill />
                  <ReviewField label="Full Name" value={user.name} />
                  <ReviewField
                    label="Email"
                    value={user.primaryEmail || (user as any).email}
                  />
                  <ReviewField label="Phone" value={user.phone} />
                  <ReviewField label="NRC" value={(user as any).nrcNumber} mono />
                  <ReviewField label="Date of Birth" value={(user as any).dateOfBirth} />
                  <ReviewField label="Joined" value={formatDate(user.createdAt)} />
                </ReviewGrid>

                {((user as any).profilePicture || meta.logo) && (
                  <div className="mt-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                      Profile / Identity Photo
                    </p>
                    <DocImage src={(user as any).profilePicture || meta.logo} alt="profile" />
                  </div>
                )}
              </ReviewSection>

              {(isShopOrSupplier || isService) && (
                <ReviewSection title="Business" eyebrow="Company" icon={ShieldCheck}>
                  <ReviewGrid>
                    <ReviewField label="Company Name" value={meta.companyName} />
                    <ReviewField label="TPIN" value={meta.tpin} mono />
                    <ReviewField
                      label="Business License ID"
                      value={(user as any).businessLicenseId}
                      mono
                    />
                    <ReviewField
                      label="Categories"
                      value={
                        Array.isArray((user as any).categories)
                          ? (user as any).categories.join(', ')
                          : (user as any).categories
                      }
                    />
                  </ReviewGrid>

                  {meta.incorporationCertUrl && (
                    <div className="mt-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                        PACRA Certificate of Incorporation
                      </p>
                      <DocImage src={meta.incorporationCertUrl} alt="incorporation cert" />
                    </div>
                  )}

                  {Array.isArray(meta.businessDocs) && meta.businessDocs.length > 0 && (
                    <div className="mt-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                        Business / Identity Documents ({meta.businessDocs.length})
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {meta.businessDocs.map((doc: string, i: number) => (
                          <DocImage key={i} src={doc} alt={`doc-${i}`} compact />
                        ))}
                      </div>
                    </div>
                  )}
                </ReviewSection>
              )}

              {/* Lenders are regulated — the admin must see PACRA + ZRA + Bank
                  of Zambia licence to approve. A required-doc checklist makes an
                  incomplete dossier obvious at a glance. */}
              {isLender && (
                <ReviewSection title="Regulatory Compliance" eyebrow="Lending" icon={ShieldCheck}>
                  <ReviewGrid>
                    <ReviewField label="Bank of Zambia Licence No." value={meta.bozLicenceNumber} mono />
                  </ReviewGrid>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { label: 'PACRA Certificate', ok: !!meta.incorporationCertUrl },
                      { label: 'ZRA TPIN', ok: !!meta.tpin },
                      { label: 'Bank of Zambia Licence', ok: !!meta.bozLicenceUrl },
                    ].map((c) => (
                      <div
                        key={c.label}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-[11px] font-bold ${
                          c.ok
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-rose-200 bg-rose-50 text-rose-600'
                        }`}
                      >
                        {c.ok ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 shrink-0" />
                        )}
                        {c.label}
                      </div>
                    ))}
                  </div>

                  {meta.bozLicenceUrl ? (
                    <div className="mt-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                        Bank of Zambia Lending Licence
                      </p>
                      <DocImage src={meta.bozLicenceUrl} alt="boz licence" />
                    </div>
                  ) : (
                    <div className="mt-4 flex items-center gap-2 text-rose-500 text-[12px] font-medium">
                      <ShieldAlert className="w-4 h-4 shrink-0" /> Bank of Zambia licence not uploaded —
                      required to approve a lender.
                    </div>
                  )}
                </ReviewSection>
              )}

              {isShopOrSupplier && meta.storePhotos && (
                <ReviewSection title="Storefront" eyebrow="Premises" icon={ImageIcon}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {meta.storePhotos.front && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                          Storefront
                        </p>
                        <DocImage src={meta.storePhotos.front} alt="storefront" />
                      </div>
                    )}
                    {meta.storePhotos.interior && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                          Interior
                        </p>
                        <DocImage src={meta.storePhotos.interior} alt="interior" />
                      </div>
                    )}
                  </div>
                </ReviewSection>
              )}

              {(isShopOrSupplier || isService) && (
                <ReviewSection title="Social Presence" eyebrow="Reach" icon={ExternalLink}>
                  <ReviewGrid>
                    <ReviewField label="Facebook" value={meta.facebookLink} link />
                    <ReviewField label="TikTok" value={meta.tiktokLink} link />
                    <ReviewField label="WhatsApp" value={meta.whatsappLink} link />
                  </ReviewGrid>
                </ReviewSection>
              )}

              {isLabour && (
                <ReviewSection title="Labour Profile" eyebrow="Skills" icon={Sparkles}>
                  <ReviewGrid>
                    <ReviewField label="Category" value={meta.labourCategory} />
                    <ReviewField
                      label="Specialties"
                      value={
                        Array.isArray(meta.labourSubTypes)
                          ? meta.labourSubTypes.join(', ')
                          : meta.labourSubTypes
                      }
                    />
                  </ReviewGrid>
                </ReviewSection>
              )}

              <ReviewSection title="Location" eyebrow="Where" icon={ImageIcon}>
                <ReviewGrid>
                  {/* Sellers carry a single `location` string; buyer profiles
                      store province/city/area instead — compose those when
                      no location string exists (Set dedupes city==province). */}
                  <ReviewField
                    label="Location"
                    value={
                      (user as any).location ||
                      Array.from(
                        new Set(
                          [meta.area, meta.city, meta.province]
                            .filter(Boolean)
                            .map((s: any) => String(s).trim())
                        )
                      ).join(', ') ||
                      null
                    }
                  />
                  <ReviewField
                    label="Coordinates"
                    value={
                      meta.latitude && meta.longitude
                        ? `${meta.latitude}, ${meta.longitude}`
                        : '—'
                    }
                    mono
                  />
                </ReviewGrid>
              </ReviewSection>

              {meta.verificationRejectionReason && (
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 mb-1">
                      Previously rejected
                    </p>
                    <p className="text-[13px] text-rose-700 font-medium leading-relaxed">
                      {meta.verificationRejectionReason}
                    </p>
                    {meta.rejectedAt && (
                      <p className="text-[11px] text-rose-400 mt-1">
                        on {formatDate(meta.rejectedAt)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {user && !loading && (
          <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-5 space-y-3">
            {showReject ? (
              <>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection (the user will see this so they can fix it)…"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:bg-white focus:border-rose-300 outline-none resize-none"
                  rows={3}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setShowReject(false);
                      setRejectReason('');
                    }}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[11px] font-black uppercase tracking-[0.12em]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={actionState === 'rejecting'}
                    className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[11px] font-black uppercase tracking-[0.12em] flex items-center gap-2 disabled:opacity-50"
                  >
                    {actionState === 'rejecting' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    Confirm Rejection
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowReject(true)}
                  disabled={actionState !== 'idle'}
                  className="flex-1 sm:flex-none px-6 py-3 bg-white border border-rose-200 text-rose-600 rounded-xl text-[11px] font-black uppercase tracking-[0.14em] hover:bg-rose-50 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject
                </button>
                <button
                  onClick={handleApprove}
                  disabled={actionState !== 'idle'}
                  className="flex-1 px-6 py-3 bg-[#C9973A] hover:bg-[#b8861e] text-white rounded-xl text-[11px] font-black uppercase tracking-[0.14em] shadow-[0_8px_20px_-8px_rgba(201,151,58,0.55)] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionState === 'verifying' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Approve & Issue Verified Badge
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Review-section primitives
// ──────────────────────────────────────────────────────────────────────────

function ReviewSection({
  title,
  eyebrow,
  icon: Icon,
  children,
}: {
  title: string;
  eyebrow: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-[0_4px_18px_-12px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fdf6e9] to-[#f3e3bd] text-[#C9973A] flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#C9973A] mb-0.5">
            {eyebrow}
          </p>
          <h4 className="font-serif text-[16px] font-bold text-[#1a1a2e] leading-snug">
            {title}
          </h4>
        </div>
      </div>
      {children}
    </section>
  );
}

function ReviewGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">{children}</div>;
}

function ReviewField({
  label,
  value,
  mono,
  pill,
  link,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  pill?: boolean;
  link?: boolean;
}) {
  const empty = !value;
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">
        {label}
      </p>
      {empty ? (
        <p className="text-[13px] text-slate-300 italic">— not provided —</p>
      ) : pill ? (
        <span className="inline-flex items-center px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-md text-[11px] font-black uppercase tracking-[0.1em] text-[#1a1a2e]">
          {value}
        </span>
      ) : link ? (
        <a
          href={value!}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] font-bold text-[#C9973A] hover:underline break-all flex items-center gap-1"
        >
          {value}
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
      ) : (
        <p
          className={`text-[13px] font-bold text-[#1a1a2e] break-words ${mono ? 'font-mono' : ''}`}
        >
          {value}
        </p>
      )}
    </div>
  );
}

function DocImage({
  src,
  alt,
  compact,
}: {
  src: string;
  alt: string;
  compact?: boolean;
}) {
  // Most onboarding files land here as base64 data URLs (legacy ingestion).
  // If a future flow uploads to /files/upload, we'd see `/uploads/...` paths
  // — both work the same in an <img> tag, so no special-casing needed.
  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className={`block bg-slate-100 rounded-xl overflow-hidden border border-slate-200 hover:border-[#C9973A]/40 transition-all ${
        compact ? 'aspect-square' : 'max-h-[320px]'
      }`}
    >
      <img
        src={src}
        alt={alt}
        className={`w-full ${compact ? 'h-full object-cover' : 'object-contain max-h-[320px]'}`}
      />
    </a>
  );
}
