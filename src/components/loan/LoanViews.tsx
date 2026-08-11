import React, { useState, useEffect, useCallback } from 'react';
import {
  Landmark,
  User,
  Loader2,
  Check,
  X,
  FileText,
  Clock,
  Send,
  ArrowLeftRight,
  PhoneCall,
  Mail,
  ShoppingBag,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { loanService } from '../../services/api/loanService';
import { financingService } from '../../services/api/financingService';
import { beginHostedPayment } from '../../services/api/paymentsService';
import { recordInquiryView } from '../../services/api/inquiryService';
import SecureFile, { isSecureFileUrl } from '../SecureFile';
import { recordConsent } from '../../services/api/consentService';
import { generateQuoteSchema, type QuoteField } from '../../services/quoteSchemaGenerator';
import {
  loanTypeKey,
  DEFAULT_INTEREST_TYPE,
  computeMonthlyRepayment,
  roundZmw,
  nextLoanStage,
  LOAN_STAGE_LABEL,
  loanStageIndex,
  type LoanTypeKey,
  type LoanStage,
} from '../../utils/loan';

const zmw = (v: any) => `ZMW ${Number(v || 0).toLocaleString()}`;

// Survives LoanRequestsView remounts within the session, so a lender
// navigating away and back doesn't re-inflate the borrower's "N lenders
// viewed" count. (Server dedup per (viewer,inquiry) is the proper fix; this
// keeps the client from padding it in the meantime.)
const SESSION_VIEWED_REQUESTS = new Set<string>();

// Human-friendly rendering of a borrower's request attributes (the loan
// officer needs the full picture to accept/decline).
const prettifyKey = (k: string) =>
  k
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/_/g, ' ')
    .trim();

// Borrower follow-up contact is PRIVATE until the borrower accepts an offer —
// it's revealed only in the accepted-offer "follow up" panel, never on the open
// request. Keep these keys out of the general attribute dump.
const HIDDEN_ATTR_KEYS = new Set([
  'contactName',
  'contactPhone',
  'contactEmail',
  'preferredContact',
  // Purchase-financing linkage — rendered in the dedicated FinancingContext
  // panel, kept out of the raw attribute dump (productSpec is a nested object).
  'financing',
  'financedQuoteId',
  'financedInquiryId',
  'productTitle',
  'productSpec',
  'sellerId',
  'sellerName',
  'principal',
]);

const RequestDetails: React.FC<{ attributes: Record<string, any> }> = ({ attributes }) => {
  const entries = Object.entries(attributes || {}).filter(
    ([k, v]) =>
      !HIDDEN_ATTR_KEYS.has(k) &&
      v !== undefined &&
      v !== null &&
      v !== '' &&
      !(Array.isArray(v) && v.length === 0),
  );
  if (entries.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
      {entries.map(([k, v]) => (
        <div key={k} className="flex flex-col p-2.5 bg-slate-50 rounded-xl border border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {prettifyKey(k)}
          </span>
          <span className="text-sm font-medium text-slate-800 break-words">
            {isSecureFileUrl(v) ? (
              <SecureFile url={v} asLink />
            ) : typeof v === 'boolean' ? (
              v ? 'Yes' : 'No'
            ) : (
              String(v)
            )}
          </span>
        </div>
      ))}
    </div>
  );
};

// Purchase-financing context — shown when a loan request finances a specific
// product buy. Gives the lender the product, seller and the fixed principal, plus
// the product spec, so they can assess the deal they're actually funding.
const FinancingContext: React.FC<{ a: Record<string, any> }> = ({ a }) => {
  if (!a?.financing) return null;
  const spec = a.productSpec && typeof a.productSpec === 'object' ? a.productSpec : null;
  return (
    <div className="mt-3 p-3.5 rounded-2xl bg-[#1B3068]/5 border border-[#1B3068]/15">
      <div className="flex items-center gap-2">
        <ShoppingBag className="w-4 h-4 text-[#1B3068]" />
        <span className="text-[10px] font-black uppercase tracking-wider text-[#1B3068]">
          Purchase financing
        </span>
      </div>
      <p className="mt-1.5 text-sm text-slate-700">
        Financing <span className="font-bold">{a.productTitle || 'a product purchase'}</span>
        {a.sellerName ? (
          <>
            {' '}from <span className="font-bold">{a.sellerName}</span>
          </>
        ) : null}
        . The principal is fixed to the purchase price (
        <span className="font-bold">{zmw(a.principal ?? a.loanAmount)}</span>).
      </p>
      <p className="mt-1 text-[11px] text-slate-500 leading-snug">
        On approval you disburse into the platform holding account and confirm — that pays the seller
        and marks the buyer's order paid. Repayment is arranged with the borrower directly.
      </p>
      {spec && (
        <div className="mt-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2">
            Product specification
          </p>
          <RequestDetails attributes={spec} />
        </div>
      )}
    </div>
  );
};

// Compact offer form built from the loan-offer QuoteField[] schema.
const OfferForm: React.FC<{
  request: any;
  onCancel: () => void;
  onSubmit: (values: Record<string, any>) => Promise<void>;
  /** Force loan behaviour + type (used on REVISE, where `request` is the
   *  offer's inquiry relation and lacks categoryIds to auto-detect from). */
  isLoanOverride?: boolean;
  loanTypeOverride?: LoanTypeKey | null;
  /** Pre-fill values, wins over the request-derived defaults. On revise this
   *  carries the EXISTING offer's terms overlaid with the borrower's counter,
   *  so the lender tweaks rather than re-types (and custom T&C survive). */
  seed?: Record<string, any>;
}> = ({ request, onCancel, onSubmit, isLoanOverride, loanTypeOverride, seed }) => {
  const { user } = useAuth();
  const categoryKey = request.categoryIds?.[0] || request.category || 'loans';
  const { fields } = generateQuoteSchema(categoryKey, request.attributes || {}, 'STANDARD');
  const lt = loanTypeOverride ?? loanTypeKey(categoryKey, request.category, request.title);
  const isLoan = isLoanOverride ?? !!lt;
  // Purchase financing: the principal is the buyer's purchase price and must not
  // be changed by the lender (they fund exactly the order amount). Lock it.
  const isFinancing = !!request.attributes?.financing;

  // Terms & Conditions default from the lender's saved, per-loan-type terms
  // (type-specific → general fallback) so they rarely retype boilerplate.
  const savedTerms = ((user as any)?.loanTerms || {}) as Record<string, string>;
  const defaultTerms = isLoan ? savedTerms[lt as string] || savedTerms.general || '' : '';
  // The lender's attached T&C DOCUMENT for this loan type (type-specific →
  // general fallback) travels with the offer so the borrower sees the contract.
  const savedDocs = ((user as any)?.loanTermsDocs || {}) as Record<string, string>;
  const termsDocUrl = isLoan ? savedDocs[lt as string] || savedDocs.general || '' : '';

  // Seed the offer from the borrower's ask + a sensible interest method per
  // loan type, so the lender edits rather than types everything from scratch.
  // On revise, `seed` (existing offer + counter) overrides these defaults.
  const [values, setValues] = useState<Record<string, any>>(() => {
    if (!isLoan) return seed ? { ...seed } : {};
    const base: Record<string, any> = {
      price: request.attributes?.loanAmount ?? '',
      tenureMonths: request.attributes?.tenureMonths ?? '',
      interestType: lt ? DEFAULT_INTEREST_TYPE[lt] : 'Flat',
      conditions: defaultTerms,
      // Rides along in the submitted values → dynamicFields.termsDocUrl, so the
      // lender's attached T&C document travels with the offer. Not a rendered
      // input; just metadata carried through submit.
      termsDocUrl,
    };
    // Only let defined seed values override, so a missing counter field
    // doesn't blank out a good default.
    const merged = { ...base };
    if (seed) {
      for (const [k, v] of Object.entries(seed)) {
        if (v !== undefined && v !== null && v !== '') merged[k] = v;
      }
    }
    return merged;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (name: string, v: any) => setValues((prev) => ({ ...prev, [name]: v }));

  // Auto-price: derive the monthly repayment from amount, monthly rate, tenure
  // and interest method (Flat vs Reducing Balance). Kept in `values` so it
  // submits, and surfaced read-only in the grid + a summary strip below.
  const monthly = isLoan
    ? computeMonthlyRepayment({
        principal: Number(values.price) || 0,
        monthlyRatePct: Number(values.interestRatePct) || 0,
        tenure: values.tenureMonths,
        interestType: values.interestType,
      })
    : 0;
  const tenureN = Number(String(values.tenureMonths ?? '').match(/(\d+)/)?.[1] || 0);
  const totalRepayable = monthly && tenureN ? monthly * tenureN : 0;
  useEffect(() => {
    if (!isLoan) return;
    setValues((prev) => ({ ...prev, monthlyRepayment: monthly ? roundZmw(monthly) : '' }));
  }, [monthly, isLoan]);

  const handleSubmit = async () => {
    const missing = fields.filter((f) => f.required && (values[f.name] === undefined || values[f.name] === ''));
    if (missing.length) {
      setError(`Please fill: ${missing.map((m) => m.label).join(', ')}`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit(values);
    } catch (e: any) {
      setError(e?.message || 'Failed to send offer.');
    } finally {
      setSaving(false);
    }
  };

  const renderField = (f: QuoteField) => {
    const common = 'w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#C9973A] outline-none';
    // Purchase financing: the principal is locked to the purchase price — show it
    // read-only so the lender funds exactly the order amount.
    if (isLoan && isFinancing && f.name === 'price') {
      return (
        <div className={`${common} bg-slate-50 flex items-center justify-between`}>
          <span className="font-bold text-slate-900">
            {values.price ? `ZMW ${Number(values.price).toLocaleString()}` : '—'}
          </span>
          <span className="text-[10px] font-black uppercase tracking-wider text-[#C9973A] flex items-center gap-1">
            <Lock className="w-3 h-3" /> Purchase price
          </span>
        </div>
      );
    }
    // Monthly repayment is auto-priced for loans — show it read-only so the
    // lender can't fat-finger the arithmetic.
    if (isLoan && f.name === 'monthlyRepayment') {
      return (
        <div className={`${common} bg-slate-50 flex items-center justify-between`}>
          <span className="font-bold text-slate-900">
            {values.monthlyRepayment ? `ZMW ${Number(values.monthlyRepayment).toLocaleString()}` : '—'}
          </span>
          <span className="text-[10px] font-black uppercase tracking-wider text-[#C9973A]">Auto</span>
        </div>
      );
    }
    if (f.type === 'select') {
      return (
        <select className={common} value={values[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)}>
          <option value="">Select…</option>
          {f.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }
    if (f.type === 'textarea') {
      return (
        <textarea
          className={common}
          rows={3}
          placeholder={f.placeholder}
          value={values[f.name] ?? ''}
          onChange={(e) => set(f.name, e.target.value)}
        />
      );
    }
    return (
      <input
        type={f.type === 'currency' || f.type === 'number' ? 'number' : 'text'}
        className={common}
        placeholder={f.placeholder}
        value={values[f.name] ?? ''}
        onChange={(e) => set(f.name, e.target.value)}
      />
    );
  };

  return (
    <div className="mt-4 p-4 bg-white border border-[#C9973A]/30 rounded-2xl">
      <h4 className="font-bold text-slate-900 mb-3">Make a Loan Offer</h4>
      {error && <p className="text-rose-500 text-sm mb-3">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.name} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              {f.label}
              {f.required && <span className="text-[#C9973A]"> *</span>}
            </label>
            {renderField(f)}
            {f.helpText && <p className="text-[11px] text-slate-400 mt-1">{f.helpText}</p>}
          </div>
        ))}
      </div>

      {isLoan && monthly > 0 && (
        <div className="mt-4 p-3.5 rounded-2xl bg-[#fdf6e9]/70 border border-[#C9973A]/20 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#C9973A]">Monthly Repayment</p>
            <p className="text-lg font-black text-slate-900">ZMW {roundZmw(monthly).toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Repayable{tenureN ? ` · ${tenureN} mo` : ''}
            </p>
            <p className="text-lg font-black text-slate-900">ZMW {roundZmw(totalRepayable).toLocaleString()}</p>
          </div>
          <p className="w-full text-[11px] text-slate-500 leading-snug">
            Auto-calculated from the amount at {values.interestRatePct || 0}%/mo ({values.interestType || 'interest'})
            over {tenureN || '—'} months. Change any input above and this updates instantly.
          </p>
        </div>
      )}

      <div className="flex gap-2 justify-end mt-4">
        <button onClick={onCancel} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-5 py-2 text-sm font-bold text-white bg-[#C9973A] rounded-xl flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send Offer
        </button>
      </div>
    </div>
  );
};

export const LoanRequestsView: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRequests(await loanService.listRequests({ status: 'OPEN' }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Record a lender view of each matched request once per session, so the
  // borrower sees "N lenders viewed" progress. The backend only counts
  // non-buyer/non-owner hits; the ref dedupes within this session.
  useEffect(() => {
    if (!requests.length) return;
    if (user?.role === 'BUYER' || user?.role === 'ADMIN') return;
    requests.forEach((r) => {
      const key = String(r.id);
      if (SESSION_VIEWED_REQUESTS.has(key)) return;
      SESSION_VIEWED_REQUESTS.add(key);
      recordInquiryView(r.id).catch(() => {});
    });
  }, [requests, user?.role]);

  const submitOffer = async (request: any, values: Record<string, any>) => {
    const { price, ...terms } = values;
    await loanService.makeOffer({
      inquiryId: String(request.id),
      inquiryTitle: request.title || 'Loan Request',
      providerName: user?.companyName || user?.name || 'Lender',
      price,
      condition: 'LOAN',
      message: terms.conditions || 'Loan offer',
      // Travel the lender's own contact with the offer (stored in
      // dynamicFields) so once the borrower accepts they can reach the
      // lender directly to arrange disbursement — no extra lookup.
      lenderContact: {
        name: user?.companyName || user?.name || 'Lender',
        phone: (user as any)?.phone || '',
        email: (user as any)?.email || '',
      },
      ...terms,
    });
    setOpenId(null);
    await load();
  };

  const decline = async (request: any) => {
    // window.prompt returns null on Cancel — capture it BEFORE defaulting, or
    // Cancel would fall through and decline the request anyway.
    const reason = window.prompt('Reason for declining this loan request?');
    if (reason === null) return;
    try {
      await loanService.decline({
        inquiryId: String(request.id),
        inquiryTitle: request.title || 'Loan Request',
        providerName: user?.companyName || user?.name || 'Lender',
        reason: reason || 'Declined',
      });
      await load();
    } catch (e: any) {
      alert(e?.message || 'Failed to decline the request. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#C9973A]" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
        <Landmark className="w-12 h-12 text-slate-200 mx-auto mb-4" />
        <p className="text-slate-500 font-medium">No loan requests yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((r) => {
        const a = r.attributes || {};
        return (
          <div key={String(r.id)} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900">{r.title || 'Loan Request'}</h3>
                <div className="text-sm text-slate-500 flex items-center gap-2 mt-0.5">
                  <User className="w-3.5 h-3.5" /> {r.buyerName || 'Borrower'}
                  {r.category && <span className="text-slate-300">·</span>}
                  {r.category && <span>{r.category}</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-black text-[#C9973A]">{zmw(a.loanAmount)}</div>
                {a.tenureMonths && <div className="text-xs text-slate-400">{a.tenureMonths}</div>}
              </div>
            </div>

            <FinancingContext a={a} />
            <RequestDetails attributes={a} />

            {openId === String(r.id) ? (
              <OfferForm
                request={r}
                onCancel={() => setOpenId(null)}
                onSubmit={(v) => submitOffer(r, v)}
              />
            ) : (
              <div className="flex gap-2 justify-end mt-4">
                <button
                  onClick={() => decline(r)}
                  className="px-4 py-2 text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" /> Decline
                </button>
                <button
                  onClick={() => setOpenId(String(r.id))}
                  className="px-5 py-2 text-sm font-bold text-white bg-[#C9973A] rounded-xl flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Make Offer
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  ACCEPTED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  PAID: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
};

const monthsOf = (t: any): number => {
  const m = String(t || '').match(/(\d+)/);
  return m ? Number(m[1]) : 0;
};

/**
 * On-demand full view of an offer: the terms the lender offered (and, once
 * ACCEPTED, that the borrower agreed to) PLUS the original loan request the
 * borrower submitted. Lets the lender pull up the whole deal from the Loan
 * Offers list without hunting for the (now non-OPEN) request.
 */
const OfferDetailModal: React.FC<{ offer: any; onClose: () => void }> = ({ offer, onClose }) => {
  const d = offer.dynamicFields || {};
  const months = monthsOf(d.tenureMonths);
  const totalRepayable = d.monthlyRepayment && months ? Number(d.monthlyRepayment) * months : null;
  const declined = offer.status === 'REJECTED' || d.declined;

  let attrs: any = offer.inquiry?.attributes || {};
  if (typeof attrs === 'string') {
    try { attrs = JSON.parse(attrs); } catch { attrs = {}; }
  }

  const terms: Array<[string, string]> = [
    ['Approved Amount', zmw(offer.price)],
    ...(d.interestRatePct != null ? ([['Interest Rate', `${d.interestRatePct}% / mo`]] as [string, string][]) : []),
    ...(d.interestType ? ([['Interest Type', String(d.interestType)]] as [string, string][]) : []),
    ...(d.tenureMonths ? ([['Repayment Period', String(d.tenureMonths)]] as [string, string][]) : []),
    ...(d.monthlyRepayment != null ? ([['Monthly Repayment', zmw(d.monthlyRepayment)]] as [string, string][]) : []),
    ...(d.processingFee != null ? ([['Processing Fee', zmw(d.processingFee)]] as [string, string][]) : []),
    ...(totalRepayable != null ? ([['Total Repayable', zmw(totalRepayable)]] as [string, string][]) : []),
    ...(d.disbursementDays != null ? ([['Disbursement', `${d.disbursementDays} days`]] as [string, string][]) : []),
    ...(d.validity || offer.expiryDuration ? ([['Offer Valid For', String(d.validity || offer.expiryDuration)]] as [string, string][]) : []),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[88vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-start justify-between gap-3 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#C9973A]/10 text-[#C9973A] flex items-center justify-center shrink-0">
              <Landmark className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif font-black text-brand-dark truncate">
                {offer.inquiryTitle || 'Loan Offer'}
              </h3>
              <span
                className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  STATUS_STYLE[offer.status] || 'bg-slate-100 text-slate-600'
                }`}
              >
                {offer.status}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!declined && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#C9973A] mb-3">
                {offer.status === 'ACCEPTED' ? 'Accepted Offer Terms' : 'Offer Terms'}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {terms.map(([k, v]) => (
                  <div key={k} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{k}</p>
                    <p className="text-sm font-black text-slate-900 break-words">{v}</p>
                  </div>
                ))}
              </div>
              {(d.conditions || offer.message) && (
                <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Terms &amp; Conditions
                  </p>
                  <p className="text-sm text-slate-700 italic">“{d.conditions || offer.message}”</p>
                </div>
              )}
            </div>
          )}
          {declined && d.reason && (
            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-100 text-rose-600 text-sm">
              Declined: {d.reason}
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Borrower's Loan Request
            </h4>
            {offer.inquiry?.description && (
              <p className="text-sm text-slate-600 mt-1">{offer.inquiry.description}</p>
            )}
            {Object.keys(attrs).length > 0 ? (
              <RequestDetails attributes={attrs} />
            ) : (
              <p className="text-sm text-slate-400 mt-2">
                No request details are available for this offer.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const LoanOffersView: React.FC = () => {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviseId, setReviseId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [stageBusyId, setStageBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOffers(await loanService.listOffers());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitRevision = async (offer: any, values: Record<string, any>) => {
    const { price, ...terms } = values;
    await loanService.revise(String(offer.id), { price, message: terms.conditions, ...terms });
    setReviseId(null);
    await load();
  };

  // Revise seeds the form from the EXISTING offer, overlaid with the borrower's
  // pending counter, and forces loan behaviour/type (the offer's inquiry
  // relation has no categoryIds to auto-detect from).
  const reviseProps = (o: any) => {
    const d = o.dynamicFields || {};
    const c = d.counter && !d.counter.resolved ? d.counter : null;
    return {
      loanType: loanTypeKey(o.inquiryTitle, o.inquiry?.category, o.inquiry?.title),
      seed: {
        price: c?.requestedAmount ?? o.price,
        interestRatePct: c?.maxInterestRatePct ?? d.interestRatePct,
        interestType: d.interestType,
        tenureMonths: c?.requestedTenure ?? d.tenureMonths,
        processingFee: d.processingFee,
        disbursementDays: d.disbursementDays,
        validity: d.validity,
        conditions: d.conditions ?? o.message,
      } as Record<string, any>,
    };
  };

  // Advance an accepted loan's lifecycle stage (drives the borrower's tracker).
  // For a PURCHASE-FINANCING loan, DISBURSED is special: it must fund the linked
  // product order's escrow, so it goes through the financing settlement endpoint
  // (which also stamps the stage DISBURSED) — the plain stage bump is rejected
  // server-side for financing loans.
  const advanceStage = async (offer: any, stage: LoanStage) => {
    setStageBusyId(String(offer.id));
    setNotice(null);
    try {
      let attrs: any = offer.inquiry?.attributes;
      if (typeof attrs === 'string') {
        try { attrs = JSON.parse(attrs); } catch { attrs = {}; }
      }
      const isFinancing = !!attrs?.financedQuoteId;
      if (stage === 'DISBURSED' && isFinancing) {
        // Disbursement is now a VERIFIED PSP payment, not a click. Initiating it
        // starts a collection of the principal from the lender; the order's
        // escrow (and this loan → DISBURSED) only settles once the payment is
        // confirmed. So we report a pending state rather than an instant "done".
        const res = await financingService.initiateDisbursement(String(offer.id));
        // Live (DPO): the lender pays the principal on the provider's own page,
        // so leave the app. Sandbox returns no redirect and reports below.
        if (beginHostedPayment(res, { label: 'This disbursement' })) return;
        if (res?.status === 'successful') {
          setNotice({ kind: 'info', text: 'Disbursement confirmed — the seller has been paid.' });
        } else {
          setNotice({
            kind: 'info',
            text:
              res?.instruction ||
              'Disbursement initiated — the seller is paid once your payment is confirmed. This may take a moment.',
          });
        }
      } else {
        await loanService.advanceStage(String(offer.id), stage);
      }
      await load();
    } catch (e: any) {
      setNotice({ kind: 'error', text: e?.message || 'Failed to update the loan stage.' });
    } finally {
      setStageBusyId(null);
    }
  };

  const detailOffer = offers.find((o) => String(o.id) === detailId);

  if (loading) {
    return (
      <div className="text-center py-16">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#C9973A]" />
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
        <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
        <p className="text-slate-500 font-medium">You haven't made any offers yet.</p>
      </div>
    );
  }

  return (
    <>
    {notice && (
      <div
        className={`mb-3 rounded-2xl border p-4 text-sm font-medium ${
          notice.kind === 'error'
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : 'border-blue-100 bg-blue-50/70 text-blue-800'
        }`}
      >
        {notice.text}
      </div>
    )}
    <div className="space-y-3">
      {offers.map((o) => {
        const d = o.dynamicFields || {};
        const declined = d.declined || o.status === 'REJECTED';
        const counter = d.counter;
        const counterPending = counter && !counter.resolved && o.status === 'PENDING';
        const accepted = o.status === 'ACCEPTED';
        // Borrower's follow-up contact, captured on the loan request and
        // stored on inquiry.attributes. attributes is a json column (object),
        // but tolerate a stringified payload just in case.
        let attrs: any = o.inquiry?.attributes || {};
        if (typeof attrs === 'string') {
          try { attrs = JSON.parse(attrs); } catch { attrs = {}; }
        }
        // Purchase-financing loan → DISBURSED funds the product order's escrow.
        const isFinancing = !!attrs.financedQuoteId;
        const contactPhone: string = attrs.contactPhone || '';
        const contactEmail: string = attrs.contactEmail || '';
        const contactName: string = attrs.contactName || '';
        const preferred: string = attrs.preferredContact || '';
        const hasContact = !!(contactName || contactPhone || contactEmail);
        return (
          <div key={String(o.id)} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900">{o.inquiryTitle || 'Loan Offer'}</h3>
                {!declined && (
                  <div className="text-sm text-slate-500 mt-0.5">
                    {zmw(o.price)}
                    {d.interestRatePct ? ` · ${d.interestRatePct}%/mo` : ''}
                    {d.tenureMonths ? ` · ${d.tenureMonths}` : ''}
                    {d.monthlyRepayment ? ` · ${zmw(d.monthlyRepayment)}/mo` : ''}
                  </div>
                )}
                {declined && d.reason && (
                  <div className="text-sm text-rose-500 mt-0.5">Declined: {d.reason}</div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    STATUS_STYLE[o.status] || 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {o.status}
                </span>
                {o.createdAt && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(o.createdAt).toLocaleDateString()}
                  </span>
                )}
                <button
                  onClick={() => setDetailId(String(o.id))}
                  className="mt-1 text-[11px] font-bold text-[#C9973A] hover:underline flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" /> View details
                </button>
              </div>
            </div>

            {accepted && (
              <div className="mt-3 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 mb-2">
                  <PhoneCall className="w-4 h-4" /> Approved — follow up with the borrower
                </p>

                {/* Lifecycle control — advance the loan; drives the borrower's tracker. */}
                {(() => {
                  const stage = (d.stage || 'ACCEPTED') as LoanStage;
                  const next = nextLoanStage(stage);
                  const borrowerConfirmed = !!d.borrowerConfirmedAt;
                  const atDisbursed = loanStageIndex(stage) >= loanStageIndex('DISBURSED');
                  return (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/60">
                          Loan stage
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {LOAN_STAGE_LABEL[stage]}
                        </span>
                        {atDisbursed &&
                          (borrowerConfirmed ? (
                            <span className="text-[11px] font-bold text-emerald-700">· Borrower confirmed receipt ✓</span>
                          ) : (
                            <span className="text-[11px] font-bold text-amber-600">· Awaiting borrower confirmation</span>
                          ))}
                      </div>
                      {next && (
                        <button
                          onClick={() => advanceStage(o, next.stage)}
                          disabled={stageBusyId === String(o.id)}
                          className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {stageBusyId === String(o.id) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          {next.stage === 'DISBURSED' && isFinancing
                            ? 'Confirm disbursement — pay seller'
                            : next.label}
                        </button>
                      )}
                    </div>
                  );
                })()}
                {hasContact ? (
                  <>
                    <div className="text-[13px] text-emerald-900 space-y-0.5 mb-3">
                      {contactName && (
                        <div>
                          <span className="text-emerald-700/60">Contact:</span> {contactName}
                        </div>
                      )}
                      {contactPhone && (
                        <div>
                          <span className="text-emerald-700/60">Phone:</span> {contactPhone}
                        </div>
                      )}
                      {contactEmail && (
                        <div>
                          <span className="text-emerald-700/60">Email:</span> {contactEmail}
                        </div>
                      )}
                      {preferred && (
                        <div>
                          <span className="text-emerald-700/60">Prefers:</span> {preferred}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {contactPhone && (
                        <a
                          href={`tel:${contactPhone.replace(/[^\d+]/g, '')}`}
                          onClick={() => recordConsent('offplatform_handoff', true, 'loan-contact')}
                          className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg flex items-center gap-1.5"
                        >
                          <PhoneCall className="w-3.5 h-3.5" /> Call
                        </a>
                      )}
                      {contactEmail && (
                        <a
                          href={`mailto:${contactEmail}`}
                          onClick={() => recordConsent('offplatform_handoff', true, 'loan-contact')}
                          className="px-4 py-2 text-xs font-bold text-emerald-700 border border-emerald-300 rounded-lg flex items-center gap-1.5"
                        >
                          <Mail className="w-3.5 h-3.5" /> Email
                        </a>
                      )}
                    </div>
                    <p className="mt-2.5 text-[11px] text-emerald-800/70 leading-snug">
                      By contacting the borrower you agree to use these details{' '}
                      <span className="font-semibold">only to arrange this loan</span>, keep them
                      secure, and not reuse or retain them beyond what this deal and the law require —
                      you become an independent controller of this data under the Data Protection Act.
                    </p>
                  </>
                ) : (
                  <p className="text-[13px] text-emerald-800/80">
                    No contact details were captured on this request. Reach the borrower through their inquiry.
                  </p>
                )}
              </div>
            )}

            {counterPending && (
              <div className="mt-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5 mb-1.5">
                  <ArrowLeftRight className="w-4 h-4" /> Borrower counter-offer
                </p>
                <div className="text-[13px] text-amber-800 space-y-0.5">
                  {counter.requestedAmount != null && <div>Requested amount: {zmw(counter.requestedAmount)}</div>}
                  {counter.maxInterestRatePct != null && <div>Max rate: {counter.maxInterestRatePct}% / mo</div>}
                  {counter.requestedTenure && <div>Preferred period: {counter.requestedTenure}</div>}
                  {counter.note && <div className="italic">“{counter.note}”</div>}
                </div>
                {reviseId !== String(o.id) && (
                  <button
                    onClick={() => setReviseId(String(o.id))}
                    className="mt-3 px-4 py-2 text-xs font-bold text-white bg-[#C9973A] rounded-lg"
                  >
                    Revise Offer
                  </button>
                )}
              </div>
            )}

            {reviseId === String(o.id) &&
              (() => {
                const rp = reviseProps(o);
                return (
                  <OfferForm
                    request={o.inquiry || { attributes: {}, categoryIds: ['loans'] }}
                    isLoanOverride={true}
                    loanTypeOverride={rp.loanType}
                    seed={rp.seed}
                    onCancel={() => setReviseId(null)}
                    onSubmit={(v) => submitRevision(o, v)}
                  />
                );
              })()}
          </div>
        );
      })}
    </div>
    {detailOffer && <OfferDetailModal offer={detailOffer} onClose={() => setDetailId(null)} />}
    </>
  );
};
