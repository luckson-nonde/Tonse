import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRef } from 'react';
import {
  ArrowLeft,
  Banknote,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileCheck,
  FileText,
  Loader2,
  MapPin,
  Paperclip,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react';
import {
  JOB_RATE_UNITS,
  jobBoardService,
  type JobApplicationAttachment,
  type JobFeedItem,
  type JobRateUnit,
} from '../../services/api/jobBoardService';
import { apiClient } from '../../services/api/client';
import { LABOUR_CATEGORIES } from '../../services/labourCategories';
import {
  APPLICATION_LETTER_SLOT,
  getRequiredAttachmentSlots,
} from '../../services/labourFormSchema';
import JobAttributesDisplay from './JobAttributesDisplay';
import SecureFile from '../SecureFile';
import DateTimePicker from '../DateTimePicker';

const tradeLabelOf = (id: string) =>
  LABOUR_CATEGORIES.find((c) => c.id === id)?.label ?? id.replace(/_/g, ' ');

const formatPay = (payOffer: number | string | null, unit: string | null) => {
  const n = Number(payOffer);
  if (!payOffer || Number.isNaN(n) || n <= 0) return null;
  return `K${n.toLocaleString()} ${unit ?? ''}`.trim();
};

/** Rate units expressed as a per-day multiplier, so "highest pay" can rank a
 *  K50/hour job against a K4,000/month one instead of comparing raw figures
 *  across incompatible units. Zambian norms: 8h day, 5-day week, 22-day month. */
const PER_DAY_FACTOR: Record<string, number> = {
  'Per Hour': 8,
  'Per Day': 1,
  'Per Week': 1 / 5,
  'Per Month': 1 / 22,
};

const payPerDay = (job: JobFeedItem): number | null => {
  const n = Number(job.payOffer);
  if (!job.payOffer || Number.isNaN(n) || n <= 0) return null;
  return n * (PER_DAY_FACTOR[job.payRateUnit ?? 'Per Day'] ?? 1);
};

const timeAgo = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (mins < 60) return `${mins || 1}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

const POSTED_WITHIN = [
  { value: 'any', label: 'Any time', days: null as number | null },
  { value: '1', label: 'Past 24 hours', days: 1 },
  { value: '7', label: 'Past 7 days', days: 7 },
  { value: '30', label: 'Past 30 days', days: 30 },
];

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'pay', label: 'Highest pay' },
  { value: 'closing', label: 'Closing soonest' },
];

interface Filters {
  q: string;
  trade: string;
  location: string;
  postedWithin: string;
  sort: string;
}

const EMPTY_FILTERS: Filters = {
  q: '',
  trade: 'all',
  location: 'all',
  postedWithin: 'any',
  sort: 'newest',
};

/**
 * "Find Jobs" — the job board. Every approved, still-open posting on the
 * platform, whoever posted it (buyer, shop or provider).
 *
 * Deliberately NOT trade-matched any more: an employment account is for
 * seeing what work is going, not for being shown only the trade you ticked
 * at signup. Trades survive as a card tag and one filter among several, so
 * narrowing the board is the jobseeker's choice rather than the system's.
 * The backend now returns the whole board, so all filtering here is
 * client-side over the loaded list.
 */
export default function JobSeekerFeedView() {
  const [jobs, setJobs] = useState<JobFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyTarget, setApplyTarget] = useState<JobFeedItem | null>(null);
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const load = useCallback(async () => {
    try {
      setError(null);
      setJobs(await jobBoardService.listFeed());
    } catch (e) {
      setError((e as Error)?.message || 'Could not load jobs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onApplied = (jobId: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId ? { ...j, hasApplied: true, myApplicationStatus: 'PENDING' } : j,
      ),
    );
    setApplyTarget(null);
  };

  // Option lists are derived from what's actually on the board, so the
  // dropdowns can never offer a filter that returns nothing.
  const tradeOptions = useMemo(() => {
    const ids = new Set<string>();
    jobs.forEach((j) => j.tradeCategoryIds.forEach((id) => ids.add(id)));
    return Array.from(ids)
      .map((id) => ({ id, label: tradeLabelOf(id) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [jobs]);

  const locationOptions = useMemo(() => {
    const names = new Set<string>();
    jobs.forEach((j) => {
      const name = j.city || j.location;
      if (name) names.add(name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  const visible = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const window = POSTED_WITHIN.find((p) => p.value === filters.postedWithin)?.days ?? null;
    const cutoff = window === null ? null : Date.now() - window * 86400000;

    const rows = jobs.filter((job) => {
      if (filters.trade !== 'all' && !job.tradeCategoryIds.includes(filters.trade)) return false;
      if (filters.location !== 'all' && (job.city || job.location) !== filters.location) {
        return false;
      }
      if (cutoff !== null && new Date(job.createdAt).getTime() < cutoff) return false;
      if (q) {
        const haystack = [
          job.title,
          job.description,
          job.posterName,
          job.location,
          job.city,
          ...job.tradeCategoryIds.map(tradeLabelOf),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    // Jobs with no figure sort last under "highest pay", and jobs with no
    // deadline sort last under "closing soonest" — an open-ended job isn't
    // urgent, and a blank is not the same as zero.
    const sorted = [...rows];
    if (filters.sort === 'pay') {
      sorted.sort((a, b) => (payPerDay(b) ?? -1) - (payPerDay(a) ?? -1));
    } else if (filters.sort === 'closing') {
      const deadline = (j: JobFeedItem) =>
        j.applicationDeadline ? new Date(j.applicationDeadline).getTime() : Infinity;
      sorted.sort((a, b) => deadline(a) - deadline(b));
    } else {
      sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return sorted;
  }, [jobs, filters]);

  const activeCount = useMemo(
    () =>
      (filters.q.trim() ? 1 : 0) +
      (filters.trade !== 'all' ? 1 : 0) +
      (filters.location !== 'all' ? 1 : 0) +
      (filters.postedWithin !== 'any' ? 1 : 0),
    [filters],
  );

  const openJob = openJobId ? jobs.find((j) => j.id === openJobId) ?? null : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-rose-600 font-bold">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            void load();
          }}
          className="mt-3 px-4 py-2 rounded-lg border border-[#e2e8f0] text-sm font-bold text-slate-600 hover:bg-slate-50"
        >
          Try again
        </button>
      </div>
    );
  }

  if (openJob) {
    return (
      <>
        {applyTarget && (
          <ApplyModal
            job={applyTarget}
            onClose={() => setApplyTarget(null)}
            onApplied={onApplied}
          />
        )}
        <JobDetail
          job={openJob}
          onBack={() => setOpenJobId(null)}
          onApply={() => setApplyTarget(openJob)}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {applyTarget && (
        <ApplyModal job={applyTarget} onClose={() => setApplyTarget(null)} onApplied={onApplied} />
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[19px] font-black text-[#0A1931]">All Jobs on Nyuwe</h2>
          <p className="text-[12px] text-slate-500 mt-0.5">
            Every open vacancy posted on the platform — shops, service providers and buyers.
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#e8e4dc] text-[12px] font-bold text-slate-600">
          <Briefcase className="w-3.5 h-3.5 text-[#C9973A]" />
          {visible.length} {visible.length === 1 ? 'job' : 'jobs'}
          {activeCount > 0 && <span className="text-slate-400">· filtered</span>}
        </span>
      </div>

      {/* Filter placement is the only thing that moves between breakpoints:
          a right-hand sidebar on desktop (order-2), a collapsible bar pinned
          above the results on mobile (order-1). Same component, same state —
          rendering it twice would desynchronise the two copies. */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_290px]">
        <div className="order-2 lg:order-1 space-y-3">
          {visible.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#e8e4dc]">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#fdf6e9] border border-[#f0dfc0] flex items-center justify-center mb-3">
                <Search className="w-6 h-6 text-[#C9973A]" />
              </div>
              <p className="text-sm font-black text-[#1a1a2e]">
                {jobs.length === 0 ? 'No jobs posted yet' : 'No jobs match these filters'}
              </p>
              <p className="text-[13px] text-slate-500 mt-1 max-w-sm mx-auto">
                {jobs.length === 0
                  ? 'As soon as anyone on Nyuwe posts a vacancy and it clears review, it shows up here.'
                  : 'Try a different search, or clear the filters to see the whole board again.'}
              </p>
              {jobs.length > 0 && activeCount > 0 && (
                <button
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  className="mt-4 px-4 py-2 rounded-lg border border-[#e2e8f0] text-[13px] font-bold text-slate-600 hover:bg-slate-50"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            visible.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onOpen={() => setOpenJobId(job.id)}
                onApply={() => setApplyTarget(job)}
              />
            ))
          )}
        </div>

        <aside className="order-1 lg:order-2">
          <JobFilters
            filters={filters}
            onChange={setFilters}
            tradeOptions={tradeOptions}
            locationOptions={locationOptions}
            activeCount={activeCount}
          />
        </aside>
      </div>
    </div>
  );
}

/* ─── Filters ─────────────────────────────────────────────────────────── */

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold text-slate-600 mb-1">{label}</span>
      {children}
    </label>
  );
}

const selectClass =
  'w-full px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#C9973A]/40';

function JobFilters({
  filters,
  onChange,
  tradeOptions,
  locationOptions,
  activeCount,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  tradeOptions: Array<{ id: string; label: string }>;
  locationOptions: string[];
  activeCount: number;
}) {
  // Mobile-only disclosure. On desktop the `lg:grid` below always wins over
  // `hidden`, so the sidebar is permanently open and this state is inert —
  // which is why there's no matching lg branch to keep in sync.
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <div className="bg-white rounded-2xl border border-[#e8e4dc] p-4 lg:sticky lg:top-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[13px] font-black text-[#0A1931]">Filter</span>
        {activeCount > 0 && (
          <button
            onClick={() => onChange(EMPTY_FILTERS)}
            className="text-[11px] font-bold text-[#C9973A] hover:text-[#a87b28]"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Search stays visible at every size — it's the primary action. */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={filters.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="Job title, employer, trade…"
          className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C9973A]/40"
        />
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="lg:hidden mt-3 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[13px] font-bold text-slate-600"
      >
        <SlidersHorizontal className="w-4 h-4" />
        {open ? 'Hide filters' : 'More filters'}
        {activeCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-[#fdf6e9] text-[#a87b28] text-[11px] font-black">
            {activeCount}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <div
        className={`${open ? 'grid' : 'hidden'} grid-cols-2 gap-3 mt-3 lg:grid lg:grid-cols-1 lg:gap-3.5 lg:mt-4`}
      >
        <FilterField label="Category">
          <select
            value={filters.trade}
            onChange={(e) => set({ trade: e.target.value })}
            className={selectClass}
          >
            <option value="all">All categories</option>
            {tradeOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Location">
          <select
            value={filters.location}
            onChange={(e) => set({ location: e.target.value })}
            className={selectClass}
          >
            <option value="all">All locations</option>
            {locationOptions.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Posted At">
          <select
            value={filters.postedWithin}
            onChange={(e) => set({ postedWithin: e.target.value })}
            className={selectClass}
          >
            {POSTED_WITHIN.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Sort By">
          <select
            value={filters.sort}
            onChange={(e) => set({ sort: e.target.value })}
            className={selectClass}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </FilterField>
      </div>
    </div>
  );
}

/* ─── List card ───────────────────────────────────────────────────────── */

function AppliedBadge({ status }: { status: JobFeedItem['myApplicationStatus'] }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-emerald-700 bg-emerald-50 border border-[#6ee7b7] px-3 py-1.5 rounded-lg">
      <CheckCircle2 className="w-3.5 h-3.5" />
      {status === 'ACCEPTED'
        ? 'Accepted'
        : status === 'REJECTED'
          ? 'Not selected'
          : 'Applied'}
    </span>
  );
}

function JobCard({
  job,
  onOpen,
  onApply,
}: {
  job: JobFeedItem;
  onOpen: () => void;
  onApply: () => void;
}) {
  const pay = formatPay(job.payOffer, job.payRateUnit);
  const place = job.city || job.location;
  const initial = (job.posterName || '?').trim().charAt(0).toUpperCase();

  return (
    <article className="group bg-white rounded-2xl border border-[#e8e4dc] hover:border-[#E9D5B0] hover:shadow-[0_8px_24px_-18px_rgba(26,22,18,0.25)] transition-all overflow-hidden">
      {/* The whole body is the link to the detail view; Apply lives in the
          footer so the two targets can't swallow one another. */}
      <button type="button" onClick={onOpen} className="w-full text-left p-4 pb-3.5">
        <div className="flex items-start gap-3.5">
          <span className="w-12 h-12 shrink-0 rounded-xl bg-[#fdf6e9] border border-[#f0dfc0] flex items-center justify-center text-[17px] font-black text-[#C9973A]">
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-start justify-between gap-3">
              <span className="block text-[16px] font-black text-[#0A1931] leading-snug group-hover:text-[#C9973A] transition-colors">
                {job.title}
              </span>
              <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 whitespace-nowrap mt-0.5">
                <Clock className="w-3 h-3" />
                {timeAgo(job.createdAt)}
              </span>
            </span>
            <span className="block text-[12px] font-bold text-slate-500 mt-0.5 truncate">
              {job.posterName}
            </span>
          </span>
        </div>

        {job.description && (
          <span className="block text-[13px] text-slate-600 leading-relaxed mt-3 line-clamp-2">
            {job.description}
          </span>
        )}

        {/* Key facts as scannable chips — a vacancy ad's salary/place line. */}
        <span className="flex flex-wrap items-center gap-1.5 mt-3">
          {pay && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f4faf6] border border-[#d3ecdc] text-[12px] font-bold text-emerald-700">
              <Banknote className="w-3.5 h-3.5" />
              {pay}
            </span>
          )}
          {place && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f7f8fa] border border-[#e2e8f0] text-[12px] font-bold text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {place}
            </span>
          )}
          {job.workersNeeded ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f7f8fa] border border-[#e2e8f0] text-[12px] font-bold text-slate-600">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              {job.workersNeeded} needed
            </span>
          ) : null}
          {job.tradeCategoryIds.map((id) => (
            <span
              key={id}
              className="px-2.5 py-1 rounded-lg border border-[#f0dfc0] bg-[#fdfaf3] text-[12px] font-bold text-[#a87b28]"
            >
              {tradeLabelOf(id)}
            </span>
          ))}
        </span>
      </button>

      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-[#f1ede4] bg-[#fbfaf7]">
        <div className="min-w-0 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-500">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            {job.applicantsCount === 0
              ? 'Be the first to apply'
              : `${job.applicantsCount} applicant${job.applicantsCount === 1 ? '' : 's'}`}
          </span>
          {job.applicationDeadline ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-rose-600">
              <CalendarClock className="w-3.5 h-3.5" />
              Apply by {new Date(job.applicationDeadline).toLocaleDateString()}
            </span>
          ) : (
            <span className="text-[12px] font-bold text-slate-400">Open until filled</span>
          )}
        </div>
        {job.hasApplied ? (
          <AppliedBadge status={job.myApplicationStatus} />
        ) : (
          <button
            onClick={onApply}
            className="px-5 py-2 rounded-lg bg-[#C9973A] hover:bg-[#b8852f] text-white text-[12px] font-bold shadow-sm transition-colors"
          >
            Apply now
          </button>
        )}
      </div>
    </article>
  );
}

/* ─── Detail ──────────────────────────────────────────────────────────── */

function JobDetail({
  job,
  onBack,
  onApply,
}: {
  job: JobFeedItem;
  onBack: () => void;
  onApply: () => void;
}) {
  const pay = formatPay(job.payOffer, job.payRateUnit);
  const place = job.city || job.location;
  const urgency = (job.attributes?.urgency as string) || null;
  const requiredDocs = getRequiredAttachmentSlots(job.attributes);

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[13px] font-bold text-slate-500 hover:text-[#C9973A] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Jobs search
      </button>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_290px] items-start">
        <div className="bg-white rounded-2xl border border-[#e8e4dc] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#eef2f6]">
            <h2 className="text-[20px] font-black text-[#0A1931] leading-tight">{job.title}</h2>
            <p className="text-[12px] text-slate-500 mt-1">
              {[job.posterName, pay, place, timeAgo(job.createdAt)].filter(Boolean).join(' · ')}
            </p>
            {job.tradeCategoryIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {job.tradeCategoryIds.map((id) => (
                  <span
                    key={id}
                    className="px-2 py-0.5 rounded-md border border-[#f0dfc0] bg-[#fdfaf3] text-[11px] font-bold text-[#a87b28]"
                  >
                    {tradeLabelOf(id)}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="p-5 space-y-4">
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-[12px] font-bold text-slate-500">
              {place && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> {place}
                </span>
              )}
              {pay && (
                <span className="inline-flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5" /> {pay}
                </span>
              )}
              {job.workersNeeded ? (
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> {job.workersNeeded} worker
                  {job.workersNeeded === 1 ? '' : 's'} needed
                </span>
              ) : null}
              {urgency && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {urgency === 'Immediately'
                    ? 'Starts immediately'
                    : job.attributes?.preferredDateTime
                      ? `Starts ${new Date(String(job.attributes.preferredDateTime)).toLocaleString()}`
                      : urgency}
                </span>
              )}
              {job.applicationDeadline && (
                <span className="inline-flex items-center gap-1.5 text-rose-500">
                  <CalendarClock className="w-3.5 h-3.5" />
                  Apply by {new Date(job.applicationDeadline).toLocaleDateString()}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {job.applicantsCount === 0
                  ? 'No applicants yet'
                  : `${job.applicantsCount} applicant${job.applicantsCount === 1 ? '' : 's'}`}
              </span>
            </div>

            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                Job description
              </p>
              <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                {job.description}
              </p>
            </div>

            <JobAttributesDisplay tradeId={job.tradeCategoryIds[0]} attributes={job.attributes} />

            {requiredDocs.length > 0 && (
              <div className="rounded-xl border border-[#f0dfc0] bg-[#fdf9f0] px-3.5 py-3">
                <p className="text-[11px] font-black uppercase tracking-widest text-[#a87b28]">
                  Documents you must attach
                </p>
                <ul className="mt-2 space-y-1.5">
                  {requiredDocs.map((label) => (
                    <li
                      key={label}
                      className="flex items-center gap-2 text-[12px] font-bold text-slate-700"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#C9973A] shrink-0" />
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <aside className="bg-white rounded-2xl border border-[#e8e4dc] p-5 text-center lg:sticky lg:top-4">
          <span className="w-12 h-12 mx-auto rounded-xl bg-[#fdf6e9] border border-[#f0dfc0] flex items-center justify-center text-[17px] font-black text-[#C9973A]">
            {(job.posterName || '?').trim().charAt(0).toUpperCase()}
          </span>
          <p className="text-[14px] font-black text-[#0A1931] mt-2.5">{job.posterName}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Posted this vacancy</p>

          <div className="mt-4">
            {job.hasApplied ? (
              <AppliedBadge status={job.myApplicationStatus} />
            ) : (
              <button
                onClick={onApply}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#C9973A] hover:bg-[#b8852f] text-white text-[13px] font-bold transition-colors"
              >
                <Briefcase className="w-4 h-4" />
                Apply for this job
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
            Your contact details stay private until this employer accepts your application.
          </p>
        </aside>
      </div>
    </div>
  );
}

/* ─── Apply modal ─────────────────────────────────────────────────────── */

/** An attachment being composed in the modal: the API shape plus the local
 *  file name, shown so the applicant can tell two uploads apart. */
type DraftAttachment = JobApplicationAttachment & { fileName?: string };

/** One mandatory upload slot — shared by the application letter and the
 *  employer-demanded documents so the two can never drift apart visually. */
function AttachmentSlot({
  label,
  attached,
  busy,
  inputRef,
  onFile,
  onPick,
  onRemove,
}: {
  label: string;
  attached: DraftAttachment | undefined;
  busy: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
  onFile: (file: File | undefined) => void;
  onPick: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={`rounded-lg border px-2.5 py-2 ${
        attached ? 'border-[#6ee7b7] bg-white' : 'border-[#e7d7b8] bg-white'
      }`}
    >
      <div className="flex items-center gap-2">
        {attached ? (
          <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        ) : (
          <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        )}
        <span className="min-w-0 flex-1 text-[12px] font-bold text-slate-700 truncate">
          {label}
          {!attached && <span className="text-rose-500"> *</span>}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={onPick}
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#e2e8f0] bg-white text-[11px] font-bold text-slate-600 hover:border-[#C9973A] hover:text-[#8a6420] transition-colors disabled:opacity-60"
        >
          {busy && <Loader2 className="w-3 h-3 animate-spin" />}
          {busy ? 'Uploading…' : attached ? 'Replace' : 'Upload'}
        </button>
        {attached && (
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 text-slate-400 hover:text-rose-500"
            aria-label={`Remove ${label}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {attached && (
        <div className="flex items-center gap-2 mt-1.5 pl-5.5 text-[11px] text-slate-500">
          <span className="truncate max-w-[55%]">{attached.fileName}</span>
          {/* Auth-gated /files/secure/ URL — SecureFile fetches it with the
              bearer token; a bare <a> 401s. */}
          <SecureFile url={attached.url} asLink alt={label} />
        </div>
      )}
    </div>
  );
}

function ApplyModal({
  job,
  onClose,
  onApplied,
}: {
  job: JobFeedItem;
  onClose: () => void;
  onApplied: (jobId: string) => void;
}) {
  const [coverMessage, setCoverMessage] = useState('');
  const [expectedRate, setExpectedRate] = useState('');
  const [rateUnit, setRateUnit] = useState<JobRateUnit>(
    (job.payRateUnit as JobRateUnit) || 'Per Day',
  );
  const [availabilityDate, setAvailabilityDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Every mandatory upload slot: the application letter first (universal),
  // then the documents the POSTER demanded. The letter gets its own section
  // at the top of the builder, so it is split out of the doc list here.
  // `fileName` is a local display nicety only — it is NOT part of the API
  // contract, and the backend's ValidationPipe runs forbidNonWhitelisted, so
  // it must be stripped before submit or the whole request 400s.
  const requiredSlots = getRequiredAttachmentSlots(job.attributes);
  const docSlots = requiredSlots.filter((label) => label !== APPLICATION_LETTER_SLOT);
  const [slotFiles, setSlotFiles] = useState<Record<string, DraftAttachment | undefined>>({});
  const [extras, setExtras] = useState<DraftAttachment[]>([]);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const slotInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const missingSlots = requiredSlots.filter((label) => !slotFiles[label]?.url);

  /** Upload one file and hand back its stored secure URL. Shared by the
   *  required slots and the optional extras bucket. */
  const uploadFile = async (slotKey: string, file: File): Promise<DraftAttachment | null> => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (file.type && !allowed.includes(file.type)) {
      setError(`"${file.name}" isn't supported — attach a PDF, JPG or PNG.`);
      return null;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(`"${file.name}" is too large — the limit is 10MB.`);
      return null;
    }
    setUploadingSlot(slotKey);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      // 'job-application' is a SENSITIVE category: encrypted at rest and
      // served only through the authenticated /files/secure endpoint.
      const res = await apiClient.post<{ url: string }>(
        '/files/upload?category=job-application',
        formData,
      );
      const url = res.data?.url;
      if (!url) throw new Error('Upload returned no file URL.');
      return { label: slotKey, url, fileName: file.name };
    } catch (e) {
      setError((e as Error)?.message || 'Could not upload that file.');
      return null;
    } finally {
      setUploadingSlot(null);
    }
  };

  const uploadToSlot = async (label: string, file: File | undefined) => {
    if (!file) return;
    const uploaded = await uploadFile(label, file);
    if (uploaded) setSlotFiles((prev) => ({ ...prev, [label]: uploaded }));
  };

  const uploadExtra = async (file: File | undefined) => {
    if (!file || extras.length >= 5) return;
    const uploaded = await uploadFile('Supporting document', file);
    if (uploaded) setExtras((prev) => [...prev, uploaded]);
  };

  const submit = async () => {
    if (coverMessage.trim().length < 10) {
      setError('Tell the poster why you fit this job (at least a sentence).');
      return;
    }
    const rate = Number(expectedRate);
    if (!expectedRate || Number.isNaN(rate) || rate < 0) {
      setError('Enter your expected rate as a number, e.g. 300.');
      return;
    }
    if (!availabilityDate) {
      setError('Pick the earliest day you can start.');
      return;
    }
    if (missingSlots.length > 0) {
      setError(`Attach these documents before you can apply: ${missingSlots.join(', ')}.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Required documents first (labels matched exactly against what the
      // posting demands — the server re-checks the same list), then extras.
      const attachments = [
        ...requiredSlots.map((label) => ({ label, url: slotFiles[label]!.url })),
        ...extras.map(({ label, url }) => ({ label, url })),
      ];
      await jobBoardService.applyToJob(job.id, {
        coverMessage: coverMessage.trim(),
        expectedRate: rate,
        rateUnit,
        availabilityDate,
        ...(attachments.length ? { attachments } : {}),
      });
      onApplied(job.id);
    } catch (e) {
      setError((e as Error)?.message || 'Could not send your application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#eef2f6] px-5 py-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-[#1a1a2e]">Apply: {job.title}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Your profile, message and rate go to the poster. Contact details are shared only if
              you're accepted.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* The letter opens the application — it's the first thing the
              poster reads, so it's the first thing the applicant attaches. */}
          <div className="rounded-xl border border-[#f0dfc0] bg-[#fdf9f0] px-3.5 py-3">
            <p className="text-[11px] font-black uppercase tracking-widest text-[#a87b28]">
              1 · Application letter
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 mb-2.5">
              Start here — a letter introducing yourself and why you want this job. Upload it as
              a PDF or a clear photo.
            </p>
            <AttachmentSlot
              label={APPLICATION_LETTER_SLOT}
              attached={slotFiles[APPLICATION_LETTER_SLOT]}
              busy={uploadingSlot === APPLICATION_LETTER_SLOT}
              inputRef={(el) => {
                slotInputs.current[APPLICATION_LETTER_SLOT] = el;
              }}
              onFile={(file) => void uploadToSlot(APPLICATION_LETTER_SLOT, file)}
              onPick={() => slotInputs.current[APPLICATION_LETTER_SLOT]?.click()}
              onRemove={() =>
                setSlotFiles((prev) => ({ ...prev, [APPLICATION_LETTER_SLOT]: undefined }))
              }
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              2 · Why are you right for this job? *
            </label>
            <textarea
              value={coverMessage}
              onChange={(e) => setCoverMessage(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-[#e2e8f0] bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C9973A]/40"
              placeholder="Your experience, similar work you've done, tools you have…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Expected rate (ZMW) *
              </label>
              <input
                type="number"
                min={0}
                value={expectedRate}
                onChange={(e) => setExpectedRate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#e2e8f0] bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#C9973A]/40"
                placeholder="e.g. 300"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Per *</label>
              <select
                value={rateUnit}
                onChange={(e) => setRateUnit(e.target.value as JobRateUnit)}
                className="w-full px-3 py-3 rounded-xl border border-[#e2e8f0] bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#C9973A]/40"
              >
                {JOB_RATE_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Available from *
            </label>
            <DateTimePicker
              value={availabilityDate}
              onChange={setAvailabilityDate}
              mode="date"
              placeholder="Earliest day you can start"
            />
          </div>

          {docSlots.length > 0 && (
            <div className="rounded-xl border border-[#f0dfc0] bg-[#fdf9f0] px-3.5 py-3">
              <p className="text-[11px] font-black uppercase tracking-widest text-[#a87b28]">
                3 · Required documents
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 mb-2.5">
                This employer requires each of these. Upload the PDF or a clear photo — only they
                can open your files.
              </p>
              <div className="space-y-2">
                {docSlots.map((label) => (
                  <AttachmentSlot
                    key={label}
                    label={label}
                    attached={slotFiles[label]}
                    busy={uploadingSlot === label}
                    inputRef={(el) => {
                      slotInputs.current[label] = el;
                    }}
                    onFile={(file) => void uploadToSlot(label, file)}
                    onPick={() => slotInputs.current[label]?.click()}
                    onRemove={() => setSlotFiles((prev) => ({ ...prev, [label]: undefined }))}
                  />
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-2">PDF, JPG or PNG · up to 10MB each</p>
            </div>
          )}

          <div className="rounded-xl border border-[#eef2f6] bg-[#fbfaf7] px-3.5 py-3">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              Other documents
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Optional — anything else that helps your case (portfolio photos, extra references).
            </p>
            {extras.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {extras.map((att) => (
                  <div
                    key={att.url}
                    className="flex items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-2.5 py-2"
                  >
                    <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="min-w-0 flex-1 text-[11px] text-slate-600 truncate">
                      {att.fileName}
                    </span>
                    <SecureFile url={att.url} asLink alt={att.fileName ?? 'Document'} />
                    <button
                      type="button"
                      onClick={() => setExtras((prev) => prev.filter((a) => a.url !== att.url))}
                      className="shrink-0 text-slate-400 hover:text-rose-500"
                      aria-label="Remove document"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={(el) => {
                slotInputs.current.__extra = el;
              }}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => {
                void uploadExtra(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={uploadingSlot === 'Supporting document' || extras.length >= 5}
              onClick={() => slotInputs.current.__extra?.click()}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white text-[12px] font-bold text-slate-600 hover:border-[#C9973A] hover:text-[#8a6420] transition-colors disabled:opacity-60"
            >
              {uploadingSlot === 'Supporting document' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Paperclip className="w-3.5 h-3.5" />
              )}
              Add document
            </button>
          </div>

          {error && <p className="text-[13px] text-rose-600 font-bold">{error}</p>}
          {missingSlots.length > 0 && !error && (
            <p className="text-[12px] text-slate-500">
              Still to attach:{' '}
              <span className="font-bold text-[#a87b28]">{missingSlots.join(', ')}</span>
            </p>
          )}

          <button
            disabled={submitting || missingSlots.length > 0 || uploadingSlot !== null}
            onClick={() => void submit()}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#C9973A] hover:bg-[#b8852f] text-white text-sm font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Briefcase className="w-4 h-4" />}
            Send application
          </button>
        </div>
      </div>
    </div>
  );
}
