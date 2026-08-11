import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, FlaskConical, Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../components/Button';
import PushPaymentWait from '../components/PushPaymentWait';
import { useAuth } from '../AuthContext';
import { beginHostedPayment, paymentsService } from '../services/api/paymentsService';
import { getQuote } from '../services/api/quoteService';

export default function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const amount = location.state?.amount || 0;
  const quoteId = location.state?.quoteId;
  const [phone, setPhone] = useState('');
  const [operator, setOperator] = useState('MTN');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mobile'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pending, setPending] = useState<{
    reference: string;
    provider?: string;
    instruction?: string;
  } | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Verified settlement done (push approved / sandbox simulated): the backend
  // has minted the Order + the REAL collection code on the quote — fetch it
  // for the success screen instead of inventing one client-side.
  const finishPaid = async () => {
    let collectionCode: string | undefined;
    try {
      const quote = await getQuote(String(quoteId));
      collectionCode = (quote as any)?.collectionCode || undefined;
    } catch {
      // The payment IS settled; the success page just shows less detail.
    }
    navigate('/buyer/payment-success', { state: { amount, quoteId, collectionCode } });
  };

  const handlePayment = async () => {
    if (!user || !quoteId) return;

    setIsProcessing(true);
    try {
      // Real escrow checkout: the server reads the amount from the quote,
      // starts a verified PSP collection, and only its confirmation creates
      // the Order / PAID status / collection code.
      const result = await paymentsService.checkoutQuote(String(quoteId), {
        channel: paymentMethod === 'card' ? 'card' : 'mobile-money',
        phone: paymentMethod === 'mobile' ? `260${phone.replace(/\D/g, '').replace(/^260/, '').replace(/^0/, '')}` : undefined,
        operator: paymentMethod === 'mobile' ? operator : undefined,
      });
      if (!result?.reference || result.status === 'failed') {
        throw new Error('Payment could not be started. Please try again.');
      }
      // Live card (and any mobile fallback): pay on the provider's page.
      if (beginHostedPayment(result, { label: 'Your payment' })) return;
      // In-app: mobile push (dpo) or sandbox pending.
      setPending({
        reference: result.reference,
        provider: result.provider,
        instruction: result.instruction,
      });
    } catch (error: any) {
      console.error('Payment failed:', error);
      alert(error?.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulateApproval = async () => {
    if (!pending) return;
    setSimulating(true);
    try {
      await paymentsService.simulateCheckout(pending.reference, 'successful');
      await finishPaid();
    } catch (e: any) {
      alert(e?.message || 'Could not confirm the payment. Please try again.');
    } finally {
      setSimulating(false);
    }
  };

  if (pending) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setPending(null)}
            className="p-2 rounded-full bg-white shadow-sm border border-slate-100"
          >
            <ArrowLeft className="w-6 h-6 text-slate-900" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Complete Payment</h1>
        </div>
        <div className="max-w-md mx-auto">
          {pending.provider === 'dpo' ? (
            <PushPaymentWait
              reference={pending.reference}
              amountLabel={`ZMW ${Number(amount).toLocaleString()}`}
              instruction={pending.instruction}
              onDone={(status) => {
                if (status === 'SUCCESSFUL') void finishPaid();
                else {
                  setPending(null);
                  alert('The payment was not completed. You can try again.');
                }
              }}
              onCancel={() => setPending(null)}
            />
          ) : (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
              <p className="text-sm font-black text-slate-900">Awaiting approval</p>
              <p className="text-[13px] text-slate-500 leading-relaxed">
                In production you'd approve this on your phone. This environment runs on the
                sandbox payment provider, so use the button below to simulate that approval.
              </p>
              <p className="text-[11px] text-slate-400">{pending.reference}</p>
              <Button
                onClick={() => void handleSimulateApproval()}
                disabled={simulating}
                className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
              >
                {simulating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <FlaskConical className="w-4 h-4" />
                )}
                Simulate approval (sandbox)
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full bg-white shadow-sm border border-slate-100"
        >
          <ArrowLeft className="w-6 h-6 text-slate-900" />
        </button>
        <h1 className="text-xl font-bold text-slate-900">Make Payment</h1>
      </div>

      {/* Payment Method Tabs */}
      <div className="bg-white rounded-2xl p-1 shadow-sm border border-slate-100 flex mb-6">
        <button
          onClick={() => setPaymentMethod('mobile')}
          className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${paymentMethod === 'mobile' ? 'bg-[#d49b35] text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          MOBILE MONEY
        </button>
        <button
          onClick={() => setPaymentMethod('card')}
          className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${paymentMethod === 'card' ? 'bg-[#d49b35] text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          CARD PAYMENT
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
        {paymentMethod === 'card' ? (
          <div className="space-y-4">
            {/* PCI: no card details are collected on a Nyuwe page. They are
                entered on the payment provider's own secure page, so we never
                see, transmit or store a PAN/CVV. Mirrors PaymentSheet. */}
            <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50">
              <p className="text-sm font-bold text-slate-900">Bank Card</p>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-500 font-medium">
                Card details are entered on the next screen via our PCI-compliant payment
                provider. <span className="font-bold text-slate-900">Nyuwe never sees or stores
                your card number.</span>
              </p>
            </div>
            {/* "Save card" removed: card storage is the provider's job via
                tokenisation — offering it here implies Nyuwe holds card data. */}

            {/* Amount Input for Card */}
            <div className="pt-4 border-t border-slate-100">
              <label className="text-sm font-bold text-slate-500 mb-2 block">Total Amount</label>
              <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 flex justify-between items-center">
                <input
                  type="number"
                  value={amount.toFixed(2)}
                  readOnly
                  className="font-bold text-slate-900 outline-none w-full bg-transparent"
                />
                <span className="font-bold text-slate-400">ZMW</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Phone Input */}
            <div>
              <label className="text-sm font-bold text-slate-500 mb-2 block">Phone</label>
              <div className="flex bg-slate-50 rounded-2xl border border-slate-100 p-4 gap-2 items-center">
                <div className="flex items-center gap-1 font-bold text-slate-900">
                  <span className="text-xl">🇿🇲</span> +260 <ChevronDown className="w-4 h-4" />
                </div>
                <div className="w-px h-6 bg-slate-200"></div>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 font-bold text-slate-900 outline-none bg-transparent"
                />
              </div>
            </div>

            {/* Amount Input for Mobile */}
            <div className="pt-4 border-t border-slate-100">
              <label className="text-sm font-bold text-slate-500 mb-2 block">Total Amount</label>
              <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 flex justify-between items-center">
                <input
                  type="number"
                  value={amount.toFixed(2)}
                  readOnly
                  className="font-bold text-slate-900 outline-none w-full bg-transparent"
                />
                <span className="font-bold text-slate-400">ZMW</span>
              </div>
            </div>

            {/* Operator Selection */}
            <div>
              <label className="text-sm font-bold text-slate-500 mb-4 block">
                Select your mobile operator
              </label>
              <div className="grid grid-cols-3 gap-4">
                {['Airtel', 'MTN', 'ZAMTEL'].map((op) => (
                  <button
                    key={op}
                    onClick={() => setOperator(op)}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 ${operator === op ? 'border-[#d49b35] bg-[#fdf6e9]' : 'border-slate-100 bg-slate-50'}`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${op === 'Airtel' ? 'bg-red-600' : op === 'MTN' ? 'bg-yellow-500' : 'bg-emerald-600'}`}
                    >
                      {op.charAt(0)}
                    </div>
                    <span className="text-xs font-bold text-slate-900">{op}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 pt-6">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 py-4 rounded-2xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"
          >
            Cancel
          </button>
          <Button
            onClick={handlePayment}
            disabled={isProcessing}
            className="flex-1 py-4 rounded-2xl font-bold"
          >
            {isProcessing ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </div>
            ) : (
              'Pay Now'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
