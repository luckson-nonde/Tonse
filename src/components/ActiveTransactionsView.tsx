/**
 * Active Transactions — the buyer's paid-but-not-yet-collected orders.
 *
 * A transaction is "active" from the moment it's paid on a quotation until the
 * item is actually collected (Quote.status PAID / PENDING_COLLECTION /
 * AWAITING_PICKUP). Once collected it graduates to Transaction History. This is
 * the easy-access "show your QR at the shop" surface.
 *
 * Split out of the old combined Transaction History page so ACTIVE and
 * HISTORICAL transactions are independent sidebar pages, not tabs on one
 * screen. Reuses the orders already loaded into BuyerDashboard's
 * `dashboardData` — no fetch of its own.
 */
import React, { useMemo } from 'react';
import InquiryCard from './InquiryCard';
import defaultEmptyImage from '../assets/images/empty-states/owl_reading.webp';

// Paid, not yet handed over — mirrors TransactionHistoryView's collected split.
const AWAITING_STATUSES = ['PAID', 'PENDING_COLLECTION', 'AWAITING_PICKUP'];

interface ActiveTransactionsViewProps {
  data?: any;
  onAction: (actionId: string, payload?: any) => void;
}

export default function ActiveTransactionsView({ data, onAction }: ActiveTransactionsViewProps) {
  const orders: any[] = data?.orders ?? [];

  const active = useMemo(
    () =>
      orders.filter((o) =>
        AWAITING_STATUSES.includes(String(o?.paidQuote?.status || '').toUpperCase()),
      ),
    [orders],
  );

  return (
    <div className="space-y-6">
      <div className="px-2">
        <h2 className="text-3xl font-serif font-black text-brand-dark">Active Transactions</h2>
        <p className="text-slate-500">
          Orders you've paid for that are waiting to be collected — show your QR at the shop.
        </p>
      </div>

      {active.length > 0 ? (
        <div className="space-y-4">
          {active.map((item, idx) => (
            <InquiryCard
              key={`active-${item.orderId ?? item.id ?? idx}`}
              inquiry={item}
              state="paid"
              paidQuote={item.paidQuote}
              onAction={() => onAction('view_order', item)}
              onDelete={() => onAction('delete_inquiry', item)}
              onRate={item.sellerId ? () => onAction('rate_shop', item) : undefined}
              alreadyRated={item.alreadyRated}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white p-6 sm:p-16 rounded-4xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center min-h-[40vh]">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-brand-gold/5 rounded-full blur-3xl scale-150 animate-pulse" />
            <img
              src={defaultEmptyImage}
              alt="Empty state"
              className="w-36 h-36 sm:w-48 sm:h-48 object-contain relative z-10 opacity-90 drop-shadow-lg"
            />
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-black text-brand-dark mb-3">
            No active transactions
          </h3>
          <p className="text-slate-500 max-w-sm mx-auto text-sm sm:text-base leading-relaxed font-medium">
            Orders you've paid for stay here until you collect them. Once collected, they move to
            Transaction History.
          </p>
        </div>
      )}
    </div>
  );
}
