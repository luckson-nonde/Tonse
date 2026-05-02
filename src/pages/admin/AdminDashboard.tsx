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
} from 'lucide-react';
import { useAuth } from '../../AuthContext';
import {
  adminService,
  AdminStats,
  AdminUser,
  AdminInquiry,
  AdminQuote,
  AdminTransaction,
  AdminAuditLog,
  VERIFIABLE_ROLES,
} from '../../services/api/adminService';

type AdminTab =
  | 'overview'
  | 'users'
  | 'verifications'
  | 'inquiries'
  | 'quotes'
  | 'financial'
  | 'audit';

const TABS: { id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'verifications', label: 'Verifications', icon: ShieldQuestion },
  { id: 'inquiries', label: 'Inquiries', icon: MessageSquare },
  { id: 'quotes', label: 'Quotes', icon: FileText },
  { id: 'financial', label: 'Financial', icon: Wallet },
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
          {TABS.map((t) => {
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
          {TABS.map((t) => (
            <option key={t.id} value={t.id} className="text-[#1a1a2e]">
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      <main className="flex-1 min-w-0 px-5 sm:px-8 lg:px-10 xl:px-14 pt-20 md:pt-10 pb-12 overflow-x-hidden">
        <div className="max-w-[1400px] mx-auto w-full">
          {activeTab === 'overview' && <OverviewView />}
          {activeTab === 'users' && <UsersView />}
          {activeTab === 'verifications' && <VerificationsView />}
          {activeTab === 'inquiries' && <InquiriesView />}
          {activeTab === 'quotes' && <QuotesView />}
          {activeTab === 'financial' && <FinancialView />}
          {activeTab === 'audit' && <AuditView />}
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

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'default' | 'gold' | 'navy';
}) {
  const toneClasses =
    tone === 'gold'
      ? 'bg-gradient-to-br from-[#fdf6e9] to-[#f3e3bd] text-[#C9973A] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]'
      : tone === 'navy'
        ? 'bg-[#0f1023] text-[#C9973A]'
        : 'bg-slate-50 text-slate-400';

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${toneClasses}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="font-serif text-[28px] sm:text-[32px] font-black text-[#1a1a2e] leading-none tracking-tight">
        {value}
      </p>
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#C9973A]">
        {label}
      </p>
      {hint && <p className="mt-1.5 text-[11px] text-slate-400 font-medium">{hint}</p>}
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

const formatZmw = (n: number | undefined | null) =>
  typeof n === 'number' && !Number.isNaN(n)
    ? `K${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : 'K0';

const formatDate = (s?: string | number) => {
  if (!s) return '—';
  const d = typeof s === 'number' ? new Date(s) : new Date(s);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

// ──────────────────────────────────────────────────────────────────────────
// Overview view — stat tiles + role breakdown
// ──────────────────────────────────────────────────────────────────────────

function OverviewView() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getStats();
      setStats(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load platform stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <ViewHeader
        eyebrow="Section 01 / Pulse"
        title="Platform Overview"
        subtitle="A live snapshot of every account, inquiry, quote, and ZMW that's flowed through Tonse Hub."
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
          className="space-y-8"
        >
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
            <StatTile label="Total Users" value={stats.users.total} icon={Users} tone="gold" />
            <StatTile
              label="Buyers"
              value={stats.users.byRole?.BUYER ?? 0}
              icon={Users}
            />
            <StatTile
              label="Providers"
              value={
                (stats.users.byRole?.SELLER ?? 0) +
                (stats.users.byRole?.SUPPLIER ?? 0) +
                (stats.users.byRole?.SERVICE_PROVIDER ?? 0) +
                (stats.users.byRole?.ENTERTAINMENT ?? 0) +
                (stats.users.byRole?.EVENTS ?? 0)
              }
              icon={Users}
            />
            <StatTile label="Inquiries" value={stats.inquiries.total} icon={MessageSquare} />
            <StatTile label="Quotes" value={stats.quotes.total} icon={FileText} />
            <StatTile
              label="Collected"
              value={formatZmw(stats.payments.totalCollectedZmw)}
              icon={Wallet}
              tone="navy"
              hint={`${stats.payments.total} transactions`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <BreakdownCard title="Users by Role" data={stats.users.byRole} icon={Users} />
            <BreakdownCard
              title="Inquiries by Status"
              data={stats.inquiries.byStatus}
              icon={MessageSquare}
            />
            <BreakdownCard title="Quotes by Status" data={stats.quotes.byStatus} icon={FileText} />
          </div>

          <div className="bg-gradient-to-br from-[#fdf6e9]/70 to-[#fdf6e9]/30 border border-[#C9973A]/15 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#fdf6e9] to-[#f3e3bd] text-[#C9973A] flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C9973A] mb-1">
                Health snapshot
              </p>
              <h3 className="font-serif text-[18px] font-bold text-[#1a1a2e] leading-snug">
                Quotes paid volume:{' '}
                <span className="text-[#C9973A]">{formatZmw(stats.quotes.paidVolumeZmw)}</span>
              </h3>
              <p className="mt-1 text-[12px] text-[#1a1a2e]/60 font-medium">
                Generated at {new Date(stats.generatedAt).toLocaleString()}
              </p>
            </div>
            <div className="ml-auto hidden sm:flex items-center gap-2 text-[#C9973A]">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </motion.div>
      )}
    </>
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

function FinancialView() {
  const [items, setItems] = useState<AdminTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tx, s] = await Promise.all([
        adminService.listTransactions({ page, limit: PAGE_SIZE }),
        page === 1 ? adminService.getStats() : Promise.resolve(stats),
      ]);
      setItems(tx.data ?? []);
      setTotal(tx.total ?? 0);
      if (s) setStats(s);
    } catch (e: any) {
      setError(e?.message || 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
    // stats intentionally omitted from deps — only refresh stats on page 1.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <ViewHeader
        eyebrow="Section 05 / Money"
        title="Financial"
        subtitle="Aggregate ZMW collected and the full transaction ledger across the platform."
      />

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <StatTile
            label="Total Collected"
            value={formatZmw(stats.payments.totalCollectedZmw)}
            icon={Wallet}
            tone="gold"
          />
          <StatTile
            label="Quote Volume Paid"
            value={formatZmw(stats.quotes.paidVolumeZmw)}
            icon={TrendingUp}
            tone="navy"
          />
          <StatTile label="Transactions" value={stats.payments.total} icon={History} />
          <StatTile
            label="Successful"
            value={
              (stats.payments.byStatus?.COMPLETED ?? 0) +
              (stats.payments.byStatus?.SUCCESS ?? 0) +
              (stats.payments.byStatus?.PAID ?? 0)
            }
            icon={ShieldCheck}
          />
        </div>
      )}

      <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
        <EmptyOrLoading
          loading={loading}
          error={error}
          empty={items.length === 0}
          emptyLabel="No transactions yet."
        />
        {!loading && !error && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    Reference
                  </th>
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    User
                  </th>
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    Type
                  </th>
                  <th className="text-right px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    Amount
                  </th>
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    Status
                  </th>
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400 hidden md:table-cell">
                    When
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/40">
                    <td className="px-5 py-4 font-mono text-[11px] text-slate-500 truncate max-w-[160px]">
                      {t.reference || t.id}
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
                    <td className="px-5 py-4 text-slate-500 hidden md:table-cell">
                      {formatDate(t.createdAt)}
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
                    <td className="px-5 py-4 text-slate-600 truncate max-w-[160px] hidden md:table-cell">
                      {entry.userId || '—'}
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
  SHOPS: 'Shops',
  SERVICES: 'Service Providers',
  LABOUR: 'Labour',
};

const ROLES_IN_GROUP: Record<string, string[]> = {
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
  const [groupFilter, setGroupFilter] = useState<'ALL' | 'SHOPS' | 'SERVICES' | 'LABOUR'>('ALL');
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
        subtitle="Approve or reject the documents that shops, service providers, and labour submitted during onboarding. Buyers don't pass through this queue."
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
            {(['ALL', 'SHOPS', 'SERVICES', 'LABOUR'] as const).map((g) => (
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

  const meta: Record<string, any> = (user as any)?.metadata ?? {};
  const isLabour = (user?.role || '') === 'LABOUR';
  const isShopOrSupplier = ['SELLER', 'SUPPLIER'].includes(user?.role || '');
  const isService = ['SERVICE_PROVIDER', 'ENTERTAINMENT', 'EVENTS'].includes(user?.role || '');

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
                  <ReviewField label="Location" value={(user as any).location} />
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
