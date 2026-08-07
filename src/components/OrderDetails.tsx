import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  ShoppingBag,
  CheckCircle,
  Truck,
  MapPin,
  Calendar,
  ShieldCheck,
  QrCode,
  Printer,
  ArrowRight,
  Camera,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Quote, Inquiry } from '../types';
import Button from '../components/Button';
import { jobsService, JobMediaRecord } from '../services/api/jobsService';

interface OrderDetailsProps {
  order: Quote;
  inquiry?: Inquiry;
  onAction: (actionId: string, payload?: any) => void;
}

const isVideoUrl = (src: string) => /\.(mp4|webm|mov|avi|3gp)$/i.test(src);

/** Before/after proof-of-work captured by the shop's technician on this job.
 *  Renders nothing at all when the job has no evidence (most product orders),
 *  so non-service orders stay uncluttered. */
function ServiceEvidenceSection({ quoteId }: { quoteId: string }) {
  const [media, setMedia] = useState<JobMediaRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    jobsService
      .media(quoteId)
      .then((rows) => {
        if (!cancelled) setMedia(rows);
      })
      .catch(() => {
        /* section simply doesn't render */
      });
    return () => {
      cancelled = true;
    };
  }, [quoteId]);

  if (media.length === 0) return null;

  const phases: Array<{ key: 'BEFORE' | 'AFTER'; label: string }> = [
    { key: 'BEFORE', label: 'Before service' },
    { key: 'AFTER', label: 'After service' },
  ];

  return (
    <div className="bg-white p-5 sm:p-8 rounded-3xl sm:rounded-4xl border border-slate-200 shadow-sm">
      <h3 className="text-lg font-bold text-brand-dark mb-2 flex items-center gap-2">
        <Camera className="w-5 h-5 text-[#C9973A]" />
        Service Evidence
      </h3>
      <p className="text-xs text-slate-500 mb-6">
        Captured by the provider's technician as proof of the work done.
      </p>
      <div className="space-y-6">
        {phases.map(({ key, label }) => {
          const rows = media.filter((m) => m.phase === key);
          if (rows.length === 0) return null;
          return (
            <div key={key}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                {label}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {rows.map((m) =>
                  m.mediaType === 'VIDEO' || isVideoUrl(m.url) ? (
                    <video
                      key={m.id}
                      src={m.url}
                      controls
                      preload="metadata"
                      className="w-full h-28 object-cover rounded-2xl bg-black col-span-2"
                    />
                  ) : (
                    <a key={m.id} href={m.url} target="_blank" rel="noreferrer">
                      <img
                        src={m.url}
                        alt={`${label} evidence`}
                        loading="lazy"
                        className="w-full h-28 object-cover rounded-2xl"
                      />
                    </a>
                  ),
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OrderDetails({ order, inquiry, onAction }: OrderDetailsProps) {
  // `order` is a raw Quote (price top-level) when opened from a quote flow,
  // but the buyer's Order History rows (BuyerDashboard) are inquiry-shaped
  // with the paid amount nested on `paidQuote` and the seller on
  // `sellerName`. Read whichever is present — a missing amount must never
  // crash the dashboard.
  const paid = (order as any).paidQuote as
    | {
        id?: string | number;
        price?: number | string;
        orderNumber?: string;
        status?: string;
        updatedAt?: string;
        collectionCode?: string;
      }
    | undefined;
  const price = Number(paid?.price ?? order.price ?? 0) || 0;
  const orderNumber = paid?.orderNumber || `ORD-${order.id}`;
  const providerName = order.providerName || (order as any).sellerName;

  // Real collection-flow status (Quote.status): falls back to the raw
  // Quote's own `.status` when opened from a non-inquiry-shaped source.
  // Matches the same COMPLETED/HANDED_OVER check InquiryCard uses.
  const quoteStatus = String(paid?.status ?? order.status ?? '').toUpperCase();
  const isCollected = ['COMPLETED', 'HANDED_OVER'].includes(quoteStatus);

  // Real, backend-generated collection PIN + the canonical QR payload the
  // seller's scanner expects (same format as CollectionCodePage /
  // PaymentSuccessPage). When it's missing we render no QR at all rather than
  // a fake one.
  const collectionCode = paid?.collectionCode ?? (order as any).collectionCode;
  const quoteId = paid?.id ?? order.id;
  const qrValue = collectionCode ? `NYUWE-COLLECT-QT-${quoteId}-${collectionCode}` : '';

  const money = (n: number) => `K${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  // Print / save-as-PDF receipt. Opens a clean, self-contained receipt document
  // and prints it — works on mobile (system print/share sheet) without
  // dragging in the dashboard chrome. Triggered from a user click, so the
  // pop-up isn't blocked; we alert if a blocker still intervenes.
  const handlePrintReceipt = () => {
    const itemTitle = (order as any).title || inquiry?.title || 'Product / Service';
    const paidOn = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—';
    const html = `<!doctype html><html><head><meta charset="utf-8"/>
<title>Receipt ${orderNumber}</title>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1b2437;margin:0;padding:24px}
  .wrap{max-width:420px;margin:0 auto}
  h1{font-size:20px;margin:0;color:#1B3068}
  .sub{color:#c9973a;font-weight:800;letter-spacing:.15em;text-transform:uppercase;font-size:11px;margin-top:4px}
  .card{border:1px solid #e5e9f0;border-radius:14px;padding:18px;margin-top:18px}
  .row{display:flex;justify-content:space-between;gap:16px;font-size:13px;padding:6px 0}
  .muted{color:#7b8496}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px}
  td{padding:6px 0}
  td.r{text-align:right;font-weight:700}
  .total td{border-top:1px solid #e5e9f0;padding-top:10px;font-size:15px;font-weight:800;color:#1B3068}
  .code{text-align:center}
  .pin{font-size:26px;font-weight:900;letter-spacing:.2em;color:#1B3068;margin:4px 0}
  .foot{text-align:center;color:#9aa3b2;font-size:11px;margin-top:22px}
</style></head><body><div class="wrap">
  <h1>Nyuwe Zambia</h1><div class="sub">Payment Receipt</div>
  <div class="card">
    <div class="row"><span class="muted">Order</span><span>${orderNumber}</span></div>
    <div class="row"><span class="muted">Paid on</span><span>${paidOn}</span></div>
    ${providerName ? `<div class="row"><span class="muted">Seller</span><span>${providerName}</span></div>` : ''}
    <div class="row"><span class="muted">Item</span><span>${itemTitle}</span></div>
    <table>
      <tr><td>Subtotal</td><td class="r">${money(price)}</td></tr>
      <tr><td>Escrow fee (1%)</td><td class="r">${money(price * 0.01)}</td></tr>
      <tr class="total"><td>Grand total</td><td class="r">${money(price * 1.01)}</td></tr>
    </table>
  </div>
  ${collectionCode ? `<div class="card code"><div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.15em">Collection code</div><div class="pin">${collectionCode}</div><div class="muted" style="font-size:11px">${isCollected ? 'Collected' : 'Present this at pickup'}</div></div>` : ''}
  <div class="foot">Funds held in escrow · Thank you for using Nyuwe Zambia</div>
</div><script>window.onload=function(){setTimeout(function(){window.print()},150)}<\/script></body></html>`;
    const win = window.open('', '_blank', 'width=420,height=720');
    if (!win) {
      alert('Please allow pop-ups for this site to print your receipt.');
      return;
    }
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Order Status Header */}
      <div
        className={`p-5 sm:p-8 rounded-3xl sm:rounded-4xl border flex flex-col md:flex-row md:justify-between md:items-center gap-4 sm:gap-6 ${
          isCollected
            ? 'bg-emerald-50 border-emerald-100'
            : 'bg-blue-50 border-blue-100'
        }`}
      >
        <div className="flex items-center gap-4 sm:gap-6">
          <div
            className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 ${
              isCollected
                ? 'bg-emerald-500 shadow-emerald-200'
                : 'bg-blue-500 shadow-blue-200'
            }`}
          >
            <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div className="min-w-0">
            <h2
              className={`text-lg sm:text-2xl font-serif font-black leading-tight ${
                isCollected ? 'text-emerald-900' : 'text-blue-900'
              }`}
            >
              {isCollected ? 'Order Collected' : 'Order Paid — Awaiting Collection'}
            </h2>
            <p className={`text-sm ${isCollected ? 'text-emerald-700/70 font-medium' : 'text-blue-700/70 font-medium'}`}>
              Order ID: {orderNumber}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handlePrintReceipt}
          className={`w-full md:w-auto justify-center shrink-0 ${
            isCollected
              ? 'bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-100'
          }`}
        >
          <Printer className="w-4 h-4 mr-2" /> Print Receipt
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6 lg:space-y-8">
          {/* Collection Details */}
          <div className="bg-white p-5 sm:p-8 rounded-3xl sm:rounded-4xl border border-slate-200 shadow-sm">
            <h3 className="text-base sm:text-lg font-bold text-brand-dark mb-5 sm:mb-6 flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#C9973A]" />
              Collection Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <MapPin className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Pickup Point
                    </p>
                    <p className="text-sm font-bold text-brand-dark">{providerName ? `${providerName} Store` : 'Seller Store'}</p>
                    {((order as any).city || (order as any).location) && (
                      <p className="text-xs text-slate-500">
                        {[(order as any).city, (order as any).province].filter(Boolean).join(', ') ||
                          (order as any).location}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <Calendar className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Paid On
                    </p>
                    <p className="text-sm font-bold text-brand-dark">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {isCollected && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-50 rounded-xl">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Collected On
                      </p>
                      <p className="text-sm font-bold text-brand-dark">
                        {paid?.updatedAt ? new Date(paid.updatedAt).toLocaleDateString() : '—'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {isCollected ? (
                <div className="order-first sm:order-none bg-emerald-50 p-5 sm:p-6 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center text-center">
                  <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
                    <CheckCircle className="w-16 h-16 text-emerald-500" />
                  </div>
                  <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mb-1">
                    Collected
                  </p>
                  <p className="text-sm font-bold text-emerald-800 max-w-[220px]">
                    This item has already been collected and funds released.
                  </p>
                </div>
              ) : (
                <div className="order-first sm:order-none bg-slate-50 p-5 sm:p-6 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                  {collectionCode ? (
                    <>
                      {/* Real, scannable QR of the canonical collection payload
                          — the seller's scanner validates exactly this string. */}
                      <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm mb-4">
                        <QRCodeSVG value={qrValue} size={176} level="M" />
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Collection Code
                      </p>
                      <p className="text-2xl sm:text-3xl font-black text-[#C9973A] tracking-[0.2em]">
                        {collectionCode}
                      </p>
                      <p className="text-xs text-slate-500 mt-2 max-w-[220px]">
                        Show this QR or PIN to the seller at pickup.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
                        <QrCode className="w-16 h-16 text-slate-300" />
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Collection Code
                      </p>
                      <p className="text-sm font-medium text-slate-500 max-w-[220px]">
                        Your collection code appears here once the seller confirms the order.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Item Summary */}
          <div className="bg-white p-5 sm:p-8 rounded-3xl sm:rounded-4xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-brand-dark mb-6">Order Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-4 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-brand-dark">
                      {(order as any).title || inquiry?.title || 'Product/Service'}
                    </p>
                    <p className="text-xs text-slate-500">{order.condition}</p>
                  </div>
                </div>
                <span className="font-black text-brand-dark">K{price.toLocaleString()}</span>
              </div>

              <div className="pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-bold text-brand-dark">K{price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Escrow Fee (1%)</span>
                  <span className="font-bold text-brand-dark">
                    K{(price * 0.01).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-lg pt-4 border-t border-slate-100">
                  <span className="font-serif font-bold text-brand-dark">Grand Total</span>
                  <span className="font-black text-[#C9973A]">
                    K{(price * 1.01).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Service Evidence (renders only when the technician captured any) */}
          {order.id != null && <ServiceEvidenceSection quoteId={String(order.id)} />}
        </div>

        {/* Sidebar: Protection */}
        <div className="space-y-6">
          <div className="bg-white p-5 sm:p-8 rounded-3xl sm:rounded-4xl border border-slate-200 shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 mb-6">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-brand-dark mb-2">Buyer Protection</h4>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              Your funds are held in escrow. Only release the collection code to the seller once you
              have verified the items.
            </p>
            <Button variant="outline" className="w-full border-slate-200 text-slate-600">
              How Escrow Works
            </Button>
          </div>

          <div className="bg-brand-dark p-5 sm:p-8 rounded-3xl sm:rounded-4xl text-white">
            <h4 className="font-serif font-bold text-lg mb-4">Need Assistance?</h4>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              If you encounter any issues during collection, do not release the code and contact us
              immediately.
            </p>
            <Button className="w-full bg-white/10 hover:bg-white/20 text-white border-none">
              Open Dispute
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
