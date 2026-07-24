/**
 * Transaction History — the buyer's record of everything that is no longer an
 * ACTIVE transaction. Paid-but-uncollected orders live on the separate
 * "Active Transactions" page (ActiveTransactionsView); this page is purely
 * the archive, split into three tabs:
 *
 *   Purchased Items       paid AND collected (Quote.status COMPLETED /
 *                         HANDED_OVER) — the permanent archive of completed
 *                         purchases.
 *   Requests              dead-ends: a CLOSED inquiry with no order (the buyer
 *                         cancelled / stopped wanting quotes), or a QUOTED
 *                         inquiry where every quote has lapsed
 *                         (rejected/archived/expired) — otherwise these vanish
 *                         from every other list with no trace.
 *   Expired               a still-PENDING/ACCEPTED quote whose provider-set
 *                         "Quote Valid For" window elapsed unpaid (see
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
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import InquiryCard from './InquiryCard';
import QuoteCard from './QuoteCard';
import { isActiveBuyerQuote } from '../services/lifecycleFilters';
import { isQuoteExpired } from '../utils/quoteExpiry';
import { isLoanQuote, isLoanContext } from '../utils/loan';
import defaultEmptyImage from '../assets/images/empty-states/owl_reading.webp';

type TxTab = 'PURCHASED' | 'REQUESTS' | 'EXPIRED';

const COLLECTED_STATUSES = ['COMPLETED', 'HANDED_OVER'];
// TODO: no live code path writes CANCELLED/REFUNDED to a Quote today, so
// they're not in either bucket above — harmless for now, but the day a
// cancel/refund flow ships, a cancelled/refunded paid order would silently
// vanish from every Transaction History tab instead of landing in one.

interface TransactionHistoryViewProps {
  data?: any;
  onAction: (actionId: string, payload?: any) => void;
  /** One-shot arrival hint from a dashboard metric tile ("Ready to
   *  Collect"/"Completed") — picks the tab to land on instead of always
   *  defaulting to Awaiting Collection. Consumed once on mount. */
  initialTab?: TxTab | null;
}

export default function TransactionHistoryView({ data, onAction, initialTab }: TransactionHistoryViewProps) {
  const [tab, setTab] = useState<TxTab>(initialTab || 'PURCHASED');

  useEffect(() => {
    if (initialTab) {
      onAction('transaction_tab_handled');
    }
    // Only ever meant to apply once, at the arrival that set the hint —
    // deliberately not re-running if initialTab or onAction identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orders: any[] = data?.orders ?? [];
  const allInquiries: any[] = data?.allInquiries ?? [];
  const allQuotes: any[] = data?.allQuotes ?? [];

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

  const TABS: Array<{ key: TxTab; label: string; count: number; hint: string }> = [
    { key: 'PURCHASED', label: 'Purchased', count: purchasedItems.length, hint: 'Paid orders you’ve already collected.' },
    { key: 'REQUESTS', label: 'Requests', count: requests.length, hint: 'Inquiries that closed or lost every quote.' },
    { key: 'EXPIRED', label: 'Expired', count: expiredQuotes.length, hint: 'Quotes that lapsed before you paid.' },
  ];
  const activeHint = TABS.find((t) => t.key === tab)?.hint;

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
        <h2 className="text-2xl sm:text-3xl font-serif font-black text-brand-dark">Transaction History</h2>
        <p className="text-sm sm:text-base text-slate-500">
          Your collected purchases, expired quotes, and closed requests
        </p>
      </div>

      {/* Segmented tab control — full-width, every tab visible on mobile (no
          horizontal scroll). A navy thumb slides to the active tab (framer
          layoutId) so a switch is unmistakable, and a caption below spells out
          what the active tab holds. */}
      <div>
        <div
          role="tablist"
          aria-label="Transaction history sections"
          className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100 rounded-2xl"
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className="relative flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl min-h-[54px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B3068]/40"
              >
                {active && (
                  <motion.span
                    layoutId="txTabThumb"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    className="absolute inset-0 bg-[#1B3068] rounded-xl shadow-md"
                  />
                )}
                <span
                  className={`relative z-10 text-[12px] sm:text-sm font-bold transition-colors ${
                    active ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {t.label}
                </span>
                <span
                  className={`relative z-10 inline-flex items-center justify-center min-w-[20px] h-[18px] px-1.5 rounded-full text-[10px] font-black transition-colors ${
                    active ? 'bg-white/20 text-white' : 'bg-white text-slate-500'
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
        <AnimatePresence mode="wait">
          <motion.p
            key={`hint-${tab}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="px-2 mt-3 text-xs text-slate-400 font-medium"
          >
            {activeHint}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Content — re-keyed per tab so switching fades/slides the panel in. */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
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
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
