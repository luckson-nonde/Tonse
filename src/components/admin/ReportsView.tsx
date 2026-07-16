/**
 * Reports view — user-submitted complaints queue, rendered as the
 * "Reports" tab inside AdminDashboard. Open to the primary admin and to
 * User Managers holding ADMIN_REPORTS.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Flag, RefreshCw, Loader2, X } from 'lucide-react';
import {
  adminService,
  AdminReport,
  AdminReportStatus,
} from '../../services/api/adminService';
import { REPORT_CATEGORIES } from '../../services/api/reportService';

const PAGE_SIZE = 15;

const categoryLabel = (value: string) =>
  REPORT_CATEGORIES.find((c) => c.value === value)?.label ?? value;

const STATUS_STYLES: Record<AdminReportStatus, string> = {
  OPEN: 'bg-[#fdf6e9] text-[#b07f24] border border-[#ecd9b3]',
  RESOLVED: 'bg-emerald-50 text-emerald-600 border border-[#a7f3d0]',
  DISMISSED: 'bg-slate-100 text-slate-500 border border-[#e2e8f0]',
};

export default function ReportsView() {
  const [items, setItems] = useState<AdminReport[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<AdminReportStatus>('OPEN');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<AdminReport | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.listReports({
        page,
        limit: PAGE_SIZE,
        status: statusFilter,
      });
      setItems(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#C9973A] mb-2">
            Section 04 / Trust
          </p>
          <h1 className="font-serif text-[34px] sm:text-[40px] font-black text-[#1a1a2e] leading-none">
            Reports
          </h1>
          <p className="mt-3 text-[14px] text-slate-500 max-w-xl leading-relaxed">
            Complaints users filed against other users. Resolve with a note when action was
            taken, or dismiss when nothing is actionable.
          </p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-[#1a1a2e] hover:border-[#C9973A]/40 transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <div className="inline-flex flex-wrap gap-1.5 p-1 bg-slate-100/70 rounded-xl">
            {(['OPEN', 'RESOLVED', 'DISMISSED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-[0.12em] transition-all ${
                  statusFilter === s
                    ? 'bg-white text-[#1a1a2e] shadow-[0_2px_8px_-2px_rgba(15,23,42,0.1)]'
                    : 'text-slate-400 hover:text-[#1a1a2e]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="p-14 flex items-center justify-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
        {!loading && error && (
          <div className="p-10 text-center text-[13px] font-semibold text-rose-500">{error}</div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="p-14 text-center">
            <Flag className="w-6 h-6 text-slate-300 mx-auto mb-3" />
            <p className="text-[14px] font-bold text-slate-500">
              {statusFilter === 'OPEN' ? 'No open reports — all clear.' : `No ${statusFilter.toLowerCase()} reports.`}
            </p>
          </div>
        )}
        {!loading && !error && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Reported user', 'Filed by', 'Category', 'Submitted', 'Status', ''].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/40">
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#1a1a2e]">{r.reportedUserName || '—'}</p>
                      <p className="text-[11px] text-slate-400">
                        {r.reportedUserDisplayId || r.reportedUserId.slice(0, 8)}
                        {r.reportedUserRole ? ` · ${r.reportedUserRole}` : ''}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-600">{r.reporterName || '—'}</p>
                      <p className="text-[11px] text-slate-400">
                        {r.reporterDisplayId || r.reporterId.slice(0, 8)}
                        {r.reporterRole ? ` · ${r.reporterRole}` : ''}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-slate-600 font-semibold">
                      {categoryLabel(r.category)}
                    </td>
                    <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${STATUS_STYLES[r.status]}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setReviewing(r)}
                        className="px-4 py-2 bg-[#1a1a2e] text-white rounded-lg text-[11px] font-black uppercase tracking-widest hover:bg-[#C9973A] transition-all"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-5 py-4 flex items-center justify-between border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400">
              Page {page} of {totalPages} · {total} report{total !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-500 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-500 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {reviewing && (
        <ReportReviewDrawer
          report={reviewing}
          onClose={() => setReviewing(null)}
          onResolved={async () => {
            setReviewing(null);
            await load();
          }}
        />
      )}
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────

function ReportReviewDrawer({
  report,
  onClose,
  onResolved,
}: {
  report: AdminReport;
  onClose: () => void;
  onResolved: () => Promise<void> | void;
}) {
  const [note, setNote] = useState(report.resolutionNote ?? '');
  const [submitting, setSubmitting] = useState<'RESOLVED' | 'DISMISSED' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (status: 'RESOLVED' | 'DISMISSED') => {
    setSubmitting(status);
    setError(null);
    try {
      await adminService.resolveReport(report.id, {
        status,
        ...(note.trim() ? { resolutionNote: note.trim() } : {}),
      });
      await onResolved();
    } catch (e: any) {
      setError(e?.message || 'Failed to update the report');
      setSubmitting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-serif text-[20px] font-black text-[#1a1a2e]">Report review</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">
                Reported user
              </p>
              <p className="text-[14px] font-bold text-[#1a1a2e]">
                {report.reportedUserName || '—'}
              </p>
              <p className="text-[11px] text-slate-400">
                {report.reportedUserDisplayId || report.reportedUserId}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">
                Filed by
              </p>
              <p className="text-[14px] font-bold text-[#1a1a2e]">{report.reporterName || '—'}</p>
              <p className="text-[11px] text-slate-400">
                {report.reporterDisplayId || report.reporterId}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">
              {categoryLabel(report.category)}
              {report.contextType ? ` · from ${report.contextType.toLowerCase()}` : ''}
              {report.contextId ? ` #${report.contextId.slice(0, 8)}` : ''}
            </p>
            <p className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 border border-slate-100 rounded-xl p-4">
              {report.description}
            </p>
          </div>

          {report.status === 'OPEN' ? (
            <>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1.5">
                  Resolution note
                </p>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="What was done about it (visible in the audit trail)…"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[13px] font-medium focus:bg-white focus:border-[#C9973A]/40 outline-none resize-none"
                />
              </div>
              {error && <p className="text-[12px] font-semibold text-rose-500">{error}</p>}
              <div className="flex gap-3">
                <button
                  onClick={() => act('DISMISSED')}
                  disabled={!!submitting}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-[12px] font-black uppercase tracking-widest text-slate-500 hover:text-[#1a1a2e] hover:border-slate-300 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting === 'DISMISSED' && <Loader2 className="w-4 h-4 animate-spin" />}
                  Dismiss
                </button>
                <button
                  onClick={() => act('RESOLVED')}
                  disabled={!!submitting}
                  className="flex-1 py-3 rounded-xl bg-[#C9973A] text-white text-[12px] font-black uppercase tracking-widest hover:bg-[#b3852f] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting === 'RESOLVED' && <Loader2 className="w-4 h-4 animate-spin" />}
                  Resolve
                </button>
              </div>
            </>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
                {report.status}
                {report.resolvedAt ? ` · ${new Date(report.resolvedAt).toLocaleDateString()}` : ''}
              </p>
              <p className="text-[13px] text-slate-600">
                {report.resolutionNote || 'No resolution note recorded.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
