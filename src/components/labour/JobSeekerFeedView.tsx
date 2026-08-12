import { useCallback, useEffect, useMemo, useState } from 'react';
import { Briefcase, ChevronDown, Loader2, Search, SlidersHorizontal } from 'lucide-react';
import { jobBoardService, type JobFeedItem } from '../../services/api/jobBoardService';
import JobCard from './JobCard';
import JobDetail from './JobDetail';
import ApplyModal from './ApplyModal';
import { payPerDay, tradeLabelOf } from './jobBoardFormat';

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
 *
 * `JobCard`/`JobDetail`/`ApplyModal` are shared with the public
 * `/discover` Employment surfaces (see those files) — this view is the one
 * place that also has `hasApplied`/`myApplicationStatus` to pass, since
 * those come from an authenticated session.
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
          backLabel="Jobs search"
          onApply={() => setApplyTarget(openJob)}
          hasApplied={openJob.hasApplied}
          myApplicationStatus={openJob.myApplicationStatus}
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
                hasApplied={job.hasApplied}
                myApplicationStatus={job.myApplicationStatus}
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
