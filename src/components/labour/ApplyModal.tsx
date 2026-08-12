import { useRef, useState } from 'react';
import { Briefcase, FileCheck, Loader2, Paperclip, X } from 'lucide-react';
import {
  JOB_RATE_UNITS,
  jobBoardService,
  type JobApplicationAttachment,
  type JobRateUnit,
  type PublicJobFeedItem,
} from '../../services/api/jobBoardService';
import { apiClient } from '../../services/api/client';
import { APPLICATION_LETTER_SLOT, getRequiredAttachmentSlots } from '../../services/labourFormSchema';
import SecureFile from '../SecureFile';
import DateTimePicker from '../DateTimePicker';

/** An attachment being composed in the modal: the API shape plus the local
 *  file name, shown so the applicant can tell two uploads apart. */
type DraftAttachment = JobApplicationAttachment & { fileName?: string };

/** One mandatory upload slot — shared by the application letter and the
 *  employer-demanded documents so the two can never drift apart visually. */
function AttachmentSlot({
  label,
  attached,
  busy,
  inputRef,
  onFile,
  onPick,
  onRemove,
}: {
  label: string;
  attached: DraftAttachment | undefined;
  busy: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
  onFile: (file: File | undefined) => void;
  onPick: () => void;
  onRemove: () => void;
}) {
  return (
    <div
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
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={onPick}
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#e2e8f0] bg-white text-[11px] font-bold text-slate-600 hover:border-[#C9973A] hover:text-[#8a6420] transition-colors disabled:opacity-60"
        >
          {busy && <Loader2 className="w-3 h-3 animate-spin" />}
          {busy ? 'Uploading…' : attached ? 'Replace' : 'Upload'}
        </button>
        {attached && (
          <button
            type="button"
            onClick={onRemove}
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
          {/* Auth-gated /files/secure/ URL — SecureFile fetches it with the
              bearer token; a bare <a> 401s. */}
          <SecureFile url={attached.url} asLink alt={label} />
        </div>
      )}
    </div>
  );
}

/**
 * The apply form — cover letter, expected rate, availability date, required
 * document uploads. Only ever mounts once the caller is authenticated (a
 * guest is redirected to /login before this component exists), so
 * `apiClient`'s bearer token already covers every request it makes.
 */
export default function ApplyModal({
  job,
  onClose,
  onApplied,
  onError,
}: {
  job: PublicJobFeedItem;
  onClose: () => void;
  onApplied: (jobId: string) => void;
  /** Fired alongside the modal's own inline error display (below) — lets a
   *  caller react to a SPECIFIC failure (the public job page uses this to
   *  swap in a richer "set up a worker profile" banner with a link when the
   *  backend's eligibility check is what failed). The modal keeps working
   *  standalone if this is omitted. */
  onError?: (message: string) => void;
}) {
  const [coverMessage, setCoverMessage] = useState('');
  const [expectedRate, setExpectedRate] = useState('');
  const [rateUnit, setRateUnit] = useState<JobRateUnit>(
    (job.payRateUnit as JobRateUnit) || 'Per Day',
  );
  const [availabilityDate, setAvailabilityDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Every mandatory upload slot: the application letter first (universal),
  // then the documents the POSTER demanded. The letter gets its own section
  // at the top of the builder, so it is split out of the doc list here.
  // `fileName` is a local display nicety only — it is NOT part of the API
  // contract, and the backend's ValidationPipe runs forbidNonWhitelisted, so
  // it must be stripped before submit or the whole request 400s.
  const requiredSlots = getRequiredAttachmentSlots(job.attributes);
  const docSlots = requiredSlots.filter((label) => label !== APPLICATION_LETTER_SLOT);
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
      const message = (e as Error)?.message || 'Could not send your application.';
      setError(message);
      onError?.(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    /* Responsive shell. Phone: a bottom sheet, one column, as before.
       Desktop: a wide panel that USES the screen — the builder was a 512px
       strip down the middle of a 1900px monitor, so a six-section form
       scrolled in a letterbox while two thirds of the viewport sat empty.
       The panel is a flex column (header / scrolling body / footer) rather
       than one long scroll, which is what lets the submit button stay
       pinned in view instead of living below six sections of form. */
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 lg:p-6">
      <div className="bg-white w-full sm:max-w-lg lg:max-w-4xl rounded-t-3xl sm:rounded-2xl max-h-[92vh] lg:max-h-[86vh] flex flex-col overflow-hidden">
        <div className="shrink-0 bg-white border-b border-[#eef2f6] px-5 lg:px-6 py-4 flex items-start justify-between gap-3">
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

        {/* Two columns from lg up: what you SAY on the left (letter, pitch,
            rate, start date), what you ATTACH on the right. Splitting here
            keeps the single-column mobile order identical — the columns are
            explicit stacks, not grid auto-flow, which would interleave the
            sections down the wrong cells. */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 lg:px-6 py-5 grid gap-4 lg:grid-cols-2 lg:gap-6 lg:items-start">
          <div className="space-y-4 min-w-0">
            {/* The letter opens the application — it's the first thing the
                poster reads, so it's the first thing the applicant attaches. */}
            <div className="rounded-xl border border-[#f0dfc0] bg-[#fdf9f0] px-3.5 py-3">
              <p className="text-[11px] font-black uppercase tracking-widest text-[#a87b28]">
                1 · Application letter
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 mb-2.5">
                Start here — a letter introducing yourself and why you want this job. Upload it as
                a PDF or a clear photo.
              </p>
              <AttachmentSlot
                label={APPLICATION_LETTER_SLOT}
                attached={slotFiles[APPLICATION_LETTER_SLOT]}
                busy={uploadingSlot === APPLICATION_LETTER_SLOT}
                inputRef={(el) => {
                  slotInputs.current[APPLICATION_LETTER_SLOT] = el;
                }}
                onFile={(file) => void uploadToSlot(APPLICATION_LETTER_SLOT, file)}
                onPick={() => slotInputs.current[APPLICATION_LETTER_SLOT]?.click()}
                onRemove={() =>
                  setSlotFiles((prev) => ({ ...prev, [APPLICATION_LETTER_SLOT]: undefined }))
                }
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                2 · Why are you right for this job? *
              </label>
              <textarea
                value={coverMessage}
                onChange={(e) => setCoverMessage(e.target.value)}
                rows={4}
                // Taller on desktop: `rows` is the mobile floor, and the pitch
                // is the one field worth the extra room the wide layout frees.
                className="w-full lg:min-h-40 px-4 py-3 rounded-xl border border-[#e2e8f0] bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C9973A]/40"
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
          </div>

          <div className="space-y-4 min-w-0">
            {docSlots.length > 0 && (
              <div className="rounded-xl border border-[#f0dfc0] bg-[#fdf9f0] px-3.5 py-3">
                <p className="text-[11px] font-black uppercase tracking-widest text-[#a87b28]">
                  3 · Required documents
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 mb-2.5">
                  This employer requires each of these. Upload the PDF or a clear photo — only they
                  can open your files.
                </p>
                <div className="space-y-2">
                  {docSlots.map((label) => (
                    <AttachmentSlot
                      key={label}
                      label={label}
                      attached={slotFiles[label]}
                      busy={uploadingSlot === label}
                      inputRef={(el) => {
                        slotInputs.current[label] = el;
                      }}
                      onFile={(file) => void uploadToSlot(label, file)}
                      onPick={() => slotInputs.current[label]?.click()}
                      onRemove={() => setSlotFiles((prev) => ({ ...prev, [label]: undefined }))}
                    />
                  ))}
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
          </div>
        </div>

        {/* Pinned action bar: the outstanding-documents nudge and the submit
            button stay visible while the body scrolls, so a long required-docs
            list can't hide the only way to finish. */}
        <div className="shrink-0 border-t border-[#eef2f6] bg-white px-5 lg:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="min-w-0 flex-1">
            {error && <p className="text-[13px] text-rose-600 font-bold">{error}</p>}
            {missingSlots.length > 0 && !error && (
              <p className="text-[12px] text-slate-500">
                Still to attach:{' '}
                <span className="font-bold text-[#a87b28]">{missingSlots.join(', ')}</span>
              </p>
            )}
          </div>

          <button
            disabled={submitting || missingSlots.length > 0 || uploadingSlot !== null}
            onClick={() => void submit()}
            className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#C9973A] hover:bg-[#b8852f] text-white text-sm font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Briefcase className="w-4 h-4" />}
            Send application
          </button>
        </div>
      </div>
    </div>
  );
}
