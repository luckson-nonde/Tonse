import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, Loader2, Mail, MapPin, Phone } from 'lucide-react';
import { jobBoardService, type MyJobApplication } from '../../services/api/jobBoardService';
import { LABOUR_CATEGORIES } from '../../services/labourCategories';

const tradeLabelOf = (id: string) =>
  LABOUR_CATEGORIES.find((c) => c.id === id)?.label ?? id.replace(/_/g, ' ');

const STATUS_CHIP: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-[#fcd34d]' },
  ACCEPTED: { label: 'Accepted', className: 'bg-emerald-50 text-emerald-700 border-[#6ee7b7]' },
  REJECTED: { label: 'Not selected', className: 'bg-slate-100 text-slate-500 border-[#cbd5e1]' },
};

/**
 * "My Applications" — the seeker's side of the job board: every job they
 * applied to with its verdict. Once ACCEPTED, the backend includes the
 * poster's contact so the two sides can arrange the work directly.
 */
export default function MyApplicationsView() {
  const [applications, setApplications] = useState<MyJobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setApplications(await jobBoardService.listMyApplications());
    } catch (e) {
      setError((e as Error)?.message || 'Could not load your applications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
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

  if (applications.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-[#e2e8f0]">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#fdf6e9] border border-[#f0dfc0] flex items-center justify-center mb-3">
          <ClipboardCheck className="w-6 h-6 text-[#C9973A]" />
        </div>
        <p className="text-sm font-black text-[#1a1a2e]">No applications yet</p>
        <p className="text-[13px] text-slate-500 mt-1 max-w-sm mx-auto">
          Jobs you apply to from Find Jobs show up here with their status.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {applications.map((app) => {
        const chip = STATUS_CHIP[app.status] ?? STATUS_CHIP.PENDING;
        return (
          <div key={app.id} className="bg-white rounded-2xl border border-[#e2e8f0] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-[#1a1a2e] truncate">
                  {app.posting?.title ?? 'Job post'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {(app.posting?.tradeCategoryIds ?? []).map(tradeLabelOf).join(', ')}
                  {app.posting?.city ? ` · ${app.posting.city}` : ''}
                </p>
              </div>
              <span
                className={`shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full border ${chip.className}`}
              >
                {chip.label}
              </span>
            </div>

            <p className="text-[12px] text-slate-500 mt-2 font-medium">
              You asked{' '}
              <span className="font-bold text-slate-700">
                K{Number(app.expectedRate).toLocaleString()} {app.rateUnit}
              </span>
              {' · '}available from{' '}
              <span className="font-bold text-slate-700">
                {new Date(app.availabilityDate).toLocaleDateString()}
              </span>
              {' · '}applied {new Date(app.createdAt).toLocaleDateString()}
            </p>

            {app.posting?.location && (
              <p className="text-[12px] text-slate-500 mt-1 inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> {app.posting.location}
              </p>
            )}

            {app.status === 'ACCEPTED' && app.posterContact && (
              <div className="mt-3 bg-emerald-50 border border-[#6ee7b7] rounded-xl px-3.5 py-3">
                <p className="text-[12px] font-black text-emerald-800">
                  You got the job{app.posterContact.name ? ` — contact ${app.posterContact.name}` : ''}!
                </p>
                <div className="mt-1.5 flex flex-wrap gap-3 text-[12px] font-bold text-emerald-800">
                  {app.posterContact.phone && (
                    <a
                      href={`tel:${app.posterContact.phone}`}
                      className="inline-flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5" /> {app.posterContact.phone}
                    </a>
                  )}
                  {app.posterContact.email && (
                    <a
                      href={`mailto:${app.posterContact.email}`}
                      className="inline-flex items-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5" /> {app.posterContact.email}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
