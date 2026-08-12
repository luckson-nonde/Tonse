import { ArrowRight, Briefcase } from 'lucide-react';
import type { PublicJobFeedItem } from '../../services/api/jobBoardService';
import JobCard from '../labour/JobCard';

/** Cards shown before "See all" hands off to the full Employment grid
 *  (`/discover?category=labour`, `EmploymentGrid`) — the single source of
 *  truth for the rest of the list. */
const PREVIEW_COUNT = 6;

/**
 * The "Employment" rail on the default `/discover` browse view — real job
 * postings, not shop cards. Sits where labour shops used to appear inside
 * "People & Equipment" before that category was split out onto its own
 * data source (see DiscoverPage's shop-filtering comment).
 *
 * `jobs` is the SAME array DiscoverPage already loads once to drive the Top
 * Categories pill's live opening count — no independent fetch here.
 */
export default function EmploymentSection({
  jobs,
  onOpenJob,
  onSeeAll,
}: {
  jobs: PublicJobFeedItem[];
  onOpenJob: (id: string) => void;
  onSeeAll: () => void;
}) {
  if (jobs.length === 0) return null;
  const preview = jobs.slice(0, PREVIEW_COUNT);

  return (
    <section className="px-5 sm:px-8 lg:px-12 mt-9">
      <div className="flex items-baseline justify-between mb-4 gap-4">
        <div className="min-w-0">
          <h2 className="font-serif font-semibold text-[1.25rem] sm:text-[1.4rem] text-[#1B3068] flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#a97c27]" />
            Employment
          </h2>
          <p className="text-[12.5px] text-[#8a8577] mt-0.5">
            {jobs.length} open vacanc{jobs.length === 1 ? 'y' : 'ies'} on Nyuwe — apply directly
          </p>
        </div>
        {jobs.length > PREVIEW_COUNT && (
          <button
            onClick={onSeeAll}
            className="shrink-0 flex items-center gap-1 text-[12px] font-semibold text-[#a97c27] hover:underline underline-offset-2"
          >
            See all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* JobCard is a wide, footer-bar card (unlike the compact product
          tiles this page's other grids use) — one or two columns reads
          right, four would crush it. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4.5">
        {preview.map((job) => (
          <JobCard key={job.id} job={job} onOpen={() => onOpenJob(job.id)} onApply={() => onOpenJob(job.id)} />
        ))}
      </div>
    </section>
  );
}
