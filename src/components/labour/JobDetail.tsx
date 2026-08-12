import { ArrowLeft, Banknote, Briefcase, CalendarClock, Clock, FileText, MapPin, Users } from 'lucide-react';
import type { JobApplicationStatus, PublicJobFeedItem } from '../../services/api/jobBoardService';
import { getRequiredAttachmentSlots } from '../../services/labourFormSchema';
import JobAttributesDisplay from './JobAttributesDisplay';
import AppliedBadge from './AppliedBadge';
import { formatPay, timeAgo, tradeLabelOf } from './jobBoardFormat';

/**
 * Single-posting detail body — shared by the authenticated feed
 * (`JobSeekerFeedView`) and the public `/discover/jobs/:id` page. See
 * `JobCard` for why `job` is typed as the public shape and
 * `hasApplied`/`myApplicationStatus` are separate optional props.
 *
 * `backLabel` lets the two callers word the back-link for their own context
 * ("Jobs search" inside the dashboard feed vs. "Back to Employment" on the
 * public page) without the component needing to know which one it's in.
 */
export default function JobDetail({
  job,
  onBack,
  backLabel = 'Back',
  onApply,
  hasApplied,
  myApplicationStatus,
}: {
  job: PublicJobFeedItem;
  onBack: () => void;
  backLabel?: string;
  onApply: () => void;
  hasApplied?: boolean;
  myApplicationStatus?: JobApplicationStatus | null;
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
        {backLabel}
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
            {hasApplied ? (
              <AppliedBadge status={myApplicationStatus} />
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
