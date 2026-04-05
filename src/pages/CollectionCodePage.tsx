import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Share2, QrCode, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

export default function CollectionCodePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const quoteData = useLiveQuery(
    async () => {
      if (!id) return null;
      const quote = await db.quotes.get(Number(id));
      if (!quote) return null;
      return quote;
    },
    [id]
  );

  const handleShare = async () => {
    if (navigator.share && quoteData?.collectionCode) {
      try {
        await navigator.share({
          title: 'Parcel Collection Code',
          text: `Here is my collection PIN for order ${quoteData.id}: ${quoteData.collectionCode}`,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      alert('Sharing is not supported on this device or code is missing.');
    }
  };

  if (quoteData === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d49b35]"></div>
      </div>
    );
  }

  if (quoteData === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Code Not Found</h2>
        <p className="text-slate-500 mb-6">We couldn't find the collection code for this order.</p>
        <button 
          onClick={() => navigate(-1)}
          className="bg-[#d49b35] hover:brightness-95 text-slate-900 font-bold py-3 px-6 rounded-xl"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-bold text-slate-900">Collection Code</h1>
          <div className="w-10 h-10"></div> {/* Spacer for centering */}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-8">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-2 bg-[#d49b35]"></div>
          
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-[#fdf6e9] rounded-full flex items-center justify-center mx-auto mb-4 mt-2">
              <QrCode className="w-8 h-8 text-[#d49b35]" />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Scan to Collect</h2>
            <p className="text-slate-500 text-sm mb-8">
              Present this QR code or PIN to the seller or shop attendant when picking up your parcel in person.
            </p>

            <div className="flex justify-center mb-8">
              <div className="bg-white p-4 rounded-3xl border-2 border-slate-100 shadow-sm">
                <QRCodeSVG value={`TONSE-COLLECT-QT-${quoteData.id}-${quoteData.collectionCode}`} size={200} />
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl py-4 px-8 inline-block border border-slate-100 mb-8">
              <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Collection PIN</p>
              <p className="text-4xl font-black text-slate-900 tracking-widest">{quoteData.collectionCode}</p>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleShare}
                className="w-full bg-[#d49b35] text-slate-900 font-bold py-4 rounded-2xl shadow-lg shadow-[#d49b35]/25 hover:brightness-95 transition-all flex items-center justify-center gap-2"
              >
                <Share2 className="w-5 h-5" />
                Share Collection Code
              </button>
            </div>
          </div>
          
          <div className="bg-[#fdf6e9]/50 p-6 border-t border-[#d49b35]/20">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#d49b35] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-600 leading-relaxed">
                <strong className="text-slate-900">Secure Escrow:</strong> Scanning this code completes the transaction. The funds currently held in escrow will automatically be queued for release to the seller.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
