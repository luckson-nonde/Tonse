import { CheckCircle2 } from 'lucide-react';
import type { JobApplicationStatus } from '../../services/api/jobBoardService';

/** The small pill `JobCard`/`JobDetail` show in place of an Apply button once
 *  the current session has already applied — only ever passed a status when
 *  there IS a session; a public/guest render never has one to show. */
export default function AppliedBadge({
  status,
}: {
  status: JobApplicationStatus | null | undefined;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-emerald-700 bg-emerald-50 border border-[#6ee7b7] px-3 py-1.5 rounded-lg">
      <CheckCircle2 className="w-3.5 h-3.5" />
      {status === 'ACCEPTED' ? 'Accepted' : status === 'REJECTED' ? 'Not selected' : 'Applied'}
    </span>
  );
}
