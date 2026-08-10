import { useCallback, useEffect, useState } from 'react';
import { useRef } from 'react';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  FileCheck,
  Loader2,
  MapPin,
  Paperclip,
  Search,
  Users,
  X,
} from 'lucide-react';
import {
  JOB_RATE_UNITS,
  jobBoardService,
  type JobApplicationAttachment,
  type JobFeedItem,
  type JobRateUnit,
} from '../../services/api/jobBoardService';
import { apiClient } from '../../services/api/client';
import { LABOUR_CATEGORIES } from '../../services/labourCategories';
import { getLabourRequirements } from '../../services/labourFormSchema';
import DateTimePicker from '../DateTimePicker';

const tradeLabelOf = (id: string) =>
  LABOUR_CATEGORIES.find((c) => c.id === id)?.label ?? id.replace(/_/g, ' ');

const formatPay = (payOffer: number | string | null, unit: string | null) => {
  const n = Number(payOffer);
  if (!payOffer || Number.isNaN(n) || n <= 0) return null;
  return `K${n.toLocaleString()} ${unit ?? ''}`.trim();
};

/**
 * "Find Jobs" — the labour provider's job feed: admin-approved postings
 * whose trades match the trades this provider registered with (the match
 * happens server-side; an empty feed just means nothing matches yet).
 * Applying is applicant-shaped: a message + expected rate + availability,
 * NOT a price quote.
 */
export default function JobSeekerFeedView() {
  const [jobs, setJobs] = useState<JobFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyTarget, setApplyTarget] = useState<JobFeedItem | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setJobs(await jobBoardService.listFeed());
    } catch (e) {
      setError((e as Error)?.message || 'Could not load jobs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onApplied = (jobId: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId ? { ...j, hasApplied: true, myApplicationStatus: 'PENDING' } : j,
      ),
    );
    setApplyTarget(null);
  };

  return (
    <div className="space-y-3">
      {applyTarget && (
        <ApplyModal job={applyTarget} onClose={() => setApplyTarget(null)} onApplied={onApplied} />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : error ? (
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
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#e2e8f0]">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#fdf6e9] border border-[#f0dfc0] flex items-center justify-center mb-3">
            <Search className="w-6 h-6 text-[#C9973A]" />
          </div>
          <p className="text-sm font-black text-[#1a1a2e]">No jobs for your trades right now</p>
          <p className="text-[13px] text-slate-500 mt-1 max-w-sm mx-auto">
            When someone posts a job matching the trades on your profile, it appears here and you
            get a notification.
          </p>
        </div>
      ) : (
        jobs.map((job) => {
          const pay = formatPay(job.payOffer, job.payRateUnit);
          const urgency = (job.attributes?.urgency as string) || null;
          return (
            <div key={job.id} className="bg-white rounded-2xl border border-[#e2e8f0] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-[#1a1a2e]">{job.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {job.tradeCategoryIds.map(tradeLabelOf).join(', ')} · Posted by {job.posterName}
                  </p>
                </div>
                {pay && (
                  <span className="shrink-0 text-[12px] font-black text-[#8a6420] bg-[#fdf6e9] border border-[#f0dfc0] px-2.5 py-1 rounded-full">
                    {pay}
                  </span>
                )}
              </div>

              <p className="text-[13px] text-slate-600 mt-2 whitespace-pre-wrap">{job.description}</p>

              {(() => {
                const requirements = getLabourRequirements(job.tradeCategoryIds[0], job.attributes);
                if (requirements.length === 0) return null;
                return (
                  <div className="mt-3 rounded-xl border border-[#eef2f6] bg-[#fbfaf7] px-3.5 py-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Requirements
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                      {requirements.map((r) => (
                        <div key={r.label} className="flex items-baseline gap-2 text-[12px]">
                          <span className="text-slate-500">{r.label}:</span>
                          <span className="font-bold text-slate-700">{r.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-[11px] font-bold text-slate-500">
                {job.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {job.location}
                  </span>
                )}
                {job.workersNeeded ? (
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {job.workersNeeded} worker
                    {job.workersNeeded === 1 ? '' : 's'} needed
                  </span>
                ) : null}
                {urgency && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {urgency === 'Immediately'
                      ? 'Starts immediately'
                      : job.attributes?.preferredDateTime
                        ? `Starts ${new Date(String(job.attributes.preferredDateTime)).toLocaleString()}`
                        : urgency}
                  </span>
                )}
                {job.applicationDeadline && (
                  <span className="text-rose-500">
                    Apply by {new Date(job.applicationDeadline).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="mt-3">
                {job.hasApplied ? (
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-emerald-700 bg-emerald-50 border border-[#6ee7b7] px-3 py-1.5 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {job.myApplicationStatus === 'ACCEPTED'
                      ? 'Accepted — check My Applications'
                      : job.myApplicationStatus === 'REJECTED'
                        ? 'Applied — not selected'
                        : 'Application sent'}
                  </span>
                ) : (
                  <button
                    onClick={() => setApplyTarget(job)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C9973A] hover:bg-[#b8852f] text-white text-[13px] font-bold transition-colors"
                  >
                    <Briefcase className="w-4 h-4" /> Apply
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/** An attachment being composed in the modal: the API shape plus the local
 *  file name, shown so the applicant can tell two uploads apart. */
type DraftAttachment = JobApplicationAttachment & { fileName?: string };

function ApplyModal({
  job,
  onClose,
  onApplied,
}: {
  job: JobFeedItem;
  onClose: () => void;
  onApplied: (jobId: string) => void;
}) {
  const [coverMessage, setCoverMessage] = useState('');
  const [expectedRate, setExpectedRate] = useState('');
  const [rateUnit, setRateUnit] = useState<JobRateUnit>(
    (job.payRateUnit as JobRateUnit) || 'Per Day',
  );
  const [availabilityDate, setAvailabilityDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Each attachment is labelled with the posting requirement it answers, so
  // the poster sees "Certifications Required → licence.pdf" rather than a
  // pile of anonymous files. The label is picked per file (below) instead of
  // hanging an Attach button off every requirement row — most requirements
  // ("Number of Workers: 2") are facts, not things you attach proof to.
  // `fileName` is a local display nicety only — it is NOT part of the API
  // contract, and the backend's ValidationPipe runs forbidNonWhitelisted, so
  // it must be stripped before submit or the whole request 400s.
  const [attachments, setAttachments] = useState<DraftAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const requirements = getLabourRequirements(job.tradeCategoryIds[0], job.attributes);
  const labelOptions = [...requirements.map((r) => r.label), 'Supporting document'];

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (file.type && !allowed.includes(file.type)) {
      setError(`"${file.name}" isn't supported — attach a JPG, PNG or PDF.`);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(`"${file.name}" is too large — the limit is 10MB.`);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      // 'job-application' is a SENSITIVE category: encrypted at rest and
      // served only through the authenticated /files/secure endpoint.
      const res = await apiClient.post<{ url: string }>(
        '/files/upload?category=job-application',
        formData,
      );
      const url = res.data?.url;
      if (!url) throw new Error('Upload returned no file URL.');
      // Default the label to the first requirement not yet answered, so the
      // common case (one requirement, one document) needs no extra tap.
      const used = new Set(attachments.map((a) => a.label));
      const suggested = requirements.map((r) => r.label).find((l) => !used.has(l));
      setAttachments((prev) => [
        ...prev,
        { label: suggested ?? 'Supporting document', url, fileName: file.name },
      ]);
    } catch (e) {
      setError((e as Error)?.message || 'Could not upload that file.');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (url: string) =>
    setAttachments((prev) => prev.filter((a) => a.url !== url));

  const relabel = (url: string, label: string) =>
    setAttachments((prev) => prev.map((a) => (a.url === url ? { ...a, label } : a)));

  const submit = async () => {
    if (coverMessage.trim().length < 10) {
      setError('Tell the poster why you fit this job (at least a sentence).');
      return;
    }
    const rate = Number(expectedRate);
    if (!expectedRate || Number.isNaN(rate) || rate < 0) {
      setError('Enter your expected rate as a number, e.g. 300.');
      return;
    }
    if (!availabilityDate) {
      setError('Pick the earliest day you can start.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await jobBoardService.applyToJob(job.id, {
        coverMessage: coverMessage.trim(),
        expectedRate: rate,
        rateUnit,
        availabilityDate,
        ...(attachments.length
          ? { attachments: attachments.map(({ label, url }) => ({ label, url })) }
          : {}),
      });
      onApplied(job.id);
    } catch (e) {
      setError((e as Error)?.message || 'Could not send your application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#eef2f6] px-5 py-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-[#1a1a2e]">Apply: {job.title}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Your profile, message and rate go to the poster. Contact details are shared only if
              you're accepted.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Why are you right for this job? *
            </label>
            <textarea
              value={coverMessage}
              onChange={(e) => setCoverMessage(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-[#e2e8f0] bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C9973A]/40"
              placeholder="Your experience, similar work you've done, tools you have…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Expected rate (ZMW) *
              </label>
              <input
                type="number"
                min={0}
                value={expectedRate}
                onChange={(e) => setExpectedRate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#e2e8f0] bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#C9973A]/40"
                placeholder="e.g. 300"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Per *</label>
              <select
                value={rateUnit}
                onChange={(e) => setRateUnit(e.target.value as JobRateUnit)}
                className="w-full px-3 py-3 rounded-xl border border-[#e2e8f0] bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#C9973A]/40"
              >
                {JOB_RATE_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Available from *
            </label>
            <DateTimePicker
              value={availabilityDate}
              onChange={setAvailabilityDate}
              mode="date"
              placeholder="Earliest day you can start"
            />
          </div>

          <div className="rounded-xl border border-[#eef2f6] bg-[#fbfaf7] px-3.5 py-3">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              Attach proof
            </p>
            {requirements.length > 0 ? (
              <>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  What this employer specified — attach documents for anything you can prove.
                  Only they can open your files.
                </p>
                <ul className="mt-2 space-y-0.5">
                  {requirements.map((r) => (
                    <li key={r.label} className="text-[12px] text-slate-600">
                      <span className="text-slate-500">{r.label}:</span>{' '}
                      <span className="font-bold text-slate-700">{r.value}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-[11px] text-slate-500 mt-0.5">
                Certificates, licences or photos of your work. Only this employer can open them.
              </p>
            )}

            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((att) => (
                  <div
                    key={att.url}
                    className="flex items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-2.5 py-2"
                  >
                    <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <select
                      value={att.label}
                      onChange={(e) => relabel(att.url, e.target.value)}
                      className="min-w-0 flex-1 text-[12px] font-bold text-slate-700 bg-transparent focus:outline-none"
                    >
                      {labelOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <span className="text-[11px] text-slate-400 truncate max-w-[40%]">
                      {att.fileName ?? 'Document'}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.url)}
                      className="shrink-0 text-slate-400 hover:text-rose-500"
                      aria-label="Remove attachment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => {
                void upload(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={uploading || attachments.length >= 10}
              onClick={() => fileInput.current?.click()}
              className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white text-[12px] font-bold text-slate-600 hover:border-[#C9973A] hover:text-[#8a6420] transition-colors disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Paperclip className="w-3.5 h-3.5" />
              )}
              {uploading ? 'Uploading…' : 'Add document'}
            </button>
            <p className="text-[10px] text-slate-400 mt-1">JPG, PNG or PDF · up to 10MB each</p>
          </div>

          {error && <p className="text-[13px] text-rose-600 font-bold">{error}</p>}

          <button
            disabled={submitting}
            onClick={() => void submit()}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#C9973A] hover:bg-[#b8852f] text-white text-sm font-bold transition-colors disabled:opacity-60"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Briefcase className="w-4 h-4" />}
            Send application
          </button>
        </div>
      </div>
    </div>
  );
}
