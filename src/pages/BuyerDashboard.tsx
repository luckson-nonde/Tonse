import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Store, X, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../AuthContext';
import { useDashboard } from '../DashboardContext';
import {
  createInquiry,
  fetchUserInquiries,
  deleteInquiry,
  type CreateInquiryPayload,
} from '../services/api/inquiryService';
import { useUserInquiries, notifyInquiriesChanged } from '../hooks/useInquiries';
import { useUserQuotes, notifyQuotesChanged } from '../hooks/useQuotes';
import { useNotificationStream } from '../hooks/useNotificationStream';
import { releaseReserveQuotes } from '../services/api/notificationService';
import { markQuoteAsRead, archiveQuote, deleteQuote, updateQuoteStatus } from '../services/api/quoteService';
import { fetchBuyerOrders, type OrderRecord } from '../services/api/orderService';
import { isActiveInquiry, isActiveBuyerQuote } from '../services/lifecycleFilters';
import { newIdempotencyKey } from '../services/offlineWriteQueue';
import { isLoanQuote } from '../utils/loan';
import { isEventContext } from '../utils/events';
import { getMyConsents } from '../services/api/consentService';
import { takeAdInquiryIntent, AD_INQUIRY_INTENT_EVENT } from '../services/adInquiryIntent';
import { fetchDiscoverShopProfile } from '../services/api/discoverService';
import { formatRelativeTime } from '../utils/time';
import { ViewType, MASTER_BUYER_ACCOUNT_SCHEMA } from '../services/buyerAccountSchema';
import DynamicAccountRenderer from '../components/DynamicAccountRenderer';
import BuyerCategoryPicker from '../components/buyer/BuyerCategoryPicker';
import ProcessSelection from '../components/ProcessSelection';
import DynamicInquiryForm from '../components/DynamicInquiryForm';
import InquiryPreferences from '../components/InquiryPreferences';
import LocationDetails from '../components/LocationDetails';
import InquiryPayment, { type InquiryPaymentResult } from '../components/InquiryPayment';
import InquirySuccess from '../components/InquirySuccess';
import ConfirmationModal from '../components/ConfirmationModal';
import DashboardLayout from '../components/DashboardLayout';
import { CATEGORIES_DB, getCategorySchema, getCategoryType } from '../services/categories';
import { isCategoryAvailable } from '../services/categories/availability';
import { buildInquiryDescription, clampInquiryTitle } from '../services/inquiryDescription';
import { Inquiry, InquiryItem, Quote } from '../types';
import { getLabourFormFields } from '../services/labourFormSchema';
import VacancyComposerForm, { type JobPostingDetails } from '../components/buyer/VacancyComposerForm';
import { jobBoardService, type CreateJobPostingInput } from '../services/api/jobBoardService';
import FinancialPage from './FinancialPage';
import BrowseShopsView from '../components/BrowseShopsView';
import ShopProfileView from '../components/ShopProfileView';
import RateShopModal from '../components/RateShopModal';
import TicketFeaturePromptModal, {
  SELL_TICKETS_FEATURE_KEY,
} from '../components/buyer/TicketFeaturePromptModal';
import type { ShopResult } from '../services/api/shopService';

/**
 * Rendered in place of the payment screen when the admin has monetization
 * switched OFF (preferences.quoteFee === 0): fires the normal
 * handlePaymentComplete path once with a zero-amount 'free' receipt so the
 * inquiry publishes immediately with the downstream shape unchanged.
 * The useRef guard matters — StrictMode double-invokes effects in dev and
 * handlePaymentComplete has no re-entrancy guard, so an unguarded effect
 * would publish the inquiry twice.
 */
function FreeInquiryAutoPublish({
  onReady,
  error,
  onRetry,
  pendingLabel = 'Publishing your inquiry…',
  errorTitle = "Your inquiry didn't publish",
}: {
  onReady: () => void;
  /** Publish failure reason — switches the spinner to an error + retry UI
   *  so the buyer is never stranded on an endless "Publishing…" screen. */
  error?: string | null;
  onRetry?: () => void;
  /** Copy overrides so the job-posting flow can reuse this shell. */
  pendingLabel?: string;
  errorTitle?: string;
}) {
  const fired = React.useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    onReady();
  }, [onReady]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 px-6">
        <div className="flex items-start gap-3 max-w-md w-full bg-rose-50 border border-rose-200 rounded-2xl p-4">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-rose-700">{errorTitle}</p>
            <p className="text-xs text-rose-600 mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 bg-[#C9973A] hover:bg-[#b3852f] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin text-[#C9973A]" />
      <p className="text-[11px] font-bold uppercase tracking-widest">{pendingLabel}</p>
    </div>
  );
}

export default function BuyerDashboard() {
  const { user, updateUser } = useAuth();
  const { activeTab, setActiveTab } = useDashboard();
  const navigate = useNavigate();
  const { tab, inquiryId } = useParams<{ tab: string; inquiryId?: string }>();

  // Synchronize URL tab parameter with Dashboard Context
  useEffect((): void => {
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [tab, activeTab, setActiveTab]);

  // Redirect if not buyer
  React.useEffect(() => {
    if (user && user.role !== 'BUYER') {
      navigate('/');
    }
  }, [user, navigate]);
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(inquiryId || null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | number | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | number | null>(null);
  const [selectedShopProfileId, setSelectedShopProfileId] = useState<string | null>(null);
  // When a shop card's "Send Purchase Order" opens the profile, auto-open the
  // PO composer on arrival.
  const [poAutoOpen, setPoAutoOpen] = useState(false);
  const [inquiryToDelete, setInquiryToDelete] = useState<any | null>(null);
  const [quoteToDelete, setQuoteToDelete] = useState<any | null>(null);
  // Set when the buyer clicks "Make a Payment" on a quote card. The
  // navigation lands them on QuoteDetails; the flag tells QuoteDetails
  // to auto-open the payment modal on mount instead of making them hunt
  // for the Pay button. Cleared by QuoteDetails after one open so a
  // back-navigation doesn't keep firing the modal.
  const [autoPayQuoteId, setAutoPayQuoteId] = useState<string | number | null>(null);
  // One-shot arrival hint for the Transaction History page's default tab —
  // set when a dashboard metric tile ("Ready to Collect"/"Completed") is
  // clicked, cleared once TransactionHistoryView consumes it on mount.
  // Landing-tab hint for Transaction History (history-only now — "Awaiting
  // Collection" moved to its own Active Transactions page). Set by the
  // "Completed" dashboard tile → lands on Purchased Items.
  const [transactionHistoryInitialTab, setTransactionHistoryInitialTab] = useState<
    'PURCHASED' | 'REQUESTS' | 'EXPIRED' | null
  >(null);

  // One-time opt-in offer for the ticket-selling feature (see
  // TicketFeaturePromptModal). Shown after an events-family inquiry publishes
  // — never shown once a decision (either way) is on record.
  const [showTicketPrompt, setShowTicketPrompt] = useState(false);

  // Keep selectedInquiryId in sync with the URL in both directions, so
  // browser Back/Forward (which bypasses handleTabChange) also correctly
  // clears the selection when the id drops out of the URL.
  useEffect(() => {
    setSelectedInquiryId(inquiryId || null);
  }, [inquiryId]);

  // Fetch inquiries from PostgreSQL backend (NO IndexedDB)
  const {
    inquiries,
    loading: inquiriesLoading,
    refresh: refreshInquiries,
  } = useUserInquiries(user?.id);

  // Fetch quotes from PostgreSQL backend (NO IndexedDB)
  const { quotes, loading: quotesLoading, refresh: refreshQuotes } = useUserQuotes(user?.id);

  // Fallback trigger for the ticket-feature offer: buyers who ALREADY have
  // events activity (e.g. a venue quote from before this feature shipped) may
  // never send another events inquiry, so offer once per session until they
  // decide. The primary trigger fires right after an events inquiry publishes.
  useEffect(() => {
    if (!user?.id || inquiriesLoading || quotesLoading) return;
    if (window.sessionStorage.getItem('tonse:ticket-feature-prompted')) return;
    const hasEventActivity =
      (inquiries ?? []).some((i: any) => isEventContext(i.category, i.categoryIds, i.title)) ||
      (quotes ?? []).some((q: any) => isEventContext(q.category, q.categoryIds, q.title));
    if (!hasEventActivity) return;
    window.sessionStorage.setItem('tonse:ticket-feature-prompted', '1');
    void offerTicketFeatureIfUndecided();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, inquiriesLoading, quotesLoading, inquiries, quotes]);

  // ── Live dispatch stream (buyer side) ────────────────────────────────
  // quote_received / reserve-release → instant refetch via the event buses
  // (which also resync DashboardLayout's badge counters); provider_accepted
  // ticks the "X providers accepted" chip by refetching the hydrated
  // inquiry rows. The 30s polls remain the degraded fallback.
  useNotificationStream(user?.id, {
    onQuoteReceived: () => {
      notifyQuotesChanged();
      notifyInquiriesChanged();
    },
    onProviderAccepted: () => notifyInquiriesChanged(),
    onReconnect: () => {
      notifyQuotesChanged();
      notifyInquiriesChanged();
    },
  });

  const [backendOrders, setBackendOrders] = useState<OrderRecord[]>([]);
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0);
  const refreshOrders = () => setOrdersRefreshKey((k) => k + 1);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    fetchBuyerOrders(user.id)
      .then((list) => { if (!cancelled) setBackendOrders(list); })
      .catch(() => { if (!cancelled) setBackendOrders([]); });
    return () => { cancelled = true; };
  }, [user?.id, ordersRefreshKey]);

  // Orders this buyer has already rated this session — flips the order
  // card's "Rate this shop" button into a quiet "Rated" state without a
  // refetch. (The server enforces one-review-per-order regardless.)
  const [ratedOrderIds, setRatedOrderIds] = useState<Set<string>>(new Set());
  // Target of the rate-shop modal; sellerId is the provider's users.id.
  const [ratingTarget, setRatingTarget] = useState<{
    sellerId: string;
    sellerName?: string;
    orderId: string;
  } | null>(null);

  // Order History list: every backend Order, hydrated with its quote +
  // inquiry data so InquiryCard renders correctly. Falls back to the
  // bare order shape when the related quote/inquiry hasn't loaded yet.
  const orders = useMemo(() => {
    return backendOrders.map((o) => {
      // The backend already eager-loads the linked quote onto each order
      // (`relations: ['quote', ...]`) — read its inquiryId/status straight
      // off that instead of cross-referencing the buyer's separately-polled
      // `quotes` state, which only needed to stay in sync by coincidence.
      const inquiry = o.quote?.inquiryId
        ? inquiries.find((i) => String(i.id) === String(o.quote!.inquiryId))
        : undefined;
      return {
        ...(inquiry || {}),
        id: inquiry?.id ?? o.quoteId,
        title: inquiry?.title || `Order ${o.orderNumber}`,
        createdAt: inquiry?.createdAt || o.createdAt,
        paidQuote: {
          id: o.quote?.id ?? o.quoteId,
          price: o.totalAmount,
          updatedAt: o.updatedAt,
          orderNumber: o.orderNumber,
          // The real collection-flow status (PAID/PENDING_COLLECTION/
          // AWAITING_PICKUP/COMPLETED/HANDED_OVER) — see
          // OrderQuoteSnapshot.status. NOT the same as `orderStatus` below,
          // which is the Order entity's own (effectively inert) status.
          status: o.quote?.status,
          // Real collection PIN (backend-generated on payment) so the order
          // detail screen can render a genuine, scannable QR instead of a
          // placeholder. Prefer the eager-loaded quote; fall back to the
          // buyer's own loaded quotes list.
          collectionCode:
            (o.quote as any)?.collectionCode ??
            quotes.find((q) => String(q.id) === String(o.quote?.id ?? o.quoteId))
              ?.collectionCode,
        },
        orderId: o.id,
        orderStatus: o.status,
        // Rate-this-shop target: the seller's users.id + display name.
        sellerId: o.sellerId,
        sellerName: o.seller?.businessName || o.seller?.fullName,
        alreadyRated: ratedOrderIds.has(o.id),
      };
    });
  }, [backendOrders, inquiries, quotes, ratedOrderIds]);


  // TODO: Transactions endpoint not yet implemented on backend
  // const transactions = useLiveQuery(
  //   async () => {
  //     if (!user?.id) return [];
  //     return await db.transactions
  //       .where('userId')
  //       .equals(user.id)
  //       .toArray();
  //   },
  //   [user]
  // ) || [];

  const transactions: any[] = []; // Empty until transactions endpoint is available

  const balance = useMemo(() => {
    return transactions
      .filter((t) => t.status === 'COMPLETED')
      .reduce((sum, t) => (t.type === 'IN' ? sum + t.amount : sum - t.amount), 0);
  }, [transactions]);

  const escrowBalance = useMemo(() => {
    return transactions.filter((t) => t.status === 'ESCROW').reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  // Publish-failure reason for the inquiry flow — drives the error/retry UI
  // in FreeInquiryAutoPublish and enriches the paid-path alert.
  const [publishError, setPublishError] = useState<string | null>(null);
  // True when the just-created job post parked at PENDING_PAYMENT (the
  // admin's job-posting fee is on) — the success screen sends the poster to
  // My Job Posts, where the payment step lives, instead of claiming the post
  // is already in review.
  const [jobPostNeedsPayment, setJobPostNeedsPayment] = useState(false);

  // Inquiry Flow State
  const [pendingInquiry, setPendingInquiry] = useState<{
    items: InquiryItem[];
    categories?: string[];
    category?: string;
    categoryId?: string;
    isLabour?: boolean;
    labourGroup?: string;
    inquirySchemaKey?: string;
    preferences?: any;
    location?: {
      province: string;
      city: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      radius?: number;
    };
    attributes?: Record<string, any>;
    processType?: 'EXPRESS' | 'STANDARD';
    targetedShop?: { id: string; sellerId: string; name: string; categoryIds?: string[]; city?: string; province?: string; location?: string };
    /** Set when the funnel was entered by clicking an advert — copied onto
     *  the published inquiry's attributes so the seller can see which ad
     *  earned the lead (same keys PublicShopProfile writes). */
    adSource?: { id: string; title?: string };
    /** Post-a-job flow only (labour trades): the posting-level facts
     *  collected after the per-trade form. */
    jobPostingDetails?: JobPostingDetails;
  }>({ items: [] });

  // Labour trades now run the JOB-POSTING flow (post → admin approval →
  // seekers apply) instead of the instant inquiry broadcast. Machinery-hire
  // shares the same picker/LabourSelection payload but stays an inquiry —
  // its labourGroup is the discriminator.
  const isJobPostingFlow =
    pendingInquiry.isLabour === true && pendingInquiry.labourGroup !== 'MACHINERY_HIRE';

  // The funnel runs in two orders, and this is what tells them apart at the
  // process-selection step:
  //   untargeted  — category → form → process → preferences
  //   targeted    — process → category → form → preferences   (advert click
  //                 or a shop card: the shop is known up front, the category
  //                 isn't yet)
  const hasChosenCategory = !!(
    pendingInquiry.categories?.filter(Boolean).length || pendingInquiry.categoryId
  );

  // Drives the InquiryPreferences variant (PRODUCTS / SERVICES / VENUES /
  // LABOR). Resolution happens in services/categories#getCategoryType — an
  // explicit per-master + sub-override lookup. Replaced the older substring
  // heuristic here, which fell through to PRODUCTS for entertainment,
  // telecommunications, and it-services (showing buyers "Wholesale Markets"
  // when picking DJs / ISPs / web dev).
  const categoryType = useMemo(() => {
    if (pendingInquiry.isLabour) return 'LABOR';
    return getCategoryType(pendingInquiry.categories?.[0]);
  }, [pendingInquiry.categories, pendingInquiry.isLabour]);

  const dashboardData = useMemo(() => {
    // Lifecycle slices — see src/services/lifecycleFilters.ts. Each
    // surface lists items at one stage only; the helpers are the
    // single source of truth for "what counts as active here".
    const activeInquiries = inquiries.filter(isActiveInquiry);
    // Join inquiry's category + attributes onto each quote so QuoteCard
    // can render a category-specific context line (e.g. vehicle make /
    // model / year for an automotive quote) without a second fetch.
    const enrichedQuotes = quotes.map((q) => {
      const inq = inquiries.find((i) => String(i.id) === String((q as any).inquiryId));
      if (!inq) return q;
      const inquiryCategory =
        (inq as any).categoryIds?.[0] ||
        (inq as any).categories?.[0] ||
        (inq as any).category ||
        undefined;
      return { ...q, inquiryCategory, inquiryAttributes: inq.attributes };
    });
    // Buyer-perspective: also excludes quotes whose "Quote Valid For"
    // window has lapsed unpaid — those move to Transaction History's
    // Expired tab instead of lingering here looking actionable.
    const activeQuotes = enrichedQuotes.filter(isActiveBuyerQuote);
    // A loan OFFER (condition LOAN) or DECLINE (condition DECLINED) is a Quote
    // that lives in its own "Loan Offers" surface (custom card + LoanOfferDetail),
    // NOT alongside marketplace quotes — a loan is accepted/countered, never
    // "paid". Include terminal ones (REJECTED/DECLINED) so the borrower actually
    // sees a lender's decision + reason instead of the request going silent.
    const loanOffers = enrichedQuotes.filter((q) => isLoanQuote(q) && !(q as any).isArchived);
    const marketplaceQuotes = activeQuotes.filter((q) => !isLoanQuote(q));

    // Recent activity: one card per inquiry, labelled by its
    // most-advanced known stage (Order Placed > Quote Received >
    // Inquiry Created). The previous version emitted separate cards
    // from `inquiries` and `quotes` slices, so an inquiry that had
    // received a quote showed up twice in the right rail.
    const recentActivity = inquiries.slice(0, 5).map((i) => {
      const order = orders.find(
        (o) => o.id === i.id || (o as any).paidQuote?.inquiryId === i.id,
      );
      if (order) {
        // Distinguish a paid-but-uncollected order from a collected one by the
        // real collection status (paidQuote.status), so the feed says
        // "collected" only when the item actually was.
        const oStatus = String((order as any).paidQuote?.status || '').toUpperCase();
        const collected = oStatus === 'COMPLETED' || oStatus === 'HANDED_OVER';
        const amount = Number((order as any).paidQuote?.price) || 0;
        const when = (order as any).paidQuote?.updatedAt || (order as any).createdAt;
        return {
          id: `o-${i.id}`,
          inquiryId: i.id,
          title: i.title,
          subtitle: collected
            ? 'Completed · collected'
            : `Order placed · Paid ZMW ${amount.toLocaleString()}`,
          time: formatRelativeTime(when),
          icon: collected ? 'CheckCircle' : 'ShoppingBag',
          tone: collected ? 'green' : 'blue',
        };
      }
      const liveQuote = quotes.find(
        (q) => q.inquiryId === i.id && !q.isArchived,
      );
      if (liveQuote) {
        const isLoan = String((liveQuote as any).condition || '').toUpperCase() === 'LOAN';
        return {
          id: `q-${i.id}`,
          inquiryId: i.id,
          title: i.title,
          subtitle: isLoan
            ? `Offer received · ZMW ${(liveQuote.price || 0).toLocaleString()}`
            : `Quote received · ZMW ${(liveQuote.price || 0).toLocaleString()}`,
          time: formatRelativeTime(
            (liveQuote as any).updatedAt || (liveQuote as any).createdAt,
          ),
          icon: 'FileText',
          tone: 'gold',
        };
      }
      return {
        id: `i-${i.id}`,
        inquiryId: i.id,
        title: i.title,
        subtitle: 'Inquiry sent · awaiting quotes',
        time: formatRelativeTime((i as any).createdAt),
        icon: 'MessageSquare',
        tone: 'gold',
      };
    });

    // ── Overview tile stats (value + caption under each number) ──────────
    // Split paid orders by their collection status: COMPLETED/HANDED_OVER are
    // truly collected; everything else is still awaiting pickup ("ready to
    // collect"). The order entity's own `status` never advances, so it can't
    // be used for this — paidQuote.status is the source of truth.
    const COLLECTED = new Set(['COMPLETED', 'HANDED_OVER']);
    const statusOf = (o: any) => String(o?.paidQuote?.status || '').toUpperCase();
    const completedOrdersList = orders.filter((o) => COLLECTED.has(statusOf(o)));
    const readyToCollectList = orders.filter((o) => !COLLECTED.has(statusOf(o)));
    const unreadQuotes = marketplaceQuotes.filter((q: any) => !q.isRead).length;
    const firstActive: any = activeInquiries[0];
    const notifiedCount = Number(firstActive?.preferences?.quoteCount) || 0;
    const lastCompletedAt = completedOrdersList
      .map((o: any) => o?.paidQuote?.updatedAt || o?.createdAt)
      .filter(Boolean)
      .sort()
      .pop();

    const metricStats: Record<string, { value: number; hint: string }> = {
      active_inquiries: {
        value: activeInquiries.length,
        hint:
          activeInquiries.length === 0
            ? 'Send your first inquiry'
            : notifiedCount > 0
              ? `${notifiedCount} shops notified`
              : 'Sellers are quoting',
      },
      quotes_received: {
        value: marketplaceQuotes.length,
        hint:
          marketplaceQuotes.length === 0
            ? 'Sellers are replying'
            : unreadQuotes > 0
              ? `${unreadQuotes} new`
              : 'Ready to compare',
      },
      ready_to_collect: {
        value: readyToCollectList.length,
        hint:
          readyToCollectList.length === 0
            ? 'Nothing to collect'
            : 'Show your QR at the shop',
      },
      completed_orders: {
        value: completedOrdersList.length,
        hint:
          completedOrdersList.length === 0
            ? 'None yet'
            : lastCompletedAt
              ? `Last one ${formatRelativeTime(lastCompletedAt)}`
              : 'All collected',
      },
    };

    return {
      inquiries: activeInquiries,
      quotes: marketplaceQuotes,
      loanOffers,
      orders,
      balance,
      escrowBalance,
      selectedInquiry: inquiries.find((i) => i.id === selectedInquiryId),
      selectedQuote: quotes.find((q) => q.id === selectedQuoteId),
      selectedOrder: orders.find((o) => o.id === selectedOrderId),
      autoPayQuoteId,
      recentActivity,
      metricStats,
      // Raw, unfiltered slices (every status, not just the active-stage
      // ones above) — Transaction History's Requests/Expired tabs need to
      // see closed inquiries and lapsed/rejected quotes that the main
      // My Inquiries / Received Quotes lists deliberately hide.
      allInquiries: inquiries,
      allQuotes: quotes,
      transactionHistoryInitialTab,
    };
  }, [inquiries, quotes, orders, selectedInquiryId, selectedQuoteId, selectedOrderId, balance, escrowBalance, autoPayQuoteId, transactionHistoryInitialTab]);

  const handleTabChange = (tab: string, id?: string) => {
    // The schedule/calendar page is a real route shared by every role, not
    // a /buyer/:tab view. DashboardLayout's own handleTabClick special-case
    // never runs for buyers (it defers to this handler first), so the
    // redirect has to live here too.
    if (tab === 'schedule') {
      navigate('/schedule');
      return;
    }
    setActiveTab(tab);
    // 'inquiries' with no id means "show the list" — clear any stale
    // selection so the inquiry_details view (derived from activeTab +
    // selectedInquiryId together) doesn't keep re-showing the last-viewed
    // inquiry instead of the list.
    if (tab === 'inquiries' && !id) {
      setSelectedInquiryId(null);
    }
    const basePath = '/buyer';
    // Include inquiry ID in URL for details pages
    const path = id
      ? `${basePath}/${tab}/${id}`
      : tab === 'dashboard'
        ? basePath
        : `${basePath}/${tab}`;
    navigate(path);
  };

  // ── Advert → inquiry funnel ──────────────────────────────────────────
  // An advert already names its advertiser, so a buyer who clicked one has
  // nothing to search for and nobody to pick: AdCarousel (or Login, after the
  // sign-in bounce) sends them straight here. This hydrates the targeted shop
  // behind the "how do you want to buy" step they land on — the shop page,
  // the "Need a price?" card and the shops directory are all skipped.
  //
  // Two arrival shapes, one handler: a fresh mount (coming from /login, or
  // from an ad rail on another page) reads storage, and the event covers a
  // click made while this dashboard is already on screen — its sidebar,
  // banner and category rails all live inside it. The intent is
  // read-and-cleared either way, so one click opens the funnel once.
  useEffect(() => {
    if (!user || user.role !== 'BUYER') return;
    let cancelled = false;

    const consume = async () => {
      const intent = takeAdInquiryIntent();
      if (!intent) return;
      const shop = await fetchDiscoverShopProfile(intent.shopProfileId);
      if (cancelled) return;
      if (!shop) {
        // Advertiser's profile has gone — hand off to the public shop page,
        // which owns the "this shop couldn't be found" message, rather than
        // opening a funnel aimed at nobody.
        navigate(`/discover/${intent.shopProfileId}`);
        return;
      }
      // Replaces (not merges into) any half-finished inquiry: this is a new
      // request aimed at the advertiser, so nothing earlier should leak in.
      setPendingInquiry({
        items: [],
        targetedShop: {
          id: shop.id,
          sellerId: shop.sellerId,
          name: shop.name,
          categoryIds: shop.categoryIds ?? [],
          city: shop.city ?? undefined,
          province: shop.province ?? undefined,
          location: shop.location,
        },
        ...(intent.adId ? { adSource: { id: intent.adId, title: intent.adTitle } } : {}),
      });
      handleTabChange('process-selection');
    };

    void consume();
    const onIntent = () => void consume();
    window.addEventListener(AD_INQUIRY_INTENT_EVENT, onIntent);
    return () => {
      cancelled = true;
      window.removeEventListener(AD_INQUIRY_INTENT_EVENT, onIntent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

  const handleAction = async (actionId: string, payload?: any) => {
    switch (actionId) {
      case 'new_inquiry':
        handleTabChange('category-selection');
        break;
      case 'delete_inquiry':
        setInquiryToDelete(payload);
        break;
      case 'view_financial':
        handleTabChange('financial');
        break;
      case 'delete_quote':
        setQuoteToDelete(payload);
        break;
      case 'view_details':
        if (payload?.id) {
          setSelectedInquiryId(payload.id);
          handleTabChange('inquiries', payload.id);
        }
        break;
      case 'view_quote':
        if (payload?.id) {
          setSelectedQuoteId(payload.id);
          handleTabChange('quote_details');
          // Mark quote as read via API
          try {
            await markQuoteAsRead(payload.id);
            refreshQuotes();
          } catch (error) {
            console.error('Failed to mark quote as read:', error);
          }
        }
        break;
      case 'pay_quote':
        // Same navigation as view_quote, plus an auto-open hint so the
        // payment modal pops on entry. Buyer doesn't have to click Pay
        // again on the details page.
        if (payload?.id) {
          setSelectedQuoteId(payload.id);
          setAutoPayQuoteId(payload.id);
          handleTabChange('quote_details');
          try {
            await markQuoteAsRead(payload.id);
            refreshQuotes();
          } catch (error) {
            console.error('Failed to mark quote as read:', error);
          }
        }
        break;
      case 'auto_pay_handled':
        // QuoteDetails fires this once it has consumed the autoOpenPay
        // flag (post-mount), so a later re-mount of the same quote
        // doesn't keep popping the modal.
        setAutoPayQuoteId(null);
        break;
      case 'view_transaction_tab':
        // Dashboard's "Ready to Collect"/"Completed" tiles both land on
        // Transaction History — this hint picks the matching sub-tab.
        setTransactionHistoryInitialTab(payload || null);
        handleTabChange('orders');
        break;
      case 'transaction_tab_handled':
        // TransactionHistoryView fires this once it has consumed the hint
        // (post-mount), so a later visit via the sidebar nav (not a tile
        // click) correctly defaults back to Awaiting Collection instead of
        // sticking on whichever tab was last requested.
        setTransactionHistoryInitialTab(null);
        break;
      case 'rate_shop':
        if (payload?.sellerId && payload?.orderId) {
          setRatingTarget({
            sellerId: payload.sellerId,
            sellerName: payload.sellerName,
            orderId: payload.orderId,
          });
        }
        break;
      case 'view_order':
        if (payload?.id) {
          setSelectedOrderId(payload.id);
          handleTabChange('order_details');
        }
        break;
      case 'archive_quote':
      case 'delete_quote_silent': // Silent version of delete that just archives
        if (payload?.id) {
          // Archive quote via API. Queueable: an offline dismiss is held and
          // replayed on reconnect. The catch stays silent (as before) — a
          // QueuedWrite just surfaces in the pending-sync pill.
          try {
            await archiveQuote(payload.id, {
              idempotencyKey: newIdempotencyKey(),
              label: 'Dismiss quote',
              changedEvent: 'tonse:quotes-changed',
            });
            refreshQuotes();
          } catch (error) {
            if ((error as Error)?.name !== 'QueuedWrite') {
              console.error('Failed to archive quote:', error);
            }
          }
        }
        break;
      case 'release_reserve':
        // "Didn't find what I needed in the first batch" — surface the
        // reserved (overflow) quotes. Reserve providers get notified their
        // quote is now in play; the quotes list refreshes with the batch.
        if (payload?.id) {
          try {
            await releaseReserveQuotes(String(payload.id));
            notifyQuotesChanged();
            notifyInquiriesChanged();
            refreshQuotes();
            refreshInquiries();
          } catch (error: any) {
            alert(error?.message || 'Failed to release reserved quotes.');
          }
        }
        break;
      case 'accept_quote':
        // EXPRESS pay-on-quote success: an Order row was just created by
        // PaymentModal. A freshly-paid order is awaiting collection, so land
        // the buyer on Active Transactions (not the History archive) where the
        // item they just paid for actually shows.
        refreshQuotes();
        refreshInquiries();
        refreshOrders();
        handleTabChange('active_transactions');
        break;
      case 'loan_action_done':
        // Borrower accepted / rejected / countered a loan offer (LoanOfferDetail
        // did the API call + server-side audit). Refresh and return to offers.
        refreshQuotes();
        refreshInquiries();
        handleTabChange('loan_offers');
        break;
      case 'back_to_quotes':
        handleTabChange('loan_offers');
        break;
      case 'generate_po': {
        const quote = payload as Quote;
        if (!quote?.id) break;
        // A loan OFFER is accepted, not "paid" — there's no Order/payment for a
        // loan (money flows lender→borrower later through the disbursement
        // checkout). Kept defensively although LoanOfferDetail now fires
        // loan_action_done for this.
        if ((quote as any).condition === 'LOAN') {
          try {
            await updateQuoteStatus(String(quote.id), 'ACCEPTED', {
              idempotencyKey: newIdempotencyKey(),
              label: 'Accept loan offer',
              changedEvent: 'tonse:quotes-changed',
            });
            refreshQuotes();
            refreshInquiries();
            handleTabChange('loan_offers');
          } catch (err: any) {
            if (err?.name === 'QueuedWrite') {
              alert("You're offline — this loan offer will be accepted automatically once you're back online.");
              break;
            }
            alert(err?.message || 'Failed to accept the loan offer. Please try again.');
          }
          break;
        }
        // Non-LOAN: an order without payment no longer exists (the server
        // rejects it). QuoteDetails now opens the real pay sheet itself, so
        // this branch shouldn't fire — if something stale still sends it,
        // land the buyer back on the quote to pay properly.
        alert('Purchase orders are generated by paying the quote — use the Pay button.');
        break;
      }
      case 'print_quote':
        // Print logic would go here, maybe a helper function
        console.log('Printing quote:', payload);
        break;
      case 'save_profile': {
        try {
          const { logo, dob: _dob, ownerName, gps, ...rest } = payload ?? {};
          const updatePayload: Record<string, any> = { ...rest };
          if (logo !== undefined) updatePayload.profilePicture = logo;
          if (ownerName !== undefined) updatePayload.name = ownerName;
          if (gps?.latitude != null) updatePayload.latitude = gps.latitude;
          if (gps?.longitude != null) updatePayload.longitude = gps.longitude;
          await updateUser(updatePayload);
        } catch {
          // silent — updateUser already surfaces errors via AuthContext
        }
        break;
      }
      case 'browse_shops':
        handleTabChange('shops');
        break;
      case 'view_shop_profile': {
        setPoAutoOpen(false);
        setSelectedShopProfileId((payload as ShopResult).id);
        handleTabChange('shop-profile');
        break;
      }
      case 'open_po_for_shop': {
        // Card "Send Purchase Order" → open the profile with the PO composer
        // already up (the composer lives on the profile, where the catalog +
        // shop identity are loaded).
        setPoAutoOpen(true);
        setSelectedShopProfileId((payload as ShopResult).id);
        handleTabChange('shop-profile');
        break;
      }
      case 'send_inquiry_to_shop': {
        const shop = payload as ShopResult;
        setPendingInquiry((prev) => ({
          ...prev,
          targetedShop: {
            id: shop.id,
            sellerId: shop.sellerId,
            name: shop.name,
            categoryIds: shop.categoryIds ?? [],
            city: shop.city,
            province: shop.province,
            location: shop.location,
          },
        }));
        handleTabChange('process-selection');
        break;
      }
      default:
        console.log('Unhandled action:', actionId, payload);
    }
  };

  // Product-anchored Purchase Order: a targeted EXPRESS inquiry carrying the
  // chosen products as `items`, marked orderKind PURCHASE_ORDER. The shop's
  // quotation manager prices it (one quote, maxQuotes=1), then the buyer pays
  // through the normal EXPRESS quote→order flow. No buyer-side price — the
  // shop supplies it. Throws so ShopProfileView can surface the error inline.
  const handleSendPurchaseOrder = async (
    shop: ShopResult,
    items: Array<{ productId?: string; title: string; quantity: number; category?: string }>,
    note?: string,
  ) => {
    if (!user?.id) throw new Error('Please sign in to send a purchase order.');
    if (!items.length) throw new Error('Add at least one product to the order.');

    // categoryIds must be non-empty (DTO) AND valid catalog ids. The shop's
    // own subscriptions are guaranteed-valid; targeting delivers the PO
    // regardless of category, so this is purely to satisfy validation.
    const shopCats = (shop.categoryIds ?? []).filter(Boolean);
    const fallbackCats = items.map((i) => i.category).filter(Boolean) as string[];
    const categoryIds = shopCats.length ? shopCats : Array.from(new Set(fallbackCats));
    if (!categoryIds.length) {
      throw new Error('This shop has no catalog categories set up yet.');
    }

    const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
    const payload: CreateInquiryPayload = {
      title: `Purchase Order · ${items.length} item${items.length !== 1 ? 's' : ''} from ${shop.name}`.slice(0, 255),
      // Description must be ≥10 chars; a short note falls back to a summary.
      description:
        note && note.trim().length >= 10
          ? note.trim()
          : `Purchase order for ${totalUnits} unit(s) across ${items.length} product(s). Please confirm the price and availability.`,
      items: JSON.stringify(
        items.map((i) => ({
          title: i.title,
          quantity: i.quantity,
          ...(i.productId ? { productId: i.productId } : {}),
        })),
      ),
      categoryIds,
      location: shop.location || 'Zambia',
      province: shop.province,
      city: shop.city,
      status: 'OPEN',
      preferences: JSON.stringify({}),
      attributes: JSON.stringify({ orderKind: 'PURCHASE_ORDER', note: note?.trim() || '' }),
      processType: 'EXPRESS',
      targetedProviderId: shop.sellerId,
    };

    await createInquiry(payload, {
      idempotencyKey: newIdempotencyKey(),
      label: `Purchase Order: ${shop.name}`,
      changedEvent: 'tonse:inquiries-changed',
    });
    refreshInquiries();
    handleTabChange('inquiries');
  };

  const handleInquiryComplete = (selectedCategories: any) => {
    if (selectedCategories.isLabour) {
      setPendingInquiry((prev) => ({ ...prev, ...selectedCategories }));
    } else {
      setPendingInquiry((prev) => ({ ...prev, categories: selectedCategories }));
    }
    // A labour trade opens the VACANCY COMPOSER directly — the per-trade
    // inquiry form ("how many workers / what rate / how long") can't express
    // a job ad. Machinery-hire and every non-labour category are untouched.
    const isJobPost =
      selectedCategories.isLabour === true && selectedCategories.labourGroup !== 'MACHINERY_HIRE';
    handleTabChange(isJobPost ? 'job-posting-details' : 'create-inquiry');
  };

  const handleLocationComplete = (locationData: any) => {
    // Stash location alongside the rest of the pending inquiry; payment step
    // owns the actual create-inquiry call so we don't publish until the buyer
    // has paid the service fee. Job posts skip payment entirely (posting is
    // free) and go straight to submit-for-review.
    setPendingInquiry((prev) => ({ ...prev, location: locationData }));
    handleTabChange(isJobPostingFlow ? 'job-posting-submit' : 'inquiry-payment');
  };

  /** Show the ticket-feature offer unless a decision is already on record.
   *  Consent lookup is best-effort (returns {} offline) — failing open just
   *  means the buyer might be asked again next time, never blocked. */
  const offerTicketFeatureIfUndecided = async () => {
    const consents = await getMyConsents();
    if (SELL_TICKETS_FEATURE_KEY in consents) return;
    setShowTicketPrompt(true);
  };

  const handlePaymentComplete = async (payment: InquiryPaymentResult) => {
    if (!user) return;
    const locationData = pendingInquiry.location;
    if (!locationData) {
      alert('Missing location data. Please go back and re-enter your location.');
      return;
    }
    if (!locationData.province || !locationData.city) {
      alert('Province and city are required. Please go back and complete the location step.');
      return;
    }
    // Coordinates are optional. When they're absent, the inquiry
    // broadcasts to every provider in the chosen city; when present,
    // matching narrows to providers within `radius` km of the point.
    setIsSubmitting(true);
    setPublishError(null);

    // Snapshot for the post-publish ticket-feature offer: pendingInquiry is
    // reset before the offer fires, and the queued-offline success path can't
    // see the try block's categoryIds.
    const eventContextSnapshot: Array<string | string[] | undefined> = [
      pendingInquiry.categories,
      pendingInquiry.categoryId,
      pendingInquiry.category,
    ];

    try {
      const isLabour = pendingInquiry.isLabour === true;

      // Resolve the category string the backend will store. Fall through
      // multiple sources because the inquiry flow has two shapes:
      //   - non-labour passes an array into categories
      //   - labour passes a singular category
      // and either could be missing if the user took an unusual path
      // (deep-link, quick-action, etc.). Empty strings inside the array
      // are filtered before joining.
      // Phase: matching — send stable category IDs to the backend.
      // CategorySelection now emits IDs into pendingInquiry.categories;
      // the labour branch still carries singular categoryId for the
      // chosen labour subType.
      const categoryIds: string[] = isLabour
        ? pendingInquiry.categoryId
          ? [pendingInquiry.categoryId]
          : []
        : pendingInquiry.categories?.filter(Boolean) || [];

      if (categoryIds.length === 0) {
        alert(
          "We couldn't read a category for this inquiry. Go back to the categories step, pick what you're inquiring about, then try again."
        );
        setIsSubmitting(false);
        return;
      }

      // Admin category control: final safety net. The picker already hides
      // switched-off categories, and the backend rejects them, but a category
      // could be disabled mid-flow — surface a clear message rather than a
      // raw 400 from createInquiry below.
      const unavailable = categoryIds.filter((id) => !isCategoryAvailable(id));
      if (unavailable.length > 0) {
        alert(
          'This category is no longer available on the marketplace. Please go back and choose a different one.'
        );
        setIsSubmitting(false);
        return;
      }

      // Title uses the human-readable name of the most-specific picked
      // category. Resolved from CATEGORIES_DB by id; falls back to the
      // labour display label or a generic 'Inquiry' if the lookup fails.
      const lastCategoryId = categoryIds[categoryIds.length - 1];
      const lastCategoryName =
        CATEGORIES_DB.find((c) => c.id === lastCategoryId)?.name ||
        (isLabour ? pendingInquiry.category : null) ||
        'Inquiry';
      // Prefer the buyer's own words: most schemas ask "What are you looking
      // for?" as attributes.title. Only synthesize from brand/model (or the
      // category name) when the buyer didn't type one — previously the typed
      // answer was always discarded from the headline.
      const typedTitle = (pendingInquiry.attributes?.title || '').trim();
      // clampInquiryTitle keeps the result inside the backend's 3–255 char
      // window (falls back to the category name, truncates overlong text).
      const title = clampInquiryTitle(
        typedTitle
          ? typedTitle
          : pendingInquiry.attributes?.brand
            ? `${pendingInquiry.attributes.brand} ${pendingInquiry.attributes.model || ''} Request`
            : `${lastCategoryName} Request`,
        `${lastCategoryName} Request`,
      );

      // Merge the payment receipt back into preferences so the backend can
      // bill, audit, and enforce the auto-close cap.
      const preferencesWithPayment = {
        ...(pendingInquiry.preferences || {}),
        payment: {
          method: payment.method,
          provider: payment.provider,
          amount: payment.amount,
          paidAt: new Date().toISOString(),
        },
      };

      const hasCoords =
        locationData.latitude != null && locationData.longitude != null;

      // Derive the inquiry's description from the form's own textarea
      // answers. Selection is driven by the CATEGORY SCHEMA (required
      // textareas first), so every category's differently-named free-text
      // field (`conditionDetails`, `issueDescription`, `requestItems`…) is
      // honoured — the old hardcoded five-name probe chain missed most of
      // them and shipped a generic sentinel to the seller. The helper also
      // guarantees the backend's MinLength(10): a short answer ("wound",
      // "None") is kept and topped up with a summary sentence instead of
      // being sent as-is (which 400'd after the buyer had already paid).
      const description = buildInquiryDescription({
        attributes: pendingInquiry.attributes || {},
        schema: getCategorySchema(lastCategoryId),
        title,
        categoryName: lastCategoryName,
      });

      const inquiryData: CreateInquiryPayload = {
        title,
        description,
        items: JSON.stringify([]),
        categoryIds,
        // Lead with the typed Area/Landmark (the specific place the buyer
        // wants this fulfilled) — providers see it on the lead card. Falls
        // back to "city, province" when no area was set. Backend caps the
        // column at 255.
        location: [locationData.address, locationData.city, locationData.province]
          .filter(Boolean)
          .join(', ')
          .slice(0, 255),
        province: locationData.province,
        city: locationData.city,
        status: 'OPEN',
        preferences: JSON.stringify(preferencesWithPayment),
        // Ad attribution lives INSIDE attributes on purpose — a new top-level
        // key would be stripped by the backend's whitelisting ValidationPipe.
        // Same keys PublicShopProfile writes, so sellers read one shape.
        attributes: JSON.stringify({
          ...(pendingInquiry.attributes || {}),
          ...(pendingInquiry.adSource
            ? {
                sourceAdId: pendingInquiry.adSource.id,
                ...(pendingInquiry.adSource.title
                  ? { sourceAdTitle: pendingInquiry.adSource.title }
                  : {}),
              }
            : {}),
        }),
        processType: pendingInquiry.processType || 'STANDARD',
        ...(hasCoords && {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          radius: locationData.radius ?? 5,
        }),
        ...(pendingInquiry.targetedShop && {
          targetedProviderId: pendingInquiry.targetedShop.sellerId,
        }),
        // Labour / machinery-hire context — matching rides categoryIds,
        // but the lead's identity (labour vs equipment hire) drives the
        // provider-side card copy and the quote-form template (HIRE).
        ...(isLabour && {
          isLabour: true,
          labourGroup: pendingInquiry.labourGroup,
          labourSubType: pendingInquiry.categoryId,
        }),
      };

      await createInquiry(inquiryData, {
        idempotencyKey: newIdempotencyKey(),
        label: `Inquiry: ${inquiryData.title}`,
        changedEvent: 'tonse:inquiries-changed',
      });
      console.log('✅ Inquiry created after payment:', inquiryData.title, payment);
      refreshInquiries();

      setPendingInquiry({ items: [] });
      handleTabChange('inquiry-success');
      // Events-family inquiry (venue, decor, catering…) → this buyer is
      // organising an event: offer the ticket-selling feature, once.
      if (isEventContext(...eventContextSnapshot)) void offerTicketFeatureIfUndecided();
    } catch (error) {
      // Offline: the write is safely queued and will publish automatically once
      // the connection returns — so this is a SUCCESS from the buyer's view, not
      // the "contact support" dead end that a lost inquiry-after-payment used to be.
      if ((error as Error)?.name === 'QueuedWrite') {
        setPendingInquiry({ items: [] });
        handleTabChange('inquiry-success');
        if (isEventContext(...eventContextSnapshot)) void offerTicketFeatureIfUndecided();
        return;
      }
      console.error('Error creating inquiry:', error);
      const reason =
        (error as Error)?.message || 'Something went wrong while publishing.';
      // Held in state so FreeInquiryAutoPublish can swap its spinner for an
      // inline error + retry; the alert stays as a belt-and-braces signal for
      // the paid path (and now carries the actual reason, not a fixed string).
      setPublishError(reason);
      alert(`Your inquiry failed to publish: ${reason}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Submit a labour JOB POSTING for admin review. Parallel to
   * handlePaymentComplete but deliberately never touches createInquiry or
   * any payment path — postings are free and deny-until-approved.
   */
  const handleJobPostingSubmit = async () => {
    if (!user) return;
    const locationData = pendingInquiry.location;
    const details = pendingInquiry.jobPostingDetails;
    const tradeId = pendingInquiry.categoryId;
    if (!details || !tradeId) {
      alert('Missing job details. Please go back and complete the job post.');
      return;
    }
    if (!locationData?.province || !locationData?.city) {
      alert('Province and city are required. Please go back and complete the location step.');
      return;
    }
    setIsSubmitting(true);
    setPublishError(null);
    try {
      // Trade-form answers (job specifications) + the urgency pair +
      // applicant requirements (req_* keys) all ride in attributes —
      // seekers see specs and requirements as separate blocks on the card.
      const attributes = {
        ...(pendingInquiry.attributes || {}),
        urgency: details.urgency,
        ...(details.preferredDateTime ? { preferredDateTime: details.preferredDateTime } : {}),
        ...(details.requirementsAttributes ?? {}),
      };
      const payload: CreateJobPostingInput = {
        title: details.title,
        description: details.description,
        tradeCategoryIds: [tradeId],
        ...(details.workersNeeded ? { workersNeeded: details.workersNeeded } : {}),
        ...(details.payOffer != null
          ? { payOffer: details.payOffer, payRateUnit: details.payRateUnit }
          : {}),
        ...(details.applicationDeadline
          ? { applicationDeadline: new Date(`${details.applicationDeadline}T23:59:59`).toISOString() }
          : {}),
        location: [locationData.address, locationData.city, locationData.province]
          .filter(Boolean)
          .join(', ')
          .slice(0, 255),
        province: locationData.province,
        city: locationData.city,
        attributes,
      };
      const created = await jobBoardService.createPosting(payload);
      if (!created) throw new Error('The job post could not be submitted.');
      setPendingInquiry({ items: [] });
      setJobPostNeedsPayment(created.status === 'PENDING_PAYMENT');
      handleTabChange('job-posting-success');
    } catch (error) {
      const reason =
        (error as Error)?.message || 'Something went wrong while submitting your job post.';
      setPublishError(reason);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderInquiryFlow = () => {
    switch (activeTab) {
      case 'category-selection': {
        const shopCatIds = pendingInquiry.targetedShop?.categoryIds ?? [];
        const shopParentId: string | undefined = (() => {
          for (const id of shopCatIds) {
            const cat = CATEGORIES_DB.find((c) => c.id === id);
            if (!cat) continue;
            if (!cat.parentId) return cat.id;
            return cat.parentId;
          }
          return undefined;
        })();
        return (
          <BuyerCategoryPicker
            // A targeted entry reached the picker THROUGH process-selection —
            // back goes to the path choice, not out of the funnel.
            onBack={() =>
              handleTabChange(pendingInquiry.processType ? 'process-selection' : 'dashboard')
            }
            onComplete={handleInquiryComplete}
            preselectedParentId={shopParentId}
          />
        );
      }
      case 'create-inquiry':
        const isLabour = pendingInquiry.isLabour === true;
        const rawCategoryName = isLabour
          ? pendingInquiry.category
          : pendingInquiry.categories?.[0] || 'Inquiry';

        let schema: any[] = [];
        if (isLabour) {
          // Machinery-hire only now: labour TRADES skip this step entirely
          // and go straight to the vacancy composer (a job ad can't be
          // expressed as "how many workers / what rate / how long"). The
          // isLabour flag still covers both because they share the picker.
          schema = getLabourFormFields(pendingInquiry.inquirySchemaKey);
        } else {
          // pendingInquiry.categories[0] is the stable category ID
          // (e.g. 'mobile-phones-repair'), not the display name. The
          // previous strict `cat.name === rawCategoryName` match
          // never resolved repair / variant categories and silently
          // fell through to GENERIC_FALLBACK_SCHEMA — which is the
          // buy-flavoured form, wrong for repair inquiries.
          // getCategorySchema accepts both id and name.
          schema = getCategorySchema(rawCategoryName || '');
        }

        return (
          <div className="space-y-4">
            {pendingInquiry.targetedShop && (
              <div className="px-4 py-2.5 bg-[#fdf6e9] border border-[#d49b35]/20 rounded-xl flex items-center gap-2.5 text-[13px] text-slate-700">
                <Store className="w-4 h-4 text-[#d49b35] shrink-0" />
                <span>
                  Sending to <span className="font-bold">{pendingInquiry.targetedShop.name}</span>
                </span>
                <button
                  onClick={() => setPendingInquiry((p) => ({ ...p, targetedShop: undefined }))}
                  className="ml-auto text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <DynamicInquiryForm
              schema={schema}
              categoryName={rawCategoryName || 'Inquiry'}
              isLoading={isSubmitting}
              onSubmit={(data) => {
                setPendingInquiry((prev) => ({ ...prev, attributes: data }));
                // Labour trades continue into the job-post flow (details →
                // location → submit for admin review); everything else —
                // including machinery-hire — keeps the inquiry funnel.
                // A targeted entry already chose its path on the way in, so
                // don't ask twice.
                handleTabChange(
                  isJobPostingFlow
                    ? 'job-posting-details'
                    : pendingInquiry.processType
                      ? 'inquiry-preferences'
                      : 'process-selection'
                );
              }}
              onBack={() => handleTabChange('category-selection')}
            />
          </div>
        );
      case 'job-posting-details':
        return (
          <VacancyComposerForm
            tradeLabel={pendingInquiry.category || 'Worker'}
            // Reached straight from the trade picker — the per-trade inquiry
            // form is skipped for job posts.
            onBack={() => handleTabChange('category-selection')}
            onSubmit={(details) => {
              setPendingInquiry((prev) => ({ ...prev, jobPostingDetails: details }));
              handleTabChange('location-details');
            }}
          />
        );
      case 'process-selection':
        return (
          <ProcessSelection
            onComplete={(processType) => {
              setPendingInquiry((prev) => ({
                ...prev,
                processType: processType.toUpperCase() as 'EXPRESS' | 'STANDARD',
              }));
              // Targeted entry (advert / shop card) lands here FIRST — what
              // they're buying still has to be picked before preferences.
              handleTabChange(hasChosenCategory ? 'inquiry-preferences' : 'category-selection');
            }}
            onBack={() => handleTabChange(hasChosenCategory ? 'create-inquiry' : 'dashboard')}
          />
        );
      case 'inquiry-preferences':
        return (
          <InquiryPreferences
            categoryType={categoryType as any}
            categoryKey={pendingInquiry.categories?.[0]}
            // Mirrors the two funnel orders: targeted came via the form,
            // untargeted via the path choice.
            onBack={() =>
              handleTabChange(pendingInquiry.targetedShop ? 'create-inquiry' : 'process-selection')
            }
            onNext={(prefs) => {
              const shop = pendingInquiry.targetedShop;
              const isThisShopOnly = !!shop && prefs.targetOption === 'this_shop';

              if (isThisShopOnly && shop) {
                // Shop location is already known — skip the location step entirely
                // and pre-fill from the shop's profile data.
                setPendingInquiry((prev) => ({
                  ...prev,
                  preferences: prefs,
                  location: {
                    province: shop.province || '',
                    city: shop.city || shop.location || '',
                    address: undefined,
                    latitude: undefined,
                    longitude: undefined,
                    radius: undefined,
                  },
                }));
                handleTabChange('inquiry-payment');
              } else {
                setPendingInquiry((prev) => ({ ...prev, preferences: prefs }));
                handleTabChange('location-details');
              }
            }}
            targetedShop={pendingInquiry.targetedShop}
          />
        );
      case 'location-details':
        return (
          <LocationDetails
            onBack={() =>
              handleTabChange(isJobPostingFlow ? 'job-posting-details' : 'inquiry-preferences')
            }
            onComplete={handleLocationComplete}
          />
        );
      case 'inquiry-payment': {
        const fee = Number(pendingInquiry.preferences?.quoteFee ?? 10);
        const quoteCount = Number(pendingInquiry.preferences?.quoteCount ?? 5);
        if (fee <= 0) {
          // Monetization is OFF — no service fee to collect. Publish straight
          // through the same completion path so preferences.payment keeps its
          // shape ({method:'free', amount:0}) for lead cards and receipts.
          return (
            <FreeInquiryAutoPublish
              onReady={() => handlePaymentComplete({ method: 'free', amount: 0 })}
              error={publishError}
              onRetry={() => handlePaymentComplete({ method: 'free', amount: 0 })}
            />
          );
        }
        return (
          <InquiryPayment
            amount={fee}
            quoteCount={quoteCount}
            onBack={() => handleTabChange('location-details')}
            onComplete={handlePaymentComplete}
            onTopUp={() => handleTabChange('financial')}
          />
        );
      }
      case 'job-posting-submit':
        return (
          <FreeInquiryAutoPublish
            onReady={handleJobPostingSubmit}
            error={publishError}
            onRetry={handleJobPostingSubmit}
            pendingLabel="Submitting your job post…"
            errorTitle="Your job post didn't submit"
          />
        );
      case 'job-posting-success':
        return jobPostNeedsPayment ? (
          <InquirySuccess
            title="Job post created — payment needed"
            subtitle="Your post is saved but NOT yet submitted: the platform charges a job posting fee. Open My Job Posts and complete the payment — the moment it's paid, your post goes to our review team."
            buttonLabel="Pay in My Job Posts"
            onGoToDashboard={() => handleTabChange('my-job-posts')}
          />
        ) : (
          <InquirySuccess
            title="Job post submitted!"
            subtitle="Our team is reviewing your post. Once approved, it goes out to registered workers in the trade you picked — you'll get a notification either way, and applications land in My Job Posts."
            buttonLabel="View My Job Posts"
            onGoToDashboard={() => handleTabChange('my-job-posts')}
          />
        );
      case 'inquiry-success':
        return <InquirySuccess onGoToDashboard={() => handleTabChange('dashboard')} />;
      case 'financial':
        return <FinancialPage isInsideDashboard={true} />;
      case 'shops':
        return (
          <BrowseShopsView
            onSendInquiry={(shop) => handleAction('send_inquiry_to_shop', shop)}
            onViewProfile={(shop) => handleAction('view_shop_profile', shop)}
            onSendPurchaseOrder={(shop) => handleAction('open_po_for_shop', shop)}
          />
        );
      case 'favorites':
        return (
          <BrowseShopsView
            favoritesOnly
            onSendInquiry={(shop) => handleAction('send_inquiry_to_shop', shop)}
            onViewProfile={(shop) => handleAction('view_shop_profile', shop)}
            onSendPurchaseOrder={(shop) => handleAction('open_po_for_shop', shop)}
          />
        );
      case 'shop-profile':
        return selectedShopProfileId ? (
          <ShopProfileView
            profileId={selectedShopProfileId}
            onBack={() => handleTabChange('shops')}
            onSendInquiry={(shop) => handleAction('send_inquiry_to_shop', shop)}
            onSendPurchaseOrder={handleSendPurchaseOrder}
            autoOpenPO={poAutoOpen}
          />
        ) : null;
      default:
        return null;
    }
  };

  const isFlowTab = [
    'category-selection',
    'create-inquiry',
    'process-selection',
    'inquiry-preferences',
    'location-details',
    'inquiry-payment',
    'inquiry-success',
    'job-posting-details',
    'job-posting-submit',
    'job-posting-success',
    'financial',
    'shops',
    'favorites',
    'shop-profile',
  ].includes(activeTab);

  return (
    <DashboardLayout onTabChange={handleTabChange} externalActiveTab={activeTab}>
      <div className="w-full">
        <ConfirmationModal
          isOpen={!!inquiryToDelete}
          title="Delete Inquiry"
          message="Are you sure you want to delete this inquiry? This action cannot be undone."
          onConfirm={async () => {
            if (inquiryToDelete?.id) {
              try {
                await deleteInquiry(inquiryToDelete.id);
                refreshInquiries();
                refreshQuotes();
                // Tell every other useUserInquiries instance (notably the
                // CalendarPanel in DashboardLayout) so its count updates
                // immediately instead of waiting on the 30s poll tick.
                notifyInquiriesChanged();
              } catch (error) {
                alert('Failed to delete inquiry');
              }
            }
            setInquiryToDelete(null);
          }}
          onCancel={() => setInquiryToDelete(null)}
        />
        <ConfirmationModal
          isOpen={!!quoteToDelete}
          title="Delete Quotation"
          message="Are you sure you want to delete this quotation? This action will hide it from your dashboard."
          onConfirm={async () => {
            if (quoteToDelete?.id) {
              try {
                // Use archive instead of delete to avoid 403 Forbidden errors
                // as the backend restricts deletion to the quote owner (provider)
                await archiveQuote(quoteToDelete.id);
                refreshQuotes();
                if (activeTab === 'quote_details') {
                  handleTabChange('home');
                }
              } catch (error) {
                alert('Failed to delete quotation');
              }
            }
            setQuoteToDelete(null);
          }}
          onCancel={() => setQuoteToDelete(null)}
        />
        {isFlowTab ? (
          <PageTransition transitionKey="flow">{renderInquiryFlow()}</PageTransition>
        ) : (
          <DynamicAccountRenderer
            key={activeTab}
            schema={MASTER_BUYER_ACCOUNT_SCHEMA}
            view={
              activeTab === 'home'
                ? 'dashboard'
                : activeTab === 'inquiries' && selectedInquiryId
                  ? 'inquiry_details'
                  : activeTab
            }
            data={dashboardData}
            onAction={handleAction}
            onNavigate={handleTabChange}
            user={user}
          />
        )}

        <TicketFeaturePromptModal
          open={showTicketPrompt}
          onDecided={(accepted) => {
            setShowTicketPrompt(false);
            // Land them straight in their new tool so the "it appeared"
            // moment is immediate; the sidebar tab is now visible either way.
            if (accepted) handleTabChange('sell_tickets');
          }}
        />

        {ratingTarget && (
          <RateShopModal
            sellerUserId={ratingTarget.sellerId}
            sellerName={ratingTarget.sellerName}
            orderId={ratingTarget.orderId}
            onSubmitted={() =>
              setRatedOrderIds((prev) => new Set(prev).add(ratingTarget.orderId))
            }
            onClose={() => setRatingTarget(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
