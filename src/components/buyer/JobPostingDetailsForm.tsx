import { useState } from 'react';
import { ArrowLeft, ArrowRight, Briefcase } from 'lucide-react';
import ConsentModal from '../consent/ConsentModal';
import { useConsentGate } from '../../hooks/useConsentGate';
import DateTimePicker from '../DateTimePicker';
import { JOB_RATE_UNITS, type JobRateUnit } from '../../services/api/jobBoardService';

/** Platform-wide urgency convention — the exact pair every urgency select
 *  uses (see categories/schemas/*): never add a third option here. */
const URGENCY_OPTIONS = ['Immediately', 'On a specific date & time'] as const;

export interface JobPostingDetails {
  title: string;
  description: string;
  workersNeeded?: number;
  payOffer?: number;
  payRateUnit?: JobRateUnit;
  urgency: string;
  preferredDateTime?: string;
  applicationDeadline?: string;
}

interface Props {
  /** Display name of the picked trade (e.g. "Electrician") — seeds the title. */
  tradeLabel: string;
  /** Prefill from the trade form's number_of_workers answer, when numeric. */
  defaultWorkers?: number;
  /** Prefill for edit-and-resubmit (rejected postings). Wins over the
   *  tradeLabel/defaultWorkers seeds. Remount (key) the form per open. */
  initial?: Partial<JobPostingDetails>;
  onBack: () => void;
  onSubmit: (details: JobPostingDetails) => void;
}

/**
 * Step 2 of the post-a-job flow (after the per-trade detail form): the
 * posting-level facts a job card leads with — title, description, pay
 * offer, start urgency, optional application deadline. Submission does
 * NOT publish; the post goes to admin review first.
 */
export default function JobPostingDetailsForm({ tradeLabel, defaultWorkers, initial, onBack, onSubmit }: Props) {
  const consent = useConsentGate('jobPosting');
  const [title, setTitle] = useState(initial?.title ?? `${tradeLabel} needed`);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [workersNeeded, setWorkersNeeded] = useState<string>(
    initial?.workersNeeded
      ? String(initial.workersNeeded)
      : defaultWorkers && defaultWorkers > 0
        ? String(defaultWorkers)
        : '',
  );
  const [payOffer, setPayOffer] = useState<string>(
    initial?.payOffer != null ? String(initial.payOffer) : '',
  );
  const [payRateUnit, setPayRateUnit] = useState<JobRateUnit>(initial?.payRateUnit ?? 'Per Day');
  const [urgency, setUrgency] = useState<string>(initial?.urgency ?? '');
  const [preferredDateTime, setPreferredDateTime] = useState(initial?.preferredDateTime ?? '');
  const [applicationDeadline, setApplicationDeadline] = useState(initial?.applicationDeadline ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const next: Record<string, string> = {};
    if (title.trim().length < 3) next.title = 'Give the job a short, clear title.';
    if (description.trim().length < 10) {
      next.description = 'Describe the job in at least a sentence (10+ characters).';
    }
    if (payOffer && (Number.isNaN(Number(payOffer)) || Number(payOffer) < 0)) {
      next.payOffer = 'Enter the pay as a number, e.g. 350.';
    }
    if (!urgency) next.urgency = 'Choose when the work should start.';
    if (urgency === 'On a specific date & time' && !preferredDateTime) {
      next.preferredDateTime = 'Pick the day (and time) the work should start.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const workers = parseInt(workersNeeded, 10);
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
    });
  };

  const fieldClass = (key: string) =>
    `w-full px-4 py-3 rounded-xl border bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C9973A]/40 ${
      errors[key] ? 'border-[#fda4af]' : 'border-[#e2e8f0]'
    }`;

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

      <div className="max-w-2xl mx-auto w-full px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-[#fdf6e9] border border-[#f0dfc0] flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-[#C9973A]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1a1a2e]">Job post details</h2>
            <p className="text-xs text-slate-500 font-medium">
              This is what {tradeLabel.toLowerCase()} workers will see. Your post goes live once an
              admin approves it.
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
              placeholder={`e.g. ${tradeLabel} needed for 2 weeks`}
            />
            {errors.title && <p className="text-xs text-rose-600 mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Describe the job *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={fieldClass('description')}
              placeholder="What needs to be done, where, and anything a worker should know before applying…"
            />
            {errors.description && (
              <p className="text-xs text-rose-600 mt-1">{errors.description}</p>
            )}
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
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Pay offer (ZMW)
              </label>
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
              {errors.payOffer && <p className="text-xs text-rose-600 mt-1">{errors.payOffer}</p>}
            </div>
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
            {errors.urgency && <p className="text-xs text-rose-600 mt-1">{errors.urgency}</p>}
            {urgency === 'On a specific date & time' && (
              <div className="mt-3">
                <DateTimePicker
                  value={preferredDateTime}
                  onChange={setPreferredDateTime}
                  mode="datetime"
                  placeholder="Pick the start day & time"
                  error={!!errors.preferredDateTime}
                />
                {errors.preferredDateTime && (
                  <p className="text-xs text-rose-600 mt-1">{errors.preferredDateTime}</p>
                )}
              </div>
            )}
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
