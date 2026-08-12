import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import { useAuth } from '../AuthContext';
import DiscoverHeader from '../components/discover/DiscoverHeader';
import JobDetail from '../components/labour/JobDetail';
import ApplyModal from '../components/labour/ApplyModal';
import { jobBoardService, PublicJobFeedItem } from '../services/api/jobBoardService';
import { saveJobApplicationIntent } from '../services/pendingJobApplication';

/**
 * The public detail page for a single job posting — what a `JobCard` on
 * `/discover`'s Employment surfaces opens into. Deliberately NOT a quote
 * form: this category runs on real job postings and applications now (see
 * `project_job_board` in memory), so the primary action is an Apply BUTTON
 * that either opens the real `ApplyModal` (signed in) or sends a guest to
 * log in first (mirrors `PublicShopProfile`'s guest-quote gate, but see
 * `pendingJobApplication.ts` for why this can't resubmit a draft the way a
 * quote can).
 */
export default function PublicJobPosting() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [job, setJob] = useState<PublicJobFeedItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [ineligible, setIneligible] = useState(false);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    setIsLoading(true);
    jobBoardService.getPublicPosting(id).then((data) => {
      if (isMounted) {
        setJob(data);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Bounced back here after logging in to resume a guest Apply click
  // (Login.tsx reads pendingJobApplication.ts and sends us here with this
  // flag) — open the real modal now that there's a session.
  useEffect(() => {
    if ((location.state as { resumeApply?: boolean } | null)?.resumeApply && job) {
      setApplying(true);
    }
  }, [location.state, job]);

  const handleApply = () => {
    if (!job) return;
    if (!user) {
      saveJobApplicationIntent({ jobPostingId: job.id, jobTitle: job.title });
      navigate('/login', { state: { pendingJobTitle: job.title } });
      return;
    }
    setIneligible(false);
    setApplying(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f2ed] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c9973a]" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-[#f5f2ed]">
        <DiscoverHeader onBack={() => navigate('/discover')} />
        <div className="px-5 sm:px-8 lg:px-12 py-24 text-center text-[#6b7280]">
          <p className="mb-4">This job posting couldn't be found — it may have closed.</p>
          <button
            onClick={() => navigate('/discover?category=labour')}
            className="rounded-full bg-[#1B3068] text-white font-semibold text-sm px-5 py-2.5"
          >
            See other openings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f2ed] text-[#1e293b] pb-16">
      <DiscoverHeader onBack={() => navigate('/discover?category=labour')} />

      <div className="max-w-300 mx-auto px-5 sm:px-8 lg:px-12 pt-6">
        {applied ? (
          <div className="max-w-lg mx-auto text-center py-16">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#fdf6e9] border border-[#f0dfc0] flex items-center justify-center mb-4">
              <Briefcase className="w-6 h-6 text-[#C9973A]" />
            </div>
            <h2 className="font-serif font-semibold text-[1.4rem] text-[#1B3068] mb-2">
              Application sent
            </h2>
            <p className="text-[13px] text-[#6b7280] mb-6">
              {job.posterName} will review it — your contact details stay private until they
              accept.
            </p>
            <button
              onClick={() => navigate('/provider?tab=my-applications')}
              className="rounded-full bg-[#1B3068] text-white font-semibold text-sm px-6 py-2.5"
            >
              View my applications
            </button>
          </div>
        ) : (
          <>
            {ineligible && (
              <div className="mb-5 p-4 bg-amber-50 border border-amber-100 text-amber-700 text-sm rounded-xl font-medium">
                This account can't apply for jobs yet —{' '}
                <button
                  onClick={() => navigate('/role-selection')}
                  className="font-bold underline underline-offset-2"
                >
                  set up a Looking for Employment profile
                </button>{' '}
                to apply.
              </div>
            )}
            <JobDetail
              job={job}
              onBack={() => navigate('/discover?category=labour')}
              backLabel="Back to Employment"
              onApply={handleApply}
            />
          </>
        )}
      </div>

      {applying && (
        <ApplyModal
          job={job}
          onClose={() => setApplying(false)}
          onApplied={() => {
            setApplying(false);
            setApplied(true);
          }}
          onError={(message) => {
            // The backend's exact ForbiddenException text
            // (job-board.service.ts's EMPLOYMENT_ACCOUNT_PREDICATE gate) —
            // matched so this ONE known failure gets the richer banner with
            // a link; anything else stays as the modal's own inline error.
            if (message.includes('Looking for Employment')) {
              setApplying(false);
              setIneligible(true);
            }
          }}
        />
      )}
    </div>
  );
}
