import { useEffect, useState } from 'react';
import { Briefcase, CheckCircle, ClipboardCheck, Clock, Search } from 'lucide-react';
import {
  jobBoardService,
  type JobFeedItem,
  type MyJobApplication,
} from '../../services/api/jobBoardService';

interface LabourHomeViewProps {
  onNavigate?: (view: string) => void;
}

/**
 * Labour Overview — the pure-labour seller's landing tab, rebuilt around
 * the job board: how many approved posts match their trades, where their
 * applications stand, and the newest matching jobs. Self-fetching (the
 * schema mounts it with just onNavigate); the wallet card is rendered by
 * the surrounding schema chrome, not here.
 */
export default function LabourHomeView({ onNavigate }: LabourHomeViewProps) {
  const [feed, setFeed] = useState<JobFeedItem[]>([]);
  const [applications, setApplications] = useState<MyJobApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [feedRows, appRows] = await Promise.all([
          jobBoardService.listFeed().catch(() => []),
          jobBoardService.listMyApplications().catch(() => []),
        ]);
        if (cancelled) return;
        setFeed(feedRows);
        setApplications(appRows);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openApplications = applications.filter((a) => a.status === 'PENDING').length;
  const acceptedJobs = applications.filter((a) => a.status === 'ACCEPTED').length;
  const newJobs = feed.filter((j) => !j.hasApplied);

  const metric = (
    label: string,
    value: number,
    icon: React.ReactNode,
    chipClass: string,
    target: string,
  ) => (
    <div
      onClick={() => onNavigate?.(target)}
      className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 cursor-pointer hover:border-[#e7d7b8] hover:shadow-md transition-all group"
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${chipClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-serif font-bold text-brand-dark">{loading ? '…' : value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metric(
          'Jobs For You',
          newJobs.length,
          <Search className="w-6 h-6" />,
          'bg-[#fdf6e9] text-[#c9973a]',
          'find-jobs',
        )}
        {metric(
          'Open Applications',
          openApplications,
          <ClipboardCheck className="w-6 h-6" />,
          'bg-amber-50 text-amber-500',
          'my-applications',
        )}
        {metric(
          'Accepted',
          acceptedJobs,
          <CheckCircle className="w-6 h-6" />,
          'bg-emerald-50 text-emerald-500',
          'my-applications',
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[16px] font-serif font-bold text-brand-dark">Newest jobs for you</h3>
          <button
            onClick={() => onNavigate?.('find-jobs')}
            className="text-[13px] font-medium text-[#C9973A] hover:underline"
          >
            View All
          </button>
        </div>

        {loading ? (
          <p className="text-slate-400 text-[14px] py-6 text-center">Loading…</p>
        ) : newJobs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 text-[14px]">
              No new jobs match your trades right now — you'll get a notification when one lands.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {newJobs.slice(0, 3).map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between gap-3 p-4 rounded-xl border border-slate-100 hover:border-[#e7d7b8] transition-colors"
              >
                <div className="min-w-0">
                  <h4 className="font-medium text-brand-dark truncate">{job.title}</h4>
                  <div className="flex items-center gap-3 mt-1 text-[12px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span className="truncate">{job.location || 'Location not specified'}</span>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate?.('find-jobs')}
                  className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-brand-dark text-[13px] font-medium rounded-full transition-colors"
                >
                  <Briefcase className="w-3.5 h-3.5" /> View & Apply
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
