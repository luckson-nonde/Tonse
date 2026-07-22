import React, { useState } from 'react';
import {
  ChevronLeft,
  ShieldCheck,
  Check,
  X,
  Loader2,
  Landmark,
  Percent,
  CalendarClock,
  Wallet,
  MessageSquare,
  ArrowLeftRight,
  PhoneCall,
  Mail,
  MessageCircle,
  Printer,
  CheckCircle2,
  Circle,
  Hash,
} from 'lucide-react';
import { updateQuoteStatus, counterLoanOffer, confirmLoanDisbursement } from '../../services/api/quoteService';
import { type QueueableOptions } from '../../services/api/client';
import { newIdempotencyKey } from '../../services/offlineWriteQueue';
import { useAuth } from '../../AuthContext';
import { loanStageIndex } from '../../utils/loan';
import SecureFile, { isSecureFileUrl } from '../SecureFile';

const zmw = (v: any) => `ZMW ${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const monthsOf = (t: any): number => {
  const m = String(t || '').match(/(\d+)/);
  return m ? Number(m[1]) : 0;
};

interface LoanOfferDetailProps {
  quote: any;
  inquiry?: any;
  onAction: (actionId: string, payload?: any) => void;
}

/**
 * Buyer-facing LOAN OFFER page (not a "quote"). Shows the lender's terms and
 * lets the borrower Accept, Counter, or Reject. Every action is audited
 * server-side (quotes/loans controllers). Integrated: a loan offer IS a Quote,
 * so this renders in place of QuoteDetails when quote.condition === 'LOAN'.
 */
export default function LoanOfferDetail({ quote, onAction }: LoanOfferDetailProps) {
  const d = quote?.dynamicFields || {};
  const status = quote?.status as string;
  const counter = d.counter;
  const counterPending = counter && !counter.resolved;
  const isTerminal = status === 'ACCEPTED' || status === 'REJECTED';

  const [busy, setBusy] = useState<'accept' | 'reject' | 'counter' | 'confirm' | null>(null);
  const [showCounter, setShowCounter] = useState(false);
  const [error, setError] = useState('');
  const [queuedNotice, setQueuedNotice] = useState('');
  const [cAmount, setCAmount] = useState('');
  const [cRate, setCRate] = useState('');
  const [cTenure, setCTenure] = useState('');
  const [cNote, setCNote] = useState('');

  const { user } = useAuth();

  const months = monthsOf(d.tenureMonths);
  const totalRepayable = d.monthlyRepayment && months ? Number(d.monthlyRepayment) * months : null;

  // Lender contact travels with the offer (stamped at offer time). Falls back
  // gracefully for older offers made before this shipped.
  const lc = d.lenderContact || {};
  const lenderName = quote.providerName || lc.name || 'Lender';
  const lenderPhone: string = lc.phone || '';
  const lenderEmail: string = lc.email || '';
  const hasLenderContact = !!(lenderPhone || lenderEmail);
  const borrowerName = (user as any)?.companyName || (user as any)?.name || 'Borrower';
  const reference = `LN-${String(quote.id || '').replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  const telHref = (p: string) => `tel:${p.replace(/[^\d+]/g, '')}`;
  const waHref = (p: string) => `https://wa.me/${p.replace(/[^\d]/g, '')}`;

  // Post-acceptance roadmap driven by the loan's REAL lifecycle stage
  // (dynamicFields.stage, advanced by the lender). done = i <= stageIdx;
  // active = the step immediately after the last completed one.
  const stageIdx = loanStageIndex(d.stage);
  const disbursed = stageIdx >= loanStageIndex('DISBURSED');
  const borrowerConfirmed = !!d.borrowerConfirmedAt;
  const confirmReceived = () => act('confirm', () => confirmLoanDisbursement(String(quote.id)));
  const nextSteps = [
    { label: 'Offer accepted' },
    { label: `${lenderName} contacts you to arrange disbursement` },
    { label: 'Verify your identity & collateral / documents' },
    { label: 'Funds disbursed to you' },
    { label: 'Repay according to your schedule' },
  ].map((s, i) => ({ ...s, done: i <= stageIdx, active: i === stageIdx + 1 }));

  // Self-contained printable loan agreement. Opens a clean document the
  // borrower can print or "Save as PDF" — their record of the accepted terms.
  const printAgreement = () => {
    const w = window.open('', '_blank', 'width=820,height=940');
    if (!w) {
      setError('Please allow pop-ups to view your agreement.');
      return;
    }
    const rows: Array<[string, string]> = [
      ['Approved Amount', zmw(quote.price)],
      ...(d.interestRatePct != null ? [['Interest Rate', `${d.interestRatePct}% / mo`] as [string, string]] : []),
      ...(d.interestType ? [['Interest Type', String(d.interestType)] as [string, string]] : []),
      ...(d.tenureMonths ? [['Repayment Period', String(d.tenureMonths)] as [string, string]] : []),
      ...(d.monthlyRepayment != null ? [['Monthly Repayment', zmw(d.monthlyRepayment)] as [string, string]] : []),
      ...(d.processingFee != null ? [['Processing Fee', zmw(d.processingFee)] as [string, string]] : []),
      ...(totalRepayable != null ? [['Total Repayable', zmw(totalRepayable)] as [string, string]] : []),
      ...(d.disbursementDays != null ? [['Disbursement', `${d.disbursementDays} days`] as [string, string]] : []),
      ...(d.validity || quote.expiryDuration ? [['Offer Valid For', String(d.validity || quote.expiryDuration)] as [string, string]] : []),
    ];
    const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
    const rowsHtml = rows.map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td class="v">${esc(v)}</td></tr>`).join('');
    const tnc = d.conditions || quote.message || '';
    const date = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Loan Agreement ${esc(reference)}</title>
      <style>
        *{box-sizing:border-box} body{font-family:Georgia,'Times New Roman',serif;color:#0f172a;margin:0;padding:40px;background:#fff}
        .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #C9973A;padding-bottom:16px;margin-bottom:24px}
        .brand{font-size:26px;font-weight:800;letter-spacing:.08em} .brand span{color:#C9973A}
        .doc{font-size:11px;text-transform:uppercase;letter-spacing:.18em;color:#64748b;margin-top:4px}
        .ref{text-align:right;font-size:12px;color:#64748b} .ref b{display:block;color:#0f172a;font-size:16px;letter-spacing:.05em}
        .parties{display:flex;gap:24px;margin-bottom:24px}
        .party{flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px}
        .party h4{margin:0 0 6px;font-size:10px;text-transform:uppercase;letter-spacing:.14em;color:#C9973A}
        .party p{margin:0;font-size:15px;font-weight:700}
        table{width:100%;border-collapse:collapse;margin-bottom:24px}
        td{padding:11px 14px;border-bottom:1px solid #eef2f6;font-size:14px}
        td.k{color:#64748b;width:55%} td.v{text-align:right;font-weight:800;font-family:Arial,sans-serif}
        .amt{font-size:15px}
        h3{font-size:12px;text-transform:uppercase;letter-spacing:.14em;color:#334155;margin:0 0 8px}
        .tnc{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;font-style:italic;color:#334155;font-size:13px;line-height:1.6}
        .foot{margin-top:28px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;line-height:1.6}
        .status{display:inline-block;background:#059669;color:#fff;font-family:Arial,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:4px 12px;border-radius:999px}
        @media print{body{padding:24px}}
      </style></head><body>
      <div class="head">
        <div><div class="brand">TON<span>SE</span></div><div class="doc">Loan Offer Agreement</div></div>
        <div class="ref">Reference<b>${esc(reference)}</b>${esc(date)}</div>
      </div>
      <div class="parties">
        <div class="party"><h4>Lender</h4><p>${esc(lenderName)}</p></div>
        <div class="party"><h4>Borrower</h4><p>${esc(borrowerName)}</p></div>
      </div>
      <h3>Agreed Terms</h3>
      <table>${rowsHtml}</table>
      ${tnc ? `<h3>Lender's Terms &amp; Conditions</h3><div class="tnc">${esc(tnc)}</div>` : ''}
      ${d.termsDocUrl ? `<p class="tnc" style="margin-top:12px"><strong>A signed Terms &amp; Conditions document is attached to this offer</strong> — open it from the loan offer in the ProQuote app.</p>` : ''}
      <div class="foot">
        <p><span class="status">Accepted</span></p>
        <p>This document records the loan offer terms accepted by the borrower on the ProQuote marketplace. It is a summary for the parties' reference; disbursement and repayment are arranged directly between the lender and the borrower. Generated ${esc(date)}.</p>
      </div>
    </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => {
      try { w.print(); } catch { /* user can print manually */ }
    }, 350);
  };

  const act = async (kind: 'accept' | 'reject' | 'counter' | 'confirm', fn: () => Promise<any>) => {
    setBusy(kind);
    setError('');
    setQueuedNotice('');
    try {
      await fn();
      onAction('loan_action_done', { status: kind });
    } catch (e: any) {
      // Offline: the action is queued, not done. Show an honest "queued" notice
      // and STAY on the offer — navigating away via onAction would imply it
      // completed before the server has actually seen it.
      if (e?.name === 'QueuedWrite') {
        setQueuedNotice(
          "You're offline — this will be submitted automatically once you're back online.",
        );
      } else {
        setError(e?.message || 'Action failed. Please try again.');
      }
    } finally {
      setBusy(null);
    }
  };

  const queueOpts = (label: string): QueueableOptions => ({
    idempotencyKey: newIdempotencyKey(),
    label,
    changedEvent: 'tonse:quotes-changed',
  });
  const accept = () =>
    act('accept', () => updateQuoteStatus(String(quote.id), 'ACCEPTED', queueOpts('Accept loan offer')));
  const reject = () =>
    act('reject', () => updateQuoteStatus(String(quote.id), 'REJECTED', queueOpts('Reject loan offer')));
  const submitCounter = () =>
    act('counter', () =>
      counterLoanOffer(String(quote.id), {
        requestedAmount: cAmount ? Number(cAmount) : undefined,
        maxInterestRatePct: cRate ? Number(cRate) : undefined,
        requestedTenure: cTenure || undefined,
        note: cNote,
      }),
    );

  const term = (icon: React.ElementType, label: string, value: React.ReactNode) => {
    const Icon = icon;
    return (
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          <Icon className="w-3.5 h-3.5 text-[#C9973A]" /> {label}
        </div>
        <div className="text-sm font-black text-slate-900">{value}</div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <button
        onClick={() => onAction('back_to_quotes')}
        className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm font-bold"
      >
        <ChevronLeft className="w-4 h-4" /> Back to offers
      </button>

      {/* Lender header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-[#C9973A]/10 text-[#C9973A] flex items-center justify-center shrink-0">
            <Landmark className="w-7 h-7" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="font-serif text-xl font-black text-brand-dark truncate">
                {quote.providerName || 'Lender'}
              </h2>
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#C9973A]">Loan Offer</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Approved Amount</p>
          <p className="text-3xl font-serif font-black text-brand-dark">{zmw(quote.price)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Terms */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Loan Terms</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {term(Wallet, 'Approved Amount', zmw(quote.price))}
              {d.interestRatePct != null && term(Percent, 'Interest Rate', `${d.interestRatePct}% / mo`)}
              {d.interestType && term(Percent, 'Interest Type', d.interestType)}
              {d.tenureMonths && term(CalendarClock, 'Repayment Period', d.tenureMonths)}
              {d.monthlyRepayment != null && term(Wallet, 'Monthly Repayment', zmw(d.monthlyRepayment))}
              {d.processingFee != null && term(Wallet, 'Processing Fee', zmw(d.processingFee))}
              {totalRepayable != null && term(Wallet, 'Total Repayable', zmw(totalRepayable))}
              {d.disbursementDays != null && term(CalendarClock, 'Disbursement', `${d.disbursementDays} days`)}
              {(d.validity || quote.expiryDuration) &&
                term(CalendarClock, 'Offer Valid For', d.validity || quote.expiryDuration)}
            </div>
          </div>

          {(d.conditions || quote.message || d.termsDocUrl) && (
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 text-[#C9973A] font-bold mb-3">
                <MessageSquare className="w-4.5 h-4.5" /> Lender's Terms &amp; Conditions
              </div>
              {(d.conditions || quote.message) && (
                <p className="text-sm text-slate-600 leading-relaxed italic bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  “{d.conditions || quote.message}”
                </p>
              )}
              {d.termsDocUrl && (
                <div className="mt-3 flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#C9973A]/5 border border-[#C9973A]/20">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Attached document
                  </span>
                  {isSecureFileUrl(d.termsDocUrl) ? (
                    <SecureFile url={d.termsDocUrl} asLink />
                  ) : (
                    <a
                      href={d.termsDocUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C9973A] hover:underline"
                    >
                      View document
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {status === 'ACCEPTED' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 text-[#C9973A] font-bold mb-1">
                <CalendarClock className="w-4.5 h-4.5" /> What happens next
              </div>
              <p className="text-sm text-slate-500 mb-5">
                Your loan is approved. Here's the path to getting your funds.
              </p>

              <div>
                {nextSteps.map((s, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center self-stretch">
                      {s.done ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      ) : s.active ? (
                        <span className="w-5 h-5 rounded-full border-2 border-[#C9973A] flex items-center justify-center shrink-0">
                          <span className="w-2 h-2 rounded-full bg-[#C9973A] animate-pulse" />
                        </span>
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 shrink-0" />
                      )}
                      {i < nextSteps.length - 1 && (
                        <span
                          className={`w-0.5 flex-1 min-h-[16px] ${s.done ? 'bg-emerald-200' : 'bg-slate-200'}`}
                        />
                      )}
                    </div>
                    <div className="pb-3">
                      <p
                        className={`text-sm font-bold ${
                          s.done ? 'text-slate-900' : s.active ? 'text-[#C9973A]' : 'text-slate-400'
                        }`}
                      >
                        {s.label}
                      </p>
                      {s.active && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          You're here — reach out below to speed things up.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Confirm receipt — appears once the lender marks the loan
                  disbursed, so the borrower closes the loop on-platform. */}
              {disbursed && !borrowerConfirmed && (
                <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <p className="text-sm font-bold text-emerald-800 mb-2">
                    {lenderName} has marked your funds as disbursed.
                  </p>
                  <button
                    onClick={confirmReceived}
                    disabled={busy === 'confirm'}
                    className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-2 disabled:opacity-50"
                  >
                    {busy === 'confirm' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    I've received the funds
                  </button>
                </div>
              )}
              {borrowerConfirmed && (
                <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2">
                  <Check className="w-4 h-4" /> You confirmed receipt of the funds.
                </div>
              )}

              <div className="mt-4 pt-5 border-t border-slate-100">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                  Contact {lenderName}
                </p>
                {hasLenderContact ? (
                  <div className="flex flex-wrap gap-2">
                    {lenderPhone && (
                      <a
                        href={telHref(lenderPhone)}
                        className="px-4 py-2.5 text-sm font-bold text-white bg-[#C9973A] rounded-xl flex items-center gap-1.5"
                      >
                        <PhoneCall className="w-4 h-4" /> Call
                      </a>
                    )}
                    {lenderPhone && (
                      <a
                        href={waHref(lenderPhone)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2.5 text-sm font-bold text-emerald-700 border border-emerald-300 rounded-xl flex items-center gap-1.5"
                      >
                        <MessageCircle className="w-4 h-4" /> WhatsApp
                      </a>
                    )}
                    {lenderEmail && (
                      <a
                        href={`mailto:${lenderEmail}`}
                        className="px-4 py-2.5 text-sm font-bold text-slate-700 border border-slate-200 rounded-xl flex items-center gap-1.5"
                      >
                        <Mail className="w-4 h-4" /> Email
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    {lenderName} will contact you using the details on your loan request to arrange
                    disbursement.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action panel */}
        <div className="lg:col-span-1">
          <div className="bg-brand-dark rounded-3xl p-6 text-white sticky top-6">
            <h3 className="font-serif font-bold text-lg mb-1">Your Decision</h3>

            {status === 'ACCEPTED' && (
              <div className="mt-4 space-y-3">
                <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-sm font-bold flex items-center gap-2">
                  <Check className="w-4 h-4" /> You accepted this loan offer.
                </div>
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 flex items-center gap-1.5 mb-1">
                    <Hash className="w-3 h-3" /> Reference
                  </p>
                  <p className="text-lg font-mono font-bold tracking-wider">{reference}</p>
                </div>
                <button
                  onClick={printAgreement}
                  className="w-full bg-white text-brand-dark font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
                >
                  <Printer className="w-4 h-4" /> Print / Download Agreement
                </button>
                <p className="text-white/40 text-xs text-center">
                  Save as PDF from the print dialog to keep a copy.
                </p>
              </div>
            )}
            {status === 'REJECTED' && (
              <div className="mt-4 p-4 rounded-2xl bg-rose-500/15 border border-rose-400/30 text-rose-300 text-sm font-bold flex items-center gap-2">
                <X className="w-4 h-4" /> You declined this loan offer.
              </div>
            )}

            {!isTerminal && (
              <>
                {counterPending && (
                  <div className="mt-4 p-3.5 rounded-2xl bg-amber-400/15 border border-amber-300/30 text-amber-200 text-[13px]">
                    <p className="font-bold flex items-center gap-1.5 mb-1">
                      <ArrowLeftRight className="w-4 h-4" /> Counter sent
                    </p>
                    <p className="text-amber-200/80 text-xs">
                      Awaiting the lender's response. You can still accept the current terms below.
                    </p>
                  </div>
                )}

                {error && <p className="text-rose-300 text-sm mt-3">{error}</p>}
                {queuedNotice && <p className="text-amber-300 text-sm mt-3">{queuedNotice}</p>}

                {!showCounter ? (
                  <div className="mt-5 space-y-2.5">
                    <button
                      onClick={accept}
                      disabled={!!busy}
                      className="w-full bg-white text-brand-dark font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {busy === 'accept' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Accept Offer
                    </button>
                    <button
                      onClick={() => setShowCounter(true)}
                      disabled={!!busy}
                      className="w-full border border-[#C9973A] text-[#C9973A] font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <ArrowLeftRight className="w-4 h-4" /> Counter Offer
                    </button>
                    <button
                      onClick={reject}
                      disabled={!!busy}
                      className="w-full text-white/60 hover:text-white font-bold py-2.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {busy === 'reject' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                      Reject Offer
                    </button>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    <p className="text-white/60 text-xs">Propose your preferred terms — the lender can revise.</p>
                    <input
                      type="number"
                      placeholder="Desired amount (ZMW)"
                      value={cAmount}
                      onChange={(e) => setCAmount(e.target.value)}
                      className="w-full p-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/40 outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Max interest rate (% / mo)"
                      value={cRate}
                      onChange={(e) => setCRate(e.target.value)}
                      className="w-full p-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/40 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Preferred period (e.g. 24 months)"
                      value={cTenure}
                      onChange={(e) => setCTenure(e.target.value)}
                      className="w-full p-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/40 outline-none"
                    />
                    <textarea
                      placeholder="Note to the lender…"
                      value={cNote}
                      onChange={(e) => setCNote(e.target.value)}
                      rows={2}
                      className="w-full p-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/40 outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowCounter(false)}
                        className="flex-1 text-white/60 font-bold py-3 rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={submitCounter}
                        disabled={busy === 'counter'}
                        className="flex-[2] bg-[#C9973A] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {busy === 'counter' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
                        Send Counter
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
