/**
 * Report Manager — the user-side "Trust & Safety" page reached from the
 * sidebar's Reporting card. Lists the signed-in user's transactions split
 * into Current (in fulfilment) and Past (completed / cancelled), each tied
 * to the counterparty (buyer sees the seller, seller sees the buyer), with
 * a per-transaction Report action that files an ORDER-context complaint
 * into the admin Reports queue. A My Reports section below tracks what the
 * user has filed and how each was resolved.
 *
 * Self-contained (fetches its own data) — mounted by DynamicAccountRenderer
 * for componentType 'report_manager', same pattern as FinancialPage.
 *
 * Border colors are opaque hexes on purpose — translucent borders on
 * rounded cards mis-rasterize on Mali-GPU Android phones.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Flag, Loader2, ShieldCheck, ChevronRight } from 'lucide-react';
import { useAuth } from '../AuthContext';
import {
  fetchBuyerOrders,
  fetchSellerOrders,
  OrderRecord,
} from '../services/api/orderService';
import {
  reportService,
  MyReport,
  REPORT_CATEGORIES,
} from '../services/api/reportService';
import { isCurrentOrder, isPastOrder } from '../services/lifecycleFilters';
import ReportUserModal from './ReportUserModal';

type TxTab = 'CURRENT' | 'PAST';

const ORDER_STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-[#fdf6e9] text-[#b07f24] border border-[#ecd9b3]',
  CONFIRMED: 'bg-blue-50 text-blue-600 border border-[#bfdbfe]',
  SHIPPED: 'bg-indigo-50 text-indigo-600 border border-[#c7d2fe]',
  DELIVERED: 'bg-emerald-50 text-emerald-600 border border-[#a7f3d0]',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border border-[#a7f3d0]',
  CANCELLED: 'bg-rose-50 text-rose-600 border border-[#fecdd3]',
};

const REPORT_STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-[#fdf6e9] text-[#b07f24] border border-[#ecd9b3]',
  RESOLVED: 'bg-emerald-50 text-emerald-600 border border-[#a7f3d0]',
  DISMISSED: 'bg-slate-100 text-slate-500 border border-[#e2e8f0]',
};

const categoryLabel = (value: string) =>
  REPORT_CATEGORIES.find((c) => c.value === value)?.label ?? value;

export default function ReportManagerView() {
  const { user } = useAuth();
  const isBuyer = user?.role === 'BUYER';

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [myReports, setMyReports] = useState<MyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TxTab>('CURRENT');
  const [reportingOrder, setReportingOrder] = useState<OrderRecord | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [fetchedOrders, mine] = await Promise.all([
        isBuyer ? fetchBuyerOrders(user.id) : fetchSellerOrders(user.id),
        reportService.fetchMine({ limit: 100 }),
      ]);
      setOrders(fetchedOrders);
      setMyReports(mine.data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load your transactions');
    } finally {
      setLoading(false);
    }
  }, [user?.id, isBuyer]);

  useEffect(() => {
    load();
  }, [load]);

  /** The other side of the deal — who a report from this row targets. */
  const counterpartyOf = (o: OrderRecord) => {
    if (isBuyer) {
      return {
        id: o.sellerId,
        name:
          o.seller?.businessName ||
          o.seller?.fullName ||
          o.quote?.providerName ||
          'Seller',
      };
    }
    return {
      id: o.buyerId,
      name: o.buyer?.fullName || o.buyer?.businessName || 'Buyer',
    };
  };

  /** Order ids the user already has an OPEN report against. */
  const openReportOrderIds = useMemo(
    () =>
      new Set(
        myReports
          .filter((r) => r.status === 'OPEN' && r.contextType === 'ORDER' && r.contextId)
          .map((r) => r.contextId as string),
      ),
    [myReports],
  );

  const visibleOrders = useMemo(
    () => orders.filter(tab === 'CURRENT' ? isCurrentOrder : isPastOrder),
    [orders, tab],
  );

  const currentCount = useMemo(() => orders.filter(isCurrentOrder).length, [orders]);
  const pastCount = useMemo(() => orders.filter(isPastOrder).length, [orders]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C9973A] mb-2">
          Trust &amp; Safety
        </p>
        <h1 className="font-serif text-[28px] sm:text-[34px] font-black text-[#1a1a2e] leading-none">
          Report Manager
        </h1>
        <p className="mt-3 text-[13px] sm:text-[14px] text-slate-500 max-w-xl leading-relaxed">
          Every transaction is tied to the person you traded with. If something went
          wrong, report it from the transaction — our team reviews every report.
        </p>
      </div>

      {/* ── Transactions ─────────────────────────────────────────────── */}
      <div className="bg-white border border-[#f1f5f9] rounded-2xl shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="px-4 sm:px-6 pt-4 flex items-center gap-1.5 border-b border-[#f1f5f9]">
          {(
            [
              { key: 'CURRENT', label: 'Current', count: currentCount },
              { key: 'PAST', label: 'Past', count: pastCount },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 rounded-t-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                tab === t.key
                  ? 'bg-[#1a1a2e] text-white'
                  : 'text-slate-400 hover:text-[#1a1a2e]'
              }`}
            >
              {t.label}
              <span className="ml-1.5 font-bold opacity-70">{t.count}</span>
            </button>
          ))}
        </div>

        {loading && (
          <div className="p-14 flex items-center justify-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
        {!loading && error && (
          <div className="p-10 text-center text-[13px] font-semibold text-rose-500">{error}</div>
        )}
        {!loading && !error && visibleOrders.length === 0 && (
          <div className="p-12 text-center">
            <Flag className="w-6 h-6 mx-auto text-slate-300 mb-3" />
            <p className="text-[14px] font-bold text-slate-500">
              {tab === 'CURRENT' ? 'No transactions in progress.' : 'No past transactions yet.'}
            </p>
            <p className="mt-1 text-[12px] text-slate-400">
              Transactions appear here as soon as an order is placed.
            </p>
          </div>
        )}
        {!loading && !error && visibleOrders.length > 0 && (
          <ul className="divide-y divide-[#f1f5f9]">
            {visibleOrders.map((o) => {
              const other = counterpartyOf(o);
              const reported = openReportOrderIds.has(o.id);
              return (
                <li
                  key={o.id}
                  className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#fdf6e9] border border-[#ecd9b3] flex items-center justify-center shrink-0">
                    <span className="text-[15px] font-black text-[#b07f24]">
                      {(other.name || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-[#1a1a2e] truncate">{other.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {o.orderNumber}
                      {o.quote?.inquiry?.title ? ` · ${o.quote.inquiry.title}` : ''}
                      {' · '}
                      {new Date(o.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <span className="text-[13px] font-black text-[#1a1a2e] whitespace-nowrap">
                      ZMW {Number(o.totalAmount).toLocaleString()}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${
                        ORDER_STATUS_STYLES[o.status] ?? ORDER_STATUS_STYLES.PENDING
                      }`}
                    >
                      {o.status}
                    </span>
                    {reported ? (
                      <span className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-400 bg-slate-50 border border-[#e2e8f0] whitespace-nowrap">
                        Reported
                      </span>
                    ) : (
                      <button
                        onClick={() => setReportingOrder(o)}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-rose-500 border border-[#fecdd3] hover:bg-rose-50 transition-all flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Flag className="w-3.5 h-3.5" />
                        Report
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── My Reports ───────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-[#C9973A]" />
          <h2 className="text-[12px] font-black uppercase tracking-[0.18em] text-slate-500">
            My Reports
          </h2>
        </div>
        {!loading && myReports.length === 0 && (
          <div className="p-8 text-center bg-white border border-[#f1f5f9] rounded-2xl">
            <p className="text-[13px] font-semibold text-slate-400">
              You haven't filed any reports.
            </p>
          </div>
        )}
        {myReports.length > 0 && (
          <ul className="space-y-3">
            {myReports.map((r) => (
              <li
                key={r.id}
                className="bg-white border border-[#f1f5f9] rounded-2xl px-4 sm:px-5 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-[#1a1a2e] truncate">
                      {categoryLabel(r.category)}
                      <span className="font-semibold text-slate-400">
                        {' '}
                        — {r.reportedUserName || 'user'}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Filed {new Date(r.createdAt).toLocaleDateString()}
                      {r.contextType === 'ORDER' && r.contextId
                        ? ` · order #${r.contextId.slice(0, 8)}`
                        : ''}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${
                      REPORT_STATUS_STYLES[r.status] ?? REPORT_STATUS_STYLES.OPEN
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
                <p className="mt-2 text-[12px] text-slate-500 leading-snug line-clamp-2">
                  {r.description}
                </p>
                {r.status !== 'OPEN' && r.resolutionNote && (
                  <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-[#e2e8f0]">
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-[12px] text-slate-500 leading-snug">
                      <span className="font-bold text-slate-600">Admin note:</span>{' '}
                      {r.resolutionNote}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {reportingOrder && (
        <ReportUserModal
          reportedUserId={counterpartyOf(reportingOrder).id}
          reportedUserName={counterpartyOf(reportingOrder).name}
          contextType="ORDER"
          contextId={reportingOrder.id}
          onClose={() => {
            setReportingOrder(null);
            // Refresh so a just-filed report flips the row to "Reported" and
            // appears under My Reports.
            load();
          }}
        />
      )}
    </div>
  );
}
