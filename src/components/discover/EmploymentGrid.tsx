import { Briefcase } from 'lucide-react';
import type { PublicJobFeedItem } from '../../services/api/jobBoardService';
import JobCard from '../labour/JobCard';

/**
 * The full Employment listing — rendered instead of `CategoryProductGrid`
 * when the labour/Employment category pill is active, since job postings
 * are a different data source than the product/shop catalogue that grid
 * queries. Client-side only (no server pagination): the whole public feed
 * is already loaded by `DiscoverPage` for the Top Categories pill's live
 * count, and at demo/current scale a client-rendered list is plenty — an
 * accepted v1 simplification versus `CategoryProductGrid`'s paginated
 * server fetch.
 */
export default function EmploymentGrid({
  jobs,
  isLoading,
  onOpenJob,
  onClearCategory,
}: {
  jobs: PublicJobFeedItem[];
  isLoading: boolean;
  onOpenJob: (id: string) => void;
  onClearCategory: () => void;
}) {
  return (
    <section id="category-product-grid" className="px-5 sm:px-8 lg:px-12 mt-9 scroll-mt-24">
      <div className="flex items-baseline justify-between mb-4 gap-4">
        <div className="min-w-0">
          <h2 className="font-serif font-semibold text-[1.25rem] sm:text-[1.4rem] text-[#1B3068] truncate">
            Employment listings
          </h2>
          <p className="text-[12.5px] text-[#8a8577] mt-0.5">
            {jobs.length > 0
              ? `${jobs.length} open vacanc${jobs.length === 1 ? 'y' : 'ies'}`
              : ' '}
          </p>
        </div>
        <button
          onClick={onClearCategory}
          className="text-[12px] font-semibold text-[#a97c27] hover:underline underline-offset-2 shrink-0"
        >
          Show all
        </button>
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#c9973a]" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="py-14 flex flex-col items-center text-center gap-3 bg-[#fffaf5] border border-[#e7e0d5] rounded-3xl">
          <Briefcase className="w-8 h-8 text-[#c9973a]" />
          <p className="text-[14px] font-semibold text-[#1B3068]">
            No open vacancies right now — check back soon.
          </p>
          <button
            onClick={onClearCategory}
            className="text-[12.5px] font-semibold text-[#a97c27] hover:underline underline-offset-2"
          >
            Browse other categories
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4.5">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onOpen={() => onOpenJob(job.id)}
              onApply={() => onOpenJob(job.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
