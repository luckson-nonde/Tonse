import React, { useEffect, useState, useCallback } from 'react';
import { Wallet, Loader2, ArrowDownCircle, Clock, Plus, FlaskConical } from 'lucide-react';
import emptyStateImage from '../../assets/images/empty-states/owl_reading.webp';
import { formatCurrency } from '../../utils/financeUtils';
import { ventureService, VentureJournalEntry } from '../../services/api/ventureService';
import { beginHostedPayment } from '../../services/api/paymentsService';
import PaymentSheet, { PaymentSheetSubmitPayload } from '../PaymentSheet';
import PushPaymentWait from '../PushPaymentWait';
import Button from '../Button';

interface PendingDeposit {
  reference: string;
  status: string;
  amount: string;
  /** 'dpo' → the approve-on-phone polling card; anything else → sandbox simulate. */
  provider?: string;
  instruction?: string;
}

/**
 * A shop's real venture account — money released from completed sales (net
 * of commission) plus direct deposits, backed by the double-entry ledger
 * (`SELLER_PAYABLE_ZMW`). Deposits go through the real PSP-collection +
 * verified-webhook path (`CheckoutService`), currently on the sandbox
 * provider, so a "simulate approval" step stands in for the real phone
 * approval — same as the buyer checkout flow, never hidden as if it were
 * automatic.
 */
export default function VentureAccountView() {
  const [balance, setBalance] = useState<string | null>(null);
  const [history, setHistory] = useState<VentureJournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [showDepositSheet, setShowDepositSheet] = useState(false);
  const [pendingDeposit, setPendingDeposit] = useState<PendingDeposit | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [bal, hist] = await Promise.all([
        ventureService.getBalance(),
        ventureService.getHistory({ limit: 30 }),
      ]);
      setBalance(bal);
      setHistory(hist.data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load your venture account.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDepositSubmit = async (payload: PaymentSheetSubmitPayload) => {
    const result = await ventureService.initiateDeposit({
      amount: payload.amount.toFixed(2),
      phone: payload.phone,
      operator: payload.provider,
    });
    setShowDepositSheet(false);
    if (result.status === 'failed') {
      setError('Deposit could not be started. Please try again.');
      return;
    }
    // Live (DPO): the money is taken on the provider's own page, so leave the
    // app. Sandbox returns no redirect and falls through to the pending card.
    if (beginHostedPayment(result, { label: 'Your deposit' })) return;
    setPendingDeposit({
      reference: result.reference,
      status: result.status,
      amount: result.amount,
      provider: result.provider,
      instruction: result.instruction,
    });
  };

  const handleSimulateApproval = async () => {
    if (!pendingDeposit) return;
    setIsSimulating(true);
    try {
      await ventureService.simulateDeposit(pendingDeposit.reference, 'successful');
      setPendingDeposit(null);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not confirm the deposit. Please try again.');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <h2 className="text-2xl font-serif font-bold text-slate-900">Venture Account</h2>

      {/* Balance card */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm text-white relative overflow-hidden">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                Available balance
              </p>
              <p className="text-[10px] text-white/40">From completed sales and direct deposits</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowDepositSheet(true)}
            className="shrink-0 flex items-center gap-1.5 bg-[#d49b35] hover:brightness-95 text-slate-900 font-black text-[10px] uppercase tracking-widest px-3.5 py-2.5 rounded-xl shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Deposit
          </button>
        </div>
        {isLoading ? (
          <Loader2 className="w-6 h-6 animate-spin text-white/60" />
        ) : (
          <p className="text-3xl sm:text-4xl font-black">
            ZMW {formatCurrency(Number(balance ?? '0'))}
          </p>
        )}
        <div className="mt-4 flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-wider">
          <ArrowDownCircle className="w-3.5 h-3.5" />
          Withdrawals to bank/mobile money — coming soon
        </div>
      </div>

      {/* Awaiting approval. Live DPO push → approve-on-phone polling card;
          sandbox stands in for the phone prompt with a simulate button. */}
      {pendingDeposit?.provider === 'dpo' && (
        <PushPaymentWait
          reference={pendingDeposit.reference}
          amountLabel={`ZMW ${formatCurrency(Number(pendingDeposit.amount))}`}
          instruction={pendingDeposit.instruction}
          onDone={(status) => {
            setPendingDeposit(null);
            if (status === 'SUCCESSFUL') void load();
            else setError('The deposit was not completed. You can try again.');
          }}
          onCancel={() => setPendingDeposit(null)}
        />
      )}
      {pendingDeposit && pendingDeposit.provider !== 'dpo' && (
        <div className="bg-amber-50 rounded-3xl p-6 border border-amber-200 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-slate-900 text-sm">Awaiting approval</h4>
              <p className="text-[11px] text-slate-500">
                ZMW {formatCurrency(Number(pendingDeposit.amount))} · {pendingDeposit.reference}
              </p>
            </div>
          </div>
          <p className="text-[12px] text-slate-500 leading-relaxed">
            In production you'd approve this on your phone. This environment runs on the sandbox
            payment provider, so use the button below to simulate that approval.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPendingDeposit(null)}
              className="flex-1 py-3 rounded-2xl text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-white/50 transition-all"
            >
              Dismiss
            </button>
            <Button
              onClick={handleSimulateApproval}
              disabled={isSimulating}
              className="flex-[1.5] py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
            >
              {isSimulating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FlaskConical className="w-3.5 h-3.5" />
              )}
              Simulate approval (sandbox)
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-rose-500 font-bold text-center">{error}</p>}

      {/* History */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-lg font-black text-slate-900">Funded In</h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-full">
            {history.length} Entries
          </span>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#d49b35]" />
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-10 sm:p-16 text-center border border-slate-100 flex flex-col items-center justify-center shadow-sm">
            <img
              src={emptyStateImage}
              alt="No venture account activity"
              className="w-40 h-40 sm:w-48 sm:h-48 object-contain opacity-90 mb-6"
            />
            <p className="text-slate-500 font-medium">
              Nothing funded yet — completed sales and deposits will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                  <ArrowDownCircle className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h4 className="font-bold text-slate-900 text-sm truncate">
                      {entry.description || entry.reference}
                    </h4>
                    <span className="text-sm font-black text-emerald-600 whitespace-nowrap">
                      +ZMW {formatCurrency(Number(entry.amount || 0))}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    <Clock className="w-3 h-3" />
                    {entry.postedAt ? new Date(entry.postedAt).toLocaleDateString() : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PaymentSheet
        open={showDepositSheet}
        onClose={() => setShowDepositSheet(false)}
        title="Deposit to Venture Account"
        subtitle="Secure Transaction"
        headerStat={{ label: 'Current Balance', amount: Number(balance ?? '0') }}
        amountMode="input"
        methods={['mobile_money']}
        actionLabel={(amount) => `Deposit ZMW ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        onSubmit={handleDepositSubmit}
      />
    </div>
  );
}
