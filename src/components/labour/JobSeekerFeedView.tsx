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
import { getRequiredAttachmentSlots } from '../../services/labourFormSchema';
import JobAttributesDisplay from './JobAttributesDisplay';
import SecureFile from '../SecureFile';
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

              <JobAttributesDisplay
                tradeId={job.tradeCategoryIds[0]}
                attributes={job.attributes}
              />

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

  // The documents the POSTER demanded, each its own mandatory upload slot.
  // `fileName` is a local display nicety only — it is NOT part of the API
  // contract, and the backend's ValidationPipe runs forbidNonWhitelisted, so
  // it must be stripped before submit or the whole request 400s.
  const requiredSlots = getRequiredAttachmentSlots(job.attributes);
  const [slotFiles, setSlotFiles] = useState<Record<string, DraftAttachment | undefined>>({});
  const [extras, setExtras] = useState<DraftAttachment[]>([]);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const slotInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const missingSlots = requiredSlots.filter((label) => !slotFiles[label]?.url);

  /** Upload one file and hand back its stored secure URL. Shared by the
   *  required slots and the optional extras bucket. */
  const uploadFile = async (slotKey: string, file: File): Promise<DraftAttachment | null> => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (file.type && !allowed.includes(file.type)) {
      setError(`"${file.name}" isn't supported — attach a PDF, JPG or PNG.`);
      return null;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(`"${file.name}" is too large — the limit is 10MB.`);
      return null;
    }
    setUploadingSlot(slotKey);
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
      return { label: slotKey, url, fileName: file.name };
    } catch (e) {
      setError((e as Error)?.message || 'Could not upload that file.');
      return null;
    } finally {
      setUploadingSlot(null);
    }
  };

  const uploadToSlot = async (label: string, file: File | undefined) => {
    if (!file) return;
    const uploaded = await uploadFile(label, file);
    if (uploaded) setSlotFiles((prev) => ({ ...prev, [label]: uploaded }));
  };

  const uploadExtra = async (file: File | undefined) => {
    if (!file || extras.length >= 5) return;
    const uploaded = await uploadFile('Supporting document', file);
    if (uploaded) setExtras((prev) => [...prev, uploaded]);
  };

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
    if (missingSlots.length > 0) {
      setError(`Attach these documents before you can apply: ${missingSlots.join(', ')}.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Required documents first (labels matched exactly against what the
      // posting demands — the server re-checks the same list), then extras.
      const attachments = [
        ...requiredSlots.map((label) => ({ label, url: slotFiles[label]!.url })),
        ...extras.map(({ label, url }) => ({ label, url })),
      ];
      await jobBoardService.applyToJob(job.id, {
        coverMessage: coverMessage.trim(),
        expectedRate: rate,
        rateUnit,
        availabilityDate,
        ...(attachments.length ? { attachments } : {}),
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

          {requiredSlots.length > 0 && (
            <div className="rounded-xl border border-[#f0dfc0] bg-[#fdf9f0] px-3.5 py-3">
              <p className="text-[11px] font-black uppercase tracking-widest text-[#a87b28]">
                Required documents
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 mb-2.5">
                This employer requires each of these. Upload the PDF or a clear photo — only they
                can open your files.
              </p>
              <div className="space-y-2">
                {requiredSlots.map((label) => {
                  const attached = slotFiles[label];
                  const busy = uploadingSlot === label;
                  return (
                    <div
                      key={label}
                      className={`rounded-lg border px-2.5 py-2 ${
                        attached ? 'border-[#6ee7b7] bg-white' : 'border-[#e7d7b8] bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {attached ? (
                          <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className="min-w-0 flex-1 text-[12px] font-bold text-slate-700 truncate">
                          {label}
                          {!attached && <span className="text-rose-500"> *</span>}
                        </span>
                        <input
                          ref={(el) => {
                            slotInputs.current[label] = el;
                          }}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            void uploadToSlot(label, e.target.files?.[0]);
                            e.target.value = '';
                          }}
                        />
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => slotInputs.current[label]?.click()}
                          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#e2e8f0] bg-white text-[11px] font-bold text-slate-600 hover:border-[#C9973A] hover:text-[#8a6420] transition-colors disabled:opacity-60"
                        >
                          {busy && <Loader2 className="w-3 h-3 animate-spin" />}
                          {busy ? 'Uploading…' : attached ? 'Replace' : 'Upload'}
                        </button>
                        {attached && (
                          <button
                            type="button"
                            onClick={() =>
                              setSlotFiles((prev) => ({ ...prev, [label]: undefined }))
                            }
                            className="shrink-0 text-slate-400 hover:text-rose-500"
                            aria-label={`Remove ${label}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {attached && (
                        <div className="flex items-center gap-2 mt-1.5 pl-5.5 text-[11px] text-slate-500">
                          <span className="truncate max-w-[55%]">{attached.fileName}</span>
                          {/* Auth-gated /files/secure/ URL — SecureFile fetches
                              it with the bearer token; a bare <a> 401s. */}
                          <SecureFile url={attached.url} asLink alt={label} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 mt-2">PDF, JPG or PNG · up to 10MB each</p>
            </div>
          )}

          <div className="rounded-xl border border-[#eef2f6] bg-[#fbfaf7] px-3.5 py-3">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              Other documents
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Optional — anything else that helps your case (portfolio photos, extra references).
            </p>
            {extras.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {extras.map((att) => (
                  <div
                    key={att.url}
                    className="flex items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-2.5 py-2"
                  >
                    <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="min-w-0 flex-1 text-[11px] text-slate-600 truncate">
                      {att.fileName}
                    </span>
                    <SecureFile url={att.url} asLink alt={att.fileName ?? 'Document'} />
                    <button
                      type="button"
                      onClick={() => setExtras((prev) => prev.filter((a) => a.url !== att.url))}
                      className="shrink-0 text-slate-400 hover:text-rose-500"
                      aria-label="Remove document"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={(el) => {
                slotInputs.current.__extra = el;
              }}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => {
                void uploadExtra(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={uploadingSlot === 'Supporting document' || extras.length >= 5}
              onClick={() => slotInputs.current.__extra?.click()}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white text-[12px] font-bold text-slate-600 hover:border-[#C9973A] hover:text-[#8a6420] transition-colors disabled:opacity-60"
            >
              {uploadingSlot === 'Supporting document' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Paperclip className="w-3.5 h-3.5" />
              )}
              Add document
            </button>
          </div>

          {error && <p className="text-[13px] text-rose-600 font-bold">{error}</p>}
          {missingSlots.length > 0 && !error && (
            <p className="text-[12px] text-slate-500">
              Still to attach:{' '}
              <span className="font-bold text-[#a87b28]">{missingSlots.join(', ')}</span>
            </p>
          )}

          <button
            disabled={submitting || missingSlots.length > 0 || uploadingSlot !== null}
            onClick={() => void submit()}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#C9973A] hover:bg-[#b8852f] text-white text-sm font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Briefcase className="w-4 h-4" />}
            Send application
          </button>
        </div>
      </div>
    </div>
  );
}
