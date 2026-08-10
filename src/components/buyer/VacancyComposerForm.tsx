import { useState } from 'react';
import { ArrowLeft, ArrowRight, Briefcase, ClipboardCheck, Plus, X } from 'lucide-react';
import ConsentModal from '../consent/ConsentModal';
import { useConsentGate } from '../../hooks/useConsentGate';
import DateTimePicker from '../DateTimePicker';
import BulletListEditor, { cleanBulletList } from './BulletListEditor';
import { JOB_RATE_UNITS, type JobRateUnit } from '../../services/api/jobBoardService';
import {
  EMPLOYMENT_TYPE_OPTIONS,
  EXPERIENCE_OPTIONS,
  REQUIRED_DOCUMENT_PRESETS,
} from '../../services/labourFormSchema';

/** Platform-wide urgency convention — the exact pair every urgency select
 *  uses (see categories/schemas/*): never add a third option here. */
const URGENCY_OPTIONS = ['Immediately', 'On a specific date & time'] as const;

const MAX_DOCUMENTS = 15;

export interface JobPostingDetails {
  title: string;
  /** "About the role" — the ad's opening prose. Same DB column as before. */
  description: string;
  workersNeeded?: number;
  payOffer?: number;
  payRateUnit?: JobRateUnit;
  urgency: string;
  preferredDateTime?: string;
  applicationDeadline?: string;
  /** Merged verbatim into the posting's `attributes`: the vacancy keys this
   *  form owns (postShape, resp_list, min_requirements, employment_type,
   *  pay_note) plus the applicant-requirement req_* keys. */
  requirementsAttributes?: Record<string, any>;
}

interface Props {
  /** Display name of the picked trade (e.g. "Carpenter") — seeds the title. */
  tradeLabel: string;
  /** Prefill for edit-and-resubmit. Remount (key) the form per open. */
  initial?: Partial<JobPostingDetails>;
  onBack: () => void;
  onSubmit: (details: JobPostingDetails) => void;
}

/**
 * The job-post composer: writes a real vacancy ad (About the role, Key
 * Responsibilities, Minimum Requirements, employment type, pay) and states
 * what an applicant must have — including the documents they must upload,
 * each of which becomes a mandatory slot in the application form.
 *
 * Replaces the per-trade INQUIRY form for job posts. That form still runs
 * for machinery-hire and every non-labour inquiry; it asks "how many workers
 * / what rate / how long", which cannot express "Grade 12 Certificate".
 *
 * Submitting does NOT publish — the post goes to admin review first.
 */
export default function VacancyComposerForm({ tradeLabel, initial, onBack, onSubmit }: Props) {
  const consent = useConsentGate('jobPosting');
  const initReq = initial?.requirementsAttributes ?? {};

  const [title, setTitle] = useState(initial?.title ?? `${tradeLabel} needed`);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [responsibilities, setResponsibilities] = useState<string[]>(
    Array.isArray(initReq.resp_list) && initReq.resp_list.length ? initReq.resp_list : [''],
  );
  const [minimumRequirements, setMinimumRequirements] = useState<string[]>(
    Array.isArray(initReq.min_requirements) && initReq.min_requirements.length
      ? initReq.min_requirements
      : [''],
  );
  const [employmentType, setEmploymentType] = useState<string>(
    (initReq.employment_type as string) ?? '',
  );
  const [workersNeeded, setWorkersNeeded] = useState<string>(
    initial?.workersNeeded ? String(initial.workersNeeded) : '',
  );
  const [payOffer, setPayOffer] = useState<string>(
    initial?.payOffer != null ? String(initial.payOffer) : '',
  );
  const [payRateUnit, setPayRateUnit] = useState<JobRateUnit>(initial?.payRateUnit ?? 'Per Month');
  const [payNote, setPayNote] = useState<string>((initReq.pay_note as string) ?? '');
  const [urgency, setUrgency] = useState<string>(initial?.urgency ?? '');
  const [preferredDateTime, setPreferredDateTime] = useState(initial?.preferredDateTime ?? '');
  const [applicationDeadline, setApplicationDeadline] = useState(initial?.applicationDeadline ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Applicant requirements — prefilled from req_* keys on resubmit.
  const [experience, setExperience] = useState<string>(
    (initReq.req_experience as string) ?? 'Any level',
  );
  const [ownTools, setOwnTools] = useState<boolean>(initReq.req_own_tools === true);
  const [certRequired, setCertRequired] = useState<boolean>(!!initReq.req_certifications);
  const [certDetail, setCertDetail] = useState<string>(
    typeof initReq.req_certifications === 'string' && initReq.req_certifications !== 'Required'
      ? initReq.req_certifications
      : '',
  );
  const [documents, setDocuments] = useState<string[]>(
    Array.isArray(initReq.req_documents) ? initReq.req_documents : [],
  );
  const [customDoc, setCustomDoc] = useState('');
  const [otherRequirements, setOtherRequirements] = useState<string>(
    (initReq.req_other as string) ?? '',
  );

  const toggleDocument = (doc: string) =>
    setDocuments((prev) => (prev.includes(doc) ? prev.filter((d) => d !== doc) : [...prev, doc]));

  const addCustomDoc = () => {
    const name = customDoc.trim().slice(0, 120);
    if (!name) return;
    // Case-insensitive dedupe: "cv" must not create a second slot next to
    // "CV / Résumé"-style entries the poster already ticked.
    const exists = documents.some((d) => d.toLowerCase() === name.toLowerCase());
    if (exists || documents.length >= MAX_DOCUMENTS) {
      setCustomDoc('');
      return;
    }
    setDocuments((prev) => [...prev, name]);
    setCustomDoc('');
  };

  const customDocuments = documents.filter(
    (d) => !(REQUIRED_DOCUMENT_PRESETS as readonly string[]).includes(d),
  );

  const handleSubmit = () => {
    const cleanedResp = cleanBulletList(responsibilities);
    const cleanedMinReq = cleanBulletList(minimumRequirements);

    const next: Record<string, string> = {};
    if (title.trim().length < 3) next.title = 'Give the job a short, clear title.';
    if (description.trim().length < 10) {
      next.description = 'Describe the role in at least a sentence (10+ characters).';
    }
    if (cleanedResp.length === 0) next.responsibilities = 'Add at least one responsibility.';
    if (cleanedMinReq.length === 0) next.minimumRequirements = 'Add at least one requirement.';
    if (!employmentType) next.employmentType = 'Choose the employment type.';
    if (payOffer && (Number.isNaN(Number(payOffer)) || Number(payOffer) < 0)) {
      next.payOffer = 'Enter the pay as a number, e.g. 3500.';
    }
    if (!urgency) next.urgency = 'Choose when the work should start.';
    if (urgency === 'On a specific date & time' && !preferredDateTime) {
      next.preferredDateTime = 'Pick the day (and time) the work should start.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const workers = parseInt(workersNeeded, 10);
    // 'Any level' means "no experience bar" — omit rather than store noise.
    const requirementsAttributes: Record<string, any> = {
      postShape: 'vacancy',
      resp_list: cleanedResp,
      min_requirements: cleanedMinReq,
      employment_type: employmentType,
      ...(payNote.trim() ? { pay_note: payNote.trim() } : {}),
      ...(experience && experience !== 'Any level' ? { req_experience: experience } : {}),
      ...(ownTools ? { req_own_tools: true } : {}),
      ...(certRequired ? { req_certifications: certDetail.trim() || 'Required' } : {}),
      ...(documents.length ? { req_documents: documents } : {}),
      ...(otherRequirements.trim() ? { req_other: otherRequirements.trim() } : {}),
    };

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      ...(Number.isFinite(workers) && workers > 0 ? { workersNeeded: workers } : {}),
      ...(payOffer ? { payOffer: Number(payOffer), payRateUnit } : {}),
      urgency,
      ...(urgency === 'On a specific date & time' && preferredDateTime
        ? { preferredDateTime }
        : {}),
      ...(applicationDeadline ? { applicationDeadline } : {}),
      requirementsAttributes,
    });
  };

  const fieldClass = (key: string) =>
    `w-full px-4 py-3 rounded-xl border bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C9973A]/40 ${
      errors[key] ? 'border-[#fda4af]' : 'border-[#e2e8f0]'
    }`;

  const chipClass = (active: boolean) =>
    `px-3.5 py-2 rounded-lg border text-[12px] font-bold transition-colors ${
      active
        ? 'border-[#C9973A] bg-white text-[#8a6420]'
        : 'border-[#e7d7b8] bg-white/60 text-slate-600 hover:border-[#C9973A]'
    }`;

  const err = (key: string) =>
    errors[key] ? <p className="text-xs text-rose-600 mt-1">{errors[key]}</p> : null;

  return (
    <>
      <ConsentModal
        open={consent.needsConsent}
        configKey="jobPosting"
        scope="screen"
        onConsent={consent.grant}
        onBack={() => {
          consent.dismiss();
          onBack();
        }}
      />

      <div className="max-w-3xl mx-auto w-full px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-[#fdf6e9] border border-[#f0dfc0] flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-[#C9973A]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1a1a2e]">Write the job advert</h2>
            <p className="text-xs text-slate-500 font-medium">
              This is exactly what {tradeLabel.toLowerCase()} job seekers will read. Your post goes
              live once an admin approves it.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5 space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Job title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
              className={fieldClass('title')}
              placeholder={`e.g. ${tradeLabel} — Copperbelt`}
            />
            {err('title')}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              About the role *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={fieldClass('description')}
              placeholder="We are seeking energetic, self-driven individuals to join our team as… Say who you are, what the role is, and where it is based."
            />
            {err('description')}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Key Responsibilities *
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              One task per line — what this person will actually do day to day.
            </p>
            <BulletListEditor
              value={responsibilities}
              onChange={setResponsibilities}
              placeholder="e.g. Drive assigned sales routes and ensure customer coverage"
              addLabel="Add responsibility"
              error={!!errors.responsibilities}
            />
            {err('responsibilities')}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Minimum Requirements *
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              One per line — the bar an applicant must meet to be considered.
            </p>
            <BulletListEditor
              value={minimumRequirements}
              onChange={setMinimumRequirements}
              placeholder="e.g. Grade 12 Certificate · Valid Driver's Licence · 2 years' experience"
              addLabel="Add requirement"
              error={!!errors.minimumRequirements}
            />
            {err('minimumRequirements')}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Employment type *
            </label>
            <div className="flex flex-wrap gap-2">
              {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setEmploymentType(option)}
                  className={chipClass(employmentType === option)}
                >
                  {option}
                </button>
              ))}
            </div>
            {err('employmentType')}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Workers needed
              </label>
              <input
                type="number"
                min={1}
                value={workersNeeded}
                onChange={(e) => setWorkersNeeded(e.target.value)}
                className={fieldClass('workersNeeded')}
                placeholder="e.g. 2"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Pay (ZMW)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  value={payOffer}
                  onChange={(e) => setPayOffer(e.target.value)}
                  className={fieldClass('payOffer')}
                  placeholder="Optional"
                />
                {payOffer && (
                  <select
                    value={payRateUnit}
                    onChange={(e) => setPayRateUnit(e.target.value as JobRateUnit)}
                    className="px-3 py-3 rounded-xl border border-[#e2e8f0] bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#C9973A]/40"
                  >
                    {JOB_RATE_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {err('payOffer')}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Pay structure note
            </label>
            {/* Deliberately not gated on payOffer — a real ad can be
                commission-only with no figure at all. */}
            <input
              type="text"
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              maxLength={160}
              className={fieldClass('payNote')}
              placeholder="e.g. Commission-based with a fixed basic pay component"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              When should the work start? *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {URGENCY_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setUrgency(option)}
                  className={`px-4 py-3 rounded-xl border text-sm font-bold transition-colors ${
                    urgency === option
                      ? 'border-[#C9973A] bg-[#fdf6e9] text-[#8a6420]'
                      : 'border-[#e2e8f0] bg-white text-slate-600 hover:border-[#cbd5e1]'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            {err('urgency')}
            {urgency === 'On a specific date & time' && (
              <div className="mt-3">
                <DateTimePicker
                  value={preferredDateTime}
                  onChange={setPreferredDateTime}
                  mode="datetime"
                  placeholder="Pick the start day & time"
                  error={!!errors.preferredDateTime}
                />
                {err('preferredDateTime')}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#f0dfc0] bg-[#fdf9f0] p-4">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardCheck className="w-4 h-4 text-[#C9973A]" />
              <p className="text-sm font-black text-[#1a1a2e]">Applicant requirements</p>
            </div>
            <p className="text-[11px] text-slate-500 mb-4">
              What must a worker have to apply? Every document you tick becomes a required upload —
              the applicant cannot submit without attaching it.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">
                  Experience required
                </label>
                <div className="flex flex-wrap gap-2">
                  {EXPERIENCE_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setExperience(option)}
                      className={chipClass(experience === option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOwnTools((v) => !v)}
                  className={`${chipClass(ownTools)} text-left`}
                >
                  {ownTools ? '✓ ' : ''}Must bring their own tools
                </button>
                <button
                  type="button"
                  onClick={() => setCertRequired((v) => !v)}
                  className={`${chipClass(certRequired)} text-left`}
                >
                  {certRequired ? '✓ ' : ''}Certification required
                </button>
              </div>
              {certRequired && (
                <input
                  type="text"
                  value={certDetail}
                  onChange={(e) => setCertDetail(e.target.value)}
                  maxLength={120}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#e7d7b8] bg-white text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C9973A]/40"
                  placeholder="Which certification? e.g. TEVETA craft certificate, EIZ registration"
                />
              )}

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">
                  Documents applicants must upload
                </label>
                <div className="flex flex-wrap gap-2">
                  {REQUIRED_DOCUMENT_PRESETS.map((doc) => (
                    <button
                      key={doc}
                      type="button"
                      onClick={() => toggleDocument(doc)}
                      className={chipClass(documents.includes(doc))}
                    >
                      {documents.includes(doc) ? '✓ ' : ''}
                      {doc}
                    </button>
                  ))}
                  {customDocuments.map((doc) => (
                    <span
                      key={doc}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#C9973A] bg-white text-[12px] font-bold text-[#8a6420]"
                    >
                      ✓ {doc}
                      <button
                        type="button"
                        onClick={() => toggleDocument(doc)}
                        className="text-[#a87b28] hover:text-rose-500"
                        aria-label={`Remove ${doc}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 mt-2.5">
                  <input
                    type="text"
                    value={customDoc}
                    onChange={(e) => setCustomDoc(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomDoc();
                      }
                    }}
                    maxLength={120}
                    className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-[#e7d7b8] bg-white text-[12px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C9973A]/40"
                    placeholder="Add another document… e.g. Forklift operator permit"
                  />
                  <button
                    type="button"
                    onClick={addCustomDoc}
                    disabled={!customDoc.trim() || documents.length >= MAX_DOCUMENTS}
                    className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-[#e7d7b8] bg-white text-[12px] font-bold text-slate-600 hover:border-[#C9973A] hover:text-[#8a6420] disabled:opacity-40 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">
                  Other requirements
                </label>
                <textarea
                  value={otherRequirements}
                  onChange={(e) => setOtherRequirements(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#e7d7b8] bg-white text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C9973A]/40"
                  placeholder="Anything else — e.g. must live near Woodlands, able to start at 06:00…"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Application deadline
            </label>
            <DateTimePicker
              value={applicationDeadline}
              onChange={setApplicationDeadline}
              mode="date"
              placeholder="Optional — last day to apply"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              After this day the post stops taking applications automatically.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mt-6">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[#e2e8f0] bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-[#C9973A] hover:bg-[#b8852f] text-sm font-bold text-white transition-colors"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}
