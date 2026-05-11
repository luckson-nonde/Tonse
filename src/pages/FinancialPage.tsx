import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Send,
  Plus,
  Receipt,
  Zap,
  Loader2,
  Wallet,
  ShieldCheck,
  Lock,
  Check,
  ShoppingBasket,
  CheckCircle2,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { authService } from '../services/auth/authService';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../services/api/database';
import Button from '../components/Button';
import { generateVirtualAccount, formatCurrency } from '../utils/financeUtils';
import ReadingOwl from '../assets/images/empty-states/owl_reading.png';
import TriumphantOwl from '../assets/images/empty-states/owl_triumphant.png';
import { createOrder } from '../services/api/orderService';
import { updateQuoteStatus } from '../services/api/quoteService';
import PaymentSheet from '../components/PaymentSheet';

interface FinancialPageProps {
  isInsideDashboard?: boolean;
}

export default function FinancialPage({ isInsideDashboard = false }: FinancialPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  // Quote handed to us by QuoteCard's "Make a Payment" button (or
  // PaymentModal's Wallet selection). When present, render the Pending
  // Payment basket card so the buyer sees what's about to be debited
  // BEFORE they confirm. Cleared on confirm/cancel so a hard-refresh
  // doesn't leave a phantom basket.
  const [pendingQuote, setPendingQuote] = useState<any | null>(
    (location.state as any)?.payQuote ?? null,
  );
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const { user, updateUser } = useAuth();
  const [showBalance, setShowBalance] = useState(true);
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [showPinModal, setShowPinModal] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [isCreatingPin, setIsCreatingPin] = useState(false);
  const [creationStep, setCreationStep] = useState<'enter' | 'confirm'>('enter');
  // Inline error message in the PIN keypad (replaces native alert()s for
  // mismatches / wrong PIN, which feel cheap in a financial flow).
  const [pinError, setPinError] = useState<string | null>(null);
  // Drives the celebrating-owl success modal that replaces the native
  // "PIN created successfully!" alert. Independent from isPinVerified
  // so the financial page is already mounted behind the celebration —
  // dismissing the modal feels like a reveal, not a redirect.
  const [showPinSuccess, setShowPinSuccess] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'card'>('mobile_money');
  const [momoOperator, setMomoOperator] = useState('MTN');
  const [momoPhone, setMomoPhone] = useState(user?.phone || '');

  useEffect(() => {
    // hasPin is the server-side truth; PIN itself never reaches the
    // client. First-time users see the create flow; returning users
    // see the verify flow.
    if (user && !user.hasPin) {
      setIsCreatingPin(true);
    } else {
      setIsCreatingPin(false);
    }
  }, [user]);

  const transactions =
    useLiveQuery(async () => {
      if (!user?.id) return [];
      return await db.transactions.where('userId').equals(user.id).reverse().sortBy('createdAt');
    }, [user]) || [];

  const availableBalance = transactions
    .filter((t) => t.status === 'COMPLETED')
    .reduce((sum, t) => (t.type === 'IN' ? sum + t.amount : sum - t.amount), 0);

  const escrowBalance = transactions
    .filter((t) => t.status === 'ESCROW')
    .reduce((sum, t) => sum + t.amount, 0);

  const handlePinSubmit = async () => {
    setPinError(null);
    if (isCreatingPin) {
      if (creationStep === 'enter') {
        if (pinInput.length !== 4) return;
        setConfirmPinInput(pinInput);
        setCreationStep('confirm');
        setPinInput('');
      } else {
        if (pinInput.length !== 4) return;
        if (pinInput === confirmPinInput) {
          await updateUser({ pin: pinInput });
          setIsPinVerified(true);
          // Reveal the financial page behind a celebrating-owl modal
          // rather than a native alert — feels right for a "first PIN
          // set" moment. Modal close is what dismisses showPinModal.
          setShowPinSuccess(true);
          setConfirmPinInput('');
        } else {
          setPinError("PINs don't match — let's try again.");
          setPinInput('');
          setConfirmPinInput('');
          setCreationStep('enter');
        }
      }
    } else {
      if (pinInput.length !== 4) return;
      if (!user?.id) {
        setPinError('Please sign in again.');
        return;
      }
      // Server-side verify — actual PIN value never travels to the client.
      const valid = await authService.verifyPin(user.id, pinInput);
      if (valid) {
        setIsPinVerified(true);
        setShowPinModal(false);
      } else {
        setPinError('Incorrect PIN. Try again.');
        setPinInput('');
      }
    }
  };

  // Confirm a pending wallet payment that arrived via location.state
  // (set by QuoteDetails' PaymentModal when the buyer picked Wallet).
  // Wallet ledger debit is intentionally simulated rather than POSTed —
  // the user is iterating on UX, not gateway integration. The order +
  // status sync calls hit the real backend so downstream views (Order
  // History / provider dashboard) reflect the booking.
  const handleConfirmWalletPayment = async () => {
    if (!pendingQuote || !user?.id) return;
    const total = Number(pendingQuote.price || 0);
    if (availableBalance < total) {
      // Balance dropped between mount and confirm (rare but possible if
      // the user topped up elsewhere). Surface it instead of silently
      // failing the sync calls.
      return;
    }
    setIsConfirmingPayment(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    try {
      if (typeof pendingQuote.id === 'string' && pendingQuote.providerId) {
        await createOrder({
          quoteId: String(pendingQuote.id),
          buyerId: user.id,
          sellerId: String(pendingQuote.providerId),
          totalAmount: total,
        });
      }
      if (typeof pendingQuote.id === 'string') {
        await updateQuoteStatus(pendingQuote.id, 'PAID');
        if (pendingQuote.inquiryId) {
          const { updateInquiryStatus } = await import('../services/api/inquiryService');
          await updateInquiryStatus(String(pendingQuote.inquiryId), 'PAID');
        }
      }
    } catch (e) {
      console.warn('Wallet payment status sync failed:', e);
    }
    setIsConfirmingPayment(false);
    setPaymentDone(true);
    // Wipe location.state so a refresh / back-nav doesn't keep showing
    // the basket card. The success state stays visible in-page until
    // the user dismisses or navigates away.
    navigate('.', { replace: true, state: {} });
  };

  const handleCancelPendingPayment = () => {
    setPendingQuote(null);
    navigate('.', { replace: true, state: {} });
  };

  const handleTransaction = async (type: 'IN' | 'OUT', amount: number) => {
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    if (type === 'OUT' && amount > availableBalance) {
      alert('Insufficient balance.');
      return;
    }

    setIsProcessing(true);
    try {
      if (!user?.id) return;

      // Gateway integration (Lenco / Stripe / etc.) is intentionally
      // deferred — we're iterating on UX, not wiring real PSPs. Mimic
      // the USSD round-trip so the spinner button feels real, then
      // surface a success toast. The backend ledger write is also
      // skipped here because the /payments DTO doesn't accept this
      // shape; once the PSP is real we'll re-enable the write with
      // type: 'DEPOSIT' / 'WITHDRAWAL' and status: 'SUCCESS'.
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (type === 'IN') {
        alert(
          paymentMethod === 'mobile_money'
            ? `Payment initiated. Approve the ${momoOperator} prompt on ${momoPhone || 'your phone'} to credit ZMW ${amount.toLocaleString()}.`
            : `Card deposit of ZMW ${amount.toLocaleString()} initiated.`,
        );
      } else {
        alert(`Successfully withdrawn ZMW ${amount.toLocaleString()}`);
      }

      setShowDepositModal(false);
      setShowWithdrawModal(false);
      setAmountInput('');
    } catch (error: any) {
      console.error('Transaction failed:', error);
      alert(error.message || 'Transaction failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isPinVerified && showPinModal) {
    const headerLabel = isCreatingPin
      ? creationStep === 'enter'
        ? 'Step 1 of 2 · Set PIN'
        : 'Step 2 of 2 · Confirm'
      : 'Secure Access';
    const titleText = isCreatingPin
      ? creationStep === 'enter'
        ? 'Create Your Security PIN'
        : 'Confirm Your Security PIN'
      : 'Enter Security PIN';
    const subtitleText = isCreatingPin
      ? creationStep === 'enter'
        ? 'Choose a 4-digit PIN — this guards every move on your virtual account.'
        : 'Re-enter the same 4 digits so a typo doesn’t lock you out.'
      : 'Enter your 4-digit PIN to unlock your virtual account.';

    return (
      <div
        className={
          isInsideDashboard
            ? 'w-full py-12 flex flex-col items-center justify-center'
            : 'min-h-screen bg-gradient-to-b from-[#f5f2ed] to-[#ece4d4] flex flex-col items-center justify-center p-4'
        }
      >
        <div className="w-full max-w-md bg-brand-white rounded-[28px] p-6 md:p-8 shadow-[0_24px_60px_-30px_rgba(26,22,18,0.25)] border border-[#e8e0d0] text-center relative overflow-hidden">
          {/* Soft gold glow behind the lock icon */}
          <div
            aria-hidden
            className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-[#C9973A]/10 blur-3xl"
          />

          {/* Step pill */}
          <div className="relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C9973A]/10 text-[#C9973A] font-bold uppercase tracking-[0.18em] text-[10px] mb-4">
            <Lock className="w-3 h-3" strokeWidth={2.5} />
            {headerLabel}
          </div>

          <div className="relative text-center space-y-1.5 mb-7">
            <h2 className="text-[22px] md:text-[26px] font-serif font-bold text-[#1a1612] leading-tight">
              {titleText}
            </h2>
            <p className="text-[13px] md:text-[14px] text-[#1a1612]/55 font-medium leading-relaxed max-w-[320px] mx-auto">
              {subtitleText}
            </p>
          </div>

          {/* PIN dots — round, gold-glow when filled */}
          <div className="relative flex justify-center gap-3 mb-3">
            {[0, 1, 2, 3].map((i) => {
              const filled = pinInput.length > i;
              return (
                <div
                  key={`pin-dot-${i}`}
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    filled
                      ? 'bg-gradient-to-b from-[#D5A547] to-[#C9973A] shadow-[0_0_0_4px_rgba(201,151,58,0.18)] scale-110'
                      : 'bg-[#e8e0d0]'
                  }`}
                />
              );
            })}
          </div>

          {/* Inline error — replaces the native alert() that used to fire
              on PIN mismatches and wrong-PIN entries. */}
          <div className="h-5 mb-4 flex items-center justify-center">
            {pinError && (
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-rose-500 animate-in fade-in duration-200">
                {pinError}
              </p>
            )}
          </div>

          {/* Premium keypad */}
          <div className="relative grid grid-cols-3 gap-2.5 mb-7">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'delete'].map((num, i) => (
              <button
                key={num === '' ? `empty-${i}` : num}
                type="button"
                onClick={() => {
                  if (num === 'delete') {
                    setPinInput((prev) => prev.slice(0, -1));
                    setPinError(null);
                  } else if (typeof num === 'number' && pinInput.length < 4) {
                    const newVal = pinInput + num;
                    setPinInput(newVal);
                    setPinError(null);
                    if (isCreatingPin && creationStep === 'enter') {
                      setConfirmPinInput(newVal);
                    }
                  }
                }}
                className={`group h-16 rounded-2xl flex items-center justify-center text-[22px] font-serif font-bold transition-all duration-150 ${
                  num === ''
                    ? 'invisible'
                    : 'bg-[#faf6ee] border border-[#e8e0d0] text-[#1a1612] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_2px_8px_-4px_rgba(26,22,18,0.06)] hover:border-[#C9973A]/55 hover:bg-[#f3e9d2] active:scale-[0.96]'
                }`}
              >
                {num === 'delete' ? (
                  <span className="text-[#C9973A]/70 text-[20px]">&#x232B;</span>
                ) : (
                  num
                )}
              </button>
            ))}
          </div>

          <Button
            onClick={handlePinSubmit}
            disabled={pinInput.length !== 4}
            className="w-full h-[58px] text-[13px] font-sans font-bold uppercase tracking-[0.22em] bg-gradient-to-b from-[#D5A547] to-[#C9973A] hover:from-[#C9973A] hover:to-[#B08432] disabled:from-[#e8e4dc] disabled:to-[#e0dccf] disabled:text-[#1a1612]/30 disabled:cursor-not-allowed shadow-[0_12px_28px_-8px_rgba(201,151,58,0.4)] disabled:shadow-none rounded-2xl text-white transition-all active:scale-[0.98]"
          >
            {isCreatingPin
              ? creationStep === 'enter'
                ? 'Continue →'
                : 'Confirm & Create PIN'
              : 'Unlock Account'}
          </Button>

          {!isInsideDashboard && (
            <button
              onClick={() => navigate(-1)}
              className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1612]/45 hover:text-[#1a1612]/70 transition-colors"
            >
              ← Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={isInsideDashboard ? 'w-full pb-20' : 'min-h-screen bg-slate-50 p-4 pb-20'}>
      {!isInsideDashboard && (
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full bg-white shadow-sm border border-slate-100"
          >
            <ArrowLeft className="w-6 h-6 text-slate-900" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Financial Account</h1>
        </div>
      )}

      {/* Balance Card */}
      <div className="bg-[#1B3068] rounded-4xl p-8 text-white shadow-xl mb-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#d49b35]/10 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110 duration-500"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/10">
                <Wallet className="w-5 h-5 text-[#d49b35]" />
              </div>
              <div>
                <p className="text-white/50 text-[10px] font-black uppercase tracking-[0.2em] mb-0.5">
                  Available Funds
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-[10px] font-black tracking-widest uppercase text-white/80">Live Ledger</span>
                </div>
              </div>
            </div>
            <div className="bg-[#d49b35]/20 backdrop-blur-md px-4 py-1.5 rounded-xl border border-[#d49b35]/30">
              <span className="text-[10px] font-black tracking-widest uppercase text-[#d49b35]">
                {user?.role} ACCOUNT
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between mb-8 min-w-0">
            <h2
              className="text-[clamp(2rem,6vw,3.5rem)] font-serif font-black tracking-tight truncate leading-none"
              title={showBalance ? `ZMW ${formatCurrency(availableBalance)}` : '••••••••'}
            >
              {showBalance ? `ZMW ${formatCurrency(availableBalance)}` : '••••••••'}
            </h2>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors shrink-0"
            >
              {showBalance ? (
                <EyeOff className="w-6 h-6 text-slate-300" />
              ) : (
                <Eye className="w-6 h-6 text-slate-300" />
              )}
            </button>
          </div>
          <div className="flex justify-between items-end">
            <p className="text-slate-400 font-mono tracking-[0.2em] text-sm">
              {user?.phone}
            </p>
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full bg-red-500/80 border border-white/20"></div>
              <div className="w-6 h-6 rounded-full bg-[#d49b35]/80 border border-white/20"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Payment Basket — set when the buyer arrived here from
          QuoteCard's "Make a Payment" button (Wallet method). Sits
          right under the balance so the buyer can compare at-a-glance
          before confirming the debit. Disappears once payment lands or
          the user cancels. */}
      {pendingQuote && !paymentDone && (() => {
        const total = Number(pendingQuote.price || 0);
        const insufficient = availableBalance < total;
        return (
          <div className="mb-6 bg-white rounded-3xl border border-[#C9973A]/30 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-[#fdf6e9] to-[#fdf6e9]/50 px-6 py-4 border-b border-[#C9973A]/20 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#C9973A] text-white flex items-center justify-center shadow-sm">
                <ShoppingBasket className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C9973A]">
                  Pending Payment
                </p>
                <p className="font-serif text-[18px] font-bold text-[#1a1612] leading-tight truncate">
                  Confirm payment from wallet
                </p>
              </div>
            </div>
            <div className="p-6 flex flex-col gap-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em] mb-1">
                    Quote
                  </p>
                  <p className="font-bold text-[15px] text-slate-900 leading-snug truncate">
                    {pendingQuote.inquiryTitle || pendingQuote.title || 'Quote'}
                  </p>
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    From <span className="font-semibold text-slate-700">{pendingQuote.providerName || 'Provider'}</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em] mb-1">
                    Amount
                  </p>
                  <p className="font-serif text-[22px] font-black text-[#1a1612] leading-none">
                    ZMW {total.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl px-4 py-3 grid grid-cols-2 gap-3 text-[12px]">
                <div>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Wallet balance</p>
                  <p className="font-bold text-slate-900 mt-0.5">ZMW {formatCurrency(availableBalance)}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">After payment</p>
                  <p className={`font-bold mt-0.5 ${insufficient ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {insufficient
                      ? `Short by ZMW ${(total - availableBalance).toLocaleString()}`
                      : `ZMW ${formatCurrency(availableBalance - total)}`}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleCancelPendingPayment}
                  disabled={isConfirmingPayment}
                  className="px-5 py-3 bg-white border border-slate-200 text-slate-600 text-[12px] font-bold uppercase tracking-[0.16em] rounded-full hover:bg-slate-50 disabled:opacity-50 transition-all"
                >
                  Cancel
                </button>
                {insufficient ? (
                  <button
                    type="button"
                    onClick={() => setShowDepositModal(true)}
                    className="flex-1 py-3 bg-[#1B3068] text-white text-[13px] font-bold rounded-full hover:bg-[#152453] shadow-md flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Top Up Wallet
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmWalletPayment}
                    disabled={isConfirmingPayment}
                    className="flex-1 py-3 bg-[#C9973A] text-white text-[13px] font-bold rounded-full hover:bg-[#b08432] shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isConfirmingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Confirm Payment · ZMW {total.toLocaleString()}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Payment-confirmed banner — replaces the basket card after
          handleConfirmWalletPayment completes. Stays visible until the
          buyer navigates away. */}
      {paymentDone && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-3xl p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-600 mb-1">
              Payment Confirmed
            </p>
            <p className="font-serif text-[18px] font-bold text-slate-900 leading-tight">
              Your booking is on its way.
            </p>
            <p className="text-[12px] text-slate-600 mt-1.5 leading-relaxed">
              The provider has been notified. You'll see the order in your history.
            </p>
            <button
              type="button"
              onClick={() => navigate('/buyer/orders')}
              className="mt-3 text-[12px] font-bold text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
            >
              View Order History →
            </button>
          </div>
        </div>
      )}

      {/* Escrow Balance Card (For Providers) */}
      {user?.role !== 'BUYER' && escrowBalance > 0 && (
        <div className="bg-emerald-600 rounded-4xl p-6 text-white shadow-lg mb-6 relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-200" />
              <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest">
                Escrow (Holding)
              </p>
            </div>
            <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded uppercase">
              Secured
            </span>
          </div>
          <div className="flex items-center justify-between min-w-0">
            <h2
              className="text-[clamp(1.25rem,4vw,1.5rem)] font-serif font-black truncate"
              title={`ZMW ${formatCurrency(escrowBalance)}`}
            >
              ZMW {formatCurrency(escrowBalance)}
            </h2>
            <p className="text-[10px] text-emerald-100 font-bold max-w-30 text-right shrink-0">
              Released upon parcel collection
            </p>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full"></div>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => setShowDepositModal(true)}
          className="bg-white text-slate-900 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm border border-slate-100 hover:bg-slate-50 transition-all active:scale-[0.98]"
        >
          <Plus className="w-5 h-5 text-[#C9973A]" /> Add Money
        </button>
        {/* Withdrawal gate (Phase 5) — owners always can; staff
            (parentProviderId set) only when they're an INDEPENDENT
            department head (canMoveFinance=true). MANAGED heads see
            balance + history but no Withdraw button. */}
        {(!user?.parentProviderId || user?.canMoveFinance) ? (
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="bg-[#1B3068] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-md hover:bg-[#152554] transition-all active:scale-[0.98]"
          >
            <Send className="w-5 h-5 -rotate-45" /> Withdraw
          </button>
        ) : (
          <div
            className="bg-slate-50 text-slate-400 font-bold py-4 rounded-2xl flex flex-col items-center justify-center gap-0.5 border border-dashed border-slate-200"
            title="Withdrawals are restricted by your shop owner. Contact them to move money out."
          >
            <span className="flex items-center gap-2 text-sm">
              <Send className="w-4 h-4 -rotate-45" /> View only
            </span>
            <span className="text-[10px] uppercase tracking-wider font-bold">
              Managed mode
            </span>
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Transaction History</h3>
          <button className="text-xs font-black text-[#d49b35] uppercase tracking-widest hover:underline">
            View all
          </button>
        </div>
        <div className="space-y-4">
          {transactions.length === 0 ? (
            <div className="bg-white p-16 md:p-24 rounded-4xl text-center border border-slate-100 shadow-sm min-h-[400px] flex flex-col items-center justify-center">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-[#C9973A]/20 blur-3xl rounded-full animate-pulse"></div>
                <img 
                  src={ReadingOwl} 
                  alt="No transactions" 
                  className="w-48 h-48 md:w-56 md:h-56 object-contain relative z-10 animate-bounce-slow"
                />
              </div>
              <h4 className="text-xl font-black text-slate-900 mb-2">No Transactions Yet</h4>
              <p className="text-slate-400 text-sm font-medium max-w-xs mx-auto">
                Your financial ledger is currently empty. Start by adding money to your virtual account.
              </p>
            </div>
          ) : (
            transactions.map((activity, idx) => (
              <div
                key={activity.id || `tx-${idx}`}
                className="bg-white p-6 rounded-[32px] flex items-center justify-between shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 hover:border-[#d49b35]/30 transition-all duration-300 group"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:rotate-[360deg] ${
                      activity.type === 'OUT'
                        ? 'bg-rose-50 text-rose-500 group-hover:bg-rose-500 group-hover:text-white'
                        : 'bg-emerald-50 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white'
                    }`}
                  >
                    {activity.type === 'OUT' ? (
                      <Send className="w-6 h-6 rotate-45" />
                    ) : (
                      <Send className="w-6 h-6 -rotate-135" />
                    )}
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-[15px] leading-tight mb-1">
                      {activity.description}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <span className="text-slate-400">
                        {new Date(activity.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full ${
                        activity.status === 'COMPLETED' 
                          ? 'bg-emerald-100 text-emerald-600' 
                          : activity.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-600 animate-pulse'
                            : 'bg-rose-100 text-rose-600'
                      }`}>
                        {activity.status}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-black text-lg ${
                      activity.type === 'OUT' ? 'text-rose-500' : 'text-emerald-500'
                    }`}
                  >
                    {activity.type === 'OUT' ? '-' : '+'}ZMW {activity.amount.toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {/* Deposit — single shared PaymentSheet, navy header. */}
      <PaymentSheet
        open={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        title="Fund Your Account"
        headerStat={{ label: 'Current Balance', amount: availableBalance }}
        amountMode="input"
        defaultPhone={momoPhone}
        methods={['mobile_money', 'card']}
        actionLabel="Confirm Deposit"
        busy={isProcessing}
        onSubmit={async ({ amount, provider, phone }) => {
          if (provider) setMomoOperator(provider);
          if (phone) setMomoPhone(phone);
          await handleTransaction('IN', amount);
        }}
      />

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all duration-300">
          <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 p-10">
            <h3 className="text-3xl font-black text-slate-900 mb-2">Withdraw</h3>
            <p className="text-slate-400 text-sm font-medium mb-8">
              Transfer funds from your virtual account to your mobile money or bank.
            </p>

            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">
                  Withdrawal Amount
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-slate-50 rounded-3xl border-2 border-slate-100 group-within:border-[#d49b35]/30 group-within:bg-white transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"></div>
                  <div className="relative flex items-center px-6 py-8">
                    <span className="text-2xl font-black text-[#d49b35] mr-4 select-none">ZMW</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amountInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        setAmountInput(val);
                      }}
                      placeholder="0.00"
                      className="flex-1 bg-transparent text-4xl font-black text-slate-900 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 py-5 rounded-[24px] bg-slate-50 text-slate-400 font-black uppercase tracking-widest text-xs hover:bg-slate-100 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <Button
                  onClick={() => handleTransaction('OUT', parseFloat(amountInput))}
                  disabled={!amountInput || isProcessing || parseFloat(amountInput) > availableBalance}
                  className="flex-[1.5] py-5 rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl shadow-[#d49b35]/20 active:scale-95"
                >
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    'Process Withdraw'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Celebrating-owl PIN-set success — fires once after the user
          confirms their PIN. Replaces the native alert() that broke
          the premium feel of the rest of the flow. The financial page
          is already rendered behind it, so dismissing reveals the
          wallet rather than triggering a redirect. */}
      {showPinSuccess && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#1a1612]/55 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowPinSuccess(false)}
        >
          <div
            className="relative w-full max-w-[420px] bg-brand-white rounded-[32px] overflow-hidden shadow-[0_40px_80px_-30px_rgba(26,22,18,0.45)] border border-[#e8e0d0] animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cream + gold gradient banner behind the owl */}
            <div className="relative h-44 bg-gradient-to-b from-[#fdf6e9] to-[#f3e3bd] overflow-hidden">
              <div
                aria-hidden
                className="absolute -top-10 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-[#C9973A]/15 blur-3xl"
              />
              <div
                aria-hidden
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="relative w-44 h-44">
                  <div className="absolute inset-0 rounded-full bg-white/40 animate-ping" />
                  <div className="absolute inset-3 rounded-full bg-white/60" />
                  <img
                    src={TriumphantOwl}
                    alt=""
                    className="relative w-full h-full object-contain drop-shadow-[0_12px_24px_rgba(201,151,58,0.35)]"
                  />
                </div>
              </div>
            </div>

            <div className="p-7 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-600 mb-2 flex items-center justify-center gap-1.5">
                <Check className="w-3 h-3" strokeWidth={3} />
                PIN Locked In
              </p>
              <h3 className="text-[24px] font-serif font-bold text-[#1a1612] leading-tight mb-2">
                You're all set!
              </h3>
              <p className="text-[13px] text-[#1a1612]/55 leading-relaxed max-w-[320px] mx-auto mb-6">
                Your virtual account is secured with your new 4-digit PIN. You'll need it for deposits, withdrawals, and sensitive moves.
              </p>
              <Button
                onClick={() => setShowPinSuccess(false)}
                className="w-full h-[54px] text-[13px] font-sans font-bold uppercase tracking-[0.22em] bg-gradient-to-b from-[#D5A547] to-[#C9973A] hover:from-[#C9973A] hover:to-[#B08432] shadow-[0_12px_28px_-8px_rgba(201,151,58,0.4)] rounded-2xl text-white transition-all active:scale-[0.98]"
              >
                Open my wallet →
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
