import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import {
  beginHostedPayment,
  paymentsService,
} from '../services/api/paymentsService';
import { financingService } from '../services/api/financingService';
import { isFinancingActive } from '../services/lifecycleFilters';
import { motion, AnimatePresence } from 'motion/react';
import {
  Star,
  PackageOpen,
  Calendar,
  MessageSquare,
  ArrowRight,
  Printer,
  Check,
  MapPin,
  ShieldCheck,
  Truck,
  ChevronDown,
  User,
  Phone,
  Mail,
  FileText,
  DollarSign,
  AlertCircle,
  X,
  CheckCircle2,
  Sparkles,
  Landmark,
} from 'lucide-react';
import { robustParse } from '../utils/jsonUtils';
import { Quote, Inquiry } from '../types.ts';
import Button from '../components/Button';
import { isQuoteExpired } from '../utils/quoteExpiry';
import QuoteInvoice from '../components/QuoteInvoice';
import { db } from '../services/api/database';

import PaymentSheet from './PaymentSheet';
import PushPaymentWait from './PushPaymentWait';
import ImageLightbox, { useImageLightbox } from './ImageLightbox';
import PortfolioShowcase from './PortfolioShowcase';

/**
 * Thin wrapper around the shared {@link PaymentSheet} component. Runs the
 * REAL escrow checkout: POST /payments/checkout starts a verified PSP
 * collection (the amount is read from the quote server-side), and the Order,
 * the quote's PAID status and the collection code are all created by the
 * backend only after the provider confirms the money. Mobile money on live
 * DPO is an in-app push approved on the payer's handset; card goes to the
 * provider's hosted page; sandbox keeps its simulate button. The old Wallet
 * method is gone — it debited a simulated balance while creating a real
 * order, which is exactly the bypass the server now rejects.
 */
function PaymentModal({
  quote,
  onClose,
  onSuccess,
}: {
  quote: Quote;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const total = quote.price;
  const [pending, setPending] = useState<{
    reference: string;
    provider?: string;
    instruction?: string;
  } | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [pendingError, setPendingError] = useState('');

  const handlePaymentSubmit = async (payload: {
    amount: number;
    method: string;
    provider?: string;
    phone?: string;
  }) => {
    if (!user?.id) throw new Error('You must be signed in to pay.');
    const result = await paymentsService.checkoutQuote(String(quote.id), {
      channel: payload.method === 'card' ? 'card' : 'mobile-money',
      phone: payload.phone,
      operator: payload.provider,
    });
    if (!result?.reference || result.status === 'failed') {
      throw new Error('Payment could not be started. Please try again.');
    }
    // Live card (and any mobile fallback): pay on the provider's own page.
    if (beginHostedPayment(result, { label: `Payment to ${quote.providerName || 'provider'}` })) return;
    // In-app: mobile push (dpo) or sandbox pending — swap the sheet for the wait card.
    setPending({
      reference: result.reference,
      provider: result.provider,
      instruction: result.instruction,
    });
  };

  const handleSimulateApproval = async () => {
    if (!pending) return;
    setSimulating(true);
    try {
      await paymentsService.simulateCheckout(pending.reference, 'successful');
      onSuccess();
      onClose();
    } catch (e: any) {
      setPendingError(e?.message || 'Could not confirm the payment. Please try again.');
    } finally {
      setSimulating(false);
    }
  };

  if (pending) {
    return (
      <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-3">
          {pending.provider === 'dpo' ? (
            <PushPaymentWait
              reference={pending.reference}
              amountLabel={`ZMW ${total.toLocaleString()}`}
              instruction={pending.instruction}
              onDone={(status) => {
                setPending(null);
                if (status === 'SUCCESSFUL') {
                  onSuccess();
                  onClose();
                } else {
                  setPendingError('The payment was not completed. You can try again.');
                }
              }}
              onCancel={onClose}
            />
          ) : (
            <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 space-y-4">
              <p className="text-sm font-black text-[#1a1a2e]">Awaiting approval</p>
              <p className="text-[12px] text-slate-500 leading-relaxed">
                In production you'd approve this on your phone. This environment runs on the
                sandbox payment provider, so use the button below to simulate that approval.
              </p>
              <p className="text-[11px] text-slate-400">{pending.reference}</p>
              {pendingError && (
                <p className="text-[12px] font-bold text-rose-600">{pendingError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-500 text-[12px] font-bold hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={simulating}
                  onClick={() => void handleSimulateApproval()}
                  className="flex-1 py-3 rounded-xl bg-[#C9973A] hover:bg-[#b8852f] text-white text-[12px] font-bold disabled:opacity-60"
                >
                  {simulating ? 'Confirming…' : 'Simulate approval (sandbox)'}
                </button>
              </div>
            </div>
          )}
          {pendingError && pending.provider === 'dpo' && (
            <p className="text-center text-[12px] font-bold text-rose-200">{pendingError}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <PaymentSheet
      open
      onClose={onClose}
      title="Pay Provider"
      subtitle="Secure Transaction"
      headerStat={{ label: 'Amount Due', amount: total }}
      amountMode="fixed"
      fixedAmount={total}
      defaultPhone={(user as any)?.phone || ''}
      methods={['mobile_money', 'card', 'lending']}
      defaultMethod="mobile_money"
      onLendingSelected={() => {
        // "Pay via lending institution" (government workers): route to the
        // financing-request flow, which opens a salary-backed loan request
        // whose principal is locked to this quote's price.
        onClose();
        navigate('/buyer/financing', { state: { financeQuote: quote } });
      }}
      actionLabel={(amt) => `Pay ZMW ${amt.toLocaleString()}`}
      onSubmit={handlePaymentSubmit}
      context={[
        { label: 'Provider', value: quote.providerName || 'Provider' },
        { label: 'For', value: quote.inquiryTitle || 'Quote' },
      ]}
    />
  );
}

interface QuoteDetailsProps {
  quote: Quote;
  inquiry?: Inquiry;
  onAction: (actionId: string, payload?: any) => void;
  /** Auto-open the payment modal once on mount. Set when the buyer
   *  clicked "Make a Payment" on the QuoteCard footer — the navigation
   *  lands here and the modal pops without a second click. The flag
   *  fires `auto_pay_handled` back to the parent after consuming so a
   *  re-mount of the same quote doesn't keep popping the modal. Only
   *  applies to EXPRESS quotes; STANDARD quotes go through the explicit
   *  Generate PO button. */
  autoOpenPay?: boolean;
}

// Collapsible Section Component
function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-white rounded-lg text-[#C9973A]">{Icon}</div>
          <h4 className="text-sm font-bold text-brand-dark">{title}</h4>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-slate-100"
        >
          <div className="p-6 space-y-4">{children}</div>
        </motion.div>
      )}
    </div>
  );
}

export default function QuoteDetails({ quote, inquiry, onAction, autoOpenPay }: QuoteDetailsProps) {
  const [showPayModal, setShowPayModal] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  // Provider-set "Quote Valid For" window elapsed unpaid — see
  // src/utils/quoteExpiry.ts. Status-gated: once a quote has actually moved
  // (paid, collected, rejected, etc.) its createdAt+expiryDuration math is
  // stale and must never override the real status — e.g. a buyer who pays,
  // then returns to this same URL later (bookmark, notification, browser
  // Back) after what would have been the validity window must still see the
  // paid state, not a false "this quote has expired".
  const expired =
    !['PAID', 'PENDING_COLLECTION', 'AWAITING_PICKUP', 'COMPLETED', 'HANDED_OVER', 'REJECTED', 'CANCELLED', 'ARCHIVED'].includes(
      (quote.status || '').toUpperCase(),
    ) && isQuoteExpired(quote);

  // One-shot auto-open when the buyer arrived here from the QuoteCard's
  // "Make a Payment" button. STANDARD quotes don't have a modal; they
  // use the Generate PO flow, so the flag is ignored for them.
  React.useEffect(() => {
    // Don't auto-open the cash sheet on a quote that's mid-financing — the buyer
    // would dead-end (the backend 409s a cash pay while financing is REQUESTED).
    const financingInFlight =
      (quote.dynamicFields as any)?.financing?.status === 'REQUESTED';
    if (
      autoOpenPay &&
      !hasAutoOpened &&
      !financingInFlight &&
      quote.processType === 'EXPRESS' &&
      !expired &&
      !['PAID', 'COMPLETED', 'EXPIRED', 'REJECTED', 'CANCELLED'].includes((quote.status || '').toUpperCase())
    ) {
      setShowPayModal(true);
      setHasAutoOpened(true);
      onAction('auto_pay_handled', quote);
    }
  }, [autoOpenPay, hasAutoOpened, quote, onAction, expired]);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [paid, setPaid] = useState(false);

  // Reference photos the provider attached — viewed in-app, full screen.
  const referencePhotos: string[] = React.useMemo(() => {
    const dynamicFields = robustParse(quote.dynamicFields);
    return (dynamicFields?.referencePhotos || (quote as any).referencePhotos || []) as string[];
  }, [quote]);
  const photoViewer = useImageLightbox(referencePhotos);
  const [parentQuote, setParentQuote] = useState<Quote | null>(null);

  // Financed checkout: while a lender reviews the buyer's salary-backed loan the
  // quote carries `dynamicFields.financing.status = 'REQUESTED'`. Swap the pay
  // button for an in-progress banner so the buyer can't dead-end on a cash pay
  // (the backend 409s that) and can back out to pay another way.
  const navigate = useNavigate();
  const financingActive = isFinancingActive(quote as any);
  const [cancellingFinancing, setCancellingFinancing] = useState(false);
  const handleCancelFinancing = async () => {
    setCancellingFinancing(true);
    try {
      await financingService.cancel(String(quote.id));
      navigate('/buyer/dashboard');
    } catch (e: any) {
      alert(e?.message || 'Could not cancel the financing request.');
      setCancellingFinancing(false);
    }
  };

  React.useEffect(() => {
    if ((quote as any).parentQuoteId) {
      db.quotes.get((quote as any).parentQuoteId).then((val) => setParentQuote(val || null));
    }
  }, [(quote as any).parentQuoteId]);

  const handlePrint = () => {
    setIsPrintModalOpen(true);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <>
      <AnimatePresence>
        {showPayModal && (
          <PaymentModal
            quote={quote}
            onClose={() => setShowPayModal(false)}
            onSuccess={() => { setPaid(true); onAction('accept_quote', quote); }}
          />
        )}
      </AnimatePresence>

      <ImageLightbox {...photoViewer.props} title={quote.inquiryTitle || 'Reference photos'} />

      {/* ── Receipt / Invoice Modal for Printing ── */}
      <AnimatePresence>
        {isPrintModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white print:relative print:z-0"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto print:max-h-none print:shadow-none print:rounded-none print:overflow-visible"
            >
              <div className="sticky top-0 bg-white px-8 py-4 border-b border-slate-100 flex items-center justify-between z-10 print:hidden">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Print Receipt</h3>
                  <p className="text-xs text-slate-400 font-medium tracking-wide uppercase mt-0.5">Formal Quotation Document</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#d49b35] text-white font-bold rounded-xl hover:bg-[#b8862d] transition-all text-sm shadow-lg shadow-[#d49b35]/20"
                  >
                    <Printer className="w-4 h-4" />
                    Print Now
                  </button>
                  <button
                    onClick={() => setIsPrintModalOpen(false)}
                    className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-8 md:p-12 print:p-0">
                <QuoteInvoice quote={quote} inquiry={inquiry} isPreview={true} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="space-y-8">
      {/* Provider Header */}
      <div className="bg-white p-5 sm:p-8 rounded-3xl sm:rounded-4xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-5 md:gap-6">
        {/* min-w-0 chain + wrapping meta row: provider names are frequently
            emails, an unbreakable string that overflowed the card on phones. */}
        <div className="flex items-center gap-4 sm:gap-6 min-w-0 w-full md:w-auto">
          <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-brand-white border border-[#C9973A]/10 flex items-center justify-center text-[#C9973A] font-serif font-black text-2xl sm:text-3xl shadow-inner shrink-0">
            {(quote.providerName || 'P').charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 min-w-0">
              <h2
                className="text-lg sm:text-2xl font-serif font-black text-brand-dark truncate"
                title={quote.providerName}
              >
                {quote.providerName}
              </h2>
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <div className="flex items-center gap-1 text-[#C9973A]">
                <Star className="w-4 h-4 fill-currentColor" />
                <span className="text-sm font-bold">4.9</span>
                <span className="text-xs text-slate-400 font-medium">(120 reviews)</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400 min-w-0">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium truncate">Lusaka, Zambia</span>
              </div>
            </div>
          </div>
        </div>
        <div className="text-left md:text-right w-full md:w-auto shrink-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">
            Total Offer
          </p>
          <h3 className="text-3xl sm:text-4xl font-black text-brand-dark tracking-tighter">
            <span className="text-lg font-bold text-slate-300 mr-1">K</span>
            {quote.price.toLocaleString()}
            {(() => {
              const dynamicFields = robustParse(quote.dynamicFields);
              // Home Care quotes price per visit or per month (paymentTerms)
              // — suffix the amount so "K350" reads as "K350 / visit".
              const homeCareUnit = {
                'Monthly plan': 'month',
                'Per month': 'month',
                'Per week': 'week',
                'Per visit': 'visit',
              }[dynamicFields.paymentTerms as string];
              const unit = dynamicFields.rateUnit || quote.rateUnit || homeCareUnit;
              if (unit)
                return (
                  <span className="text-sm font-bold text-slate-400 ml-1">
                    / {unit.replace('Per ', '')}
                  </span>
                );
              return null;
            })()}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Provider's portfolio — proof of work for the buyer reviewing
              this quote. Quietly absent if the provider hasn't published
              any clips, so retail/labour/repair quotes stay clean. */}
          <PortfolioShowcase
            providerId={quote.providerId ? String(quote.providerId) : undefined}
            hideWhileLoading
          />
          {(quote as any).quoteType === 'REVISION' && (
            <div className="p-6 bg-blue-50 rounded-4xl border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-2xl text-blue-600">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-blue-900">Revised Quotation</h4>
                  <p className="text-sm text-blue-700 font-medium">This is an updated offer from the provider.</p>
                </div>
              </div>
              {parentQuote && (
                <Button 
                  variant="outline" 
                  onClick={() => onAction('view_quote', parentQuote)}
                  className="border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-300 px-6 py-2.5 rounded-xl font-bold text-xs"
                >
                  View Original
                </Button>
              )}
            </div>
          )}

          {/* Message & Terms */}
          <div className="bg-white p-5 sm:p-8 rounded-3xl sm:rounded-4xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-brand-dark mb-6 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#C9973A]" />
              Provider Message
            </h3>
            <div className="p-4 sm:p-6 bg-slate-50 rounded-2xl border border-slate-100 italic text-slate-600 leading-relaxed mb-8">
              "{quote.message}"
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {quote.condition && quote.condition !== 'N/A' ? (
                <div className="p-6 rounded-2xl border border-slate-100 bg-white">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-brand-white rounded-xl text-[#C9973A]">
                      <PackageOpen className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Condition
                    </span>
                  </div>
                  <p className="text-lg font-bold text-brand-dark">{quote.condition}</p>
                </div>
              ) : null}
              <div className="p-6 rounded-2xl border border-slate-100 bg-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-rose-50 rounded-xl text-rose-500">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Validity
                  </span>
                </div>
                <p className="text-lg font-bold text-rose-600">
                  {quote.expiryDuration || '7 Days'}
                </p>
              </div>
            </div>

            {/* Offer Specific Details (Price, Deposits, Capacity, etc.) */}
            {(() => {
              const dynamicFields = robustParse(quote.dynamicFields);
              const details = [];

              if (dynamicFields.securityDeposit || quote.securityDeposit) {
                details.push({
                  label: 'Security Deposit',
                  value: `ZMW ${(dynamicFields.securityDeposit || quote.securityDeposit).toLocaleString()}`,
                  icon: ShieldCheck,
                  color: 'text-emerald-500',
                  bg: 'bg-emerald-50',
                });
              }

              if (dynamicFields.maxCapacity || quote.maxCapacity) {
                details.push({
                  label: 'Max Capacity',
                  value: `${dynamicFields.maxCapacity || quote.maxCapacity} Guests`,
                  icon: PackageOpen,
                  color: 'text-blue-500',
                  bg: 'bg-blue-50',
                });
              }

              if (quote.cleaningFee) {
                details.push({
                  label: 'Cleaning Fee',
                  value: `ZMW ${quote.cleaningFee.toLocaleString()}`,
                  icon: Truck,
                  color: 'text-amber-500',
                  bg: 'bg-amber-50',
                });
              }

              if (quote.damageDeposit) {
                details.push({
                  label: 'Damage Deposit',
                  value: `ZMW ${quote.damageDeposit.toLocaleString()}`,
                  icon: ShieldCheck,
                  color: 'text-rose-500',
                  bg: 'bg-rose-50',
                });
              }

              if (dynamicFields.numberOfWorkers || quote.numberOfWorkers) {
                details.push({
                  label: 'Workers',
                  value: `${dynamicFields.numberOfWorkers || quote.numberOfWorkers} People`,
                  icon: PackageOpen,
                  color: 'text-slate-500',
                  bg: 'bg-slate-50',
                });
              }

              if (dynamicFields.availabilityDate || quote.availabilityDate) {
                details.push({
                  label: 'Availability',
                  value: new Date(
                    dynamicFields.availabilityDate || quote.availabilityDate
                  ).toLocaleDateString(),
                  icon: Calendar,
                  color: 'text-indigo-500',
                  bg: 'bg-indigo-50',
                });
              }

              if (dynamicFields.leadTime) {
                details.push({
                  label: 'Lead Time',
                  value: dynamicFields.leadTime,
                  icon: Truck,
                  color: 'text-slate-500',
                  bg: 'bg-slate-50',
                });
              }

              // Home Care payment agreement — accepting the quote is the
              // client's agreement to these terms, so they must be visible.
              if (dynamicFields.paymentTerms) {
                const visitsSuffix = dynamicFields.visitsPerMonth
                  ? ` · ${dynamicFields.visitsPerMonth} visits/month`
                  : dynamicFields.visitsPerWeek
                    ? ` · ${dynamicFields.visitsPerWeek} visits/week`
                    : '';
                details.push({
                  label: 'Payment Terms',
                  value: `${dynamicFields.paymentTerms}${visitsSuffix}`,
                  icon: DollarSign,
                  color: 'text-emerald-500',
                  bg: 'bg-emerald-50',
                });
              }

              if (dynamicFields.paymentMethod) {
                details.push({
                  label: 'Payment Method',
                  value: dynamicFields.paymentMethod,
                  icon: DollarSign,
                  color: 'text-teal-500',
                  bg: 'bg-teal-50',
                });
              }

              if (dynamicFields.proposedSchedule) {
                details.push({
                  label: 'Proposed Schedule',
                  value: dynamicFields.proposedSchedule,
                  icon: Calendar,
                  color: 'text-indigo-500',
                  bg: 'bg-indigo-50',
                });
              }

              if (details.length === 0) return null;

              return (
                <div className="mt-8 pt-8 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">
                    Offer Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {details.map((detail, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-white"
                      >
                        <div className={`p-3 rounded-xl ${detail.bg} ${detail.color}`}>
                          <detail.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                            {detail.label}
                          </p>
                          <p className="text-sm font-black text-brand-dark">{detail.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* What's Included (Textarea or Multiselect) */}
                  {(dynamicFields.whatIsIncluded ||
                    (Array.isArray(dynamicFields.servicesIncluded) &&
                      dynamicFields.servicesIncluded.length > 0) ||
                    (Array.isArray(dynamicFields.venueAmenities) &&
                      dynamicFields.venueAmenities.length > 0)) && (
                    <div className="mt-8">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                        What's Included
                      </p>

                      {/* Service steps the provider commits to (e.g. a makeup
                          artist's applied layers) — the price justification
                          the buyer reads before accepting. */}
                      {Array.isArray(dynamicFields.servicesIncluded) &&
                        dynamicFields.servicesIncluded.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {dynamicFields.servicesIncluded.map((service: string, i: number) => (
                              <div
                                key={i}
                                className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-2"
                              >
                                <Check className="w-3 h-3 text-[#C9973A]" />
                                {service}
                              </div>
                            ))}
                          </div>
                        )}

                      {dynamicFields.whatIsIncluded && (
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-600 leading-relaxed italic">
                          {dynamicFields.whatIsIncluded}
                        </div>
                      )}

                      {Array.isArray(dynamicFields.venueAmenities) &&
                        dynamicFields.venueAmenities.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {dynamicFields.venueAmenities.map((amenity: string, i: number) => (
                              <div
                                key={i}
                                className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-2"
                              >
                                <Check className="w-3 h-3 text-[#C9973A]" />
                                {amenity}
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Reference Photos Gallery — opens the in-app viewer rather
                than dumping the raw file into a new browser tab. */}
            {referencePhotos.length > 0 && (
              <div className="mt-8">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                  Reference Photos
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {referencePhotos.map((url: string, i: number) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => photoViewer.openAt(i)}
                      aria-label={`View reference photo ${i + 1} of ${referencePhotos.length}`}
                      className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 cursor-zoom-in"
                    >
                      <img
                        src={url}
                        alt={`Reference ${i + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* All Quote Data - Comprehensive Display */}
            <div className="mt-12 pt-8 border-t border-slate-200 space-y-6">
              <h3 className="text-lg font-bold text-brand-dark">Complete Quote Details</h3>

              {/* Delivery Details */}
              {(() => {
                const delivery = robustParse(quote.delivery) || {};
                const hasDeliveryData = Object.keys(delivery).length > 0;

                if (!hasDeliveryData && !quote.pickupLocation) return null;

                return (
                  <CollapsibleSection
                    title="Delivery & Pickup Information"
                    icon={<Truck className="w-5 h-5" />}
                    defaultOpen={true}
                  >
                    <div className="space-y-4">
                      {/* Pickup Location */}
                      {quote.pickupLocation && (
                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Pickup Location
                          </p>
                          <p className="text-sm font-medium text-slate-700">
                            {quote.pickupLocation}
                          </p>
                        </div>
                      )}

                      {/* Collection Code */}
                      {quote.collectionCode && (
                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Collection Code
                          </p>
                          <p className="text-sm font-mono font-bold text-brand-dark">
                            {quote.collectionCode}
                          </p>
                        </div>
                      )}

                      {/* Delivery Details (if available) */}
                      {hasDeliveryData &&
                        Object.entries(delivery).map(
                          ([key, value]: [string, any]) =>
                            value && (
                              <div
                                key={key}
                                className="p-4 rounded-xl border border-slate-100 bg-slate-50"
                              >
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}
                                </p>
                                <p className="text-sm font-medium text-slate-700">
                                  {typeof value === 'object'
                                    ? JSON.stringify(value)
                                    : String(value)}
                                </p>
                              </div>
                            )
                        )}
                    </div>
                  </CollapsibleSection>
                );
              })()}

              {/* Buyer Contact Information */}
              {(() => {
                const buyerContact = robustParse(quote.buyerContact) || {};
                const hasContact = Object.keys(buyerContact).length > 0;

                if (!hasContact) return null;

                return (
                  <CollapsibleSection
                    title="Buyer Contact Information"
                    icon={<User className="w-5 h-5" />}
                  >
                    <div className="space-y-3">
                      {Object.entries(buyerContact).map(
                        ([key, value]: [string, any]) =>
                          value && (
                            <div
                              key={key}
                              className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-white"
                            >
                              <div className="p-2 rounded-lg bg-slate-50">
                                {key.toLowerCase().includes('phone') ||
                                key.toLowerCase().includes('mobile') ? (
                                  <Phone className="w-4 h-4 text-slate-400" />
                                ) : key.toLowerCase().includes('email') ? (
                                  <Mail className="w-4 h-4 text-slate-400" />
                                ) : (
                                  <User className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}
                                </p>
                                <p className="text-sm font-medium text-slate-700">
                                  {String(value)}
                                </p>
                              </div>
                            </div>
                          )
                      )}
                    </div>
                  </CollapsibleSection>
                );
              })()}

              {/* Item Prices Breakdown */}
              {(() => {
                const itemPrices = quote.itemPrices as any[] | undefined;

                if (!itemPrices || !Array.isArray(itemPrices) || itemPrices.length === 0)
                  return null;

                return (
                  <CollapsibleSection
                    title="Item Price Breakdown"
                    icon={<DollarSign className="w-5 h-5" />}
                  >
                    <div className="space-y-2">
                      {itemPrices.map((item: any, i: number) => (
                        <div
                          key={i}
                          className="p-3 rounded-lg border border-slate-100 bg-white flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-700">
                              {item.name || item.item || item.description || `Item ${i + 1}`}
                            </p>
                            {item.quantity && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                Qty: {item.quantity} × ZMW{' '}
                                {(item.unitPrice || item.price || 0).toLocaleString()}
                              </p>
                            )}
                          </div>
                          <p className="text-sm font-bold text-brand-dark ml-4">
                            ZMW {(item.total || item.price || item.unitPrice || 0).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CollapsibleSection>
                );
              })()}

              {/* Requirements/Specifications */}
              {(() => {
                const requirements = quote.requirements as any[] | undefined;

                if (!requirements || !Array.isArray(requirements) || requirements.length === 0)
                  return null;

                return (
                  <CollapsibleSection
                    title="Requirements & Specifications"
                    icon={<FileText className="w-5 h-5" />}
                  >
                    <div className="space-y-2">
                      {requirements.map((req: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg border border-slate-100 bg-white">
                          <p className="text-sm font-medium text-slate-700 mb-1">
                            {req.name || req.title || req.requirement || `Requirement ${i + 1}`}
                          </p>
                          {req.description && (
                            <p className="text-xs text-slate-500 italic">{req.description}</p>
                          )}
                          {req.quantity && (
                            <p className="text-xs text-slate-400 mt-1">Qty: {req.quantity}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleSection>
                );
              })()}

              {/* Additional Dynamic Fields */}
              {(() => {
                const dynamicFields = robustParse(quote.dynamicFields) || {};
                const excludedKeys = [
                  'referencePhotos',
                  'whatIsIncluded',
                  'venueAmenities',
                  'servicesIncluded',
                  'proformaInvoice',
                  'rateUnit',
                  'securityDeposit',
                  'maxCapacity',
                  'numberOfWorkers',
                  'availabilityDate',
                  'leadTime',
                ];

                const additionalFields = Object.entries(dynamicFields).filter(
                  ([key]) => !excludedKeys.includes(key) && dynamicFields[key]
                );

                if (additionalFields.length === 0) return null;

                return (
                  <CollapsibleSection
                    title="Additional Information"
                    icon={<AlertCircle className="w-5 h-5" />}
                  >
                    <div className="space-y-3">
                      {additionalFields.map(([key, value]) => {
                        if (!value) return null;

                        return (
                          <div
                            key={key}
                            className="p-3 rounded-lg border border-slate-100 bg-white"
                          >
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </p>
                            {Array.isArray(value) ? (
                              <div className="flex flex-wrap gap-2">
                                {value.map((v: any, i: number) => (
                                  <span
                                    key={i}
                                    className="px-2 py-1 bg-slate-50 border border-slate-100 rounded text-xs text-slate-600"
                                  >
                                    {String(v)}
                                  </span>
                                ))}
                              </div>
                            ) : typeof value === 'object' ? (
                              <div className="text-xs text-slate-600 p-2 bg-slate-50 rounded border border-slate-100 font-mono">
                                {JSON.stringify(value, null, 2)}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-700">{String(value)}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleSection>
                );
              })()}
            </div>
          </div>

          {/* Inquiry Reference */}
          {inquiry && (
            <div className="bg-white p-5 sm:p-8 rounded-3xl sm:rounded-4xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-brand-dark mb-4">Inquiry Reference</h3>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <h4 className="font-bold text-brand-dark mb-2">{inquiry.title}</h4>
                {inquiry.description && (
                  <p className="text-sm text-slate-500 mb-4">{inquiry.description}</p>
                )}

                {/* Inquiry Attributes (The "Provided Information") */}
                {inquiry.attributes && Object.keys(inquiry.attributes).length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-200/50">
                    {Object.entries(inquiry.attributes).map(([key, value]) => {
                      if (!value || key === 'description' || key === 'title') return null;
                      return (
                        <div key={key}>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </p>
                          <p className="text-xs font-bold text-slate-700">
                            {(() => {
                              if (Array.isArray(value)) return value.join(' • ');
                              if (typeof value === 'object' && value !== null) {
                                try {
                                  // If it's an object with a 'name' or 'title' property, use that
                                  if ((value as any).name) return (value as any).name;
                                  if ((value as any).title) return (value as any).title;
                                  return 'Multiple Items';
                                } catch (e) {
                                  return 'Complex Data';
                                }
                              }
                              if (typeof value === 'boolean') return value ? 'Yes' : 'No';
                              return String(value);
                            })()}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Actions */}
        <div className="space-y-6">
          {/* Process-Aware Action Bar */}
          <div className="bg-brand-dark p-5 sm:p-8 rounded-3xl sm:rounded-4xl text-white shadow-xl shadow-slate-200">
            <h3 className="text-xl font-serif font-bold mb-4">
              {quote.processType === 'EXPRESS' ? 'Ready to pay?' : 'Ready to proceed?'}
            </h3>

            {/* Progress Indicator for Standard */}
            {quote.processType === 'STANDARD' && (
              <div className="mb-6">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  <span>Inquiry</span>
                  <span>PO Pending</span>
                  <span>Payment</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-[#C9973A] w-1/3"></div>
                </div>
              </div>
            )}

            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              {quote.processType === 'EXPRESS'
                ? 'Pay now to start the service immediately.'
                : 'Generate a Purchase Order to formalize this transaction.'}
            </p>

            {/* Promote to Pay (Venue Specific) */}
            {(() => {
              const dynamicFields = robustParse(quote.dynamicFields) || {};
              const isVenue = !!(dynamicFields.securityDeposit || dynamicFields.venueAmenities);
              if (!isVenue) return null;

              return (
                <div className="mb-8 p-4 bg-white/5 rounded-2xl border border-white/10 flex items-start gap-3">
                  <div className="p-2 bg-[#C9973A]/20 rounded-xl">
                    <Sparkles className="w-4 h-4 text-[#C9973A]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white mb-1">Secure Your Date!</p>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Payments for venues are held in <span className="text-white">Nyuwe Escrow</span> until your event is completed successfully.
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Document Section */}
            {quote.dynamicFields?.proformaInvoice && (
              <div className="mb-6">
                <Button
                  variant="outline"
                  onClick={() => window.open(quote.dynamicFields?.proformaInvoice, '_blank')}
                  className="w-full py-3 border-white/10 text-white hover:bg-white/5 text-xs"
                >
                  View Proforma Invoice
                </Button>
              </div>
            )}

            <div className="space-y-3">
              {financingActive ? (
                <div className="py-4 px-5 bg-[#C9973A]/10 border border-[#C9973A]/30 rounded-2xl space-y-3">
                  <div className="flex items-start gap-3">
                    <Landmark className="w-5 h-5 text-[#C9973A] shrink-0" />
                    <p className="text-white/90 text-sm font-bold leading-snug">
                      Financing in progress — a lender is reviewing your salary-backed loan. Next,{' '}
                      <span className="underline">accept an offer under Loan Offers</span>; the lender
                      then pays the seller and your item is released.
                    </p>
                  </div>
                  <button
                    onClick={handleCancelFinancing}
                    disabled={cancellingFinancing}
                    className="w-full py-3 rounded-xl border border-white/15 text-white/70 hover:text-white hover:bg-white/5 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                  >
                    {cancellingFinancing ? 'Cancelling…' : 'Cancel & pay another way'}
                  </button>
                </div>
              ) : paid ? (
                <div className="flex items-center gap-3 py-4 px-5 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <p className="text-emerald-300 text-sm font-bold">Payment initiated! Awaiting provider confirmation.</p>
                </div>
              ) : expired ? (
                <div className="flex items-center gap-3 py-4 px-5 bg-white/5 border border-white/10 rounded-2xl">
                  <AlertCircle className="w-5 h-5 text-slate-400 shrink-0" />
                  <p className="text-slate-300 text-sm font-bold">
                    This quote has expired ({quote.expiryDuration || 'validity window'} elapsed) — request a new quotation.
                  </p>
                </div>
              ) : (
                <Button
                  // Both process types now END in the same real payment — the
                  // Order (the "PO") is minted by the backend only after the
                  // PSP verifies the money, so "Generate PO" opens the pay
                  // sheet rather than writing an unpaid order.
                  onClick={() => setShowPayModal(true)}
                  className={`w-full py-4 ${
                    quote.processType === 'EXPRESS'
                      ? 'bg-[#C9973A] hover:bg-[#b08432]'
                      : 'bg-white !text-[#1B3068] hover:bg-slate-100'
                  } border-none shadow-lg shadow-[#C9973A]/20`}
                >
                  {quote.processType === 'EXPRESS' ? 'Pay & Start Service' : 'Generate Purchase Order (PO)'}
                </Button>
              )}
              {!paid && !financingActive && (
                <Button
                  variant="outline"
                  onClick={() => onAction('archive_quote', quote)}
                  className="w-full py-4 border-white/10 text-white hover:bg-white/5"
                >
                  Decline Offer
                </Button>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-4xl border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-brand-dark mb-4">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handlePrint}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all"
              >
                <Printer className="w-5 h-5 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Print</span>
              </button>
              <button
                onClick={() => onAction('share_quote', quote)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all"
              >
                <ArrowRight className="w-5 h-5 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Share</span>
              </button>
              <button
                onClick={() => onAction('delete_quote', quote)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-slate-100 hover:bg-rose-50 hover:border-rose-100 group transition-all"
              >
                <X className="w-5 h-5 text-slate-400 group-hover:text-rose-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase group-hover:text-rose-600">Delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </>
);
}
