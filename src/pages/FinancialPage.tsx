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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../services/api/database';
import Button from '../components/Button';
import { generateVirtualAccount, formatCurrency } from '../utils/financeUtils';
import ReadingOwl from '../assets/images/empty-states/owl_reading.png';

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

  useEffect(() => {
    if (user && !user.pin) {
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
        setCreationStep('confirm');
        setPinInput('');
      } else {
        if (pinInput.length !== 4) return;
        if (pinInput === confirmPinInput) {
          await updateUser({ pin: pinInput });
          setIsPinVerified(true);
          setShowPinModal(false);
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
      if (pinInput === user?.pin) {
        setIsPinVerified(true);
        setShowPinModal(false);
      } else {
        alert('Incorrect PIN. Please try again.');
        setPinInput('');
      }
    }
  };

  const handleTransaction = async (type: 'IN' | 'OUT') => {
    const amount = parseFloat(amountInput);
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

      await db.transactions.add({
        userId: user.id as any,
        type: type,
        amount: amount,
        description: type === 'IN' ? 'Deposit to Virtual Account' : 'Withdrawal from Virtual Account',
        category: type === 'IN' ? 'DEPOSIT' : 'WITHDRAWAL',
        createdAt: Date.now(),
        status: 'COMPLETED',
      });

      setShowDepositModal(false);
      setShowWithdrawModal(false);
      setAmountInput('');
      alert(`Successfully ${type === 'IN' ? 'deposited' : 'withdrawn'} ZMW ${amount.toLocaleString()}`);
    } catch (error) {
      console.error('Transaction failed:', error);
      alert('Transaction failed. Please try again.');
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
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-slate-300" />
              <p className="text-slate-300 text-xs font-bold uppercase tracking-widest">
                Available Balance
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
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
              {user?.virtualAccountNumber || generateVirtualAccount(user?.phone)}
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
                className="bg-white p-5 rounded-3xl flex items-center justify-between shadow-sm border border-slate-100 hover:border-[#d49b35]/20 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                      activity.type === 'OUT'
                        ? 'bg-rose-50 text-rose-500'
                        : 'bg-emerald-50 text-emerald-500'
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
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                      {new Date(activity.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      • {activity.status}
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-100 animate-in slide-in-from-bottom duration-300 flex flex-col">
            <div className="p-8 overflow-y-auto flex-1 scrollbar-hide">
              <h3 className="text-2xl font-black text-slate-900 mb-2">Add Money</h3>
              <p className="text-slate-500 text-sm font-medium mb-8">
                Enter the amount you want to add to your virtual account.
              </p>

              <div className="space-y-6 mb-8">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                    Amount (ZMW)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-50 rounded-2xl border border-slate-100 p-6 text-3xl font-black text-slate-900 outline-none focus:border-[#d49b35] transition-colors"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      ZMW
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[100, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setAmountInput(amt.toString())}
                      className="py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-600 font-bold text-sm hover:bg-slate-100 transition-colors"
                    >
                      + {amt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 pt-0 flex gap-4 shrink-0">
              <button
                onClick={() => {
                  setShowDepositModal(false);
                  setAmountInput('');
                }}
                className="flex-1 py-4 rounded-2xl font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <Button
                onClick={() => handleTransaction('IN')}
                disabled={isProcessing || !amountInput}
                className="flex-1 py-4 rounded-2xl font-bold"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  'Confirm Add'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-100 animate-in slide-in-from-bottom duration-300 flex flex-col">
            <div className="p-8 overflow-y-auto flex-1 scrollbar-hide">
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center text-rose-500">
                  <Send className="w-4 h-4 rotate-135" />
                 </div>
                 <h3 className="text-2xl font-black text-slate-900">Withdraw Money</h3>
              </div>
              <p className="text-slate-500 text-sm font-medium mb-8">
                Transfer funds from your virtual account to your mobile money or bank account.
              </p>

              <div className="space-y-6 mb-8">
                <div className="bg-[#1B3068]/5 rounded-2xl p-4 border border-[#1B3068]/10">
                   <p className="text-[10px] font-bold text-[#1B3068]/40 uppercase tracking-widest mb-1">Available Balance</p>
                   <p className="text-lg font-black text-[#1B3068]">ZMW {formatCurrency(availableBalance)}</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                    Withdrawal Amount (ZMW)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-50 rounded-2xl border border-slate-100 p-6 text-3xl font-black text-slate-900 outline-none focus:border-[#d49b35] transition-colors"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      ZMW
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[100, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setAmountInput(amt.toString())}
                      className="py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-600 font-bold text-sm hover:bg-slate-100 transition-colors"
                    >
                      + {amt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 pt-0 flex gap-4 shrink-0">
              <button
                onClick={() => {
                  setShowWithdrawModal(false);
                  setAmountInput('');
                }}
                className="flex-1 py-4 rounded-2xl font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <Button
                onClick={() => handleTransaction('OUT')}
                disabled={isProcessing || !amountInput || parseFloat(amountInput) > availableBalance}
                className="flex-1 py-4 rounded-2xl font-bold bg-[#1B3068]"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  'Confirm Withdrawal'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
