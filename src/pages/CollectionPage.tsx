import React, { useState, useEffect } from 'react';
import { QrCode, Search, Check, X, Loader2, Package, Clock, User, ArrowRight } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Quote } from '../types';

export default function CollectionPage() {
  const [collectionCode, setCollectionCode] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const recentCollections = useLiveQuery(
    async () => {
      return await db.quotes
        .where('status')
        .equals('COMPLETED')
        .reverse()
        .sortBy('createdAt');
    },
    []
  ) || [];

  useEffect(() => {
    if (isScanning) {
      const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 }, false);
      scanner.render((decodedText) => {
        setCollectionCode(decodedText);
        setIsScanning(false);
        scanner.clear();
        handleFindParcel(decodedText);
      }, (err) => {
        console.error(err);
      });
      return () => {
        scanner.clear();
      };
    }
  }, [isScanning]);

  const handleFindParcel = async (code: string) => {
    setIsLoading(true);
    setError('');
    const foundQuote = await db.quotes.where('collectionCode').equals(code).first();
    if (foundQuote) {
      setQuote(foundQuote);
    } else {
      setError('Parcel not found. Please check the code.');
    }
    setIsLoading(false);
  };

  const handleProcessCollection = async () => {
    if (!quote || !quote.id) return;
    await db.quotes.update(quote.id, { status: 'COMPLETED' });
    setQuote(null);
    setCollectionCode('');
    alert('Parcel collected successfully!');
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Parcel Collection</h1>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={collectionCode}
            onChange={(e) => setCollectionCode(e.target.value)}
            placeholder="Enter unique ID..."
            className="flex-1 bg-slate-50 rounded-2xl border border-slate-100 p-4 font-bold text-slate-900 outline-none"
          />
          <button
            onClick={() => handleFindParcel(collectionCode)}
            className="bg-[#d49b35] hover:brightness-95 text-slate-900 p-4 rounded-2xl"
          >
            <Search className="w-6 h-6" />
          </button>
        </div>
        <button
          onClick={() => setIsScanning(!isScanning)}
          className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
        >
          <QrCode className="w-5 h-5" />
          {isScanning ? 'Stop Scanning' : 'Scan QR Code'}
        </button>
        {isScanning && <div id="qr-reader" className="mt-4"></div>}
      </div>

      {isLoading && (
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#d49b35]" />
        </div>
      )}

      {error && <p className="text-rose-500 font-bold text-center">{error}</p>}

      {quote && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Parcel Found</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ready for collection</p>
            </div>
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quote ID</span>
              <span className="text-sm font-black text-slate-900">#QT-{quote.id?.toString().padStart(4, '0')}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Buyer Name</span>
              <span className="text-sm font-black text-slate-900">{quote.buyerContact?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Amount Paid</span>
              <span className="text-sm font-black text-emerald-600">ZMW {quote.price.toLocaleString()}</span>
            </div>
          </div>

          <button
            onClick={handleProcessCollection}
            className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Check className="w-5 h-5" />
            Confirm & Process Collection
          </button>
        </div>
      )}

      {/* Recent Collections Panel */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-lg font-black text-slate-900">Recent Collections</h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-full">
            {recentCollections.length} Total
          </span>
        </div>

        <div className="space-y-3">
          {recentCollections.length === 0 ? (
            <div className="bg-white rounded-[24px] p-8 text-center border border-slate-100">
              <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-medium italic">No parcels processed yet.</p>
            </div>
          ) : (
            recentCollections.slice(0, 5).map((item) => (
              <div key={item.id} className="bg-white rounded-[24px] p-4 shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                  <Check className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h4 className="font-bold text-slate-900 text-sm truncate">#QT-{item.id?.toString().padStart(4, '0')}</h4>
                    <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      <User className="w-3 h-3" />
                      {item.buyerContact?.name || 'Buyer'}
                    </div>
                    <span className="text-slate-300">•</span>
                    <div className="text-[10px] font-black text-emerald-600">
                      ZMW {item.price.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
