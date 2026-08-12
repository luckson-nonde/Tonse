import { Banknote, CalendarClock, Clock, MapPin, Users } from 'lucide-react';
import type { JobApplicationStatus, PublicJobFeedItem } from '../../services/api/jobBoardService';
import AppliedBadge from './AppliedBadge';
import { formatPay, timeAgo, tradeLabelOf } from './jobBoardFormat';

/**
 * One job-poster/employment-ad card — the authenticated "Find Jobs" feed and
 * the public `/discover` Employment surfaces share this exact component
 * (mirrors why `StorefrontProductCard` was pulled out of `StorefrontCardGrid`
 * for dual home-band/category-grid use).
 *
 * `job` only needs the public field set (`PublicJobFeedItem`) — a
 * `JobFeedItem` from the authenticated feed satisfies that shape too, since
 * it's a strict superset. `hasApplied`/`myApplicationStatus` are separate,
 * OPTIONAL props rather than read off `job`: a public/guest render simply
 * omits them, which always renders the "Apply now" button — there's no
 * session to have applied from.
 */
export default function JobCard({
  job,
  onOpen,
  onApply,
  hasApplied,
  myApplicationStatus,
}: {
  job: PublicJobFeedItem;
  onOpen: () => void;
  onApply: () => void;
  hasApplied?: boolean;
  myApplicationStatus?: JobApplicationStatus | null;
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
        {hasApplied ? (
          <AppliedBadge status={myApplicationStatus} />
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
