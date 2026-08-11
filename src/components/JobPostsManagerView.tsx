import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FlaskConical,
  Loader2,
  Mail,
  MapPin,
  Paperclip,
  Phone,
  Plus,
  Users,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import {
  jobBoardService,
  type JobApplicationRow,
  type JobPosting,
  type JobPostingWithApplicants,
  type MyJobPosting,
} from '../services/api/jobBoardService';
import { ventureService } from '../services/api/ventureService';
import { getBillingSettings } from '../services/api/billingService';
import { beginHostedPayment } from '../services/api/paymentsService';
import PaymentSheet, { type PaymentSheetSubmitPayload } from './PaymentSheet';
import { LABOUR_CATEGORIES } from '../services/labourCategories';
import { isPosterRebuiltAttributeKey } from '../services/labourFormSchema';
import VacancyComposerForm, { type JobPostingDetails } from './buyer/VacancyComposerForm';
import JobAttributesDisplay from './labour/JobAttributesDisplay';
import SecureFile from './SecureFile';
import BuyerCategoryPicker, { type LabourSelection } from './buyer/BuyerCategoryPicker';
import LocationDetails from './LocationDetails';

const tradeLabelOf = (id: string) =>
  LABOUR_CATEGORIES.find((c) => c.id === id)?.label ?? id.replace(/_/g, ' ');

const STATUS_CHIP: Record<string, { label: string; className: string }> = {
  // Deliberately NOT "awaiting payment"-as-if-submitted: an unpaid post has
  // not been sent for review and the admin cannot see it at all (ads stance).
  PENDING_PAYMENT: { label: 'Payment required', className: 'bg-rose-50 text-rose-700 border-[#fda4af]' },
  PENDING_APPROVAL: { label: 'Pending review', className: 'bg-amber-50 text-amber-700 border-[#fcd34d]' },
  APPROVED: { label: 'Live', className: 'bg-emerald-50 text-emerald-700 border-[#6ee7b7]' },
  REJECTED: { label: 'Needs changes', className: 'bg-rose-50 text-rose-700 border-[#fda4af]' },
  FILLED: { label: 'Filled', className: 'bg-sky-50 text-sky-700 border-[#7dd3fc]' },
  CLOSED: { label: 'Closed', className: 'bg-slate-100 text-slate-600 border-[#cbd5e1]' },
};

const formatPay = (payOffer: number | string | null, unit: string | null) => {
  const n = Number(payOffer);
  if (!payOffer || Number.isNaN(n) || n <= 0) return null;
  return `K${n.toLocaleString()} ${unit ?? ''}`.trim();
};

type CreateFlowState = {
  mode: 'create' | 'resubmit';
  /** trade → details → location. Same steps as the buyer funnel, using the
   *  same picker and the same vacancy composer. */
  step: 'trade' | 'details' | 'location';
  tradeId?: string;
  tradeLabel?: string;
  /** The posting's stored attributes on resubmit (poster-rebuilt keys are
   *  stripped before the composer's fresh values are merged in). */
  attributes?: Record<string, any>;
  details?: JobPostingDetails;
  /** resubmit only: the posting being edited. */
  postingId?: string;
  initialLocation?: { province?: string; city?: string };
  initialDetails?: Partial<JobPostingDetails>;
};

/**
 * "My Job Posts" — the poster side of the labour job board, shared by every
 * primary account type (buyer, seller, provider, personal). Self-fetching:
 * schemas mount it with no props. Lists the user's postings with their
 * moderation status, the applicant queue per posting (accept/reject with
 * contact reveal on accept), close/fill controls, and a full "Post a Job"
 * flow (trade → details → location) that submits straight to admin review.
 */
export default function JobPostsManagerView() {
  const [postings, setPostings] = useState<MyJobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, JobPostingWithApplicants>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flow, setFlow] = useState<CreateFlowState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  // ── Posting-fee payment step (ads pattern) ────────────────────────────
  const [payingPosting, setPayingPosting] = useState<JobPosting | MyJobPosting | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<{ reference: string } | null>(null);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [payingFromBalance, setPayingFromBalance] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [balance, setBalance] = useState('0.00');

  useEffect(() => {
    // Balance is only needed while the payment step is open; a fetch failure
    // just leaves the balance button disabled, never blocks the PSP path.
    if (!payingPosting) return;
    void ventureService.getBalance().then(setBalance).catch(() => setBalance('0.00'));
  }, [payingPosting]);

  // Display-only fee notice so the fee is never a surprise at the end of the
  // flow — the server alone decides whether a new post actually owes it.
  const [postingFeeNotice, setPostingFeeNotice] = useState<number | null>(null);
  useEffect(() => {
    void getBillingSettings().then((s) =>
      setPostingFeeNotice(s.jobPostingFeeEnabled && s.jobPostingFee > 0 ? s.jobPostingFee : null),
    );
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      const rows = await jobBoardService.listMyPostings();
      setPostings(rows);
    } catch (e) {
      setError((e as Error)?.message || 'Could not load your job posts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(id);
    try {
      const detail = await jobBoardService.getPosting(id);
      if (detail) setDetails((prev) => ({ ...prev, [id]: detail }));
    } finally {
      setDetailLoading(null);
    }
  }, []);

  const toggleExpand = (id: string) => {
    const next = expandedId === id ? null : id;
    setExpandedId(next);
    if (next && !details[next]) void loadDetail(next);
  };

  const respond = async (posting: MyJobPosting, app: JobApplicationRow, action: 'accept' | 'reject') => {
    setBusyId(app.id);
    try {
      if (action === 'accept') await jobBoardService.acceptApplication(app.id);
      else await jobBoardService.rejectApplication(app.id);
      // Refetch the detail — accept changes what the server reveals
      // (contact fields), so a local status flip would under-render.
      await loadDetail(posting.id);
      await load();
    } catch (e) {
      alert((e as Error)?.message || 'Could not update the application.');
    } finally {
      setBusyId(null);
    }
  };

  const transition = async (posting: MyJobPosting, action: 'close' | 'fill') => {
    const verb = action === 'close' ? 'close' : 'mark as filled';
    if (!window.confirm(`Are you sure you want to ${verb} "${posting.title}"?`)) return;
    setBusyId(posting.id);
    try {
      if (action === 'close') await jobBoardService.closePosting(posting.id);
      else await jobBoardService.markFilled(posting.id);
      await load();
      if (details[posting.id]) await loadDetail(posting.id);
    } catch (e) {
      alert((e as Error)?.message || 'Could not update the posting.');
    } finally {
      setBusyId(null);
    }
  };

  const startCreate = () => setFlow({ mode: 'create', step: 'trade' });

  const startResubmit = (posting: MyJobPosting) => {
    const attrs = posting.attributes ?? {};
    setFlow({
      mode: 'resubmit',
      step: 'details',
      postingId: posting.id,
      tradeId: posting.tradeCategoryIds[0],
      tradeLabel: tradeLabelOf(posting.tradeCategoryIds[0] ?? ''),
      // Carry the original trade answers through so a resubmit never drops
      // the requirements the seeker-facing card renders.
      attributes: attrs,
      initialLocation: { province: posting.province ?? undefined, city: posting.city ?? undefined },
      initialDetails: {
        title: posting.title,
        description: posting.description,
        workersNeeded: posting.workersNeeded ?? undefined,
        payOffer: posting.payOffer != null ? Number(posting.payOffer) : undefined,
        payRateUnit: (posting.payRateUnit as JobPostingDetails['payRateUnit']) ?? undefined,
        urgency: (attrs.urgency as string) ?? '',
        preferredDateTime: (attrs.preferredDateTime as string) ?? undefined,
        requirementsAttributes: attrs,
      },
    });
  };

  const submitFlow = async (locationData: {
    province: string;
    city: string;
    address?: string;
  }) => {
    if (!flow?.tradeId || !flow.details) return;
    setSubmitting(true);
    try {
      const d = flow.details;
      const base = {
        title: d.title,
        description: d.description,
        tradeCategoryIds: [flow.tradeId],
        ...(d.workersNeeded ? { workersNeeded: d.workersNeeded } : {}),
        ...(d.payOffer != null ? { payOffer: d.payOffer, payRateUnit: d.payRateUnit } : {}),
        ...(d.applicationDeadline
          ? { applicationDeadline: new Date(`${d.applicationDeadline}T23:59:59`).toISOString() }
          : {}),
        location: [locationData.address, locationData.city, locationData.province]
          .filter(Boolean)
          .join(', ')
          .slice(0, 255),
        province: locationData.province,
        city: locationData.city,
        // Vacancy content + urgency pair + applicant requirements, same
        // shape the buyer funnel sends. Every key the composer rebuilds is
        // stripped first, so a bullet or document REMOVED during an edit
        // doesn't survive the merge from the original posting.
        attributes: {
          ...Object.fromEntries(
            Object.entries(flow.attributes ?? {}).filter(([k]) => !isPosterRebuiltAttributeKey(k)),
          ),
          urgency: d.urgency,
          ...(d.preferredDateTime ? { preferredDateTime: d.preferredDateTime } : {}),
          ...(d.requirementsAttributes ?? {}),
        },
      };
      const saved =
        flow.mode === 'resubmit' && flow.postingId
          ? await jobBoardService.resubmitPosting(flow.postingId, base)
          : await jobBoardService.createPosting(base);
      if (!saved) throw new Error('The job post could not be submitted.');
      setFlow(null);
      if (saved.status === 'PENDING_PAYMENT') {
        // The admin's posting fee is on — the post is parked until paid, so
        // open the payment step instead of claiming it was submitted.
        setBanner(null);
        setPayingPosting(saved);
      } else {
        setBanner(
          flow.mode === 'resubmit'
            ? 'Your job post was resubmitted for review.'
            : 'Your job post was submitted — our team will review it shortly.',
        );
      }
      setLoading(true);
      await load();
    } catch (e) {
      alert((e as Error)?.message || 'Could not submit the job post.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Posting-fee payment handlers ──────────────────────────────────────

  const closePaymentStep = () => {
    setPayingPosting(null);
    setPendingCheckout(null);
    setPayError(null);
  };

  const handlePayFromBalance = async () => {
    if (!payingPosting) return;
    setPayingFromBalance(true);
    setPayError(null);
    try {
      await jobBoardService.payPostingFromBalance(payingPosting.id);
      closePaymentStep();
      setBanner('Payment received — your job post is now with our review team.');
      await load();
    } catch (e) {
      setPayError((e as Error)?.message || 'Payment failed. Please try again.');
    } finally {
      setPayingFromBalance(false);
    }
  };

  const handleCheckoutSubmit = async (payload: PaymentSheetSubmitPayload) => {
    if (!payingPosting) return;
    const result = await jobBoardService.checkoutPosting(payingPosting.id, {
      channel: payload.method === 'card' ? 'card' : 'mobile-money',
      phone: payload.phone,
      operator: payload.provider,
    });
    setShowPaymentSheet(false);
    if (result.status === 'failed') {
      setPayError('Payment could not be started. Please try again.');
      return;
    }
    // Live (DPO): the money is taken on the provider's own page, so leave the
    // app. Sandbox returns no redirect and falls through to the pending card.
    if (beginHostedPayment(result, { label: `Job post "${payingPosting.title}"` })) return;
    setPendingCheckout({ reference: result.reference });
  };

  const handleSimulateApproval = async () => {
    if (!pendingCheckout) return;
    setSimulating(true);
    try {
      await jobBoardService.simulatePayment(pendingCheckout.reference, 'successful');
      closePaymentStep();
      setBanner('Payment received — your job post is now with our review team.');
      await load();
    } catch (e) {
      setPayError((e as Error)?.message || 'Could not confirm the payment. Please try again.');
    } finally {
      setSimulating(false);
    }
  };

  const feeOf = (posting: JobPosting | MyJobPosting) => Number(posting.feeAmount ?? 0);
  const balanceCoversFee = payingPosting ? Number(balance) >= feeOf(payingPosting) : false;

  /** The payment step for a just-created (or resumed) PENDING_PAYMENT post. */
  const renderPaymentStep = () => {
    if (!payingPosting) return null;
    return (
      <div className="bg-[#0A1931] rounded-2xl p-5 sm:p-7 text-white space-y-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={closePaymentStep}
            className="text-white/50 hover:text-white"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
              Complete payment
            </p>
            <p className="font-bold truncate">{payingPosting.title}</p>
          </div>
        </div>
        <p className="text-3xl sm:text-4xl font-black">
          K{feeOf(payingPosting).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
        <p className="text-[11px] text-white/60">Job posting fee — one-time, per post.</p>
        <p className="text-[11px] text-amber-300/90 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          Your post goes to our review team once this is paid — until then it isn't submitted, and
          workers can't see it.
        </p>

        {payError && <p className="text-[12px] font-bold text-rose-300">{payError}</p>}

        {pendingCheckout ? (
          <div className="bg-white/10 rounded-2xl p-5 border border-white/10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-300 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-sm">Awaiting approval</h4>
                <p className="text-[11px] text-white/50">{pendingCheckout.reference}</p>
              </div>
            </div>
            <p className="text-[12px] text-white/60 leading-relaxed">
              In production you'd approve this on your phone. This environment runs on the sandbox
              payment provider, so use the button below to simulate that approval.
            </p>
            <button
              type="button"
              onClick={() => void handleSimulateApproval()}
              disabled={simulating}
              className="w-full py-3 rounded-2xl bg-[#C9973A] hover:bg-[#b8852f] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
            >
              {simulating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FlaskConical className="w-3.5 h-3.5" />
              )}
              Simulate approval (sandbox)
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => void handlePayFromBalance()}
              disabled={!balanceCoversFee || payingFromBalance}
              title={
                !balanceCoversFee
                  ? `Your balance (K${Number(balance).toLocaleString()}) doesn't cover this`
                  : undefined
              }
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 font-black uppercase tracking-widest text-[10px] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {payingFromBalance ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wallet className="w-3.5 h-3.5" />
              )}
              Pay from balance
            </button>
            <button
              type="button"
              onClick={() => setShowPaymentSheet(true)}
              className="py-3.5 rounded-2xl bg-[#C9973A] hover:bg-[#b8852f] font-black uppercase tracking-widest text-[10px] transition-colors"
            >
              Mobile Money / Card
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── Create / resubmit overlay ─────────────────────────────────────────
  const renderFlow = () => {
    if (!flow) return null;
    return (
      <div className="fixed inset-0 z-50 bg-[#f8f7f3] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-[#e2e8f0] px-4 py-3 flex items-center justify-between">
          <p className="text-sm font-black text-[#1a1a2e]">
            {flow.mode === 'resubmit' ? 'Edit & resubmit job post' : 'Post a Job'}
          </p>
          <button
            onClick={() => setFlow(null)}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitting ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#C9973A]" />
            <p className="text-[11px] font-bold uppercase tracking-widest">
              Submitting your job post…
            </p>
          </div>
        ) : flow.step === 'trade' ? (
          // Same trade picker the buyer funnel uses (image grid, search,
          // layout toggle), mounted straight on the labour master so a job
          // post can never target machinery-hire. No width wrapper — the
          // picker centers itself (max-w-7xl), same as in the buyer funnel.
          <div className="w-full px-4 py-6">
            <BuyerCategoryPicker
              preselectedParentId="labour"
              onBack={() => setFlow(null)}
              onComplete={(selection) => {
                const picked = selection as LabourSelection;
                if (Array.isArray(selection) || !picked?.categoryId) return;
                setFlow({
                  ...flow,
                  tradeId: picked.categoryId,
                  tradeLabel: picked.category,
                  step: 'details',
                });
              }}
            />
          </div>
        ) : flow.step === 'details' ? (
          <VacancyComposerForm
            key={`${flow.mode}-${flow.postingId ?? flow.tradeId}`}
            tradeLabel={flow.tradeLabel || tradeLabelOf(flow.tradeId!)}
            initial={flow.initialDetails}
            onBack={() =>
              flow.mode === 'create' ? setFlow({ ...flow, step: 'trade' }) : setFlow(null)
            }
            onSubmit={(d) => setFlow({ ...flow, details: d, step: 'location' })}
          />
        ) : (
          <LocationDetails
            onBack={() => setFlow({ ...flow, step: 'details' })}
            onComplete={(loc) => void submitFlow(loc)}
            submitLabel={flow.mode === 'resubmit' ? 'Resubmit for review' : 'Submit for review'}
            showGps={false}
            initialValue={flow.initialLocation}
          />
        )}
      </div>
    );
  };

  // ── Applicant card ───────────────────────────────────────────────────
  const renderApplication = (posting: MyJobPosting, app: JobApplicationRow) => {
    const accepted = app.status === 'ACCEPTED';
    const rejected = app.status === 'REJECTED';
    return (
      <div
        key={app.id}
        className={`rounded-xl border p-3.5 ${
          accepted ? 'border-[#6ee7b7] bg-emerald-50/50' : rejected ? 'border-[#e2e8f0] bg-slate-50 opacity-70' : 'border-[#e2e8f0] bg-white'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {app.applicant.profilePicture ? (
              <img
                src={app.applicant.profilePicture}
                alt=""
                className="w-9 h-9 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#fdf6e9] border border-[#f0dfc0] flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-[#C9973A]" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-black text-[#1a1a2e] truncate">{app.applicant.name}</p>
              <p className="text-[11px] text-slate-500 truncate">
                {[app.applicant.city, app.applicant.trades.map(tradeLabelOf).join(', ')]
                  .filter(Boolean)
                  .join(' · ') || 'Registered worker'}
              </p>
            </div>
          </div>
          <span
            className={`shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full border ${
              accepted
                ? 'bg-emerald-50 text-emerald-700 border-[#6ee7b7]'
                : rejected
                  ? 'bg-slate-100 text-slate-500 border-[#cbd5e1]'
                  : 'bg-amber-50 text-amber-700 border-[#fcd34d]'
            }`}
          >
            {accepted ? 'Accepted' : rejected ? 'Rejected' : 'New'}
          </span>
        </div>

        <p className="text-[13px] text-slate-600 mt-2.5 whitespace-pre-wrap">{app.coverMessage}</p>
        <p className="text-[12px] text-slate-500 mt-1.5 font-medium">
          Asks <span className="font-bold text-slate-700">K{Number(app.expectedRate).toLocaleString()} {app.rateUnit}</span>
          {' · '}available from{' '}
          <span className="font-bold text-slate-700">
            {new Date(app.availabilityDate).toLocaleDateString()}
          </span>
        </p>

        {(app.attachments ?? []).length > 0 && (
          <div className="mt-2.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
              Attached evidence
            </p>
            <div className="space-y-1">
              {(app.attachments ?? []).map((att) => (
                <div key={att.url} className="flex items-center gap-2 text-[12px]">
                  <Paperclip className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="text-slate-500 shrink-0">{att.label}:</span>
                  {/* Auth-gated /files/secure/ URL — a bare <img>/<a> 401s. */}
                  <SecureFile url={att.url} asLink alt={att.label} />
                </div>
              ))}
            </div>
          </div>
        )}

        {accepted && (app.applicant.phone || app.applicant.email) && (
          <div className="mt-2.5 flex flex-wrap gap-3 text-[12px] font-bold text-emerald-800">
            {app.applicant.phone && (
              <a href={`tel:${app.applicant.phone}`} className="inline-flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> {app.applicant.phone}
              </a>
            )}
            {app.applicant.email && (
              <a href={`mailto:${app.applicant.email}`} className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> {app.applicant.email}
              </a>
            )}
          </div>
        )}

        {app.status === 'PENDING' && (
          <div className="flex gap-2 mt-3">
            <button
              disabled={busyId === app.id}
              onClick={() => void respond(posting, app, 'accept')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold transition-colors disabled:opacity-60"
            >
              {busyId === app.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              Accept
            </button>
            <button
              disabled={busyId === app.id}
              onClick={() => void respond(posting, app, 'reject')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white hover:bg-slate-50 text-slate-600 text-[12px] font-bold transition-colors disabled:opacity-60"
            >
              <XCircle className="w-3.5 h-3.5" /> Reject
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── Posting card ─────────────────────────────────────────────────────
  const renderPosting = (posting: MyJobPosting) => {
    const chip = STATUS_CHIP[posting.status] ?? STATUS_CHIP.CLOSED;
    const expanded = expandedId === posting.id;
    const detail = details[posting.id];
    const pay = formatPay(posting.payOffer, posting.payRateUnit);
    return (
      <div key={posting.id} className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
        <button className="w-full text-left p-4" onClick={() => toggleExpand(posting.id)}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-black text-[#1a1a2e] truncate">{posting.title}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {posting.tradeCategoryIds.map(tradeLabelOf).join(', ')}
                {posting.city ? ` · ${posting.city}` : ''}
                {pay ? ` · ${pay}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full border ${chip.className}`}
              >
                {chip.label}
              </span>
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2 text-[11px] font-bold text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {posting.applicationsCount} applicant
              {posting.applicationsCount === 1 ? '' : 's'}
            </span>
            {posting.pendingApplicationsCount > 0 && (
              <span className="text-amber-600">{posting.pendingApplicationsCount} new</span>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {new Date(posting.createdAt).toLocaleDateString()}
            </span>
          </div>
          {posting.status === 'REJECTED' && posting.rejectionReason && (
            <p className="mt-2 text-[12px] text-rose-700 bg-rose-50 border border-[#fda4af] rounded-lg px-3 py-2">
              Admin feedback: {posting.rejectionReason}
            </p>
          )}
        </button>

        {expanded && (
          <div className="border-t border-[#eef2f6] px-4 py-3.5 space-y-3">
            <p className="text-[13px] text-slate-600 whitespace-pre-wrap">{posting.description}</p>
            <JobAttributesDisplay
              tradeId={posting.tradeCategoryIds[0]}
              attributes={posting.attributes}
            />
            {posting.location && (
              <p className="text-[12px] text-slate-500 inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> {posting.location}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {posting.status === 'PENDING_PAYMENT' && (
                <button
                  onClick={() => {
                    setPayError(null);
                    setPendingCheckout(null);
                    setPayingPosting(posting);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-4 py-2 rounded-lg bg-[#C9973A] hover:bg-[#b8852f] text-white text-[12px] font-bold transition-colors"
                >
                  Complete payment — K{Number(posting.feeAmount ?? 0).toLocaleString()}
                </button>
              )}
              {posting.status === 'REJECTED' && (
                <button
                  onClick={() => startResubmit(posting)}
                  className="px-4 py-2 rounded-lg bg-[#C9973A] hover:bg-[#b8852f] text-white text-[12px] font-bold transition-colors"
                >
                  Edit & resubmit
                </button>
              )}
              {posting.status === 'APPROVED' && (
                <>
                  <button
                    disabled={busyId === posting.id}
                    onClick={() => void transition(posting, 'fill')}
                    className="px-4 py-2 rounded-lg border border-[#7dd3fc] bg-sky-50 text-sky-700 text-[12px] font-bold hover:bg-sky-100 transition-colors disabled:opacity-60"
                  >
                    Mark as filled
                  </button>
                  <button
                    disabled={busyId === posting.id}
                    onClick={() => void transition(posting, 'close')}
                    className="px-4 py-2 rounded-lg border border-[#e2e8f0] bg-white text-slate-600 text-[12px] font-bold hover:bg-slate-50 transition-colors disabled:opacity-60"
                  >
                    Close post
                  </button>
                </>
              )}
              {posting.status === 'FILLED' && (
                <button
                  disabled={busyId === posting.id}
                  onClick={() => void transition(posting, 'close')}
                  className="px-4 py-2 rounded-lg border border-[#e2e8f0] bg-white text-slate-600 text-[12px] font-bold hover:bg-slate-50 transition-colors disabled:opacity-60"
                >
                  Close post
                </button>
              )}
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                Applicants
              </p>
              {detailLoading === posting.id && !detail ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading applicants…
                </div>
              ) : detail && detail.applications.length > 0 ? (
                <div className="space-y-2.5">
                  {detail.applications.map((app) => renderApplication(posting, app))}
                </div>
              ) : (
                <p className="text-[13px] text-slate-400 py-2">
                  {posting.status === 'PENDING_PAYMENT'
                    ? "This post hasn't been submitted yet — complete the payment above to send it for review."
                    : posting.status === 'PENDING_APPROVAL'
                      ? 'Applications open once an admin approves this post.'
                      : 'No applications yet.'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderFlow()}
      {renderPaymentStep()}

      {payingPosting && (
        <PaymentSheet
          open={showPaymentSheet}
          onClose={() => setShowPaymentSheet(false)}
          title="Pay Job Posting Fee"
          subtitle="Secure Transaction"
          amountMode="fixed"
          fixedAmount={feeOf(payingPosting)}
          methods={['mobile_money', 'card']}
          actionLabel={(amount) =>
            `Pay ZMW ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          }
          onSubmit={handleCheckoutSubmit}
          context={[{ label: 'Job post', value: payingPosting.title }]}
        />
      )}

      {banner && (
        <div className="flex items-start justify-between gap-3 bg-emerald-50 border border-[#6ee7b7] rounded-xl px-4 py-3">
          <p className="text-[13px] font-bold text-emerald-800">{banner}</p>
          <button onClick={() => setBanner(null)} className="text-emerald-700" aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] text-slate-500 font-medium">
          Posts are reviewed by our team before going live to registered workers.
          {postingFeeNotice !== null && (
            <span className="block mt-0.5 font-bold text-[#a87b28]">
              Publishing a job costs K{postingFeeNotice.toLocaleString()} per post.
            </span>
          )}
        </p>
        <button
          onClick={startCreate}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C9973A] hover:bg-[#b8852f] text-white text-[13px] font-bold transition-colors"
        >
          <Plus className="w-4 h-4" /> Post a Job
        </button>
      </div>

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
      ) : postings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#e2e8f0]">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#fdf6e9] border border-[#f0dfc0] flex items-center justify-center mb-3">
            <Briefcase className="w-6 h-6 text-[#C9973A]" />
          </div>
          <p className="text-sm font-black text-[#1a1a2e]">No job posts yet</p>
          <p className="text-[13px] text-slate-500 mt-1 max-w-sm mx-auto">
            Need a carpenter, cleaner, driver or any skilled worker? Post a job and registered
            workers in that trade will apply.
          </p>
        </div>
      ) : (
        <div className="space-y-3">{postings.map(renderPosting)}</div>
      )}
    </div>
  );
}
