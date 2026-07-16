import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  CreditCard,
  Smartphone,
  Wallet,
  Sparkles,
  ShieldCheck,
  Check,
  Lock,
  ArrowRight,
  Loader2,
  Zap,
  Receipt,
} from 'lucide-react';
import { useAuth } from '../AuthContext';

export type InquiryPaymentMethod = 'mobile' | 'card' | 'virtual';

export interface InquiryPaymentResult {
  method: InquiryPaymentMethod;
  provider?: string;
  phone?: string;
  amount: number;
}

interface InquiryPaymentProps {
  amount: number;
  quoteCount: number;
  onBack: () => void;
  onComplete: (payment: InquiryPaymentResult) => void;
  onTopUp?: () => void;
}

const MOBILE_NETWORKS = [
  { id: 'mtn', label: 'MTN Mobile Money', short: 'MTN', color: '#FFC300', prefix: '+260 96', recommended: true },
  { id: 'airtel', label: 'Airtel Money', short: 'Airtel', color: '#E40000', prefix: '+260 97' },
  { id: 'zamtel', label: 'Zamtel Kwacha', short: 'Zamtel', color: '#008000', prefix: '+260 95' },
];

const inputClass =
  'w-full px-4 py-3.5 bg-white border border-[#f1f5f9] rounded-xl font-sans font-bold text-[14px] text-[#1a1a2e] focus:border-[#C9973A]/50 focus:shadow-[0_0_0_3px_rgba(201,151,58,0.08)] outline-none transition-all placeholder:text-[#94a3b8] placeholder:font-medium';

const labelClass =
  'block text-[10px] font-bold text-[#94a3b8] tracking-[0.1em] uppercase mb-2 ml-1 font-sans';

export default function InquiryPayment({
  amount,
  quoteCount,
  onBack,
  onComplete,
  onTopUp,
}: InquiryPaymentProps) {
  const { user } = useAuth();
  const balance = user?.virtualAccountBalance ?? 0;
  const balanceSufficient = balance >= amount;
  const deficit = Math.max(0, amount - balance);

  const [method, setMethod] = useState<'mobile' | 'card'>('mobile');
  const [mobileProvider, setMobileProvider] = useState('mtn');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const selectedNetwork = MOBILE_NETWORKS.find((n) => n.id === mobileProvider) ?? MOBILE_NETWORKS[0];

  // PCI: card details are NEVER collected here. Card payments are completed on
  // the payment provider's own secure page — TONSE never sees, transmits or
  // stores a card number, expiry or CVC, which keeps us out of PCI-DSS scope.

  const handlePay = (paymentMethod: InquiryPaymentMethod) => {
    setError('');

    if (paymentMethod === 'mobile') {
      if (phone.replace(/\D/g, '').length < 9) {
        setError('Please enter a valid mobile number.');
        return;
      }
    } else if (paymentMethod === 'virtual') {
      if (!balanceSufficient) {
        setError('Your virtual account balance is too low. Please top up first.');
        return;
      }
    }

    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      onComplete({
        method: paymentMethod,
        provider: paymentMethod === 'mobile' ? mobileProvider : undefined,
        phone: paymentMethod === 'mobile' ? phone : undefined,
        amount,
      });
    }, 1800);
  };

  return (
    <div className="max-w-[1440px] 2xl:max-w-[1600px] mx-auto w-full min-h-screen bg-[#f5f2ed]">
      {/* Mobile-only sticky header */}
      <div className="md:hidden sticky top-0 z-30 px-4 pt-4 pb-5 bg-[#f5f2ed]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-10 h-10 -ml-2 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-[#1a1a2e]" />
          </button>
          <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-[#C9973A] font-bold">
            STEP 4 / PAYMENT
          </p>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="font-serif text-[22px] font-bold text-[#1a1a2e] leading-tight">Payment</h1>
          <p className="font-serif text-[20px] font-bold text-[#C9973A]">K{amount}</p>
        </div>
      </div>

      <div className="p-4 md:p-8 lg:p-10 xl:p-12">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-16 items-start">
          {/* Desktop left-side context — sticky */}
          <div className="hidden md:flex flex-col gap-8 w-full md:w-[320px] lg:w-[400px] shrink-0 sticky top-12">
            <div className="bg-white/40 backdrop-blur-sm border border-white/60 rounded-[32px] p-8 shadow-sm">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-[#C9973A] text-[11px] font-bold uppercase tracking-wider mb-8 hover:gap-3 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to location
              </button>

              <div className="space-y-4">
                <div className="w-16 h-16 bg-[#C9973A]/10 rounded-2xl flex items-center justify-center text-[#C9973A]">
                  <CreditCard className="w-8 h-8" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#C9973A]">
                  Step 04 / Pay
                </p>
                <h1 className="font-serif text-[32px] font-bold text-[#1a1a2e] leading-[1.1]">
                  Payment
                </h1>
                <p className="text-[14px] text-[#1a1a2e]/60 leading-relaxed font-medium">
                  Settle the service fee to publish your inquiry. Quotes start landing within minutes.
                </p>
              </div>

              {/* Order Summary */}
              <div className="mt-8 pt-8 border-t border-[#1a1a2e]/10 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C9973A] flex items-center gap-2">
                  <Receipt className="w-3.5 h-3.5" /> Order Summary
                </p>
                <div className="flex justify-between items-baseline text-[13px]">
                  <span className="text-[#1a1a2e]/60 font-medium">Quotes cap</span>
                  <span className="font-black text-[#1a1a2e]">{quoteCount} quotes</span>
                </div>
                <div className="flex justify-between items-baseline text-[13px]">
                  <span className="text-[#1a1a2e]/60 font-medium">Service fee</span>
                  <span className="font-black text-[#1a1a2e]">K{amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-3 border-t border-[#1a1a2e]/10">
                  <span className="text-[11px] font-black uppercase tracking-widest text-[#1a1a2e]/40">
                    Total
                  </span>
                  <span className="font-serif text-[24px] font-black text-[#C9973A]">
                    K{amount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Why this is safe */}
            <div className="bg-gradient-to-br from-[#fdf6e9]/70 to-[#fdf6e9]/30 border border-[#C9973A]/15 rounded-[32px] p-7">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fdf6e9] to-[#f3e3bd] text-[#C9973A] flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="pt-0.5">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#C9973A] mb-1">
                    Tonse Tip
                  </p>
                  <h3 className="font-serif text-[18px] font-bold text-[#1a1a2e] leading-snug">
                    Safe, simple, one-time
                  </h3>
                </div>
              </div>
              <p className="text-[13px] text-[#1a1a2e]/65 leading-relaxed font-medium mb-5">
                Pay once and we handle the rest — sourcing offers, capping the count, closing on time.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[#1a1a2e]/80 leading-relaxed">
                    <span className="font-bold text-[#1a1a2e]">256-bit SSL</span> encrypts every transaction end to end.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <Zap className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[#1a1a2e]/80 leading-relaxed">
                    <span className="font-bold text-[#1a1a2e]">Instant publishing</span> — providers see your inquiry within minutes of payment.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <Lock className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[#1a1a2e]/80 leading-relaxed">
                    <span className="font-bold text-[#1a1a2e]">No hidden fees</span> — the K{amount} is the only charge for this inquiry.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <Receipt className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[#1a1a2e]/80 leading-relaxed">
                    <span className="font-bold text-[#1a1a2e]">Receipt</span> emailed automatically once payment clears.
                  </p>
                </li>
              </ul>
            </div>
          </div>

          {/* Right-side payment column */}
          <div className="flex-1 w-full space-y-6">
            {/* Main payment card with tabs */}
            <div className="bg-white border border-[#f1f5f9] rounded-[32px] p-6 md:p-8 xl:p-10 shadow-sm shadow-[#1a1a2e]/[0.02]">
              {/* Method tabs */}
              <div className="flex gap-1.5 mb-7 p-1 bg-[#f1f5f9]/70 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setMethod('mobile');
                    setError('');
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-[12px] font-black uppercase tracking-[0.12em] transition-all ${
                    method === 'mobile'
                      ? 'bg-white text-[#1a1a2e] shadow-[0_4px_12px_-4px_rgba(15,23,42,0.12)]'
                      : 'text-[#94a3b8] hover:text-[#1a1a2e]'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  Mobile Money
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMethod('card');
                    setError('');
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-[12px] font-black uppercase tracking-[0.12em] transition-all ${
                    method === 'card'
                      ? 'bg-white text-[#1a1a2e] shadow-[0_4px_12px_-4px_rgba(15,23,42,0.12)]'
                      : 'text-[#94a3b8] hover:text-[#1a1a2e]'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Card
                </button>
              </div>

              {/* Mobile content */}
              {method === 'mobile' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div>
                    <label className={labelClass}>Network</label>
                    <div className="grid grid-cols-3 gap-3">
                      {MOBILE_NETWORKS.map((net) => {
                        const isSelected = mobileProvider === net.id;
                        return (
                          <button
                            key={net.id}
                            type="button"
                            onClick={() => setMobileProvider(net.id)}
                            className={`relative py-4 rounded-2xl border-[1.5px] transition-all flex flex-col items-center gap-2 ${
                              isSelected
                                ? 'border-[#C9973A] bg-[rgba(201,151,58,0.05)] shadow-[0_8px_20px_-12px_rgba(201,151,58,0.35)]'
                                : 'border-[#f1f5f9] bg-white hover:border-[#C9973A]/30'
                            }`}
                          >
                            {net.recommended && (
                              <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-[#C9973A] text-white text-[8px] font-black rounded-full uppercase tracking-[0.14em]">
                                Recommended
                              </span>
                            )}
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-[14px] tracking-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
                              style={{ backgroundColor: net.color }}
                            >
                              {net.short[0]}
                            </div>
                            <p
                              className={`text-[11px] font-black uppercase tracking-[0.1em] ${
                                isSelected ? 'text-[#1a1a2e]' : 'text-[#94a3b8]'
                              }`}
                            >
                              {net.short}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Amount</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[12px] font-black text-[#C9973A] uppercase tracking-widest">
                          ZMW
                        </span>
                        <input
                          type="text"
                          value={amount.toFixed(2)}
                          readOnly
                          className={`${inputClass} pl-16 bg-[#fdf6e9]/40 cursor-not-allowed`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Mobile Number</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#94a3b8]">
                          {selectedNetwork.prefix}
                        </span>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="XXXXXXX"
                          className={`${inputClass} pl-[88px]`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Card content — NO card details are collected here. TONSE never
                  sees a card number, expiry or CVC: the payment provider takes
                  them on its own secure page, which keeps us out of PCI scope. */}
              {method === 'card' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-3 p-5 rounded-2xl border-[1.5px] border-[#f1f5f9] bg-[#f8fafc]">
                    <div className="w-10 h-10 rounded-xl bg-[#C9973A]/10 text-[#C9973A] flex items-center justify-center shrink-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-black text-[#1a1a2e]">
                        You'll finish on our payment provider's secure page
                      </p>
                      <p className="mt-1.5 text-[12px] leading-relaxed text-[#64748b] font-medium">
                        Continue below and we'll hand you over to our licensed payment provider to
                        enter your card details. <span className="font-bold text-[#1a1a2e]">TONSE never
                        sees or stores your card number, expiry or CVC.</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <p className="mt-4 text-[12px] text-rose-500 font-bold flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> {error}
                </p>
              )}

              <button
                onClick={() => handlePay(method)}
                className="mt-7 w-full py-4 bg-[#C9973A] text-white rounded-2xl font-black uppercase tracking-[0.16em] text-[12px] flex items-center justify-center gap-2 shadow-[0_8px_24px_-8px_rgba(201,151,58,0.5)] hover:bg-[#b8861e] hover:scale-[1.005] active:scale-[0.99] transition-all"
              >
                <Lock className="w-4 h-4" />
                Pay K{amount.toFixed(2)}
              </button>
              <p className="mt-3 text-center text-[10px] text-[#94a3b8] font-medium flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3 h-3" />
                Secured by 256-bit SSL encryption
              </p>
            </div>

            {/* Virtual Account card — secondary payment path */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1a1a2e] to-[#262640] text-white rounded-[32px] p-6 md:p-8 shadow-[0_18px_40px_-12px_rgba(26,26,46,0.35)]">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#C9973A]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#C9973A]/5 rounded-full blur-2xl pointer-events-none" />

              <div className="relative flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-[#C9973A]/20 border border-[#C9973A]/30 flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                    <Wallet className="w-6 h-6 text-[#C9973A]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#C9973A] mb-1">
                      Or pay instantly
                    </p>
                    <h3 className="font-serif text-[20px] font-bold leading-snug mb-1.5">
                      Pay with Virtual Account
                    </h3>
                    <p className="text-[12px] text-white/60 leading-relaxed font-medium">
                      Use your in-app balance — no SMS, no OTP, just one click.
                    </p>
                  </div>
                </div>

                <div className="md:text-right shrink-0 w-full md:w-auto">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">
                    Available Balance
                  </p>
                  <p
                    className={`font-serif text-[28px] font-black leading-none ${
                      balanceSufficient ? 'text-white' : 'text-white/50'
                    }`}
                  >
                    K{balance.toFixed(2)}
                  </p>
                  {balanceSufficient ? (
                    <button
                      onClick={() => handlePay('virtual')}
                      className="mt-4 w-full md:w-auto px-6 py-3 bg-[#C9973A] text-white rounded-xl font-black uppercase tracking-[0.14em] text-[11px] flex items-center justify-center gap-2 shadow-[0_8px_20px_-8px_rgba(201,151,58,0.55)] hover:bg-[#b8861e] active:scale-[0.98] transition-all"
                    >
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      Use Balance
                    </button>
                  ) : (
                    <button
                      onClick={() => onTopUp?.()}
                      className="mt-4 w-full md:w-auto px-6 py-3 bg-white/10 border border-white/15 text-white rounded-xl font-black uppercase tracking-[0.14em] text-[11px] flex items-center justify-center gap-2 hover:bg-white/15 active:scale-[0.98] transition-all"
                    >
                      Top Up · K{deficit.toFixed(2)} short
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {!balanceSufficient && (
                <div className="relative mt-5 pt-5 border-t border-white/10">
                  <p className="text-[11px] text-white/55 leading-relaxed font-medium">
                    To use your virtual account, top up at least{' '}
                    <span className="font-black text-white">K{deficit.toFixed(2)}</span>. Otherwise pay
                    directly above with mobile money or card — both clear instantly.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Processing overlay */}
      <AnimatePresence>
        {processing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-slate-900/75 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 220 }}
              className="bg-white rounded-[32px] p-10 sm:p-12 max-w-sm w-full flex flex-col items-center text-center gap-5"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-[#fdf6e9] border-4 border-[#C9973A]/20 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-[#C9973A] animate-spin" />
                </div>
                <motion.div
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#C9973A]"
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              </div>
              <div>
                <h3 className="font-serif text-[20px] font-black text-[#1a1a2e]">
                  Processing payment
                </h3>
                <p className="text-[13px] text-[#94a3b8] mt-1.5 font-medium">
                  Hold on — we're publishing your inquiry.
                </p>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="h-full bg-[#C9973A] rounded-full"
                  animate={{ width: ['0%', '100%'] }}
                  transition={{ duration: 1.8, ease: 'easeInOut' }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
