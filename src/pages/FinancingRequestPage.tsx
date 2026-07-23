import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Landmark, ShieldCheck, CheckCircle2, ArrowRight, Lock } from 'lucide-react';
import DynamicInquiryForm from '../components/DynamicInquiryForm';
import { loanGovernmentSchema } from '../services/categories/schemas/loans';
import { financingService } from '../services/api/financingService';
import type { Quote } from '../types.ts';
import Button from '../components/Button';

/**
 * "Pay via lending institution" (government workers).
 *
 * Reached from the quote PaymentSheet's Loan tab with the product quote in
 * location.state. Opens a salary-backed (`loan-government`) financing request
 * whose PRINCIPAL IS LOCKED to the quote price — the buyer only supplies their
 * repayment period + government-employment documents. The backend fixes
 * loanAmount and purpose, links the request to the product quote, and broadcasts
 * it to licensed lenders. When a lender approves + disburses, the product order's
 * escrow is funded and the buyer + seller are notified (ORDER_PAID).
 */
export default function FinancingRequestPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const quote = (location.state as any)?.financeQuote as Quote | undefined;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!quote) navigate('/buyer/dashboard', { replace: true });
  }, [quote, navigate]);
  if (!quote) return null;

  const principal = Number(quote.price) || 0;

  // The loan amount is the purchase price (not buyer-chosen) and the purpose is
  // auto-derived — drop both from the borrower form; the backend sets them.
  const schema = loanGovernmentSchema.filter(
    (f) => f.name !== 'loanAmount' && f.name !== 'purpose',
  );

  const handleSubmit = async (data: Record<string, any>) => {
    setError(null);
    setSubmitting(true);
    try {
      await financingService.createRequest({
        productQuoteId: String(quote.id),
        tenureMonths: data.tenureMonths,
        attributes: data,
      });
      setDone(true);
    } catch (e: any) {
      setError(e?.message || 'Could not submit your financing request. Please try again.');
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="mt-5 text-xl font-black text-slate-900">Financing request sent</h2>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed">
            Licensed lenders can now review your request for{' '}
            <span className="font-bold text-slate-700">{quote.inquiryTitle}</span>. Once a lender
            approves and confirms disbursement, <span className="font-bold">the item is paid for</span>{' '}
            and the seller proceeds — you'll be notified instantly.
          </p>
          <p className="mt-3 text-[12px] text-slate-400">
            Review incoming loan offers under <span className="font-bold">Loan Offers</span> in your
            dashboard.
          </p>
          <Button
            onClick={() => navigate('/buyer/dashboard')}
            className="mt-6 w-full py-3.5 rounded-2xl font-black uppercase tracking-widest text-[11px]"
          >
            Back to dashboard <ArrowRight className="w-4 h-4 inline ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Product-context banner — the principal is locked to the quote price. */}
      <div className="bg-gradient-to-r from-[#1B3068] to-[#12224d] text-white px-5 sm:px-8 pt-6 pb-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#d49b35]/20 border border-[#d49b35]/30 flex items-center justify-center">
              <Landmark className="w-5 h-5 text-[#d49b35]" />
            </div>
            <div>
              <h1 className="text-lg font-black leading-tight">Pay via lending institution</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="w-3 h-3 text-[#d49b35]" />
                <span className="text-[9px] font-black uppercase tracking-widest text-[#d49b35]/80">
                  Government employees · salary-backed
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between gap-3 text-[12px]">
              <span className="text-white/40 font-bold uppercase tracking-[0.14em] text-[10px]">
                Financing
              </span>
              <span className="font-bold truncate">{quote.inquiryTitle}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[12px]">
              <span className="text-white/40 font-bold uppercase tracking-[0.14em] text-[10px]">
                Seller
              </span>
              <span className="font-bold truncate">{quote.providerName || 'Provider'}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-2.5">
              <span className="flex items-center gap-1.5 text-white/60 font-bold uppercase tracking-[0.14em] text-[10px]">
                <Lock className="w-3 h-3" /> Loan amount (locked)
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] font-black text-[#d49b35]">ZMW</span>
                <span className="text-xl font-black tabular-nums">
                  {principal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-white/50 leading-relaxed">
            The lender verifies your government employment, then disburses the purchase amount into
            the platform holding account. Repayment is arranged with the lender via salary/payroll
            deduction.
          </p>
        </div>
      </div>

      {error && (
        <div className="max-w-2xl mx-auto px-5 sm:px-8 pt-4">
          <p className="text-[12px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
            {error}
          </p>
        </div>
      )}

      <DynamicInquiryForm
        schema={schema}
        categoryName="Government Employee Loan"
        processType="STANDARD"
        isLoading={submitting}
        onBack={() => navigate(-1)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
