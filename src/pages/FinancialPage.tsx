import React, { useState, useEffect } from 'react';
import { ArrowLeft, Eye, EyeOff, Send, Plus, CreditCard, Receipt, Wifi, Zap, Loader2, Wallet, ShieldCheck, Lock, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../services/api/database';
import Button from '../components/Button';

export default function FinancialPage() {
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
  const [depositAmount, setDepositAmount] = useState('');
  const [isProcessingDeposit, setIsProcessingDeposit] = useState(false);

  useEffect(() => {
    if (user && !user.pin) {
      setIsCreatingPin(true);
    } else {
      setIsCreatingPin(false);
    }
  }, [user]);

  const transactions = useLiveQuery(
    async () => {
      if (!user?.id) return [];
      return await db.transactions
        .where('userId')
        .equals(user.id)
        .reverse()
        .sortBy('createdAt');
    },
    [user]
  ) || [];

  const availableBalance = transactions
    .filter(t => t.status === 'COMPLETED')
    .reduce((sum, t) => t.type === 'IN' ? sum + t.amount : sum - t.amount, 0);

  const escrowBalance = transactions
    .filter(t => t.status === 'ESCROW')
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

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    setIsProcessingDeposit(true);
    try {
      if (!user?.id) return;

      await db.transactions.add({
        userId: user.id,
        type: 'IN',
        amount: amount,
        description: 'Deposit to Virtual Account',
        category: 'DEPOSIT',
        createdAt: Date.now(),
        status: 'COMPLETED'
      });

      setShowDepositModal(false);
      setDepositAmount('');
      alert(`Successfully deposited ZMW ${amount.toLocaleString()}`);
    } catch (error) {
      console.error('Deposit failed:', error);
      alert('Deposit failed. Please try again.');
    } finally {
      setIsProcessingDeposit(false);
    }
  };

  if (!isPinVerified && showPinModal) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-[24px] p-6 shadow-xl border border-slate-100 text-center">
          <div className="w-12 h-12 bg-[#fdf6e9] rounded-2xl flex items-center justify-center text-[#d49b35] mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <div className="text-center space-y-1 mb-6">
            <h2 className="text-[20px] md:text-[22px] font-serif font-bold text-[#1e293b] leading-tight">
              {isCreatingPin 
                ? (creationStep === 'enter' ? 'Create Your Security PIN' : 'Confirm Your Security PIN') 
                : 'Enter Security PIN'}
            </h2>
            <p className="text-slate-500 md:text-[#64748b] font-sans text-[13px] md:text-[14px]">
              {isCreatingPin 
                ? (creationStep === 'enter' 
                    ? 'Set a 4-digit PIN to secure your financial account.' 
                    : 'Please re-enter your 4-digit PIN to confirm.') 
                : 'Please enter your 4-digit PIN to access your account.'}
            </p>
          </div>

          <div className="flex justify-center gap-3 mb-6">
            {[0, 1, 2, 3].map((i) => (
              <div 
                key={`pin-dot-${i}`} 
                className={`w-12 h-14 rounded-[12px] border-2 flex items-center justify-center text-xl font-bold transition-all ${
                  pinInput.length > i ? 'border-[#d49b35] bg-[#fdf6e9] text-[#d49b35]' : 'border-[#f1f5f9] bg-transparent text-slate-300'
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
                    setPinInput(prev => prev.slice(0, -1));
                  } else if (typeof num === 'number' && pinInput.length < 4) {
                    const newVal = pinInput + num;
                    setPinInput(newVal);
                    if (isCreatingPin && creationStep === 'enter') {
                      setConfirmPinInput(newVal);
                    }
                  }
                }}
                className={`h-14 rounded-[14px] flex items-center justify-center text-[18px] font-bold transition-colors ${
                  num === '' ? 'invisible' : 'bg-[#f8fafc] text-[#1e293b] hover:bg-[#f1f5f9] active:bg-[#e2e8f0]'
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
              ? (creationStep === 'enter' ? 'Continue' : 'Confirm & Create PIN') 
              : 'Unlock Account'}
          </Button>
          
          <button 
            onClick={() => navigate(-1)}
            className="mt-4 text-[13px] font-bold text-slate-400 hover:text-slate-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-white shadow-sm border border-slate-100">
          <ArrowLeft className="w-6 h-6 text-slate-900" />
        </button>
        <h1 className="text-xl font-bold text-slate-900">Financial Account</h1>
      </div>

      {/* Balance Card */}
      <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-xl mb-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#d49b35]/10 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110 duration-500"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-slate-300" />
              <p className="text-slate-300 text-xs font-bold uppercase tracking-widest">Available Balance</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
              <span className="text-[10px] font-black tracking-widest uppercase text-[#d49b35]">{user?.role} ACCOUNT</span>
            </div>
          </div>
          <div className="flex items-center justify-between mb-8 min-w-0">
            <h2 className="text-[clamp(1.5rem,5vw,2.25rem)] font-black tracking-tight truncate" title={showBalance ? `ZMW ${availableBalance.toLocaleString()}` : '••••••••'}>
              {showBalance ? `ZMW ${availableBalance.toLocaleString()}` : '••••••••'}
            </h2>
            <button onClick={() => setShowBalance(!showBalance)} className="p-2 hover:bg-white/10 rounded-full transition-colors flex-shrink-0">
              {showBalance ? <EyeOff className="w-6 h-6 text-slate-300" /> : <Eye className="w-6 h-6 text-slate-300" />}
            </button>
          </div>
          <div className="flex justify-between items-end">
            <p className="text-slate-400 font-mono tracking-widest text-sm">
              {user?.virtualAccountNumber 
                ? user.virtualAccountNumber.match(/.{1,4}/g)?.join(' ') 
                : `**** **** **** ${user?.id?.toString().padStart(4, '0') || '0000'}`}
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
        <div className="bg-emerald-600 rounded-[32px] p-6 text-white shadow-lg mb-6 relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-200" />
              <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest">Escrow (Holding)</p>
            </div>
            <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded uppercase">Secured</span>
          </div>
          <div className="flex items-center justify-between min-w-0">
            <h2 className="text-[clamp(1.25rem,4vw,1.5rem)] font-black truncate" title={`ZMW ${escrowBalance.toLocaleString()}`}>ZMW {escrowBalance.toLocaleString()}</h2>
            <p className="text-[10px] text-emerald-100 font-bold max-w-[120px] text-right flex-shrink-0">Released upon parcel collection</p>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full"></div>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button className="bg-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-md hover:bg-slate-800 transition-colors">
          <Send className="w-5 h-5" /> Send
        </button>
        <button 
          onClick={() => setShowDepositModal(true)}
          className="bg-white text-slate-900 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors"
        >
          <Plus className="w-5 h-5" /> Add Money
        </button>
      </div>

      {/* Functionalities */}
      <div className="grid grid-cols-5 gap-2 mb-8">
        {[
          { icon: CreditCard, label: 'Cards' },
          { icon: Receipt, label: 'Bills' },
          { icon: Wifi, label: 'Airtime' },
          { icon: Zap, label: 'Electricity' },
        ].map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-[#d49b35] border border-slate-50">
              <item.icon className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-slate-500">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
          <button className="text-xs font-bold text-[#d49b35] hover:underline">View all</button>
        </div>
        <div className="space-y-4">
          {transactions.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl text-center border border-slate-100">
              <p className="text-slate-400 text-sm font-medium">No transactions yet.</p>
            </div>
          ) : (
            transactions.map((activity, idx) => (
              <div key={activity.id || `tx-${idx}`} className="bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activity.type === 'OUT' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                    {activity.type === 'OUT' ? <Send className="w-5 h-5 rotate-45" /> : <Send className="w-5 h-5 -rotate-135" />}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{activity.description}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      {new Date(activity.createdAt).toLocaleDateString()} • {activity.status}
                    </p>
                  </div>
                </div>
                <p className={`font-bold text-sm ${activity.type === 'OUT' ? 'text-red-500' : 'text-emerald-500'}`}>
                  {activity.type === 'OUT' ? '-' : '+'}ZMW {activity.amount.toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-[32px] max-h-[90vh] overflow-hidden shadow-2xl border border-slate-100 animate-in slide-in-from-bottom duration-300 flex flex-col">
            <div className="p-8 overflow-y-auto flex-1 scrollbar-hide">
              <h3 className="text-2xl font-black text-slate-900 mb-2">Deposit Money</h3>
              <p className="text-slate-500 text-sm font-medium mb-8">Enter the amount you want to add to your virtual account.</p>
              
              <div className="space-y-6 mb-8">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Amount (ZMW)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-50 rounded-2xl border border-slate-100 p-6 text-3xl font-black text-slate-900 outline-none focus:border-[#d49b35] transition-colors"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold">ZMW</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[100, 500, 1000].map(amt => (
                    <button 
                      key={amt}
                      onClick={() => setDepositAmount(amt.toString())}
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
                onClick={() => setShowDepositModal(false)}
                className="flex-1 py-4 rounded-2xl font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <Button 
                onClick={handleDeposit}
                disabled={isProcessingDeposit || !depositAmount}
                className="flex-1 py-4 rounded-2xl font-bold"
              >
                {isProcessingDeposit ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm Deposit'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
