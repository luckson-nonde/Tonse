import React, { useState, useEffect, useCallback } from 'react';
import {
  QrCode,
  Search,
  Check,
  Loader2,
  Package,
  Clock,
  User,
  ArrowRight,
  ShieldCheck,
  BadgeCheck,
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Quote } from '../types';
import { useAuth } from '../AuthContext';
import { hasPermission, PERMISSIONS } from '../utils/rbac';
import { logAuditAction } from '../utils/auditLogger';
import { collectionService } from '../services/api/collectionService';

/**
 * Pull the bare 6-char collection code out of a scanned QR string
 * (`TONSE-COLLECT-QT-<uuid>-<code>`) or return raw manual input unchanged.
 */
function extractCode(raw: string): string {
  const t = (raw || '').trim();
  if (t.toUpperCase().startsWith('TONSE-COLLECT')) return t.substring(t.lastIndexOf('-') + 1);
  return t;
}

/** Pull the quote UUID out of a scanned QR string, if present. */
function extractQuoteId(raw: string): string | null {
  const m = (raw || '').match(
    /QT-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  );
  return m ? m[1] : null;
}

export default function CollectionPage() {
  const { user } = useAuth();
  const [collectionCode, setCollectionCode] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [queue, setQueue] = useState<Quote[]>([]);
  const [recent, setRecent] = useState<Quote[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Financial figures only for staff/owners allowed to see analytics.
  const canViewFinancials = hasPermission(user, PERMISSIONS.VIEW_ANALYTICS);

  const loadLists = useCallback(async () => {
    try {
      const [q, r] = await Promise.all([
        collectionService.listQueue(),
        collectionService.listRecent(),
      ]);
      setQueue(q);
      setRecent(r);
    } catch {
      // Non-fatal — the lookup path still works even if the lists fail.
    }
  }, []);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  const selectParcel = useCallback(
    (found: Quote) => {
      setQuote(found);
      setError('');
      if (user && found.id != null) {
        logAuditAction(
          user,
          'COLLECTION_STARTED',
          String(found.id),
          found.inquiryTitle,
          found.buyerContact?.name || 'Unknown Buyer',
          found.price,
          `Started collection for parcel ${String(found.id)}`,
        );
      }
    },
    [user],
  );

  const handleFindParcel = useCallback(
    async (raw: string) => {
      setIsLoading(true);
      setError('');
      try {
        // If a QR carried the quote id and it's already in the queue, use it —
        // no round-trip and works even when the code isn't separately stored.
        const qid = extractQuoteId(raw);
        const inQueue = qid ? queue.find((q) => String(q.id) === qid) : undefined;
        if (inQueue) {
          selectParcel(inQueue);
          return;
        }
        const found = await collectionService.lookupByCode(extractCode(raw));
        if (found) selectParcel(found);
        else setError('Parcel not found. Check the code or pick it from the list below.');
      } finally {
        setIsLoading(false);
      }
    },
    [queue, selectParcel],
  );

  useEffect(() => {
    if (!isScanning) return;
    const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 }, false);
    scanner.render(
      (decodedText) => {
        setCollectionCode(decodedText);
        setIsScanning(false);
        scanner.clear().catch(() => undefined);
        handleFindParcel(decodedText);
      },
      () => undefined,
    );
    return () => {
      scanner.clear().catch(() => undefined);
    };
  }, [isScanning, handleFindParcel]);

  const handleVerify = async () => {
    if (!quote?.id) return;
    setIsWorking(true);
    setError('');
    try {
      const updated = await collectionService.verify(String(quote.id));
      setQuote({ ...quote, ...updated, status: 'AWAITING_PICKUP' });
      await loadLists();
    } catch (e: any) {
      setError(e?.message || 'Failed to verify buyer. Please try again.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleComplete = async () => {
    if (!quote?.id) return;
    setIsWorking(true);
    setError('');
    try {
      await collectionService.complete(String(quote.id));
      if (user) {
        logAuditAction(
          user,
          'HANDOVER_COMPLETED',
          String(quote.id),
          quote.inquiryTitle,
          quote.buyerContact?.name || 'Unknown Buyer',
          quote.price,
          `Completed handover for parcel ${String(quote.id)}`,
        );
      }
      setQuote(null);
      setCollectionCode('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
      await loadLists();
    } catch (e: any) {
      setError(e?.message || 'Failed to complete handover. Please try again.');
    } finally {
      setIsWorking(false);
    }
  };

  const shortId = (id: Quote['id']) => `#${String(id ?? '').slice(0, 8).toUpperCase()}`;
  const isAwaitingPickup = quote?.status === 'AWAITING_PICKUP';

  return (
    <div className="p-4 max-w-lg mx-auto">
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-emerald-900/20 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-4xl p-8 shadow-2xl border border-emerald-100 max-w-xs w-full text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-6">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Handover Complete</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              The parcel has been handed over and funds released to the shop's account.
            </p>
            <button
              onClick={() => setShowSuccess(false)}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl"
            >
              Done
            </button>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold text-slate-900 mb-6">Parcel Collection</h1>

      {/* Scan / code entry */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
        <div className="relative mb-4">
          <input
            type="text"
            value={collectionCode}
            onChange={(e) => setCollectionCode(e.target.value)}
            placeholder="Enter collection code..."
            className="w-full bg-slate-50 rounded-2xl border border-slate-100 p-4 pr-14 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#d49b35]/20 transition-all"
            onKeyDown={(e) => e.key === 'Enter' && handleFindParcel(collectionCode)}
          />
          <button
            onClick={() => handleFindParcel(collectionCode)}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#d49b35] hover:brightness-95 text-slate-900 p-2.5 rounded-xl transition-all shadow-sm active:scale-95"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={() => setIsScanning(!isScanning)}
          className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-[0.98]"
        >
          <QrCode className="w-5 h-5" />
          {isScanning ? 'Stop Scanning' : 'Scan Buyer QR Code'}
        </button>
        {isScanning && <div id="qr-reader" className="mt-4"></div>}
      </div>

      {isLoading && (
        <div className="text-center mb-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#d49b35]" />
        </div>
      )}

      {error && <p className="text-rose-500 font-bold text-center mb-4">{error}</p>}

      {/* Selected parcel → verify → complete */}
      {quote && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Parcel Found</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {isAwaitingPickup ? 'Identity verified — ready to hand over' : 'Verify the buyer to continue'}
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Order</span>
              <span className="text-sm font-black text-slate-900">{shortId(quote.id)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Buyer</span>
              <span className="text-sm font-black text-slate-900">
                {quote.buyerContact?.name || 'N/A'}
              </span>
            </div>
            {canViewFinancials && (
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Amount Paid
                </span>
                <span className="text-sm font-black text-emerald-600">
                  ZMW {Number(quote.price || 0).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {!isAwaitingPickup ? (
            <button
              onClick={handleVerify}
              disabled={isWorking}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50"
            >
              {isWorking ? <Loader2 className="w-5 h-5 animate-spin" /> : <BadgeCheck className="w-5 h-5" />}
              Confirm Buyer Identity
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={isWorking}
              className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {isWorking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              Confirm Handover &amp; Complete
            </button>
          )}
          <button
            onClick={() => setQuote(null)}
            className="w-full mt-2 text-slate-400 font-bold py-2 text-sm hover:text-slate-600"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Awaiting-collection queue */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-lg font-black text-slate-900">Awaiting Collection</h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-full">
            {queue.length} Parcels
          </span>
        </div>
        <div className="space-y-3">
          {queue.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-100">
              <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-medium italic">No parcels awaiting collection.</p>
            </div>
          ) : (
            queue.map((item) => (
              <button
                key={String(item.id)}
                onClick={() => selectParcel(item)}
                className="w-full text-left bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex items-center gap-4 hover:border-[#d49b35]/40 transition-colors"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                  <Package className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h4 className="font-bold text-slate-900 text-sm truncate">
                      {item.inquiryTitle || shortId(item.id)}
                    </h4>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        item.status === 'AWAITING_PICKUP'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {item.status === 'AWAITING_PICKUP' ? 'Awaiting pickup' : 'Paid'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    <User className="w-3 h-3" />
                    {item.buyerContact?.name || 'Buyer'}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Recent completed collections */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-lg font-black text-slate-900">Recent Collections</h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-full">
            {recent.length} Total
          </span>
        </div>
        <div className="space-y-3">
          {recent.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-100">
              <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-medium italic">No parcels processed yet.</p>
            </div>
          ) : (
            recent.slice(0, 5).map((item) => (
              <div
                key={String(item.id)}
                className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                  <Check className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h4 className="font-bold text-slate-900 text-sm truncate">
                      {item.inquiryTitle || shortId(item.id)}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {item.createdAt ? new Date(item.createdAt as any).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      <User className="w-3 h-3" />
                      {item.buyerContact?.name || 'Buyer'}
                    </div>
                    {canViewFinancials && (
                      <>
                        <span className="text-slate-300">•</span>
                        <div className="text-[10px] font-black text-emerald-600">
                          ZMW {Number(item.price || 0).toLocaleString()}
                        </div>
                      </>
                    )}
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
