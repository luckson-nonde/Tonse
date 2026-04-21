import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Star,
  MapPin,
  MessageSquare,
  Truck,
  PackageOpen,
  Check,
  QrCode,
  ShieldCheck,
  Printer,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import VerificationModal from '../components/VerificationModal';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient } from '../services/api/client';
import { Quote, Inquiry } from '../types';

type QuoteData = Quote & { inquiry?: Inquiry };

export default function QuoteDetailsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quoteId = Number(searchParams.get('id'));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState('');
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!quoteId) return;
      try {
        const response = await apiClient.get(`/quotes/${quoteId}`);
        setQuoteData(response.data);
      } catch (error) {
        console.error('Error fetching quote:', error);
        setQuoteData(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [quoteId]);

  if (!quoteData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d49b35]"></div>
      </div>
    );
  }

  const { inquiry } = quoteData;
  const totalAmount = quoteData.price;

  const openVerification = (itemName: string) => {
    setSelectedItem(itemName);
    setIsModalOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10 flex items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-700" />
          </button>
          <h1 className="text-lg font-bold text-slate-900">Quotation Details</h1>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
      </div>

      <div className="p-4 max-w-3xl mx-auto mt-2 print:p-0 print:max-w-none">
        {/* Main Quotation Document Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-6 print:border-none print:shadow-none print:rounded-none">
          {/* Document Header */}
          <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row md:justify-between gap-6 print:border-b-2 print:border-slate-200">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fdf6e9] text-[#d49b35] text-[10px] font-bold uppercase tracking-widest mb-4 print:hidden">
                <ShieldCheck className="w-3.5 h-3.5" />
                Official Quotation
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-1">
                #QT-{quoteData.id?.toString().padStart(3, '0')}
              </h2>
              {(quoteData.inquiry?.entertainmentData?.eventDateTime ||
                quoteData.inquiry?.attributes?.eventDateTime ||
                quoteData.inquiry?.attributes?.date) && (
                <p className="text-[#d49b35] font-bold text-sm mb-2">
                  Event Date:{' '}
                  {new Date(
                    quoteData.inquiry.entertainmentData?.eventDateTime ||
                      quoteData.inquiry.attributes?.eventDateTime ||
                      quoteData.inquiry.attributes?.date
                  ).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
              <p className="text-slate-500 font-medium text-sm">
                Issued on{' '}
                {new Date(quoteData.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            {/* Provider Info (From) */}
            <div className="bg-slate-50 rounded-2xl p-4 md:text-right md:bg-transparent md:p-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Prepared By
              </p>
              <div className="flex items-center md:justify-end gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white shadow-sm shrink-0">
                  {(quoteData.providerName || 'P').charAt(0)}
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-slate-900">
                    {quoteData.providerName || 'Provider'}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                    <Star className="w-3.5 h-3.5 text-[#d49b35]" fill="currentColor" />
                    <span className="font-bold text-slate-700">4.9</span>
                    <span>• {quoteData.inquiry?.location || 'Lusaka'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Seller Message */}
          {(quoteData.message ||
            (quoteData.requirements && quoteData.requirements.length > 0) ||
            quoteData.venueSpaceName) && (
            <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50 print:bg-white print:border-b print:border-slate-200">
              {quoteData.venueSpaceName && (
                <div className="mb-6">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                    Venue Space
                  </p>
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <p className="text-sm font-bold text-slate-900 mb-2">
                      {quoteData.venueSpaceName}
                    </p>
                    {(quoteData.damageDeposit || quoteData.cleaningFee) && (
                      <div className="flex gap-6 mt-3 pt-3 border-t border-slate-100">
                        {quoteData.damageDeposit && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                              Damage Deposit
                            </p>
                            <p className="text-sm font-bold text-slate-700">
                              ZMW {quoteData.damageDeposit.toLocaleString()}
                            </p>
                          </div>
                        )}
                        {quoteData.cleaningFee && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                              Cleaning Fee
                            </p>
                            <p className="text-sm font-bold text-slate-700">
                              ZMW {quoteData.cleaningFee.toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {quoteData.message && (
                <>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                    Message from Seller
                  </p>
                  <div className="flex gap-4 mb-6">
                    <MessageSquare className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-700 leading-relaxed italic">
                      "{quoteData.message}"
                    </p>
                  </div>
                </>
              )}
              {quoteData.requirements && quoteData.requirements.length > 0 && (
                <>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                    Artist Requirements
                  </p>
                  <div className="space-y-2">
                    {quoteData.requirements.map((req) => (
                      <div
                        key={req.item}
                        className="flex gap-3 items-start bg-white p-3 rounded-xl border border-slate-200"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-[#d49b35] mt-2 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-slate-900">{req.item}</p>
                          <p className="text-xs text-slate-600">{req.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Items List */}
          <div className="p-6 md:p-8">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
              Quoted Items
            </p>

            <div className="space-y-4">
              {quoteData.inquiry?.items?.map((item: any) => (
                <div
                  key={item.id || item.title}
                  className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm transition-all print:border-slate-200"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 overflow-hidden shrink-0 print:hidden">
                      {item.images && item.images.length > 0 ? (
                        <img
                          src={item.images[0]}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <PackageOpen className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <h4 className="font-bold text-slate-900 text-base leading-tight mb-1.5">
                        {item.title}
                      </h4>
                      <div className="flex flex-col gap-0.5 text-sm text-slate-500">
                        <span className="font-medium text-slate-700">Qty: {item.quantity}</span>
                        <span>{item.brand || 'Unbranded'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-50 flex justify-end print:hidden">
                    <button
                      onClick={() => openVerification(item.title)}
                      className="text-xs font-bold text-[#d49b35] flex items-center gap-1.5 hover:text-[#b3822c] transition-colors bg-[#fdf6e9] px-3 py-1.5 rounded-lg"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verify Item
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total Section */}
          <div className="p-6 md:p-8 bg-slate-50/50 border-t border-slate-100 print:bg-white print:border-t-2 print:border-slate-200">
            <div className="flex flex-col items-end">
              <div className="w-full sm:w-2/3 md:w-1/2 space-y-3">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-medium text-slate-700">
                    ZMW {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-slate-500 pb-4 border-b border-slate-200/60">
                  <span>Taxes & Fees</span>
                  <span className="font-medium text-slate-700">Included</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <div>
                    <p className="text-base font-bold text-slate-900">Total Amount</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Due by {quoteData.expiryDuration || 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-slate-900 tracking-tight">
                      <span className="text-sm font-semibold text-slate-500 mr-1.5">ZMW</span>
                      {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="space-y-4 print:hidden">
          {quoteData.status === 'PENDING' && (
            <>
              <button
                onClick={async () => {
                  if (quoteData.id) {
                    try {
                      const response = await apiClient.patch(`/quotes/${quoteData.id}/status`, {
                        status: 'ACCEPTED',
                      });
                      setQuoteData(response.data);
                      navigate('/buyer/payment', {
                        state: { amount: totalAmount, quoteId: quoteData.id },
                      });
                    } catch (error) {
                      console.error('Failed to accept quote:', error);
                      alert('Failed to accept quote. Please try again.');
                    }
                  }
                }}
                className="w-full bg-[#d49b35] text-slate-900 font-bold py-4 rounded-2xl shadow-lg shadow-[#d49b35]/25 hover:brightness-95 hover:shadow-[#d49b35]/40 transition-all flex items-center justify-center gap-2 text-lg"
              >
                <Check className="w-6 h-6" />
                Accept & Proceed to Payment
              </button>
              <p className="text-center text-sm text-slate-500 font-medium">
                By accepting, you agree to the seller's terms and conditions.
              </p>
            </>
          )}

          {quoteData.status === 'ACCEPTED' && (
            <button
              onClick={() =>
                navigate('/buyer/payment', {
                  state: { amount: totalAmount, quoteId: quoteData.id },
                })
              }
              className="w-full bg-[#d49b35] text-slate-900 font-bold py-4 rounded-2xl shadow-lg shadow-[#d49b35]/25 hover:bg-[#d49b35]/90 transition-all text-lg"
            >
              Pay ZMW {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} Now
            </button>
          )}

          {quoteData.status === 'PAID' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm relative overflow-hidden mb-6">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#d49b35]"></div>
              <div className="w-16 h-16 bg-[#fdf6e9] rounded-full flex items-center justify-center mx-auto mb-4 mt-2">
                <QrCode className="w-8 h-8 text-[#d49b35]" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Ready for Collection</h3>
              <p className="text-slate-500 mb-6 max-w-sm mx-auto text-sm">
                Your payment is held securely in escrow. Generate your collection code to pick up
                your parcel.
              </p>

              <button
                onClick={() => navigate(`/buyer/collection-code/${quoteData.id}`)}
                className="w-full bg-[#d49b35] text-slate-900 font-bold py-4 rounded-2xl shadow-lg shadow-[#d49b35]/25 hover:brightness-95 transition-all flex items-center justify-center gap-2 mb-4"
              >
                <QrCode className="w-5 h-5" />
                Confirm Parcel Collection
              </button>

              <button
                onClick={() => navigate('/buyer')}
                className="w-full bg-slate-50 text-slate-700 border border-slate-200 font-bold py-3 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          )}

          {quoteData.status === 'COMPLETED' && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-emerald-800 font-bold mb-1 text-lg">Order Completed</p>
              <p className="text-sm text-emerald-600">
                This order has been successfully collected and funds released.
              </p>
            </div>
          )}
        </div>
      </div>

      <VerificationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        itemName={selectedItem}
      />
    </div>
  );
}
