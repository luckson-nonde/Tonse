/**
 * Transaction History — the buyer's renamed/restructured "Order History"
 * page. Splits every paid order + dead-end inquiry + lapsed quote into four
 * tabs instead of one flat, everything-looks-the-same list:
 *
 *   Awaiting Collection  paid, not yet collected (Quote.status PAID /
 *                         PENDING_COLLECTION / AWAITING_PICKUP) — the
 *                         easy-access tab for the actual pickup moment.
 *   Purchased Items       paid AND collected (Quote.status COMPLETED /
 *                         HANDED_OVER) — the permanent archive.
 *   Requests              dead-ends: a CLOSED inquiry with no order, or a
 *                         QUOTED inquiry where every quote has lapsed
 *                         (rejected/archived/expired) — today these vanish
 *                         from every other list in the dashboard with no
 *                         trace anywhere.
 *   Expired               a still-PENDING/ACCEPTED quote whose provider-set
 *                         "Quote Valid For" window has elapsed unpaid (see
 *                         src/utils/quoteExpiry.ts). Loans excluded — they
 *                         have their own dedicated Loan Offers surface.
 *
 * Self-contained tab state (mirrors ReportManagerView.tsx's established
 * pattern — this codebase's schema layer has no sub-tab concept, so every
 * screen that wants this reimplements it locally). Data comes straight from
 * BuyerDashboard's `dashboardData` (orders/allInquiries/allQuotes) — no new
 * fetches of its own, same as ReportManagerView fetching its own but unlike
 * it, this one reuses what's already loaded for the rest of the dashboard.
 */
import React, { useMemo, useState } from 'react';
import InquiryCard from './InquiryCard';
import QuoteCard from './QuoteCard';
import { isActiveBuyerQuote } from '../services/lifecycleFilters';
import { isQuoteExpired } from '../utils/quoteExpiry';
import { isLoanQuote, isLoanContext } from '../utils/loan';
import defaultEmptyImage from '../assets/images/empty-states/owl_reading.webp';

type TxTab = 'AWAITING' | 'PURCHASED' | 'REQUESTS' | 'EXPIRED';

const AWAITING_STATUSES = ['PAID', 'PENDING_COLLECTION', 'AWAITING_PICKUP'];
const COLLECTED_STATUSES = ['COMPLETED', 'HANDED_OVER'];

interface TransactionHistoryViewProps {
  data?: any;
  onAction: (actionId: string, payload?: any) => void;
}

export default function TransactionHistoryView({ data, onAction }: TransactionHistoryViewProps) {
  const [tab, setTab] = useState<TxTab>('AWAITING');

  const orders: any[] = data?.orders ?? [];
  const allInquiries: any[] = data?.allInquiries ?? [];
  const allQuotes: any[] = data?.allQuotes ?? [];

  const awaitingCollection = useMemo(
    () =>
      orders.filter((o) =>
        AWAITING_STATUSES.includes(String(o?.paidQuote?.status || '').toUpperCase()),
      ),
    [orders],
  );

  const purchasedItems = useMemo(
    () =>
      orders.filter((o) =>
        COLLECTED_STATUSES.includes(String(o?.paidQuote?.status || '').toUpperCase()),
      ),
    [orders],
  );

  // Every order that resolved to a real inquiry join carries that inquiry's
  // own id (see BuyerDashboard.tsx's `orders` memo) — used below to tell a
  // truly dead-ended CLOSED inquiry apart from one that already has an order.
  const inquiryIdsWithOrders = useMemo(
    () => new Set(orders.map((o) => String(o.id))),
    [orders],
  );

  const requests = useMemo(
    () =>
      allInquiries.filter((inq) => {
        // Loans have their own dedicated Loan Offers surface (which already
        // shows rejected/declined offers) — don't duplicate them here.
        if (isLoanContext(inq?.category, inq?.categoryIds, inq?.title)) return false;
        const status = String(inq?.status || '').toUpperCase();
        if (status === 'CLOSED') {
          return !inquiryIdsWithOrders.has(String(inq.id));
        }
        if (status === 'QUOTED') {
          return !allQuotes.some(
            (q) => String(q?.inquiryId) === String(inq.id) && isActiveBuyerQuote(q),
          );
        }
        return false;
      }),
    [allInquiries, allQuotes, inquiryIdsWithOrders],
  );

  const expiredQuotes = useMemo(
    () =>
      allQuotes.filter((q) => {
        const status = String(q?.status || '').toUpperCase();
        return (
          ['PENDING', 'ACCEPTED'].includes(status) &&
          !q?.isArchived &&
          !isLoanQuote(q) &&
          isQuoteExpired(q)
        );
      }),
    [allQuotes],
  );

  const TABS: Array<{ key: TxTab; label: string; count: number }> = [
    { key: 'AWAITING', label: 'Awaiting Collection', count: awaitingCollection.length },
    { key: 'PURCHASED', label: 'Purchased Items', count: purchasedItems.length },
    { key: 'REQUESTS', label: 'Requests', count: requests.length },
    { key: 'EXPIRED', label: 'Expired', count: expiredQuotes.length },
  ];

  const renderEmpty = (title: string, description: string) => (
    <div className="bg-white p-6 sm:p-16 rounded-4xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center min-h-[40vh]">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-brand-gold/5 rounded-full blur-3xl scale-150 animate-pulse" />
        <img
          src={defaultEmptyImage}
          alt="Empty state"
          className="w-36 h-36 sm:w-48 sm:h-48 object-contain relative z-10 opacity-90 drop-shadow-lg"
        />
      </div>
      <h3 className="text-xl sm:text-2xl font-serif font-black text-brand-dark mb-3">{title}</h3>
      <p className="text-slate-500 max-w-sm mx-auto text-sm sm:text-base leading-relaxed font-medium">
        {description}
      </p>
    </div>
  );

  const renderOrderCards = (rows: any[]) => (
    <div className="space-y-4">
      {rows.map((item, idx) => (
        <InquiryCard
          key={`order-${item.orderId ?? item.id ?? idx}`}
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
  );

  return (
    <div className="space-y-6">
      <div className="px-2">
        <h2 className="text-3xl font-serif font-black text-brand-dark">Transaction History</h2>
        <p className="text-slate-500">
          Track paid orders awaiting collection, purchases, requests, and expired quotes
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-3 sm:px-4 pt-3 flex items-center gap-1 sm:gap-1.5 border-b border-slate-100 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 sm:px-4 py-2.5 rounded-t-xl text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                tab === t.key ? 'bg-[#1B3068] text-white' : 'text-slate-400 hover:text-[#1B3068]'
              }`}
            >
              {t.label}
              <span className="ml-1.5 font-bold opacity-70">{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {tab === 'AWAITING' &&
        (awaitingCollection.length > 0
          ? renderOrderCards(awaitingCollection)
          : renderEmpty(
              'Nothing awaiting collection',
              "Orders you've paid for stay here until you collect them.",
            ))}

      {tab === 'PURCHASED' &&
        (purchasedItems.length > 0
          ? renderOrderCards(purchasedItems)
          : renderEmpty(
              'No purchases yet',
              'Once you collect a paid order, it moves here as a permanent record.',
            ))}

      {tab === 'REQUESTS' &&
        (requests.length > 0 ? (
          <ul className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-3xl overflow-hidden">
            {requests.map((inq, idx) => (
              <li
                key={`request-${inq.id ?? idx}`}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-brand-dark truncate">
                    {inq.title || 'Untitled Inquiry'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 truncate">
                    {String(inq.category || inq.categoryIds?.[0] || '').replace(/-/g, ' ')}
                    {' · '}
                    {inq.createdAt ? new Date(inq.createdAt).toLocaleDateString() : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 whitespace-nowrap">
                    {String(inq.status || '').toUpperCase() === 'CLOSED' ? 'Closed' : 'No Response'}
                  </span>
                  <button
                    onClick={() => onAction('view_details', inq)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors whitespace-nowrap"
                  >
                    View Details
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          renderEmpty(
            'No dead-end requests',
            'Inquiries that close without an order, or lose every quote, show up here.',
          )
        ))}

      {tab === 'EXPIRED' &&
        (expiredQuotes.length > 0 ? (
          <div className="space-y-4">
            {expiredQuotes.map((quote, idx) => (
              <QuoteCard
                key={`expired-${quote.id ?? idx}`}
                quote={quote}
                onView={() => onAction('view_quote', quote)}
                onDelete={() => onAction('delete_quote', quote)}
              />
            ))}
          </div>
        ) : (
          renderEmpty(
            'No expired quotes',
            "A quote that goes unpaid past its provider's validity window shows up here.",
          )
        ))}
    </div>
  );
}
