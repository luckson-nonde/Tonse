import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Send,
  Plus,
  CreditCard,
  Receipt,
  Wifi,
  Zap,
  Loader2,
  Wallet,
  ShieldCheck,
  Lock,
  Check,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { authService } from '../services/auth/authService';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../services/api/database';
import Button from '../components/Button';
import { generateVirtualAccount, formatCurrency } from '../utils/financeUtils';
import ReadingOwl from '../assets/images/empty-states/owl_reading.png';
import { lencoService } from '../services/api/lencoService';

interface FinancialPageProps {
  isInsideDashboard?: boolean;
}

export default function FinancialPage({ isInsideDashboard = false }: FinancialPageProps) {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [showBalance, setShowBalance] = useState(true);
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [showPinModal, setShowPinModal] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [isCreatingPin, setIsCreatingPin] = useState(false);
  const [creationStep, setCreationStep] = useState<'enter' | 'confirm'>('enter');
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
    if (isCreatingPin) {
      if (creationStep === 'enter') {
        if (pinInput.length !== 4) return;
        // Stash the first entry so the confirm step has something to
        // compare against. Previous code cleared pinInput without
        // saving it, so confirmPinInput stayed empty forever and the
        // equality check on the next step always failed — meaning the
        // PIN was never actually persisted via updateUser.
        setConfirmPinInput(pinInput);
        setCreationStep('confirm');
        setPinInput('');
      } else {
        if (pinInput.length !== 4) return;
        if (pinInput === confirmPinInput) {
          await updateUser({ pin: pinInput });
          setIsPinVerified(true);
          setShowPinModal(false);
          // Reset confirmation state so a re-open of the modal starts
          // clean (covers the rare "user signs out and a new user
          // signs in on the same browser tab" path).
          setConfirmPinInput('');
          alert('PIN created successfully!');
        } else {
          alert('PINs do not match. Please try again.');
          setPinInput('');
          setConfirmPinInput('');
          setCreationStep('enter');
        }
      }
    } else {
      if (pinInput.length !== 4) return;
      if (!user?.id) {
        alert('Please sign in again.');
        return;
      }
      // Server-side verify — actual PIN value never travels to the client.
      const valid = await authService.verifyPin(user.id, pinInput);
      if (valid) {
        setIsPinVerified(true);
        setShowPinModal(false);
      } else {
        alert('Incorrect PIN. Please try again.');
        setPinInput('');
      }
    }
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

      if (type === 'IN') {
        // Initiate real payment via Lenco
        if (paymentMethod === 'mobile_money') {
          await lencoService.initiateMobileMoneyCollection({
            amount: amount,
            phone: momoPhone,
            operator: momoOperator.toLowerCase(),
            reference: `TONSE-DEP-${Date.now()}`
          });
        }
        
        // Add pending transaction to ledger
        await db.transactions.add({
          userId: user.id as any,
          type: 'IN',
          amount: amount,
          description: `Deposit via ${paymentMethod === 'mobile_money' ? momoOperator : 'Card'}`,
          category: 'DEPOSIT',
          createdAt: Date.now(),
          status: 'PENDING',
        });

        alert('Payment initiated! Please check your phone for the prompt.');
      } else {
        // Withdrawal logic (remains mock for now)
        await db.transactions.add({
          userId: user.id as any,
          type: 'OUT',
          amount: amount,
          description: 'Withdrawal from Virtual Account',
          category: 'WITHDRAWAL',
          createdAt: Date.now(),
          status: 'COMPLETED',
        });
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
    return (
      <div className={isInsideDashboard ? 'w-full py-12 flex flex-col items-center justify-center' : 'min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4'}>
        <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-slate-100 text-center">
          <div className="w-12 h-12 bg-[#fdf6e9] rounded-2xl flex items-center justify-center text-[#d49b35] mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <div className="text-center space-y-1 mb-6">
            <h2 className="text-xl md:text-2xl font-serif font-bold text-brand-dark leading-tight">
              {isCreatingPin
                ? creationStep === 'enter'
                  ? 'Create Your Security PIN'
                  : 'Confirm Your Security PIN'
                : 'Enter Security PIN'}
            </h2>
            <p className="text-slate-500 md:text-[#64748b] font-sans text-[13px] md:text-[14px]">
              {isCreatingPin
                ? creationStep === 'enter'
                  ? 'Set a 4-digit PIN to secure your financial account.'
                  : 'Please re-enter your 4-digit PIN to confirm.'
                : 'Please enter your 4-digit PIN to access your account.'}
            </p>
          </div>

          <div className="flex justify-center gap-3 mb-6">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={`pin-dot-${i}`}
                className={`w-12 h-14 rounded-lg border-2 flex items-center justify-center text-xl font-bold transition-all ${
                  pinInput.length > i
                    ? 'border-[#d49b35] bg-[#fdf6e9] text-[#d49b35]'
                    : 'border-[#f1f5f9] bg-transparent text-slate-300'
                }`}
              >
                {pinInput[i] ? '•' : ''}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'delete'].map((num, i) => (
              <button
                key={num === '' ? `empty-${i}` : num}
                onClick={() => {
                  if (num === 'delete') {
                    setPinInput((prev) => prev.slice(0, -1));
                  } else if (typeof num === 'number' && pinInput.length < 4) {
                    const newVal = pinInput + num;
                    setPinInput(newVal);
                    if (isCreatingPin && creationStep === 'enter') {
                      setConfirmPinInput(newVal);
                    }
                  }
                }}
                className={`h-14 rounded-[14px] flex items-center justify-center text-[18px] font-bold transition-colors ${
                  num === ''
                    ? 'invisible'
                    : 'bg-slate-50 text-brand-dark hover:bg-slate-100 active:bg-slate-200'
                }`}
              >
                {num === 'delete' ? '⌫' : num}
              </button>
            ))}
          </div>

          <Button
            onClick={handlePinSubmit}
            disabled={pinInput.length !== 4}
            className="w-full py-3.5 text-[15px] shadow-md"
          >
            {isCreatingPin
              ? creationStep === 'enter'
                ? 'Continue'
                : 'Confirm & Create PIN'
              : 'Unlock Account'}
          </Button>

          {!isInsideDashboard && (
            <button
              onClick={() => navigate(-1)}
              className="mt-4 text-[13px] font-bold text-slate-400 hover:text-slate-600"
            >
              Go Back
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
        <button 
          onClick={() => setShowWithdrawModal(true)}
          className="bg-[#1B3068] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-md hover:bg-[#152554] transition-all active:scale-[0.98]"
        >
          <Send className="w-5 h-5 -rotate-45" /> Withdraw
        </button>
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
      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all duration-300">
          <div className="w-full max-w-lg bg-white rounded-[40px] shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[95vh] md:max-h-[85vh]">
            {/* Top Section: Account & Balance (Condensed Header) */}
            <div className="bg-gradient-to-r from-[#1B3068] to-[#12224d] p-6 md:p-8 text-white relative overflow-hidden shrink-0">
              <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#d49b35]/20 rounded-xl flex items-center justify-center border border-[#d49b35]/30">
                    <Wallet className="w-5 h-5 text-[#d49b35]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black leading-tight">Fund Your Account</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <ShieldCheck className="w-3 h-3 text-[#d49b35]" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#d49b35]/80">Secure Transaction</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowDepositModal(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-all text-white/50 hover:text-white"
                >
                   <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="mt-6 relative z-10 p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-black">Current Balance</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[10px] font-black text-[#d49b35]">ZMW</span>
                    <p className="text-xl font-black tabular-nums">{formatCurrency(availableBalance)}</p>
                  </div>
                </div>
              </div>

              {/* Decorative Background Elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#d49b35]/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
            </div>

            {/* Bottom Section: High-Density Intentional Form */}
            <div className="px-8 py-7 space-y-5 bg-white flex-1 overflow-y-auto scrollbar-hide">
              {/* 1. Amount Input (Defined Boundaries) */}
              <div className="space-y-2.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] block ml-1">
                  Amount to Add
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-slate-50 rounded-2xl border border-slate-200 transition-all group-within:border-[#d49b35]/40 group-within:bg-white group-within:shadow-[0_0_0_4px_rgba(212,155,53,0.05)] shadow-sm"></div>
                  <div className="relative flex items-center px-6 py-4">
                    <div className="flex items-center gap-3 pr-4 border-r-2 border-slate-200/60">
                      <span className="text-lg font-black text-[#d49b35]">ZMW</span>
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amountInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setAmountInput(val);
                        }
                      }}
                      placeholder="0.00"
                      className="flex-1 bg-transparent text-3xl font-black text-slate-900 outline-none placeholder:text-slate-300 ml-5"
                      autoFocus
                    />
                  </div>
                </div>
              </div>

              {/* 2. Phone Number (Visible Envelope) */}
              {paymentMethod === 'mobile_money' && (
                <div className="space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-300">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] block ml-1">
                    Phone Number
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-slate-50 rounded-2xl border border-slate-200 transition-all group-within:border-[#d49b35]/40 group-within:bg-white shadow-sm"></div>
                    <div className="relative flex items-center">
                      <input
                        type="tel"
                        value={momoPhone}
                        onChange={(e) => setMomoPhone(e.target.value)}
                        placeholder="097XXXXXXXX"
                        className="w-full bg-transparent px-6 py-4 font-black text-slate-900 outline-none text-base tracking-widest placeholder:text-slate-300"
                      />
                      <div className="absolute right-5 top-1/2 -translate-y-1/2">
                        <div className="w-6 h-6 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100">
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Payment Method (High-Contrast Row) */}
              <div className="space-y-2.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] block ml-1">
                  Payment Method
                </label>
                <div className="flex gap-2 p-1 bg-slate-100/50 rounded-2xl border border-slate-200 shadow-inner">
                  <button
                    onClick={() => setPaymentMethod('mobile_money')}
                    className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2.5 transition-all border ${
                      paymentMethod === 'mobile_money' 
                        ? 'bg-white shadow-md border-slate-100 text-[#d49b35]' 
                        : 'border-transparent text-slate-400 hover:text-slate-500 hover:bg-white/40'
                    }`}
                  >
                    <Wifi className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Mobile</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2.5 transition-all border ${
                      paymentMethod === 'card' 
                        ? 'bg-white shadow-md border-slate-100 text-[#d49b35]' 
                        : 'border-transparent text-slate-400 hover:text-slate-500 hover:bg-white/40'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Bank Card</span>
                  </button>
                </div>
              </div>

              {/* 4. Provider Selection (Sharp Pill Selector) */}
              {paymentMethod === 'mobile_money' && (
                <div className="space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-300">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] block ml-1">
                    Select Provider
                  </label>
                  <div className="flex gap-2 p-1 bg-slate-100/50 rounded-2xl border border-slate-200 shadow-inner">
                    {['MTN', 'Airtel', 'Zamtel'].map((op) => (
                      <button
                        key={op}
                        onClick={() => setMomoOperator(op)}
                        className={`flex-1 py-2.5 rounded-xl font-black text-[9px] tracking-widest transition-all uppercase border ${
                          momoOperator === op
                            ? 'bg-[#1B3068] text-white shadow-lg border-blue-900'
                            : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-white/40'
                        }`}
                      >
                        {op}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons (Always Visible) */}
              <div className="flex gap-4 pt-4 border-t border-slate-50">
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="flex-1 py-4 rounded-2xl text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <Button
                  onClick={() => handleTransaction('IN', parseFloat(amountInput))}
                  disabled={!amountInput || isProcessing || (paymentMethod === 'mobile_money' && !momoPhone)}
                  className="flex-[1.5] py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-[#d49b35]/20"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    'Confirm Deposit'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
