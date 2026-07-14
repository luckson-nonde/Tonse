import { resolveSchemaForUser } from '../services/mergeAccountSchemas';
import { NavigationItem } from '../services/accountSchemaTypes';
import { useActiveProfileContext } from '../hooks/useActiveProfileContext';
import {
  fetchMyNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  type NotificationRecord,
} from '../services/api/notificationService';
import {
  Menu,
  Bell,
  Home,
  ClipboardCheck,
  List,
  Store,
  X,
  ChevronLeft,
  PlusCircle,
  MessageSquare,
  FileText,
  User,
  Users,
  Truck,
  QrCode,
  ChevronRight,
  Archive,
  Calendar,
  MapPin,
  History,
  ChevronDown,
  LayoutDashboard,
  Wallet,
  Landmark,
} from 'lucide-react';
import Logo from './Logo';
import ConfirmModal from './ConfirmModal';
import BuyerVerificationBanner from './BuyerVerificationBanner';
import DashboardCalendar, { CalendarTone, CounterCard } from './DashboardCalendar';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'motion/react';
import { useDashboard } from '../DashboardContext';
import { hasPermission, isCollectionOfficer, isQuotationManager, PERMISSIONS } from '../utils/rbac';
import {
  getBusinessTypes,
  getPrimaryBusinessType,
  getEffectiveBusinessType,
  getEffectiveBusinessTypes,
  BusinessType,
} from '../services/categories';
import { useAuth } from '../AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useMemo, useEffect } from 'react';
import { useUserInquiries, useMatchedLeads } from '../hooks/useInquiries';
import { useUserQuotes } from '../hooks/useQuotes';
import { isActiveInquiry, isActiveQuote } from '../services/lifecycleFilters';
import {
  fetchBuyerOrders,
  fetchSellerOrders,
  type OrderRecord,
} from '../services/api/orderService';
import { Inquiry } from '../types';

// Map a derived BusinessType (one source of truth — see services/categories.ts)
// to the CalendarPanel "tone" — controls the headline counter labels and how
// each event in the upcoming list is described. Lets a phone-repair shop see
// "OPEN REPAIRS / THIS WEEK" with "Repair Request" entries while an events
// provider keeps "TOTAL EVENTS / THIS MONTH" — same widget, same data shape,
// different vocabulary.
function businessTypeToCalendarTone(type: BusinessType): CalendarTone {
  switch (type) {
    case 'REPAIR':
      return 'repair';
    case 'RETAIL':
      return 'retail';
    case 'WHOLESALE':
      return 'wholesale';
    case 'SERVICE':
      return 'services';
    case 'EVENTS':
    case 'ENTERTAINMENT':
      return 'events';
    case 'BUYER':
      return 'buyer';
    default:
      // RENTAL / BOOKING / LABOUR / ADMIN / UNKNOWN fall through to the
      // generic tone for now. TODO: dedicated tones per archetype.
      return 'generic';
  }
}

// Calendar panel shown in right sidebar on dashboard/home tabs
const CalendarPanel = () => {
  const { user } = useAuth();
  // Inquiry-source split is role-shaped, not ownership-shaped:
  //   - BUYERS authored their inquiries — own them, see them on the
  //     calendar.
  //   - SELLERS / SERVICE_PROVIDERS don't own inquiries; they MATCH them
  //     by category subscription. The calendar shows whichever open
  //     inquiries fall under their seller_profile_categories tree, via
  //     the same recursive-ancestry endpoint the leads tab uses.
  // Calling useUserInquiries on a seller before this fix issued a bare
  // GET /inquiries which the backend returned the entire inquiries
  // table for — every seller saw every buyer's inquiry on the
  // calendar regardless of category. That's the leak this branch
  // closes.
  const isBuyer = user?.role === 'BUYER';
  const { context: calendarActiveContext } = useActiveProfileContext();

  // Calendar variant must match the persona — without it, a RETAIL+
  // REPAIR seller in REPAIR persona would still see RETAIL leads
  // counted as "OPEN REPAIRS" because the count is taken from the
  // unfiltered matched-leads set while only the tone (label) follows
  // persona. Pass the active archetype so backend SQL filters to it.
  const calendarVariant: string | undefined =
    !isBuyer && calendarActiveContext.type === 'business'
      ? calendarActiveContext.archetype
      : undefined;

  const { inquiries: ownInquiries } = useUserInquiries(isBuyer ? user?.id : undefined);
  const { inquiries: matchedInquiries } = useMatchedLeads(
    isBuyer ? undefined : user?.id,
    undefined,
    calendarVariant,
  );
  const inquiries = isBuyer ? ownInquiries : matchedInquiries;
  const { quotes } = useUserQuotes(user?.id);

  const tone = useMemo<CalendarTone>(
    () => businessTypeToCalendarTone(getEffectiveBusinessType(user as any, calendarActiveContext)),
    [user, calendarActiveContext]
  );

  const events = useMemo(() => {
    const evts: any[] = [];

    // Apply the same lifecycle filters the dashboard cards use so the
    // calendar's MY INQUIRIES / THIS MONTH counters match the headline
    // numbers. For buyers: only OPEN inquiries count as "active". For
    // sellers, useMatchedLeads already filters to matched-and-open
    // leads, so passing through is correct.
    if (inquiries) {
      const visible = isBuyer ? inquiries.filter(isActiveInquiry) : inquiries;
      visible.forEach((inq) => {
        evts.push({
          date: new Date(inq.createdAt),
          // Title falls back to the toned label when the inquiry has no
          // explicit title — DashboardCalendar's typeLabel uses the same
          // tone, so titles + type-tags read coherently.
          title: inq.title || 'Inquiry',
          type: 'inquiry',
          color: 'amber',
        });
      });
    }

    if (quotes) {
      quotes.forEach((quote) => {
        const status = String(quote.status || '').toUpperCase();
        if (status === 'PAID' || status === 'COMPLETED' || status === 'HANDED_OVER') {
          // Always-show: paid orders are real bookings worth surfacing.
          evts.push({
            date: new Date(quote.updatedAt),
            title: quote.inquiryTitle || 'Order',
            type: 'order',
            color: 'emerald',
          });
        } else if (isActiveQuote(quote as any)) {
          // Live quotes the buyer/seller can still act on. Skips
          // ARCHIVED, REJECTED, SUPERSEDED so the count doesn't drift
          // from what the My Quotes tab shows.
          evts.push({
            date: new Date(quote.createdAt),
            title: quote.inquiryTitle || 'Quote',
            type: 'quote',
            color: 'purple',
          });
        }
      });
    }

    return evts;
  }, [inquiries, quotes, isBuyer]);

  // Per-tone carousel counters that literally mirror the headline tiles
  // shown on the dashboard body. Each tone derives its values from the
  // same data the body uses (inquiries / quotes), so the right-rail
  // numbers can never drift from the headline.
  //
  //   • buyer       → mirrors BuyerDashboard's 3 stat cards
  //                   (Active Inquiries / Pending Quotes / Completed Orders)
  //   • events      → mirrors ProviderHomeView's entertainment/events
  //                   tiles (Booking Requests / Quotes Sent /
  //                   Potential Revenue / Pending Completion)
  //
  // Other tones keep the existing tone-derived 2-card stats by leaving
  // `counters` undefined (the calendar widget falls back to its
  // primary/secondary pair).
  const counters = useMemo<CounterCard[] | undefined>(() => {
    if (tone === 'buyer') {
      const activeInquiries = events.filter((e) => e.type === 'inquiry').length;
      const pendingQuotes   = events.filter((e) => e.type === 'quote').length;
      const completedOrders = events.filter((e) => e.type === 'order').length;
      return [
        { id: 'active',    label: 'Active Inquiries', value: activeInquiries, bg: 'bg-amber-50',   text: 'text-amber-600' },
        { id: 'pending',   label: 'Pending Quotes',   value: pendingQuotes,   bg: 'bg-purple-50',  text: 'text-purple-600' },
        { id: 'completed', label: 'Completed Orders', value: completedOrders, bg: 'bg-emerald-50', text: 'text-emerald-600' },
      ];
    }
    if (tone === 'events') {
      // Source data: matchedInquiries (already in `inquiries` for
      // sellers) + the seller's submitted `quotes`. Mirrors the
      // computation in ProviderHomeView (lines 281-302) so the carousel
      // matches the headline tiles 1:1.
      const bookingRequests = (inquiries ?? []).length;
      const displayQuotes   = (quotes ?? []).filter((q: any) => !q.isArchived);
      const quotesSent      = displayQuotes.length;
      const potentialZmw    = displayQuotes.reduce(
        (sum: number, q: any) => sum + Number(q.price || 0),
        0,
      );
      const pendingCompletion = displayQuotes.filter((q: any) => {
        const s = String(q.status || '').toUpperCase();
        return s === 'PAID' || s === 'PENDING_COLLECTION' || s === 'AWAITING_PICKUP';
      }).length;
      const fmtZmw = (n: number) =>
        `K${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
      return [
        { id: 'booking',    label: 'Booking Requests',  value: bookingRequests,         bg: 'bg-amber-50',   text: 'text-amber-600' },
        { id: 'sent',       label: 'Quotes Sent',       value: quotesSent,              bg: 'bg-emerald-50', text: 'text-emerald-600' },
        { id: 'potential',  label: 'Potential Revenue', value: fmtZmw(potentialZmw),    bg: 'bg-[#fdf6e9]',  text: 'text-[#d49b35]' },
        { id: 'completion', label: 'Pending Completion',value: pendingCompletion,       bg: 'bg-blue-50',    text: 'text-blue-600' },
      ];
    }
    return undefined;
  }, [tone, events, inquiries, quotes]);

  return <DashboardCalendar events={events} tone={tone} counters={counters} />;
};

// Map icon names to components
const iconMap: Record<string, any> = {
  Home,
  LayoutDashboard,
  MessageSquare,
  FileText,
  ShoppingBag: Truck, // Placeholder for ShoppingBag
  Store,
  User,
  Users,
  Truck,
  QrCode,
  Archive,
  Calendar,
  MapPin,
  History,
  ChevronDown,
  ChevronRight,
  PlusCircle,
  ClipboardCheck,
  List,
  Wallet,
  Landmark,
};

interface DashboardLayoutProps {
  children: React.ReactNode;
  onTabChange?: (tab: string) => void;
  externalActiveTab?: string;
}

export default function DashboardLayout({
  children,
  onTabChange,
  externalActiveTab,
}: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { activeTab: internalActiveTab, setActiveTab } = useDashboard();
  const activeTab = externalActiveTab ?? internalActiveTab;

  // <main> is the scroll container and this layout is REUSED across sibling
  // routes (React Router keeps same-typed elements mounted), so scrollTop
  // survives view changes — a new view entering mid-scroll clamps/jumps.
  // Every view change starts at the top, like a real page navigation.
  const mainRef = React.useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  React.useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [pathname, activeTab]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // ── Real notifications (Uber-dispatch Tier-1 rows) ───────────────────
  // Unread badge polls lightly (~30s; deliberately not a second SSE
  // stream); the list itself loads when the panel opens. "Mark all read"
  // zeroes the badge server-side + locally.
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifItems, setNotifItems] = useState<NotificationRecord[]>([]);

  const [notificationCounts, setNotificationCounts] = useState<{
    inquiries: number;
    quotes: number;
    activeInquiry: Partial<Inquiry> | null;
  }>({
    inquiries: 0,
    quotes: 0,
    activeInquiry: null,
  });

  // Placeholder kept ONLY for `activeInquiry` (consumed by the
  // multi-stage routing logic further down). Inquiry/quote counts now
  // come from `badgeCounts` below — derived from real data hooks rather
  // than hardcoded to zero.
  useEffect(() => {
    setNotificationCounts((prev) => ({ ...prev, inquiries: 0, quotes: 0 }));
  }, [user]);

  // Unread-notification badge poll (light; SSE handles the loud alerts).
  useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const count = await fetchUnreadNotificationCount();
      if (!cancelled) setUnreadCount(count);
    };
    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user?.id]);

  // Panel contents load on open (fresh every time — cheap, bounded list).
  useEffect(() => {
    if (!isNotificationPanelOpen || !user?.id) return;
    let cancelled = false;
    fetchMyNotifications(30).then((rows) => {
      if (!cancelled) setNotifItems(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [isNotificationPanelOpen, user?.id]);

  // Sidebar notification badges. Counts are TOTALS per surface — not
  // lifecycle-filtered — so when an inquiry advances OPEN → QUOTED → PAID
  // the badge on its source surface (e.g. "My Inquiries") doesn't shrink.
  // The data point still exists, the page still lists it, the badge
  // counts it.
  const sidebarIsBuyer = user?.role === 'BUYER';
  const { context: sidebarActiveContext } = useActiveProfileContext();
  const sidebarVariant: string | undefined =
    !sidebarIsBuyer && sidebarActiveContext.type === 'business'
      ? sidebarActiveContext.archetype
      : undefined;
  const { inquiries: sidebarOwnInquiries } = useUserInquiries(
    sidebarIsBuyer ? user?.id : undefined,
  );
  const { inquiries: sidebarMatchedInquiries } = useMatchedLeads(
    sidebarIsBuyer ? undefined : user?.id,
    undefined,
    sidebarVariant,
  );
  const { quotes: sidebarQuotes } = useUserQuotes(user?.id);
  const [sidebarOrders, setSidebarOrders] = useState<OrderRecord[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const fn = sidebarIsBuyer ? fetchBuyerOrders : fetchSellerOrders;
    fn(String(user.id))
      .then((rows) => { if (!cancelled) setSidebarOrders(rows); })
      .catch(() => { if (!cancelled) setSidebarOrders([]); });
    return () => { cancelled = true; };
  }, [user?.id, sidebarIsBuyer]);

  const badgeCounts = useMemo<Record<string, number>>(() => {
    // Each badge mirrors what's actually on the corresponding page.
    // Pages slice by lifecycle stage (see services/lifecycleFilters.ts),
    // so the badge does the same — otherwise badge=3, page=1 confuses
    // the user (the prior bug). When an inquiry transitions
    // OPEN → QUOTED → PAID it doesn't vanish; the count shifts from
    // "My Inquiries" to "Received Quotes" to "Order History" exactly as
    // its data point moves between the three pages.
    const counts: Record<string, number> = {};

    if (sidebarIsBuyer) {
      const activeInquiries = (sidebarOwnInquiries ?? []).filter(isActiveInquiry).length;
      // Mirror the page split: loan offers live under "Loan Offers", not
      // "Received Quotes". Marketplace badge excludes loans; the loan badge
      // signals pending offers the borrower still needs to act on.
      const isLoanish = (q: any) => ['LOAN', 'DECLINED'].includes(String(q?.condition || '').toUpperCase());
      const activeQuotes = (sidebarQuotes ?? []).filter((q: any) => isActiveQuote(q) && !isLoanish(q)).length;
      const pendingLoanOffers = (sidebarQuotes ?? []).filter(
        (q: any) => isLoanish(q) && String(q?.status || '').toUpperCase() === 'PENDING',
      ).length;
      counts.inquiries = activeInquiries;
      counts.quotes = activeQuotes;
      counts.loan_offers = pendingLoanOffers;
      counts.orders = sidebarOrders.length; // Order History shows every backend order
      return counts;
    }

    // Seller / provider variants. Matched leads from the backend are
    // already pre-filtered to "matched and currently open"; archived
    // ones are tagged on the row, so split locally.
    const archivedLeads = (sidebarMatchedInquiries ?? []).filter((i: any) => i.isArchived).length;
    const activeLeads   = (sidebarMatchedInquiries ?? []).filter((i: any) => !i.isArchived).length;
    const activeQuotes  = (sidebarQuotes ?? []).filter(isActiveQuote).length;
    counts.leads             = activeLeads;
    counts['my-quotes']      = activeQuotes;
    counts.my_quotes         = activeQuotes; // labour schema uses underscore form
    counts['paid-orders']    = sidebarOrders.length;
    counts['archived-leads'] = archivedLeads;
    return counts;
  }, [sidebarIsBuyer, sidebarOwnInquiries, sidebarMatchedInquiries, sidebarQuotes, sidebarOrders]);

  // Single source of truth for what kind of seller/buyer/etc this user is —
  // derived from role + subRole + categories (incl. specification variants).
  // See services/categories.ts → getBusinessType().
  // The label / page-title switches further down are single-value
  // consumers — they pick one string per tab. Composition-aware
  // surfaces (the schema-selection block above for retail vs others)
  // operate on `businessTypes` (the set) so a multi-archetype seller
  // (e.g. RETAIL + REPAIR) merges schemas instead of collapsing to one.
  // STRUCTURAL: what archetypes this user actually serves (junction
  // membership). Used for nav-item filters, schema resolver tie-
  // breakers, and dropdowns that need the seller's full archetype list.
  const businessTypes: BusinessType[] = useMemo(() => getBusinessTypes(user), [user]);
  const businessType: BusinessType = useMemo(() => getPrimaryBusinessType(user), [user]);

  const { context: activeContext, setContext: setActiveContext } = useActiveProfileContext();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // DISPLAY: persona-aware. Drives every visual label / title /
  // hero-tile copy that should reflect "what mode the seller is
  // currently acting in" rather than "what archetypes they serve".
  // Defaults to RETAIL (Buy New) when no persona is set.
  const effectiveBusinessType: BusinessType = useMemo(
    () => getEffectiveBusinessType(user, activeContext),
    [user, activeContext],
  );
  const effectiveBusinessTypes: BusinessType[] = useMemo(
    () => getEffectiveBusinessTypes(user, activeContext),
    [user, activeContext],
  );

  // Sidebar Profile popover — Phase 4. Personal mode + per-archetype
  // Business mode entries. Hidden for buyers (no business identity)
  // and locked for staff with assignedArchetype (only their entry +
  // Personal show, no "All").
  const profilePersonaOptions = useMemo(() => {
    const archetypes = businessTypes.filter(
      (a) => a !== 'BUYER' && a !== 'ADMIN' && a !== 'UNKNOWN' && a !== 'LABOUR',
    );
    const lockedArchetype = (user as any)?.assignedArchetype;
    if (lockedArchetype) {
      // Staff: only their archetype + Personal.
      return [
        { kind: 'personal' as const, label: 'Personal Profile' },
        { kind: 'business' as const, archetype: lockedArchetype, label: `Business · ${lockedArchetype}` },
      ];
    }
    // Owners: Personal + one entry per archetype they actually serve.
    // No "All" option — the simplified persona model is one view at
    // a time; default lands on RETAIL (Buy New) on first login.
    const opts: Array<
      | { kind: 'personal'; label: string }
      | { kind: 'business'; archetype: string; label: string }
    > = [
      { kind: 'personal', label: 'Personal Profile' },
    ];
    if (archetypes.length > 1) {
      archetypes.forEach((a) =>
        opts.push({ kind: 'business', archetype: a, label: `Business · ${a}` }),
      );
    } else if (archetypes.length === 1) {
      opts.push({ kind: 'business', archetype: archetypes[0], label: 'Business Profile' });
    }
    return opts;
  }, [businessTypes, user]);

  // What's currently selected, so the popover can highlight it.
  const currentPersonaKey = (() => {
    if (activeContext.type === 'personal') return 'personal';
    return `business:${activeContext.archetype}`;
  })();

  const handleSelectPersona = (
    opt:
      | { kind: 'personal'; label: string }
      | { kind: 'business'; archetype: string; label: string },
  ) => {
    if (opt.kind === 'personal') setActiveContext({ type: 'personal' });
    else setActiveContext({ type: 'business', archetype: opt.archetype as any });
    setIsProfileMenuOpen(false);
    // Land on the profile tab when switching to Personal; otherwise
    // home for the new business persona's dashboard. Staff stay on
    // leads (their natural surface) when they pick their assigned
    // archetype.
    if (opt.kind === 'personal') handleTabClick('profile');
    else if ((user as any)?.assignedArchetype) handleTabClick('leads');
    else handleTabClick('home');
  };

  const navItems = useMemo(() => {
    if (!user) return [];
    // Schema resolution. Three-way: merged multi-archetype view
    // (default), single-archetype scope when the seller switched the
    // Profile popover to "Business · X", or identity-only Personal
    // mode when they picked "Personal Profile".
    // See services/mergeAccountSchemas.ts for the full rules.
    const schema = resolveSchemaForUser(user, businessTypes, businessType, activeContext);

    return schema.navigation.filter((item) => {
      if (item.permissions && Array.isArray(item.permissions)) {
        // Check if user has ALL required permissions
        if (!item.permissions.every((perm) => hasPermission(user, perm))) return false;
      } else if (item.permissions && typeof item.permissions === 'string') {
        if (!hasPermission(user, item.permissions)) return false;
      }
      if (item.roleFilter && !item.roleFilter.includes(user.role)) return false;
      if (item.excludeRoles && item.excludeRoles.includes(user.role)) return false;

      if (item.categoryFilter) {
        const displayNames: string[] = user.categories ?? [];
        // Sellers don't have user.categories — fall back to categoryIds
        // (e.g. ['event-venues']) by normalising dashes → spaces so the
        // filter string 'event venues' still matches 'event-venues'.
        const categoryIds: string[] = (user as any).categoryIds ?? [];
        const idNormalised = categoryIds.map((id: string) => id.replace(/-/g, ' ').toLowerCase());
        const allNames = [...displayNames.map((c: string) => c.toLowerCase()), ...idNormalised];

        if (typeof item.categoryFilter === 'function') {
          if (!item.categoryFilter(user.role, displayNames.length ? displayNames : idNormalised)) return false;
        } else if (allNames.length > 0) {
          const hasMatchingCategory = item.categoryFilter.some((filterCat) =>
            allNames.some((userCat: string) => userCat.includes(filterCat.toLowerCase()))
          );
          if (!hasMatchingCategory) return false;
        }
        // If allNames is empty (no categories at all), skip filter and show the item
      }

      // BusinessType-based filtering — lets a schema item declare "only show
      // for repair shops" or "only show for wholesale" without needing
      // separate role/subRole conditionals.
      if (item.businessTypes && item.businessTypes.length > 0) {
        if (!item.businessTypes.includes(businessType)) return false;
      }

      return true;
    });
  }, [user, businessType, businessTypes, activeContext]);

  // Adapt the label of universal nav items based on businessType. The schema
  // declares "Booking Requests" generically; for a REPAIR_SERVICE shop we
  // surface "Repair Requests", for a WHOLESALE supplier "Purchase Requests",
  // etc. Keeps the schema declarative while the UI stays role-aware.
  const getLabel = (label: string | ((role: string) => string), itemId?: string) => {
    const baseLabel = typeof label === 'function' ? label(user?.role || '') : label;
    if (!itemId) return baseLabel;

    // Per-tab translations based on businessType. Each case rewrites the
    // generic "Booking Requests" label declared by the (still-shared)
    // MASTER_PROVIDER_ACCOUNT_SCHEMA. Once an archetype gets its own
    // schema (RETAIL already did) it declares its own label and no
    // longer needs a case here — those entries become dead code for
    // that archetype and can be deleted alongside the schema split.
    if (itemId === 'leads') {
      switch (effectiveBusinessType) {
        case 'REPAIR':
          return 'Repair Requests';
        case 'WHOLESALE':
          return 'Purchase Requests';
        case 'SERVICE':
          return 'Service Requests';
        case 'EVENTS':
          return 'Event Bookings';
        case 'ENTERTAINMENT':
          return 'Performance Bookings';
        // RETAIL now uses MASTER_RETAIL_ACCOUNT_SCHEMA which declares
        // "Buyer Inquiries" directly — no rewrite needed here.
        default:
          return baseLabel;
      }
    }
    if (itemId === 'products') {
      switch (effectiveBusinessType) {
        case 'REPAIR':
          return 'Service Catalog';
        case 'SERVICE':
          return 'Service Catalog';
        case 'WHOLESALE':
          return 'Stock & Pricing';
        default:
          return baseLabel;
      }
    }
    if (itemId === 'paid-orders') {
      switch (effectiveBusinessType) {
        case 'REPAIR':
          return 'Active Repairs';
        case 'SERVICE':
          return 'Active Engagements';
        default:
          return baseLabel;
      }
    }
    return baseLabel;
  };

  const handleTabClick = React.useCallback(
    (tab: string) => {
      // Phase 2: LABOUR is no longer a role — former labour users now route
      // via /provider as SERVICE_PROVIDER. Buyers still get the
      // onTabChange-driven tab swap.
      if (user?.role === 'BUYER' && onTabChange) {
        onTabChange(tab);
        setIsMobileMenuOpen(false);
        return;
      }

      setActiveTab(tab);
      setIsMobileMenuOpen(false);

      const isBuyer = user?.role === 'BUYER';
      const basePath = isBuyer ? '/buyer' : '/provider';
      const activeInquiry = notificationCounts?.activeInquiry;

      if (['quotation', 'purchase_order', 'order_confirmation', 'delivery_order'].includes(tab)) {
        if (activeInquiry) {
          navigate(`${basePath}/inquiries/${activeInquiry.id}/${tab}`);
        } else {
          navigate(`${basePath}/inquiries`);
        }
      } else if (tab === 'collection') {
        if (isBuyer && activeInquiry) {
          navigate(`${basePath}/inquiries/${activeInquiry.id}/collection`);
        } else if (isBuyer) {
          navigate(`${basePath}/inquiries`);
        } else {
          navigate(`${basePath}/collection`);
        }
      } else if (tab === 'suppliers') {
        navigate(`${basePath}/suppliers`);
      } else if (tab === 'archived') {
        navigate(`${basePath}/archived`);
      } else if (tab === 'archived-leads') {
        navigate(`${basePath}/archived-leads`);
      } else if (tab === 'profile') {
        navigate(`${basePath}/profile`);
      } else if (tab === 'schedule') {
        navigate('/schedule');
      } else if (tab === 'venue-spaces') {
        navigate('/provider/venue-spaces');
      } else if (tab === 'audit-trail') {
        navigate('/provider/audit-trail');
      } else {
        navigate(tab === 'home' ? basePath : `${basePath}/${tab}`);
      }
    },
    [setActiveTab, navigate, user?.role, notificationCounts?.activeInquiry, onTabChange]
  );


  const getPageTitle = () => {
    // Phase 2: legacy roles (EVENTS / ENTERTAINMENT) collapsed into the
    // category-driven businessType. The page-title copy keys off
    // the effective (persona-aware) businessType the same way the
    // sidebar / home tiles already do.
    const isBookingBased =
      effectiveBusinessType === 'EVENTS' || effectiveBusinessType === 'ENTERTAINMENT';
    switch (activeTab) {
      case 'home':
      case 'dashboard':
        return effectiveBusinessType === 'LENDING' ? 'LENDING OVERVIEW' : 'MARKETPLACE OVERVIEW';
      case 'quotes':
        return 'RECEIVED QUOTATIONS';
      case 'loan_offers':
        return 'LOAN OFFERS';
      case 'inquiries':
        return 'MY INQUIRIES';
      case 'create-inquiry':
        // Category-neutral: this tab hosts every request type (goods,
        // services, labour trades, machinery hire, loans) — the form itself
        // shows the specific category header.
        return 'NEW REQUEST';
      case 'inquiry-items':
        return 'ITEM LIST';
      case 'category-selection':
        return 'SELECT CATEGORY';
      case 'shops':
        return 'SHOPS & RETAILERS';
      case 'suppliers':
        return 'VERIFIED SUPPLIERS';
      case 'paid-orders':
        if (effectiveBusinessType === 'EVENTS') return 'PAID RENTALS';
        if (effectiveBusinessType === 'WHOLESALE') return 'PURCHASE ORDERS';
        if (effectiveBusinessType === 'REPAIR') return 'ACTIVE REPAIRS';
        return isBookingBased ? 'PAID BOOKINGS' : 'PAID ORDERS (ESCROW)';
      case 'collection':
        return 'PARCEL COLLECTION';
      case 'products':
        if (effectiveBusinessType === 'WHOLESALE') return 'SUPPLY INVENTORY';
        if (effectiveBusinessType === 'REPAIR' || effectiveBusinessType === 'SERVICE') return 'SERVICE CATALOG';
        if (effectiveBusinessType === 'ENTERTAINMENT') return 'PERFORMANCE CATALOG';
        return effectiveBusinessType === 'EVENTS' ? 'INVENTORY' : 'MY PRODUCTS';
      case 'venue-spaces':
        return 'VENUE SPACES';
      case 'archived':
        return effectiveBusinessType === 'WHOLESALE' ? 'ARCHIVED REQUESTS' : 'ARCHIVED QUOTES';
      case 'profile':
        if (effectiveBusinessType === 'LENDING') return 'LENDER PROFILE';
        return effectiveBusinessType === 'WHOLESALE' ? 'SUPPLIER PROFILE' : 'SHOP PROFILE';
      case 'leads':
        if (effectiveBusinessType === 'WHOLESALE') return 'PURCHASE REQUESTS';
        if (effectiveBusinessType === 'REPAIR') return 'REPAIR REQUESTS';
        if (effectiveBusinessType === 'SERVICE') return 'SERVICE REQUESTS';
        if (effectiveBusinessType === 'EVENTS') return 'EVENT BOOKINGS';
        if (effectiveBusinessType === 'ENTERTAINMENT') return 'PERFORMANCE BOOKINGS';
        if (effectiveBusinessType === 'RETAIL') return 'BUYER INQUIRIES';
        if (effectiveBusinessType === 'LENDING') return 'LOAN REQUESTS';
        return 'BOOKING REQUESTS';
      case 'my-quotes':
        if (effectiveBusinessType === 'LENDING') return 'LOAN OFFERS';
        return effectiveBusinessType === 'WHOLESALE' ? 'ACTIVE QUOTATIONS' : 'MY QUOTES';
      case 'loan-terms':
        return 'LOAN TERMS';
      case 'schedule':
        return 'MY SCHEDULE';
      case 'audit-trail':
        return effectiveBusinessType === 'WHOLESALE' ? 'SUPPLY AUDIT' : 'AUDIT TRAIL';
      default:
        return 'HOME';
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleFactoryReset = async () => {
    try {
      setIsResetting(true);
      const { db } = await import('../services/api/database');
      await db.clearAllTables();
      setIsResetModalOpen(false);
      // Force refresh/logout to clear local state
      logout();
      navigate('/login');
      window.location.reload();
    } catch (error) {
      console.error('Failed to reset data:', error);
    } finally {
      setIsResetting(false);
    }
  };

  const NavLink = ({
    tab,
    icon: Icon,
    label,
    isActive,
    badgeCount,
  }: {
    tab: string;
    icon: any;
    label: string;
    isActive: boolean;
    badgeCount?: number;
  }) => (
    <button
      onClick={() => handleTabClick(tab)}
      className={`flex items-center justify-between w-full px-6 py-3.5 md:py-4 text-[14px] font-medium font-sans transition-all duration-200 ${
        isActive
          ? 'border-l-[4px] border-[#C9973A] bg-[#1B3068] text-white shadow-md'
          : 'text-slate-500 hover:bg-[#1B3068] hover:text-white border-l-[4px] border-transparent'
      }`}
    >
      <div className="flex items-center">
        <Icon className="w-4.5 h-4.5 mr-4 stroke-[1.8]" /> {label}
      </div>
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="bg-brand-error text-white text-[10px] font-bold min-w-4.5 h-4.5 flex items-center justify-center rounded-full px-1.5 shadow-sm">
          {badgeCount}
        </span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#f5f2ed] noise-bg flex relative font-sans">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-100 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-199 w-64 bg-[#ffffff] text-brand-dark flex flex-col transform transition-transform duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} border-r border-[#f1f5f9] shadow-[4px_0_24px_rgba(26,22,18,0.02)]`}
      >
        <div
          className="p-4 border-b border-[#f1f5f9] flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors h-18.25"
          onClick={() => handleTabClick('home')}
        >
          <div className="hidden md:flex items-center space-x-3">
            <div className="flex flex-col">
              <Logo className="text-2xl" />
              <span className="text-[10px] font-sans text-[#9ca3af] tracking-wider uppercase mt-1">
                {getPageTitle()}
              </span>
            </div>
          </div>
          {/* Mobile: signed-in identity (desktop shows the logo block above).
              Fills what was an empty white strip at the top of the drawer. */}
          <div className="flex md:hidden items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#1B3068] text-white flex items-center justify-center font-bold text-[15px] shrink-0 shadow-sm">
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-brand-dark leading-tight truncate">
                {user?.name || 'Your account'}
              </p>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#C9973A] truncate">
                {user?.role || 'BUYER'} Account
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMobileMenuOpen(false);
              }}
              className="md:hidden p-1 text-brand-dark/60 hover:text-brand-dark"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="py-8 flex-1 overflow-y-auto scrollbar-hide">
          <nav className="space-y-2 md:space-y-3">
            {navItems.map((item) => {
              // Phase 4: Profile is a persona switcher, not a route.
              // Personal mode + per-archetype Business modes pop in
              // line; selecting one switches the entire dashboard.
              // Buyers don't see this (their `profile` is a regular
              // route via the BUYER schema's NavLink path below).
              if (item.id === 'profile' && user?.role !== 'BUYER') {
                const ProfileIcon = iconMap[item.icon] || User;
                return (
                  <div key={item.id} className="w-full">
                    <button
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className={`flex items-center justify-between w-full px-6 py-3.5 md:py-4 text-[14px] font-medium font-sans transition-all duration-200 border-l-[4px] ${
                        activeTab === 'profile' || isProfileMenuOpen
                          ? 'border-[#C9973A] bg-[#1B3068] text-white shadow-md'
                          : 'border-transparent text-slate-500 hover:bg-[#1B3068] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center">
                        <ProfileIcon className="w-4.5 h-4.5 mr-4 stroke-[1.8]" />
                        {getLabel(item.label, item.id)}
                      </div>
                      {isProfileMenuOpen ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    {isProfileMenuOpen && (
                      <div className="pl-6 pb-2 space-y-0.5 bg-white">
                        {profilePersonaOptions.map((opt) => {
                          const key =
                            opt.kind === 'personal'
                              ? 'personal'
                              : `business:${(opt as any).archetype}`;
                          const isSelected = currentPersonaKey === key;
                          return (
                            <button
                              key={key}
                              onClick={() => handleSelectPersona(opt as any)}
                              className={`w-full text-left px-6 py-2 text-[13px] font-medium transition-colors ${
                                isSelected
                                  ? 'text-[#C9973A] font-bold'
                                  : 'text-slate-500 hover:text-brand-dark'
                              }`}
                            >
                              {opt.label}
                              {isSelected && (
                                <span className="ml-2 text-[10px] uppercase tracking-wider">· active</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              if (
                item.id === 'inquiries' &&
                user?.role === 'BUYER' &&
                notificationCounts?.activeInquiry?.processType === 'STANDARD'
              ) {
                return (
                  <div key={item.id} className="w-full">
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex items-center justify-between w-full px-4 py-3 text-[14px] font-medium font-sans text-brand-dark hover:bg-slate-50 border-l-[3px] border-transparent"
                    >
                      <div className="flex items-center">
                        <FileText className="w-4.5 h-4.5 mr-4 stroke-[1.8]" />{' '}
                        {getLabel(item.label, item.id)}
                      </div>
                      {isDropdownOpen ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    {isDropdownOpen && (
                      <div className="pl-8 space-y-1 pb-2">
                        {[
                          'quotation',
                          'purchase_order',
                          'order_confirmation',
                          'delivery_order',
                        ].map((stage) => {
                          const stages = [
                            'quotation',
                            'purchase_order',
                            'order_confirmation',
                            'delivery_order',
                          ];
                          const currentStage =
                            notificationCounts.activeInquiry?.currentStage || 'quotation';
                          const isUnlocked =
                            stages.indexOf(stage) <= stages.indexOf(currentStage) ||
                            (stage === 'delivery_order' && currentStage === 'order_confirmation');

                          const stageLabels: Record<string, string> = {
                            quotation: 'Quotations',
                            purchase_order: 'Purchase Order',
                            order_confirmation: 'Order Confirmation',
                            delivery_order: 'Delivery Order',
                          };
                          return (
                            <button
                              key={stage}
                              disabled={!isUnlocked}
                              onClick={() => handleTabClick(stage)}
                              className={`flex items-center w-full px-4 py-2 text-[13px] font-medium font-sans transition-all duration-200 ${
                                activeTab === stage
                                  ? 'text-[#C9973A]'
                                  : isUnlocked
                                    ? 'text-[#64748b]'
                                    : 'text-slate-300 cursor-not-allowed'
                              }`}
                            >
                              {stageLabels[stage]}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const Icon = iconMap[item.icon] || Home;
              // Single source of truth for sidebar badges — see
              // `badgeCounts` useMemo above. Items lacking an entry get
              // `undefined`, which NavLink renders as no badge.
              const badgeCount = badgeCounts[item.id];

              return (
                <NavLink
                  key={item.id}
                  tab={item.id}
                  icon={Icon}
                  label={getLabel(item.label, item.id)}
                  isActive={
                    activeTab === item.id ||
                    (item.id === 'inquiries' &&
                      [
                        'inquiries',
                        'create-inquiry',
                        'inquiry-items',
                        'category-selection',
                        'inquiry-preferences',
                        'location-details',
                      ].includes(activeTab))
                  }
                  badgeCount={badgeCount}
                />
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-[#f1f5f9] mt-auto min-h-[140px] flex flex-col items-center justify-center bg-white space-y-4">
          <LogoutToggle user={user} onLogout={handleLogout} />
          <button 
            onClick={() => setIsResetModalOpen(true)}
            className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-widest flex items-center gap-1.5"
          >
            <History className="w-3 h-3" />
            Factory Reset
          </button>
        </div>

        <ConfirmModal
          isOpen={isResetModalOpen}
          onClose={() => setIsResetModalOpen(false)}
          onConfirm={handleFactoryReset}
          title="Factory Reset"
          message="This will permanently delete all inquiries, quotes, orders, and products. Your user account will be preserved, but all activity will be wiped. This Cannot be undone."
          confirmText={isResetting ? "Clearing..." : "Yes, Clear All Data"}
          variant="danger"
        />
      </div>

      {/* Main Content + Calendar */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {activeTab !== 'create-inquiry' && (
          <header className="sticky top-0 bg-[#ffffff] text-brand-dark z-50 py-4 border-b border-[#f1f5f9] h-18.25 flex items-center">
            <div className="px-4 sm:px-6 lg:px-8 flex items-center justify-between w-full">
              {/* Left Section: Mobile Menu */}
              <div className="flex items-center">
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="md:hidden w-10 h-10 bg-white border border-[#f1f5f9] rounded-lg flex items-center justify-center text-brand-dark mr-4 hover:bg-slate-50 transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>

              {/* Center Section: Mobile Logo & Title */}
              <div className="flex flex-col items-center justify-center flex-1 md:hidden">
                <Logo className="text-2xl" />
                <span className="text-[10px] font-bold text-[#C9973A] mt-1 font-sans uppercase tracking-widest">
                  {getPageTitle()}
                </span>
              </div>

              {/* Desktop Title Section */}
              <div className="hidden md:flex flex-col ml-4">
                <h2 className="text-lg font-serif font-black text-brand-dark leading-tight uppercase tracking-tight">
                  {getPageTitle()}
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              {/* Active persona badge — shows the seller's current
                  view mode. Hidden for buyers and for staff pinned by
                  assignedArchetype (the lock indicator already covers
                  them). The "Switch" button drops Personal mode back
                  to the default Business · RETAIL (Buy New) view. */}
              {user?.role !== 'BUYER' &&
                !user?.assignedArchetype &&
                (activeContext.type === 'personal' ||
                  (activeContext.type === 'business' &&
                    activeContext.archetype !== 'RETAIL')) && (
                  <div className="hidden md:flex items-center ml-6 gap-2 px-3 py-1.5 rounded-full bg-[#fdf8f0] border border-[#C9973A]/20">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Mode:
                    </span>
                    <span className="text-xs font-bold text-[#C9973A]">
                      {activeContext.type === 'personal'
                        ? 'Personal'
                        : `Business · ${activeContext.archetype}`}
                    </span>
                    {true && (
                      <button
                        onClick={() => {
                          setActiveContext({ type: 'business', archetype: 'RETAIL' });
                          handleTabClick('home');
                        }}
                        className="text-[10px] font-bold text-slate-400 hover:text-brand-dark uppercase tracking-wider underline-offset-4 hover:underline"
                        title="Switch back to the merged Business · All view"
                      >
                        Switch
                      </button>
                    )}
                  </div>
                )}

              {/* Right Section: User Info & Notifications */}
              <div className="flex items-center space-x-4 ml-auto">
                <div className="hidden sm:flex flex-col items-end mr-2">
                  <span className="text-[11px] font-bold text-[#C9973A] uppercase tracking-widest leading-none mb-1">
                    Welcome back,
                  </span>
                  <span className="text-sm font-black font-sans text-brand-dark leading-none">
                    {(user?.name || '').split(' ')[0]}
                  </span>
                </div>

                <div className="relative flex items-center gap-3">
                  <button
                    onClick={() => setIsNotificationPanelOpen(true)}
                    className="w-10 h-10 bg-transparent flex items-center justify-center text-brand-dark hover:bg-slate-50 transition-colors relative rounded-full"
                  >
                    <Bell className="w-4.5 h-4.5 stroke-[1.8]" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 px-1 bg-brand-error text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </header>
        )}

        <div className="flex flex-1 overflow-hidden">
          <main
            ref={mainRef}
            className="flex-1 px-4 sm:px-5 pt-4 sm:pt-6 pb-24 md:pb-8 relative overflow-x-hidden overflow-y-auto"
          >
            <BuyerVerificationBanner />
            {children}
          </main>

          {/* Right Calendar Panel - desktop only, shown on home/dashboard views */}
          {(activeTab === 'home' || activeTab === 'dashboard') && (
            <aside className="hidden xl:flex flex-col w-88 shrink-0 border-l border-[#f1f5f9] bg-white overflow-y-auto">
              <div className="p-6 pt-8">
                <CalendarPanel />
              </div>
            </aside>
          )}
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#1a1612]/5 flex justify-around items-center h-17.5 z-110 px-2 pb-safe shadow-[0_-10px_30px_rgba(26,22,18,0 (truncated…).05)]">
          {/* Collection Officers / Quotation Managers have no Home — they're
              locked to their scoped surface. */}
          {!isCollectionOfficer(user) && !isQuotationManager(user) && (
            <button
              onClick={() => handleTabClick('home')}
              className={`flex flex-col items-center justify-center w-full h-full transition-all ${activeTab === 'home' ? 'text-[#C9973A]' : 'text-[#9ca3af]'}`}
            >
              <Home
                className="w-5.5 h-5.5 mb-1"
                stroke="white"
                strokeWidth={1.5}
                fill="currentColor"
              />
              <span
                className={`text-[11px] font-sans tracking-tight ${activeTab === 'home' ? 'font-bold' : 'font-normal'}`}
              >
                Home
              </span>
            </button>
          )}

          {user?.role === 'BUYER' ? (
            <>
              <button
                onClick={() => handleTabClick('inquiries')}
                className={`flex flex-col items-center justify-center w-full h-full transition-all relative ${['inquiries', 'create-inquiry', 'inquiry-items', 'category-selection', 'inquiry-preferences', 'location-details'].includes(activeTab) ? 'text-[#C9973A]' : 'text-[#9ca3af]'}`}
              >
                <FileText
                  className="w-5.5 h-5.5 mb-1"
                  stroke="white"
                  strokeWidth={1.5}
                  fill="currentColor"
                />
                {notificationCounts?.inquiries > 0 && (
                  <span className="absolute top-1.5 right-1/2 translate-x-3.5 bg-brand-error text-white text-[9px] font-bold min-w-3.5 h-3.5 flex items-center justify-center rounded-full px-1 shadow-[0_2px_4px_rgba(239,68,68,0.3)] border border-white">
                    {notificationCounts.inquiries}
                  </span>
                )}
                <span
                  className={`text-[11px] font-sans tracking-tight ${['inquiries', 'create-inquiry', 'inquiry-items', 'category-selection', 'inquiry-preferences', 'location-details'].includes(activeTab) ? 'font-bold' : 'font-normal'}`}
                >
                  Inquiries
                </span>
              </button>
              <button
                onClick={() => handleTabClick('quotes')}
                className={`flex flex-col items-center justify-center w-full h-full transition-all relative ${activeTab === 'quotes' ? 'text-[#C9973A]' : 'text-[#9ca3af]'}`}
              >
                <MessageSquare
                  className="w-5.5 h-5.5 mb-1"
                  stroke="white"
                  strokeWidth={1.5}
                  fill="currentColor"
                />
                {notificationCounts?.quotes > 0 && (
                  <span className="absolute top-1.5 right-1/2 translate-x-3.5 bg-brand-error text-white text-[9px] font-bold min-w-3.5 h-3.5 flex items-center justify-center rounded-full px-1 shadow-[0_2px_4px_rgba(239,68,68,0.3)] border border-white">
                    {notificationCounts.quotes}
                  </span>
                )}
                <span
                  className={`text-[11px] font-sans tracking-tight ${activeTab === 'quotes' ? 'font-bold' : 'font-normal'}`}
                >
                  Quotes
                </span>
              </button>
              <button
                onClick={() => handleTabClick('shops')}
                className={`flex flex-col items-center justify-center w-full h-full transition-all ${activeTab === 'shops' ? 'text-[#C9973A]' : 'text-[#9ca3af]'}`}
              >
                <Store
                  className="w-5.5 h-5.5 mb-1"
                  stroke="white"
                  strokeWidth={1.5}
                  fill="currentColor"
                />
                <span
                  className={`text-[11px] font-sans tracking-tight ${activeTab === 'shops' ? 'font-bold' : 'font-normal'}`}
                >
                  Shops
                </span>
              </button>
            </>
          ) : (
            <>
              {hasPermission(user, PERMISSIONS.MANAGE_QUOTES) && (
                <>
                  <button
                    onClick={() => handleTabClick('leads')}
                    className={`flex flex-col items-center justify-center w-full h-full transition-all relative ${activeTab === 'leads' ? 'text-[#C9973A]' : 'text-[#9ca3af]'}`}
                  >
                    <FileText
                      className="w-5.5 h-5.5 mb-1"
                      stroke="white"
                      strokeWidth={1.5}
                      fill="currentColor"
                    />
                    {notificationCounts?.inquiries > 0 && (
                      <span className="absolute top-1.5 right-1/2 translate-x-3.5 bg-brand-error text-white text-[9px] font-bold min-w-3.5 h-3.5 flex items-center justify-center rounded-full px-1 shadow-[0_2px_4px_rgba(239,68,68,0.3)] border border-white">
                        {notificationCounts.inquiries}
                      </span>
                    )}
                    <span
                      className={`text-[11px] font-sans tracking-tight ${activeTab === 'leads' ? 'font-bold' : 'font-normal'}`}
                    >
                      Inquiries
                    </span>
                  </button>
                  <button
                    onClick={() => handleTabClick('my-quotes')}
                    className={`flex flex-col items-center justify-center w-full h-full transition-all relative ${activeTab === 'my-quotes' ? 'text-[#C9973A]' : 'text-[#9ca3af]'}`}
                  >
                    <MessageSquare
                      className="w-5.5 h-5.5 mb-1"
                      stroke="white"
                      strokeWidth={1.5}
                      fill="currentColor"
                    />
                    {notificationCounts?.quotes > 0 && (
                      <span className="absolute top-1.5 right-1/2 translate-x-3.5 bg-brand-error text-white text-[9px] font-bold min-w-3.5 h-3.5 flex items-center justify-center rounded-full px-1 shadow-[0_2px_4px_rgba(239,68,68,0.3)] border border-white">
                        {notificationCounts.quotes}
                      </span>
                    )}
                    <span
                      className={`text-[11px] font-sans tracking-tight ${activeTab === 'my-quotes' ? 'font-bold' : 'font-normal'}`}
                    >
                      Quotes
                    </span>
                  </button>
                </>
              )}

              {hasPermission(user, PERMISSIONS.VIEW_ANALYTICS) && !isQuotationManager(user) && (
                <button
                  onClick={() => handleTabClick('products')}
                  className={`flex flex-col items-center justify-center w-full h-full transition-all ${activeTab === 'products' ? 'text-[#C9973A]' : 'text-[#9ca3af]'}`}
                >
                  <Store
                    className="w-5.5 h-5.5 mb-1"
                    stroke="white"
                    strokeWidth={1.5}
                    fill="currentColor"
                  />
                  <span
                    className={`text-[11px] font-sans tracking-tight ${activeTab === 'products' ? 'font-bold' : 'font-normal'}`}
                  >
                    Shops
                  </span>
                </button>
              )}

              {user?.parentProviderId && hasPermission(user, PERMISSIONS.MANAGE_COLLECTIONS) && (
                <button
                  onClick={() => handleTabClick('collection')}
                  className={`flex flex-col items-center justify-center w-full h-full transition-all ${activeTab === 'collection' ? 'text-[#C9973A]' : 'text-[#9ca3af]'}`}
                >
                  <QrCode
                    className="w-5.5 h-5.5 mb-1"
                    stroke="white"
                    strokeWidth={1.5}
                    fill="currentColor"
                  />
                  <span
                    className={`text-[11px] font-sans tracking-tight ${activeTab === 'collection' ? 'font-bold' : 'font-normal'}`}
                  >
                    Collections
                  </span>
                </button>
              )}

              {user?.parentProviderId &&
                (!hasPermission(user, PERMISSIONS.MANAGE_COLLECTIONS) || isCollectionOfficer(user)) && (
                <button
                  onClick={() => handleTabClick('profile')}
                  className={`flex flex-col items-center justify-center w-full h-full transition-all ${activeTab === 'profile' ? 'text-[#C9973A]' : 'text-[#9ca3af]'}`}
                >
                  <User
                    className="w-5.5 h-5.5 mb-1"
                    stroke="white"
                    strokeWidth={1.5}
                    fill="currentColor"
                  />
                  <span
                    className={`text-[11px] font-sans tracking-tight ${activeTab === 'profile' ? 'font-bold' : 'font-normal'}`}
                  >
                    Profile
                  </span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Notification Side Panel */}
        <AnimatePresence>
          {isNotificationPanelOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsNotificationPanelOpen(false)}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-200"
              />
              {/* Panel */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white z-201 shadow-2xl flex flex-col"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-brand-white">
                  <div>
                    <h3 className="font-serif font-bold text-2xl text-brand-dark">Notifications</h3>
                    <p className="text-[10px] font-sans font-bold text-[#C9973A] uppercase tracking-widest mt-1">
                      Stay updated with your activity
                    </p>
                  </div>
                  <button
                    onClick={() => setIsNotificationPanelOpen(false)}
                    className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                  <div className="flex items-center justify-between px-2 mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Recent
                    </span>
                    <button
                      onClick={() => {
                        markAllNotificationsRead();
                        setUnreadCount(0);
                        setNotifItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
                      }}
                      className="text-[11px] font-bold text-[#C9973A] uppercase tracking-wider hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>

                  {/* Real Tier-1 notification rows (NEW_LEAD / QUOTE_RECEIVED /
                      RESERVE_RELEASED), newest first. */}
                  {notifItems.length === 0 && (
                    <div className="p-8 text-center text-sm text-slate-400 font-medium">
                      No notifications yet — new requests and quotes land here.
                    </div>
                  )}
                  {notifItems.map((n) => {
                    const icon =
                      n.type === 'NEW_LEAD' ? '📣' : n.type === 'RESERVE_RELEASED' ? '✅' : '💬';
                    const heading =
                      n.type === 'NEW_LEAD'
                        ? 'New Request'
                        : n.type === 'RESERVE_RELEASED'
                          ? 'Reserve Quote Released'
                          : 'Quote Received';
                    const ageMs = Date.now() - new Date(n.createdAt).getTime();
                    const age =
                      ageMs < 60_000
                        ? 'now'
                        : ageMs < 3_600_000
                          ? `${Math.floor(ageMs / 60_000)}m`
                          : ageMs < 86_400_000
                            ? `${Math.floor(ageMs / 3_600_000)}h`
                            : `${Math.floor(ageMs / 86_400_000)}d`;
                    return (
                      <div
                        key={n.id}
                        className={`p-4 rounded-2xl transition-all group ${
                          n.isRead
                            ? 'bg-white border border-slate-100 hover:border-[#C9973A]/20'
                            : 'bg-brand-white border border-[#C9973A]/10 hover:border-[#C9973A]/30'
                        }`}
                      >
                        <div className="flex gap-4">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl ${
                              n.isRead ? 'bg-slate-50' : 'bg-[#C9973A]/10'
                            }`}
                          >
                            {icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1 gap-2">
                              <p className="text-sm font-bold text-brand-dark">{heading}</p>
                              <span
                                className={`text-[10px] font-bold shrink-0 ${
                                  n.isRead ? 'text-slate-400' : 'text-[#C9973A]'
                                }`}
                              >
                                {age}
                              </span>
                            </div>
                            <p className="text-xs text-[#64748b] leading-relaxed break-words">
                              {n.title}
                            </p>
                            {n.type === 'NEW_LEAD' && n.status !== 'PENDING' && (
                              <p
                                className={`mt-1.5 text-[10px] font-bold uppercase tracking-wider ${
                                  n.status === 'ACKNOWLEDGED' ? 'text-emerald-600' : 'text-slate-400'
                                }`}
                              >
                                {n.status === 'ACKNOWLEDGED' ? 'Accepted' : 'Declined'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function LogoutToggle({ user, onLogout }: { user: any; onLogout: () => void }) {
  const x = useMotionValue(0);
  const xSpring = useSpring(x, { stiffness: 400, damping: 30 });

  // Track width: 160px. Thumb width: 38px. Padding: 5px.
  // Max travel = 160 - 38 - 10 = 112px.
  const maxDrag = 112;

  const labelOpacity = useTransform(x, [0, maxDrag * 0.6], [1, 0]);
  const [isSuccess, setIsSuccess] = useState(false);

  const initials =
    (user?.name || '')
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2) || 'JD';

  return (
    <div className="w-full flex justify-center">
      <div
        className="relative w-40 h-12 rounded-full border-2 border-white overflow-hidden cursor-pointer"
        style={{
          background: 'linear-gradient(145deg, #c9973a, #b8832a)',
          boxShadow:
            '0 4px 12px rgba(201,151,58,0.25), 0 1px 3px rgba(0,0,0,0.1), inset 0 3px 8px rgba(0,0,0,0.2), inset 0 -1px 4px rgba(255,255,255,0.1)',
        }}
      >
        {/* Slide to Logout Text */}
        <motion.div
          className="absolute inset-0 flex items-center justify-end pr-4 pointer-events-none z-10"
          style={{ opacity: labelOpacity }}
        >
          <span className="text-[9px] font-bold font-sans text-white/85 uppercase tracking-widest text-right leading-tight">
            SLIDE TO
            <br />
            LOGOUT
          </span>
        </motion.div>

        {/* Draggable Thumb */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: maxDrag }}
          dragElastic={0.05}
          dragMomentum={false}
          onDrag={(event, info) => {
            x.set(info.offset.x);
          }}
          onDragEnd={(event, info) => {
            if (info.offset.x >= maxDrag - 8) {
              setIsSuccess(true);
              setTimeout(onLogout, 400);
            } else {
              x.set(0);
            }
          }}
          style={{ x: xSpring }}
          className="absolute inset-y-0 left-1 flex items-center z-30 cursor-grab active:cursor-grabbing"
        >
          <motion.div
            className="w-9 h-9 rounded-full flex items-center justify-center border border-white/90 relative overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #ffffff, #f0ece4)',
              boxShadow:
                '0 4px 10px rgba(0,0,0,0.20), 0 1px 3px rgba(0,0,0,0.10), inset 0 -2px 3px rgba(0,0,0,0.05)',
            }}
          >
            {isSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center"
              >
                <ClipboardCheck className="w-4 h-4 text-[#C9973A]" />
              </motion.div>
            ) : user?.logo ? (
              <img
                src={user.logo}
                alt="Profile"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-[13px] font-bold font-serif text-[#C9973A] flex items-center justify-center h-full w-full">
                {initials}
              </span>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
