/**
 * Job board — admin moderation queue.
 *
 * ReportsView/AdsAdminView-style pending queue with inline approve/reject
 * (reject requires-or-invites a reason shown back to the poster). Unlike
 * Ads, this tab IS grantable to sub-admins via ADMIN_JOB_BOARD; the real
 * enforcement is the backend @AdminPermission decorator.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  RefreshCw,
  Users,
  XCircle,
} from 'lucide-react';
import { adminService, AdminJobPosting } from '../../services/api/adminService';
import { LABOUR_CATEGORIES } from '../../services/labourCategories';
import { getJobSpecifications, getSeekerRequirements } from '../../services/labourFormSchema';

const CARD =
  'bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)]';

const tradeLabelOf = (id: string) =>
  LABOUR_CATEGORIES.find((c) => c.id === id)?.label ?? id.replace(/_/g, ' ');

const formatPay = (payOffer: number | string | null, unit: string | null) => {
  const n = Number(payOffer);
  if (!payOffer || Number.isNaN(n) || n <= 0) return null;
  return `K${n.toLocaleString()} ${unit ?? ''}`.trim();
};

export default function JobBoardAdminView() {
  const [pending, setPending] = useState<AdminJobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPending(await adminService.listPendingJobPostings());
    } catch (e: any) {
      setError(e?.message || 'Failed to load pending job posts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (id: string) => {
    setBusyId(id);
    try {
      await adminService.approveJobPosting(id);
      setPending((rows) => rows.filter((r) => r.id !== id));
    } catch (e: any) {
      alert(e?.message || 'Failed to approve this job post.');
    } finally {
      setBusyId(null);
    }
  };

  const confirmReject = async (id: string) => {
    setBusyId(id);
    try {
      await adminService.rejectJobPosting(id, rejectReason.trim() || undefined);
      setPending((rows) => rows.filter((r) => r.id !== id));
      setRejectingId(null);
      setRejectReason('');
    } catch (e: any) {
      alert(e?.message || 'Failed to reject this job post.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center gap-4 text-slate-400">
        {error ? (
          <>
            <p className="text-[13px] font-bold text-rose-500">{error}</p>
            <button
              onClick={load}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-[#1a1a2e] hover:border-[#C9973A]/40 transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </>
        ) : (
          <Loader2 className="w-6 h-6 animate-spin" />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className={CARD}>
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#fdf6e9] flex items-center justify-center">
              <Briefcase className="w-4.5 h-4.5 text-[#C9973A]" />
            </div>
            <div>
              <h3 className="text-[15px] font-black text-[#1a1a2e]">Job posts awaiting review</h3>
              <p className="text-[12px] text-slate-500">
                Approved posts go live to registered workers in the selected trades and the poster
                is notified either way.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
            {pending.length} pending
          </span>
        </div>

        {pending.length === 0 ? (
          <p className="text-[13px] text-slate-400 py-8 text-center">
            Nothing waiting for review — new job posts land here.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {pending.map((posting) => {
              const pay = formatPay(posting.payOffer, posting.payRateUnit);
              return (
                <div key={posting.id} className="border border-slate-100 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[#1a1a2e]">{posting.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {posting.tradeCategoryIds.map(tradeLabelOf).join(', ')} · Posted by{' '}
                        <span className="font-bold">{posting.poster.name}</span> ({posting.poster.role})
                      </p>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(posting.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-[13px] text-slate-600 mt-2 whitespace-pre-wrap">
                    {posting.description}
                  </p>

                  {(() => {
                    const specs = getJobSpecifications(
                      posting.tradeCategoryIds[0],
                      posting.attributes,
                    );
                    const requirements = getSeekerRequirements(posting.attributes);
                    return (
                      <>
                        {specs.length > 0 && (
                          <div className="mt-2.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                              Job specifications
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                              {specs.map((r) => (
                                <div key={r.label} className="flex items-baseline gap-2 text-[12px]">
                                  <span className="text-slate-500">{r.label}:</span>
                                  <span className="font-bold text-slate-700">{r.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {requirements.length > 0 && (
                          <div className="mt-2 rounded-lg border border-[#f0dfc0] bg-[#fdf9f0] px-3 py-2.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#a87b28] mb-1.5">
                              Applicant requirements
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                              {requirements.map((r) => (
                                <div key={r.label} className="flex items-baseline gap-2 text-[12px]">
                                  <span className="text-[#a87b28]">{r.label}:</span>
                                  <span className="font-bold text-slate-700">{r.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] font-bold text-slate-500">
                    {posting.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {posting.location}
                      </span>
                    )}
                    {posting.workersNeeded ? (
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> {posting.workersNeeded} worker
                        {posting.workersNeeded === 1 ? '' : 's'}
                      </span>
                    ) : null}
                    {pay && <span className="text-[#8a6420]">{pay}</span>}
                    {posting.applicationDeadline && (
                      <span>
                        Apply by {new Date(posting.applicationDeadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {rejectingId === posting.id ? (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-rose-200"
                        placeholder="Tell the poster what to change (shown to them)…"
                      />
                      <div className="flex gap-2">
                        <button
                          disabled={busyId === posting.id}
                          onClick={() => void confirmReject(posting.id)}
                          className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-bold transition-colors disabled:opacity-60"
                        >
                          {busyId === posting.id ? 'Rejecting…' : 'Confirm reject'}
                        </button>
                        <button
                          onClick={() => {
                            setRejectingId(null);
                            setRejectReason('');
                          }}
                          className="px-4 py-2 rounded-lg border border-slate-200 text-slate-500 text-[12px] font-bold hover:bg-slate-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-3">
                      <button
                        disabled={busyId === posting.id}
                        onClick={() => void approve(posting.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold transition-colors disabled:opacity-60"
                      >
                        {busyId === posting.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Approve
                      </button>
                      <button
                        disabled={busyId === posting.id}
                        onClick={() => setRejectingId(posting.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-[12px] font-bold hover:bg-slate-50 transition-colors disabled:opacity-60"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
