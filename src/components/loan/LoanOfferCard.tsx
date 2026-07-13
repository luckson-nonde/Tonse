import React from 'react';
import {
  Landmark,
  ShieldCheck,
  Percent,
  CalendarClock,
  Wallet,
  ArrowLeftRight,
  ChevronRight,
  Clock,
  Check,
} from 'lucide-react';

const zmw = (v: any) => `ZMW ${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Awaiting your decision', cls: 'bg-amber-100 text-amber-700' },
  ACCEPTED: { label: 'Accepted', cls: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: 'Declined', cls: 'bg-rose-100 text-rose-700' },
};

interface LoanOfferCardProps {
  offer: any;
  onView: () => void;
}

/**
 * Buyer-facing LOAN OFFER list card. A loan offer is a Quote (condition
 * 'LOAN') but must never read like a marketplace quote — there's no
 * "Make a Payment", only "View Offer" → the LoanOfferDetail page where the
 * borrower accepts / counters / rejects. Surfaces the headline terms so the
 * borrower can compare offers at a glance.
 */
export default function LoanOfferCard({ offer, onView }: LoanOfferCardProps) {
  const d = offer?.dynamicFields || {};
  const status = String(offer?.status || 'PENDING').toUpperCase();
  const badge = STATUS_STYLE[status] || { label: status, cls: 'bg-slate-100 text-slate-600' };
  const counter = d.counter;
  const counterPending = counter && !counter.resolved && status === 'PENDING';

  const term = (Icon: React.ElementType, label: string, value: React.ReactNode) => (
    <div className="flex items-center gap-2 min-w-0">
      <Icon className="w-4 h-4 text-[#C9973A] shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">{label}</p>
        <p className="text-sm font-black text-slate-900 truncate">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-4xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-[#C9973A]/10 text-[#C9973A] flex items-center justify-center shrink-0">
              <Landmark className="w-7 h-7" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#C9973A] mb-0.5">Loan Offer</p>
              <div className="flex items-center gap-1.5">
                <h3 className="font-serif text-lg font-black text-brand-dark truncate">
                  {offer.providerName || 'Lender'}
                </h3>
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              </div>
              <p className="text-xs text-slate-500 truncate">{offer.inquiryTitle || 'Loan Request'}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Approved</p>
            <p className="text-2xl font-serif font-black text-brand-dark leading-tight">{zmw(offer.price)}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {d.interestRatePct != null && term(Percent, 'Rate', `${d.interestRatePct}% / mo`)}
          {d.tenureMonths && term(CalendarClock, 'Period', d.tenureMonths)}
          {d.monthlyRepayment != null && term(Wallet, 'Monthly', zmw(d.monthlyRepayment))}
          {d.processingFee != null && term(Wallet, 'Fee', zmw(d.processingFee))}
        </div>
      </div>

      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${badge.cls}`}>
            {status === 'ACCEPTED' && <Check className="w-3 h-3 inline mr-1 -mt-0.5" />}
            {badge.label}
          </span>
          {counterPending && (
            <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
              <ArrowLeftRight className="w-3 h-3" /> Counter sent
            </span>
          )}
          {offer.createdAt && (
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {new Date(offer.createdAt).toLocaleDateString()}
            </span>
          )}
        </div>
        <button
          onClick={onView}
          className="px-5 py-2.5 text-sm font-bold text-white bg-[#C9973A] hover:bg-[#1e3a8a] rounded-xl flex items-center gap-1.5 transition-colors shrink-0"
        >
          View Offer <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
