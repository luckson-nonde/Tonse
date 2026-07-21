import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Store, X, Loader2 } from 'lucide-react';
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
import { createOrder, fetchBuyerOrders, type OrderRecord } from '../services/api/orderService';
import { isActiveInquiry, isActiveQuote } from '../services/lifecycleFilters';
import { newIdempotencyKey } from '../services/offlineWriteQueue';
import { isLoanQuote } from '../utils/loan';
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
import { Inquiry, InquiryItem, Quote } from '../types';
import { getLabourInquirySchema } from '../services/labourSchemaRegistry';
import FinancialPage from './FinancialPage';
import BrowseShopsView from '../components/BrowseShopsView';
import ShopProfileView from '../components/ShopProfileView';
import RateShopModal from '../components/RateShopModal';
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
function FreeInquiryAutoPublish({ onReady }: { onReady: () => void }) {
  const fired = React.useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    onReady();
  }, [onReady]);
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin text-[#C9973A]" />
      <p className="text-[11px] font-bold uppercase tracking-widest">Publishing your inquiry…</p>
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

  // Update selectedInquiryId when URL changes
  useEffect(() => {
    if (inquiryId) {
      setSelectedInquiryId(inquiryId);
    }
  }, [inquiryId]);

  // Fetch inquiries from PostgreSQL backend (NO IndexedDB)
  const {
    inquiries,
    loading: inquiriesLoading,
    refresh: refreshInquiries,
  } = useUserInquiries(user?.id);

  // Fetch quotes from PostgreSQL backend (NO IndexedDB)
  const { quotes, loading: quotesLoading, refresh: refreshQuotes } = useUserQuotes(user?.id);

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
      const quote = quotes.find((q) => String(q.id) === String(o.quoteId));
      const inquiry = quote ? inquiries.find((i) => String(i.id) === String(quote.inquiryId)) : undefined;
      return {
        ...(inquiry || {}),
        id: inquiry?.id ?? o.quoteId,
        title: inquiry?.title || `Order ${o.orderNumber}`,
        createdAt: inquiry?.createdAt || o.createdAt,
        paidQuote: {
          id: quote?.id ?? o.id,
          price: o.totalAmount,
          updatedAt: o.updatedAt,
          orderNumber: o.orderNumber,
          status: o.status,
        },
        orderId: o.id,
        orderStatus: o.status,
        // Rate-this-shop target: the seller's users.id + display name.
        sellerId: o.sellerId,
        sellerName: o.seller?.businessName || o.seller?.fullName,
        alreadyRated: ratedOrderIds.has(o.id),
      };
    });
  }, [backendOrders, quotes, inquiries, ratedOrderIds]);


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
  }>({ items: [] });

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
    const activeQuotes = enrichedQuotes.filter(isActiveQuote);
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
        return {
          id: `o-${i.id}`,
          title: i.title,
          subtitle: 'Order Placed',
          time: 'Recently',
          icon: 'Truck',
        };
      }
      const liveQuote = quotes.find(
        (q) => q.inquiryId === i.id && !q.isArchived,
      );
      if (liveQuote) {
        return {
          id: `q-${i.id}`,
          title: i.title,
          subtitle:
            String((liveQuote as any).condition || '').toUpperCase() === 'LOAN'
              ? `Offer Received · ZMW ${(liveQuote.price || 0).toLocaleString()}`
              : `Quote Received · K${(liveQuote.price || 0).toLocaleString()}`,
          time: 'Recently',
          icon: 'FileText',
        };
      }
      return {
        id: `i-${i.id}`,
        title: i.title,
        subtitle: 'Inquiry Created',
        time: 'Recently',
        icon: 'MessageSquare',
      };
    });

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
    };
  }, [inquiries, quotes, orders, selectedInquiryId, selectedQuoteId, selectedOrderId, balance, escrowBalance, autoPayQuoteId]);

  const handleTabChange = (tab: string, id?: string) => {
    setActiveTab(tab);
    const basePath = '/buyer';
    // Include inquiry ID in URL for details pages
    const path = id
      ? `${basePath}/${tab}/${id}`
      : tab === 'dashboard'
        ? basePath
        : `${basePath}/${tab}`;
    navigate(path);
  };

  const handleAction = async (actionId: string, payload?: any) => {
    switch (actionId) {
      case 'new_inquiry':
        handleTabChange('process-selection');
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
        // EXPRESS pay-on-quote success: an Order row was just created
        // by PaymentModal; refresh everything and land the buyer on the
        // Orders tab so they see the paid item in their history.
        refreshQuotes();
        refreshInquiries();
        refreshOrders();
        handleTabChange('orders');
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
        if (!quote?.id || !quote?.providerId || quote?.price == null) break;
        // A loan OFFER is accepted, not "paid" — there's no Order/payment for a
        // loan (money flows lender→borrower later). Accepting just marks the
        // offer ACCEPTED; the lender then proceeds off-platform / Phase-2.
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
        try {
          await createOrder({
            quoteId: String(quote.id),
            sellerId: String(quote.providerId),
            totalAmount: quote.price,
            buyerId: user!.id,
          });
          refreshQuotes();
          refreshInquiries();
          refreshOrders();
          handleTabChange('orders');
        } catch (err: any) {
          alert(err?.response?.data?.message || err?.message || 'Failed to generate purchase order. Please try again.');
        }
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
    handleTabChange('create-inquiry');
  };

  const handleLocationComplete = (locationData: any) => {
    // Stash location alongside the rest of the pending inquiry; payment step
    // owns the actual create-inquiry call so we don't publish until the buyer
    // has paid the service fee.
    setPendingInquiry((prev) => ({ ...prev, location: locationData }));
    handleTabChange('inquiry-payment');
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
      const title = typedTitle
        ? typedTitle
        : pendingInquiry.attributes?.brand
          ? `${pendingInquiry.attributes.brand} ${pendingInquiry.attributes.model || ''} Request`
          : `${lastCategoryName} Request`;

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

      // Derive the inquiry's display description from whatever long-form
      // text the form actually captured. The form schemas vary by
      // archetype — repair has `incidentReport` / `symptoms`, retail has
      // `additionalDetails` / `title`, events have `description` /
      // `additionalDetails` — so probe a priority list and stop on the
      // first non-empty entry. Falling back to the literal placeholder
      // string ("No description provided.") was the prior behaviour and
      // it polluted every inquiry's description column with the same
      // sentinel — the seller-side panel then rendered the sentinel as
      // if it were real copy. Empty string means the renderer
      // suppresses the panel entirely (it already short-circuits on
      // falsy `lead.description`), which is the right outcome when the
      // user genuinely had nothing more to add beyond the structured
      // fields.
      const attrs = pendingInquiry.attributes || {};
      // Probe structured fields in priority order; fall back to a neutral
      // placeholder that satisfies the backend's MinLength(10) constraint
      // when the buyer filled in only structured fields (brand/model/etc.)
      // and left the free-text area blank.
      const description: string =
        attrs.description ||
        attrs.incidentReport ||
        attrs.symptoms ||
        attrs.additionalDetails ||
        attrs.notes ||
        'No additional details provided.';

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
        attributes: JSON.stringify(pendingInquiry.attributes || {}),
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
    } catch (error) {
      // Offline: the write is safely queued and will publish automatically once
      // the connection returns — so this is a SUCCESS from the buyer's view, not
      // the "contact support" dead end that a lost inquiry-after-payment used to be.
      if ((error as Error)?.name === 'QueuedWrite') {
        setPendingInquiry({ items: [] });
        handleTabChange('inquiry-success');
        return;
      }
      console.error('Error creating inquiry:', error);
      alert('Payment cleared but the inquiry failed to publish. Please contact support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderInquiryFlow = () => {
    switch (activeTab) {
      case 'process-selection':
        return (
          <ProcessSelection
            onComplete={(processType) => {
              setPendingInquiry((prev) => ({
                ...prev,
                processType: processType.toUpperCase() as 'EXPRESS' | 'STANDARD',
              }));
              handleTabChange('category-selection');
            }}
            onBack={() => handleTabChange('dashboard')}
          />
        );
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
            onBack={() => handleTabChange('process-selection')}
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
          const labourSchema = getLabourInquirySchema(pendingInquiry.inquirySchemaKey || 'generic');
          // LabourInquiryField keys its fields `id`; DynamicInquiryForm
          // renders by `name` and SKIPS nameless fields — without this
          // adapter every labour/machinery form rendered empty.
          schema = (labourSchema?.fields || []).map((f) => ({
            name: f.id,
            label: f.label,
            type: f.type,
            required: f.required,
            placeholder: f.placeholder,
            options: f.options,
          }));
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

        // EXPRESS-mode filtering is handled inside DynamicInquiryForm
        // ([components/DynamicInquiryForm.tsx] activeSchema). The
        // earlier hardcoded `coreFieldNames` list duplicated that work
        // and stripped any field whose name wasn't in a fixed allow-list,
        // ignoring the per-field `keepInExpress` flag entirely. That's
        // why a richly-defined schema like eventDecorSchema rendered as
        // only Decor Style — every optional decor-specific field got
        // killed here before the form even saw it. One filter, one
        // place, single source of truth.

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
              processType={pendingInquiry.processType}
              isLoading={isSubmitting}
              onSubmit={(data) => {
                setPendingInquiry((prev) => ({ ...prev, attributes: data }));
                handleTabChange('inquiry-preferences');
              }}
              onBack={() => handleTabChange('category-selection')}
            />
          </div>
        );
      case 'inquiry-preferences':
        return (
          <InquiryPreferences
            categoryType={categoryType as any}
            categoryKey={pendingInquiry.categories?.[0]}
            onBack={() => handleTabChange('create-inquiry')}
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
            onBack={() => handleTabChange('inquiry-preferences')}
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
    'process-selection',
    'category-selection',
    'create-inquiry',
    'inquiry-preferences',
    'location-details',
    'inquiry-payment',
    'inquiry-success',
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
