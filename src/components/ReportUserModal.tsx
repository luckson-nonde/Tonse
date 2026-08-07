/**
 * Report-a-user modal — shared by every "report" surface (seller reports
 * a buyer from a lead card, buyer reports a shop from its profile).
 * Submits to POST /reports; admins review under the console's Reports tab.
 *
 * Border colors are opaque hexes on purpose — translucent borders on
 * rounded cards mis-rasterize on Mali-GPU Android phones.
 */
import React, { useState } from 'react';
import { Flag, X, Loader2, CheckCircle2 } from 'lucide-react';
import {
  reportService,
  REPORT_CATEGORIES,
  ReportCategory,
} from '../services/api/reportService';

export default function ReportUserModal({
  reportedUserId,
  reportedUserName,
  contextType,
  contextId,
  onClose,
}: {
  reportedUserId: string;
  reportedUserName?: string;
  contextType?: 'INQUIRY' | 'QUOTE' | 'ORDER';
  contextId?: string;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<ReportCategory | ''>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!category) {
      setError('Choose what went wrong.');
      return;
    }
    if (description.trim().length < 5) {
      setError('Please describe what happened (a sentence is enough).');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await reportService.submit({
        reportedUserId,
        category,
        description: description.trim(),
        ...(contextType && contextId ? { contextType, contextId } : {}),
      });
      setDone(true);
    } catch (e: any) {
      setError(e?.message || 'Could not submit the report — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#f1f5f9] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Flag className="w-4.5 h-4.5 text-[#c0392b]" />
            <h3 className="text-[16px] font-bold text-slate-900">
              Report {reportedUserName || 'this user'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {done ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <p className="text-[15px] font-bold text-slate-900">Report submitted</p>
            <p className="mt-1 text-[13px] text-slate-500 leading-relaxed">
              Our team will review it. Thanks for helping keep Nyuwe safe.
            </p>
            <button
              onClick={onClose}
              className="mt-5 px-6 py-2.5 rounded-xl bg-[#1a1a2e] text-white text-[12px] font-bold hover:bg-[#C9973A] transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                What went wrong?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {REPORT_CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value)}
                    className={`px-3 py-2.5 rounded-xl border text-[12px] font-semibold text-left transition-all ${
                      category === c.value
                        ? 'border-[#d49b35] bg-[#fdf6e9] text-[#8a6118]'
                        : 'border-[#e2e8f0] text-slate-600 hover:border-[#cbd5e1]'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                What happened?
              </p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe what happened, with any details that help us verify it…"
                className="w-full px-4 py-3 bg-slate-50 border border-[#f1f5f9] rounded-xl text-[13px] font-medium focus:bg-white focus:border-[#d49b35] outline-none resize-none"
              />
            </div>

            {error && <p className="text-[12px] font-semibold text-rose-500">{error}</p>}

            <button
              onClick={submit}
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-[#1a1a2e] text-white text-[12px] font-black uppercase tracking-widest hover:bg-[#C9973A] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit report
            </button>
            <p className="text-[11px] text-slate-400 text-center leading-snug">
              Reports are confidential — the reported user is not notified who filed it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
