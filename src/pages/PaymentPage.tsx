import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../components/Button';
import { db } from '../db';
import { useAuth } from '../AuthContext';

export default function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const amount = location.state?.amount || 0;
  const quoteId = location.state?.quoteId;
  const [phone, setPhone] = useState('979120920');
  const [operator, setOperator] = useState('MTN');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mobile'>('card');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    if (!user || !quoteId) return;
    
    setIsProcessing(true);
    try {
      // 1. Update Quote Status to PAID and generate collection code
      const collectionCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      await db.quotes.update(quoteId, { status: 'PAID', collectionCode });

      // Automatically create a schedule if it's an entertainment inquiry
      const quote = await db.quotes.get(quoteId);
      if (quote) {
        const inquiry = await db.inquiries.get(quote.inquiryId);
        // Check if it's an entertainment-related inquiry
        const isEntertainment = inquiry?.category === 'Entertainment' || 
                                inquiry?.category?.includes('Entertainment');
        
        let scheduleDate = '';
        let startTime = '09:00';
        let endTime = '17:00';
        let location = inquiry?.location || 'TBD';

        if (isEntertainment && (inquiry.entertainmentData || inquiry.attributes)) {
          const data = inquiry.entertainmentData || inquiry.attributes;
          if (data.eventDateTime || data.date) {
            const eventDateTime = new Date(data.eventDateTime || data.date);
            scheduleDate = eventDateTime.toISOString().split('T')[0];
            startTime = eventDateTime.toTimeString().substring(0, 5);
            const durationHours = parseInt(data.eventDuration || data.duration) || 1;
            const endDateTime = new Date(eventDateTime.getTime() + durationHours * 60 * 60 * 1000);
            endTime = endDateTime.toTimeString().substring(0, 5);
          }
          location = data.venueLocation || data.location || inquiry.location;
        } else {
          // Fallback for non-entertainment inquiries
          scheduleDate = new Date(inquiry?.createdAt || Date.now()).toISOString().split('T')[0];
        }
        
        await db.schedules.add({
          providerId: quote.providerId,
          buyerId: inquiry.buyerId,
          inquiryId: inquiry.id!,
          quoteId: quote.id!,
          title: inquiry.title,
          date: scheduleDate,
          startTime: startTime,
          endTime: endTime,
          location: location,
          status: 'SCHEDULED',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }

      // 2. Record Transaction for Buyer (OUT)
      await db.transactions.add({
        userId: user.id!,
        type: 'OUT',
        amount: amount,
        description: `Payment for Quote #${quoteId}`,
        category: 'PAYMENT',
        quoteId: quoteId,
        createdAt: Date.now(),
        status: 'COMPLETED'
      });

      // 3. Record Transaction for Escrow (This is conceptual, but we can track it)
      // We'll use the providerId from the quote to know who the money is for
      if (quote) {
        await db.transactions.add({
          userId: quote.providerId,
          type: 'IN',
          amount: amount,
          description: `Escrow: Payment received for Quote #${quoteId}`,
          category: 'PAYMENT',
          quoteId: quoteId,
          createdAt: Date.now(),
          status: 'ESCROW'
        });
      }

      navigate('/buyer/payment-success', { state: { amount, quoteId, collectionCode } });
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-white shadow-sm border border-slate-100">
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
            <div>
              <label className="text-sm font-bold text-slate-500 mb-2 block">Cardholder Name</label>
              <input type="text" placeholder="Full Name on Card" className="w-full bg-slate-50 rounded-2xl border border-slate-100 p-4 font-bold text-slate-900 outline-none" />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-500 mb-2 block">Card Number</label>
              <input type="text" placeholder="0000 0000 0000 0000" className="w-full bg-slate-50 rounded-2xl border border-slate-100 p-4 font-bold text-slate-900 outline-none" />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-bold text-slate-500 mb-2 block">Expiry Date</label>
                <input type="text" placeholder="MM / YY" className="w-full bg-slate-50 rounded-2xl border border-slate-100 p-4 font-bold text-slate-900 outline-none" />
              </div>
              <div className="flex-1">
                <label className="text-sm font-bold text-slate-500 mb-2 block">CVV</label>
                <input type="text" placeholder="123" className="w-full bg-slate-50 rounded-2xl border border-slate-100 p-4 font-bold text-slate-900 outline-none" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 font-medium">
              <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-[#d49b35] focus:ring-[#d49b35]" />
              Save card for future payments
            </label>
            
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
              <label className="text-sm font-bold text-slate-500 mb-4 block">Select your mobile operator</label>
              <div className="grid grid-cols-3 gap-4">
                {['Airtel', 'MTN', 'ZAMTEL'].map((op) => (
                  <button 
                    key={op}
                    onClick={() => setOperator(op)}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 ${operator === op ? 'border-[#d49b35] bg-[#fdf6e9]' : 'border-slate-100 bg-slate-50'}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${op === 'Airtel' ? 'bg-red-600' : op === 'MTN' ? 'bg-yellow-500' : 'bg-emerald-600'}`}>
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
