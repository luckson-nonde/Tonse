import React, { useEffect, useState } from 'react';
import {
  XCircle,
  Wallet,
  ShieldCheck,
  Wifi,
  CreditCard,
  Check,
  Loader2,
} from 'lucide-react';
import Button from './Button';

export type PaymentMethod = 'wallet' | 'mobile_money' | 'card';
export type MobileMoneyProvider = 'MTN' | 'Airtel' | 'Zamtel';

export interface PaymentSheetSubmitPayload {
  amount: number;
  method: PaymentMethod;
  provider?: MobileMoneyProvider;
  phone?: string;
}

export interface PaymentSheetProps {
  open: boolean;
  onClose: () => void;

  /** Header copy — e.g. "Fund Your Account", "Pay Provider". */
  title: string;
  /** Tiny eyebrow under the title. Defaults to "Secure Transaction". */
  subtitle?: string;

  /** Inline stat card on the blue header — e.g. {label: 'Current Balance', amount: 1500}.
   *  Optional; pass undefined to hide the band. */
  headerStat?: { label: string; amount: number };

  /** Whether the amount field is editable ('input', for top-ups) or locked
   *  to a fixed number ('fixed', for paying a quote). */
  amountMode: 'input' | 'fixed';
  /** Required when amountMode='fixed'. The amount the user is paying. */
  fixedAmount?: number;

  /** Pre-fills the phone field for mobile-money. Falls back to ''. */
  defaultPhone?: string;

  /** Subset of methods to show as tabs. Defaults to ['mobile_money', 'card']. */
  methods?: PaymentMethod[];
  /** Which method is selected on open. Defaults to the first item in `methods`. */
  defaultMethod?: PaymentMethod;

  /** Fires when the user picks the 'wallet' tab. Use this to route them
   *  to /buyer/financial (with state) so the wallet flow can take over.
   *  If unset, the wallet tab is hidden even if it's in `methods`. */
  onWalletSelected?: () => void;

  /** Primary CTA copy. Receives the resolved amount (input mode lets you
   *  format with the live value). */
  actionLabel: string | ((amount: number) => string);
  /** Submit handler. Sheet awaits the promise and shows a spinner. */
  onSubmit: (payload: PaymentSheetSubmitPayload) => Promise<void> | void;

  /** Optional rows shown above the amount field — e.g.
   *  [{label:'Provider', value:'foodies'}, {label:'For', value:'Event Equipment Rental'}]. */
  context?: { label: string; value: string }[];

  /** External busy override — locks the action button even if the user
   *  has entered everything. Useful when the parent is doing a follow-up
   *  request after onSubmit resolves. */
  busy?: boolean;
}

const PROVIDERS: MobileMoneyProvider[] = ['MTN', 'Airtel', 'Zamtel'];

/**
 * The single payment popup the system uses everywhere.
 *
 * Matches the navy-headered "Fund Your Account" sheet that lives in
 * FinancialPage today. Reusable for any flow that needs to take money
 * via mobile-money or card: top-ups, paying a quote direct, paying an
 * inquiry fee, etc. The Wallet tab is conditional and emits a callback
 * so the host page can hand off to the wallet flow.
 */
export default function PaymentSheet({
  open,
  onClose,
  title,
  subtitle = 'Secure Transaction',
  headerStat,
  amountMode,
  fixedAmount,
  defaultPhone = '',
  methods = ['mobile_money', 'card'],
  defaultMethod,
  onWalletSelected,
  actionLabel,
  onSubmit,
  context,
  busy: externalBusy = false,
}: PaymentSheetProps) {
  // Wallet tab is only available when the host has wired the redirect.
  const visibleMethods = methods.filter((m) => m !== 'wallet' || !!onWalletSelected);

  const initialMethod: PaymentMethod = (() => {
    if (defaultMethod && visibleMethods.includes(defaultMethod)) return defaultMethod;
    const firstNonWallet = visibleMethods.find((m) => m !== 'wallet');
    return firstNonWallet ?? visibleMethods[0] ?? 'mobile_money';
  })();

  const [method, setMethod] = useState<PaymentMethod>(initialMethod);
  const [provider, setProvider] = useState<MobileMoneyProvider>('MTN');
  const [phone, setPhone] = useState(defaultPhone);
  const [amountInput, setAmountInput] = useState<string>(
    amountMode === 'fixed' ? String(fixedAmount ?? 0) : ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset on re-open so a stale typed amount/phone doesn't leak across
  // sessions of the same host.
  useEffect(() => {
    if (!open) return;
    setMethod(initialMethod);
    setProvider('MTN');
    setPhone(defaultPhone);
    setAmountInput(amountMode === 'fixed' ? String(fixedAmount ?? 0) : '');
    setError(null);
    setSubmitting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const resolvedAmount =
    amountMode === 'fixed' ? Number(fixedAmount || 0) : parseFloat(amountInput || '0') || 0;

  const isMobile = method === 'mobile_money';
  const isCard = method === 'card';
  const phoneOk = !isMobile || phone.replace(/\D/g, '').length >= 9;
  const amountOk = resolvedAmount > 0;
  const busy = submitting || externalBusy;
  const actionDisabled = busy || !amountOk || !phoneOk;

  const handleMethodClick = (m: PaymentMethod) => {
    setError(null);
    if (m === 'wallet') {
      onWalletSelected?.();
      return;
    }
    setMethod(m);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!amountOk) {
      setError('Enter a valid amount.');
      return;
    }
    if (!phoneOk) {
      setError('Enter a valid mobile number.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        amount: resolvedAmount,
        method,
        provider: isMobile ? provider : undefined,
        phone: isMobile ? phone : undefined,
      });
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const labelText =
    typeof actionLabel === 'function' ? actionLabel(resolvedAmount) : actionLabel;

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md transition-all duration-300">
      <div className="w-full sm:max-w-lg md:max-w-xl bg-white rounded-t-[40px] sm:rounded-[40px] shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[95vh] md:max-h-[88vh]">
        {/* ── Navy header ── */}
        <div className="bg-gradient-to-r from-[#1B3068] to-[#12224d] p-6 md:p-8 text-white relative overflow-hidden shrink-0">
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-[#d49b35]/20 rounded-xl flex items-center justify-center border border-[#d49b35]/30 shrink-0">
                <Wallet className="w-5 h-5 text-[#d49b35]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-black leading-tight truncate">{title}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <ShieldCheck className="w-3 h-3 text-[#d49b35]" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#d49b35]/80 truncate">
                    {subtitle}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="p-2 hover:bg-white/10 rounded-full transition-all text-white/50 hover:text-white disabled:opacity-50"
              aria-label="Close"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          {headerStat && (
            <div className="mt-6 relative z-10 p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-black">
                  {headerStat.label}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-[10px] font-black text-[#d49b35]">ZMW</span>
                  <p className="text-xl font-black tabular-nums">
                    {headerStat.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="absolute top-0 right-0 w-32 h-32 bg-[#d49b35]/10 rounded-full blur-2xl -mr-16 -mt-16" />
        </div>

        {/* ── Body form ── */}
        <div className="px-6 sm:px-8 py-7 space-y-5 bg-white flex-1 overflow-y-auto">
          {context && context.length > 0 && (
            <div className="bg-slate-50 rounded-2xl border border-slate-100 px-5 py-4 space-y-2">
              {context.map((row, i) => (
                <div key={i} className="flex items-center justify-between gap-3 text-[12px]">
                  <span className="text-slate-400 font-bold uppercase tracking-[0.14em] text-[10px]">
                    {row.label}
                  </span>
                  <span className="font-bold text-slate-800 truncate">{row.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Amount */}
          <div className="space-y-2.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] block ml-1">
              {amountMode === 'fixed' ? 'Amount Due' : 'Amount to Add'}
            </label>
            <div className="relative group">
              <div className="absolute inset-0 bg-slate-50 rounded-2xl border border-slate-200 transition-all group-within:border-[#d49b35]/40 group-within:bg-white group-within:shadow-[0_0_0_4px_rgba(212,155,53,0.05)] shadow-sm" />
              <div className="relative flex items-center px-6 py-4">
                <div className="flex items-center gap-3 pr-4 border-r-2 border-slate-200/60">
                  <span className="text-lg font-black text-[#d49b35]">ZMW</span>
                </div>
                {amountMode === 'fixed' ? (
                  <p className="flex-1 bg-transparent text-3xl font-black text-slate-900 ml-5 tabular-nums">
                    {Number(fixedAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                ) : (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amountInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      if (val === '' || /^\d*\.?\d*$/.test(val)) setAmountInput(val);
                    }}
                    placeholder="0.00"
                    className="flex-1 bg-transparent text-3xl font-black text-slate-900 outline-none placeholder:text-slate-300 ml-5"
                    autoFocus
                  />
                )}
              </div>
            </div>
          </div>

          {/* Phone (mobile-money only) */}
          {isMobile && (
            <div className="space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-300">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] block ml-1">
                Phone Number
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-slate-50 rounded-2xl border border-slate-200 transition-all group-within:border-[#d49b35]/40 group-within:bg-white shadow-sm" />
                <div className="relative flex items-center">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="097XXXXXXXX"
                    className="w-full bg-transparent px-6 py-4 font-black text-slate-900 outline-none text-base tracking-widest placeholder:text-slate-300"
                  />
                  {phoneOk && phone && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2">
                      <div className="w-6 h-6 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Method tabs */}
          {visibleMethods.length > 1 && (
            <div className="space-y-2.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] block ml-1">
                Payment Method
              </label>
              <div className="flex gap-2 p-1 bg-slate-100/50 rounded-2xl border border-slate-200 shadow-inner">
                {visibleMethods.map((m) => {
                  const isSelected = method === m;
                  const meta =
                    m === 'wallet'
                      ? { Icon: Wallet, label: 'Wallet' }
                      : m === 'card'
                      ? { Icon: CreditCard, label: 'Bank Card' }
                      : { Icon: Wifi, label: 'Mobile' };
                  const Icon = meta.Icon;
                  return (
                    <button
                      type="button"
                      key={m}
                      onClick={() => handleMethodClick(m)}
                      className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2.5 transition-all border ${
                        isSelected
                          ? 'bg-white shadow-md border-slate-100 text-[#d49b35]'
                          : 'border-transparent text-slate-400 hover:text-slate-500 hover:bg-white/40'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-widest">{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Provider pills */}
          {isMobile && (
            <div className="space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-300">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] block ml-1">
                Select Provider
              </label>
              <div className="flex gap-2 p-1 bg-slate-100/50 rounded-2xl border border-slate-200 shadow-inner">
                {PROVIDERS.map((op) => (
                  <button
                    type="button"
                    key={op}
                    onClick={() => setProvider(op)}
                    className={`flex-1 py-2.5 rounded-xl font-black text-[9px] tracking-widest transition-all uppercase border ${
                      provider === op
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

          {/* Card form (placeholder — gateway integration deferred) */}
          {isCard && (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3 text-[12px] text-slate-500 leading-relaxed">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em]">
                Bank Card
              </p>
              <p>
                Card details will be entered on the next screen via our PCI-compliant
                processor. We never store card numbers on ProQuote.
              </p>
            </div>
          )}

          {error && (
            <p className="text-[12px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 py-4 rounded-2xl text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 disabled:opacity-50 transition-all"
            >
              Cancel
            </button>
            <Button
              onClick={handleSubmit}
              disabled={actionDisabled}
              className="flex-[1.5] py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-[#d49b35]/20"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : labelText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
