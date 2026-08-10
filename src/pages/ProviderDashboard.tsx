import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useActiveProfileContext, resolveActiveArchetype } from '../hooks/useActiveProfileContext';
import owlTriumphant from '../assets/images/empty-states/owl_triumphant.webp';
import { type Inquiry, type Quote } from '../types';
import { useDashboard } from '../DashboardContext';
import {
  TrendingUp,
  FileText,
  MessageSquare,
  Truck,
  Star,
  Search,
  PackageOpen,
  Plus,
  MapPin,
  Clock,
  User,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  ArrowRight,
  Settings,
  Loader2,
  Archive,
  X,
  Printer,
  ChevronRight,
  MoreHorizontal,
  Zap,
  Calendar,
  CheckCircle,
  Music,
  Heart,
  QrCode,
  Camera,
  Image as ImageIcon,
  ShieldCheck,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useMatchedLeads } from '../hooks/useInquiries';
import { db } from '../services/api/database';
import { apiClient } from '../services/api/client';
import { newIdempotencyKey } from '../services/offlineWriteQueue';
import { collectionService } from '../services/api/collectionService';
import {
  getCategorySchema,
  getCategoryNature,
  CATEGORIES_DB,
  getBusinessTypes,
  getPrimaryBusinessType,
  getEffectiveBusinessTypes,
  isRepairVariant,
} from '../services/categories';
import { hasPermission, isCollectionOfficer, isQuotationManager, isLoanOfficer, isTechnician, PERMISSIONS } from '../utils/rbac';
import { logAuditAction } from '../utils/auditLogger';
import DynamicDataDisplay from '../components/DynamicDataDisplay';
import Notification from '../components/Notification';
import Button from '../components/Button';
import ConfirmModal from '../components/ConfirmModal';
import ProviderHomeView from '../components/provider/ProviderHomeView';
import DynamicAccountRenderer from '../components/DynamicAccountRenderer';
import IncomingLeadAlert from '../components/IncomingLeadAlert';
import { recordInquiryView, type InquiryResponse } from '../services/api/inquiryService';
import { useNotificationStream, type QuoteCountUpdate } from '../hooks/useNotificationStream';
import { updateNotificationStatus } from '../services/api/notificationService';
import { robustParse } from '../utils/jsonUtils';
import { resolveSchemaForUser } from '../services/mergeAccountSchemas';

const renderSpecifications = (
  data: any,
  category: string = '',
  title: string = 'Specifications'
) => {
  // Use robustParse utility for consistent data handling
  const parsedData = robustParse(data, null);

  if (!parsedData || typeof parsedData !== 'object' || Object.keys(parsedData).length === 0)
    return null;

  const schema = getCategorySchema(category);

  return (
    <div className="space-y-7">
      {/* Section header in confident slate-700 with strong tracking.
          Earlier slate-400 read as faded — section titles need to feel
          present, not whispered. Single shared treatment across all
          spec blocks (Inquiry / Event / Repair) so the eye recognises
          the rhythm. */}
      <h5 className="text-[11px] font-black text-slate-700 uppercase tracking-[0.28em] flex items-center gap-3">
        <span className="block w-6 h-px bg-slate-300" />
        {title}
      </h5>
      <DynamicDataDisplay schema={schema} attributes={parsedData} />
    </div>
  );
};

export default function ProviderDashboard() {
  const { activeTab, setActiveTab } = useDashboard();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const { tab } = useParams<{ tab: string }>();

  // Synchronize URL tab parameter with Dashboard Context.
  // The exclusion list is for tabs that have a DEDICATED route in
  // App.tsx mounting their own page component (ShopProfilePage,
  // SuppliersPage, VenueSpacesManager, AuditTrailPage, ArchivedLeadsPage)
  // — for those, ProviderDashboard isn't mounted so syncing activeTab
  // would just clobber a stale value. `financial` does NOT have a
  // dedicated route — it falls through to /provider/:tab and is rendered
  // BY ProviderDashboard via DynamicAccountRenderer (view="financial").
  // Excluding it left activeTab stuck on 'home', so deep-links and the
  // "My Account" button on the provider home view silently rendered the
  // wrong screen.
  useEffect(() => {
    // Collection Officer (collection-only staff) is locked to the handover
    // surface. They arrive at /provider/home like everyone else — force them
    // onto the collection tab and block navigation to any other view (only
    // their own profile is also reachable). Handled here (the single tab-sync
    // effect) so it can't ping-pong with the generic sync below.
    if (isCollectionOfficer(user)) {
      const target =
        tab === 'profile' ? 'profile' : tab === 'collection' ? 'collection' : 'dashboard';
      if (activeTab !== target) setActiveTab(target);
      return;
    }
    // Quotation Manager (quoting-only staff) is locked to the quoting surface.
    // leads + my-quotes render here; profile / archived-leads are dedicated
    // routes (this component isn't mounted there). Any other tab → the staff
    // Overview landing tab.
    if (isQuotationManager(user)) {
      const target = ['my-quotes', 'leads'].includes(tab || '') ? tab! : 'dashboard';
      if (activeTab !== target) setActiveTab(target);
      return;
    }
    // Loan Officer — same shape as the quotation manager (their schema's
    // leads/my-quotes render the loan views). Previously had no branch at all,
    // so they landed on 'home', a view their schema doesn't define.
    if (isLoanOfficer(user)) {
      const target = ['my-quotes', 'leads'].includes(tab || '') ? tab! : 'dashboard';
      if (activeTab !== target) setActiveTab(target);
      return;
    }
    // Technician (job-evidence field staff) — Overview lands, My Jobs/History
    // are the work tabs.
    if (isTechnician(user)) {
      const target = ['my-jobs', 'history'].includes(tab || '') ? tab! : 'dashboard';
      if (activeTab !== target) setActiveTab(target);
      return;
    }
    // Pure-labour seller — their schema (MASTER_LABOUR_ACCOUNT_SCHEMA) has
    // no 'home' view, so the generic `!tab → 'home'` fallback below rendered
    // "View Not Found" on every first login. Land them on the labour
    // Overview instead, with the job-board tabs as the valid deep-links.
    {
      const bizTypes = getBusinessTypes(user as any);
      if (bizTypes.length === 1 && bizTypes[0] === 'LABOUR') {
        const labourTabs = [
          'find-jobs',
          'my-applications',
          'my-job-posts',
          'financial',
          'advertise',
          'reporting',
        ];
        const target = labourTabs.includes(tab || '') ? tab! : 'dashboard';
        if (activeTab !== target) setActiveTab(target);
        return;
      }
    }
    if (
      tab &&
      tab !== activeTab &&
      ![
        'profile',
        'suppliers',
        'venue-spaces',
        'audit-trail',
        'archived-leads',
      ].includes(tab)
    ) {
      setActiveTab(tab);
    } else if (!tab && activeTab !== 'home') {
      setActiveTab('home');
    }
  }, [tab, activeTab, setActiveTab, user]);

  const { context: activeContext } = useActiveProfileContext();

  const currentSchema = useMemo(() => {
    return resolveSchemaForUser(
      user,
      getBusinessTypes(user as any),
      getPrimaryBusinessType(user as any),
      activeContext,
    );
  }, [user, activeContext]);

  const effectiveProviderId = user?.parentProviderId || user?.id;
  const [quotesRefreshKey, setQuotesRefreshKey] = useState(0);

  // RBAC Redirect Logic — Phase 2 dropped PROVIDER_STAFF from the role enum;
  // staff users (if reintroduced later) would be a SELLER subRole, not a
  // top-level role. The team-tab guard remains, just gated by permissions.
  useEffect(() => {
    if (user && activeTab === 'team' && !hasPermission(user, PERMISSIONS.MANAGE_TEAM)) {
      setActiveTab('leads');
    }
  }, [user?.id, user?.permissions, activeTab, setActiveTab]);

  // STRUCTURAL set: archetypes the seller actually serves. Used below
  // for data-fetch gates (e.g. venue spaces) that must reflect what
  // they CAN do, regardless of which persona they're viewing right now.
  const _bizTypesForFlow = getBusinessTypes(user as any);

  // DISPLAY: persona-aware. Drives label switches downstream — a
  // seller who serves EVENTS but is in RETAIL persona reads as "not
  // booking-based" so the orders view shows "Paid Orders" not "Paid
  // Bookings".
  const isBookingBased =
    getEffectiveBusinessTypes(user as any, activeContext).includes('EVENTS') ||
    getEffectiveBusinessTypes(user as any, activeContext).includes('ENTERTAINMENT') ||
    getEffectiveBusinessTypes(user as any, activeContext).includes('BOOKING');

  const isServiceOrEvent = (inquiry: Inquiry) => {
    return (
      !!inquiry.entertainmentData ||
      (inquiry.attributes &&
        (inquiry.attributes.eventType ||
          inquiry.attributes.eventName ||
          inquiry.attributes.performanceType))
    );
  };

  const handleTabClick = useCallback(
    (tab: string) => {
      setActiveTab(tab);
      if (tab === 'profile') {
        navigate('/provider/profile');
      } else if (tab === 'home') {
        navigate('/provider');
      } else if (
        [
          'leads',
          'my-quotes',
          'paid-orders',
          'my-clients',
          'schedule',
          'products',
          'team',
          'collection',
          'audit-trail',
          'archived-leads',
          'financial',
          'advertise',
          'venue-spaces',
          'dashboard',
          'my-jobs',
          'history',
          'my-job-posts',
          'find-jobs',
          'my-applications',
          'reporting',
        ].includes(tab)
      ) {
        navigate(`/provider/${tab}`);
      }
    },
    [setActiveTab, navigate]
  );

  const handleAction = useCallback(
    async (actionId: string, payload?: any) => {
      if (actionId === 'save_profile') {
        try {
          // Reverse-map form field names → backend DTO field names.
          // Form uses: logo, nrc, dob, ownerName, gps
          // DTO expects: profilePicture, nrc, name, latitude, longitude
          const { logo, dob: _dob, ownerName, gps, ...rest } = payload ?? {};
          const updatePayload: Record<string, any> = { ...rest };
          if (logo !== undefined) updatePayload.profilePicture = logo;
          if (ownerName !== undefined) updatePayload.name = ownerName;
          if (gps?.latitude != null) updatePayload.latitude = gps.latitude;
          if (gps?.longitude != null) updatePayload.longitude = gps.longitude;
          await updateUser(updatePayload);
          showNotification('Profile saved successfully');
        } catch {
          showNotification('Failed to save profile. Please try again.', 'error');
        }
        return;
      }
    },
    [updateUser]
  );

  const products =
    useLiveQuery(async () => {
      if (!effectiveProviderId) return [];
      // Dedicated endpoint: all of this seller's rows, newest-first. The
      // generic /products list ignores a providerId filter (backend only
      // knows sellerId) and would return an unscoped global slice.
      const res = await apiClient.get<any[]>(`/products/seller/${effectiveProviderId}`);
      const allProducts = Array.isArray(res.data) ? res.data : [];
      return allProducts.slice(0, 5);
    }, [effectiveProviderId]) || [];

  const myQuotes =
    useLiveQuery(async () => {
      if (!effectiveProviderId) return [];
      const quotes = await db.quotes.where('providerId').equals(effectiveProviderId).toArray();
      const sortedQuotes = quotes.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const enrichedQuotes = await Promise.all(
        sortedQuotes.map(async (quote) => {
          // GET /quotes already joins the inquiry server-side. Keep it —
          // re-fetching GET /inquiries/:id 403s for providers on broadcast
          // inquiries (post-IDOR lockdown: only owner/admin/targeted provider
          // may read one), and overwriting with undefined blanked the whole
          // My Quotes / Paid Orders lists (cards bail on a missing inquiry).
          if ((quote as any).inquiry) return quote;
          const inquiry = await db.inquiries.get(quote.inquiryId);
          return { ...quote, inquiry };
        })
      );
      return enrichedQuotes;
    }, [effectiveProviderId, quotesRefreshKey]) || [];

  const schedules =
    useLiveQuery(async () => {
      if (!effectiveProviderId) return [];
      return await db.schedules.where('providerId').equals(effectiveProviderId).toArray();
    }, [effectiveProviderId]) || [];

  const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  const displayQuotes = React.useMemo(() => {
    return myQuotes.filter((q) => !q.isArchived);
  }, [myQuotes]);

  const chartData =
    useLiveQuery(async () => {
      if (!effectiveProviderId) return [];
      const now = new Date();
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(now.getDate() - (6 - i));
        return {
          name: d.toLocaleDateString('en-US', { weekday: 'short' }),
          date: d.setHours(0, 0, 0, 0),
          sales: 0,
        };
      });

      const allQuotes = await db.quotes.where('providerId').equals(effectiveProviderId).toArray();
      const completedQuotes = allQuotes.filter(
        (q) => q.status === 'COMPLETED' || q.status === 'PAID'
      );

      completedQuotes.forEach((quote) => {
        const quoteDate = new Date(quote.createdAt).setHours(0, 0, 0, 0);
        const day = last7Days.find((d) => d.date === quoteDate);
        if (day) {
          day.sales += quote.price;
        }
      });

      return last7Days;
    }, [user, myQuotes, quotesRefreshKey]) || [];

  // Phase: matching — leads come from the server-side category-aware
  // endpoint. The backend resolves the active profile, expands the
  // category ancestry, and returns only matching inquiries. The old
  // path (read every OPEN inquiry from IndexedDB + run
  // isRelatedCategory client-side) is gone — it was the source of the
  // "Electronics seller sees zero / wrong leads" bug because it
  // depended on stable display-name parsing and a populated
  // user.categories array, both of which were fragile.
  // Variant-aware leads: staff with assignedArchetype are locked to
  // that variant (the backend enforces it regardless of what we send).
  // Multi-archetype owners default to their primary archetype but can
  // switch via the toggle in ProviderLeadsView. Single-archetype
  // owners pass undefined → no filter.
  const sellerArchetypes = React.useMemo<string[]>(
    () =>
      getBusinessTypes(user as any).filter(
        (a) => a !== 'BUYER' && a !== 'ADMIN' && a !== 'UNKNOWN' && a !== 'LABOUR',
      ),
    [user],
  );
  const initialVariant = React.useMemo<string | undefined>(() => {
    // Priority: staff lock > Profile-popover persona > the seller's only
    // archetype (single-archetype) > primary archetype for multi.
    // Previously single-archetype owners returned undefined here, which
    // told the leads endpoint not to filter by archetype at all — so a
    // catering provider also matched event-venues / event-equipment-rental
    // through the recursive parent-expansion of "events". Auto-setting
    // the variant to their one archetype scopes the leads correctly.
    if (user?.assignedArchetype) return user.assignedArchetype;
    const personaArchetype = resolveActiveArchetype(
      activeContext,
      sellerArchetypes as any,
    );
    if (personaArchetype) return personaArchetype;
    if (sellerArchetypes.length === 1) return sellerArchetypes[0];
    if (sellerArchetypes.length > 1) return getPrimaryBusinessType(user as any);
    return undefined;
  }, [user, sellerArchetypes, activeContext]);
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>(
    initialVariant,
  );
  // Re-sync if the user / assignedArchetype changes (e.g. on first
  // /auth/me load after a refresh).
  React.useEffect(() => {
    setSelectedVariant(initialVariant);
  }, [initialVariant]);
  // Queue of new leads waiting to be alerted on. The hook reports
  // every freshly-arrived lead via onNewLeads; we surface them one at
  // a time so the provider isn't drowned by a stack of full-screen
  // overlays. A small Set of dismissed-this-session ids prevents the
  // same lead from re-alerting on toggle / variant change.
  const [alertQueue, setAlertQueue] = useState<InquiryResponse[]>([]);
  const dismissedAlertIdsRef = React.useRef<Set<string>>(new Set());
  const handleNewLeads = useCallback((fresh: InquiryResponse[]) => {
    setAlertQueue((prev) => {
      const have = new Set([...prev.map((p) => String(p.id)), ...dismissedAlertIdsRef.current]);
      const adds = fresh.filter((f: any) => f.id && !have.has(String(f.id)));
      return adds.length > 0 ? [...prev, ...adds] : prev;
    });
  }, []);

  // ── Uber-dispatch stream ─────────────────────────────────────────────
  // Live SSE channel: NEW_LEAD fires the incoming-request alert instantly
  // (the poll below becomes reconciliation), QUOTE_COUNT_UPDATE ticks the
  // "X/Y slots" counters on cards + the open alert in real time, LEAD_FULL
  // retracts alerts for leads that filled up. `liveCounts` overlays the
  // freshest counter values onto poll-fetched lead objects.
  const [liveCounts, setLiveCounts] = useState<Record<string, Partial<QuoteCountUpdate>>>({});
  const leadsRefreshRef = React.useRef<() => void>(() => {});
  const { status: streamStatus } = useNotificationStream(user?.id, {
    onNewLead: (payload) => {
      // Catch-up replays carry the persisted Accept/Decline status —
      // anything already handled must not re-alert.
      if (payload.status && payload.status !== 'PENDING') {
        if (payload.inquiryId) dismissedAlertIdsRef.current.add(String(payload.inquiryId));
        return;
      }
      if (!payload.inquiryId) return;
      handleNewLeads([
        { ...(payload as any), id: payload.inquiryId } as InquiryResponse,
      ]);
      // Reconcile the list view so the lead card exists behind the alert.
      leadsRefreshRef.current();
    },
    onQuoteCountUpdate: (p) => {
      setLiveCounts((prev) => ({ ...prev, [String(p.inquiryId)]: p }));
    },
    onLeadFull: ({ inquiryId }) => {
      const id = String(inquiryId);
      dismissedAlertIdsRef.current.add(id);
      setAlertQueue((prev) => prev.filter((l) => String(l.id) !== id));
    },
    onReserveReleased: () => {
      // Their reserve quote just went live for the buyer — refresh quotes.
      setQuotesRefreshKey((k) => k + 1);
    },
    onReconnect: () => leadsRefreshRef.current(),
  });

  const { inquiries: matchedLeads, refresh: refreshMatchedLeads } = useMatchedLeads(
    user?.id,
    undefined,
    selectedVariant,
    handleNewLeads,
    // Stream healthy → poll is just reconciliation; stream down → the
    // original 8s cadence is the degraded-but-live fallback.
    streamStatus === 'open' ? 45000 : 8000,
  );
  leadsRefreshRef.current = refreshMatchedLeads;

  // Declined/accepted leads must never re-alert, even across refreshes —
  // the leads hydration ships the caller's persisted notification status.
  useEffect(() => {
    for (const lead of matchedLeads as any[]) {
      if (lead.notificationStatus && lead.notificationStatus !== 'PENDING' && lead.id) {
        dismissedAlertIdsRef.current.add(String(lead.id));
      }
    }
  }, [matchedLeads]);

  const currentAlertLead = React.useMemo(() => {
    const head = alertQueue[0] ?? null;
    if (!head?.id) return head;
    const live = liveCounts[String(head.id)];
    return live ? ({ ...head, ...live } as InquiryResponse) : head;
  }, [alertQueue, liveCounts]);
  const dismissAlert = useCallback(() => {
    setAlertQueue((prev) => {
      if (prev.length === 0) return prev;
      const [head, ...rest] = prev;
      if (head?.id) {
        dismissedAlertIdsRef.current.add(String(head.id));
        // Persist the Decline — behaviour telemetry for the buyer, and the
        // reason this lead won't re-alert after a refresh.
        const notifId = (head as any).notificationId;
        if (notifId) updateNotificationStatus(notifId, 'DECLINED');
      }
      return rest;
    });
  }, []);
  const acceptAlert = useCallback((lead: InquiryResponse) => {
    if (lead?.id) {
      dismissedAlertIdsRef.current.add(String(lead.id));
      // Tapping "Quote Now" counts as the provider viewing the lead.
      // Backend dedups: BUYER/ADMIN/owner hits don't count, providers
      // opening their own dashboard alert do. Best-effort, fire-and-
      // forget — failure must not block the navigation.
      recordInquiryView(lead.id).catch(() => {});
      // Persist the Accept — ticks the buyer's "X providers accepted".
      const notifId = (lead as any).notificationId;
      if (notifId) updateNotificationStatus(notifId, 'ACKNOWLEDGED');
    }
    setAlertQueue((prev) => prev.slice(1));
    handleTabClick('leads');
  }, []);
  const allLeads = React.useMemo(
    () =>
      [...matchedLeads]
        .map((lead: any) => {
          const live = lead.id ? liveCounts[String(lead.id)] : undefined;
          return live ? { ...lead, ...live } : lead;
        })
        .sort(
          (a: any, b: any) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        ),
    [matchedLeads, liveCounts],
  );

  // Coerce price to Number — backend returns DECIMAL columns as strings
  // ("14000.00"), so a bare `sum + q.price` triggers string concatenation
  // ("0" + "14000.00" = "014000.00"), which is exactly the leading-zero
  // balance the buyer was seeing.
  const availableBalance = displayQuotes
    .filter((q) => q.status === 'COMPLETED' || q.status === 'PAID')
    .reduce((sum, q) => sum + Number(q.price || 0), 0);

  const pendingClearance = displayQuotes
    .filter((q) => q.status === 'ACCEPTED')
    .reduce((sum, q) => sum + Number(q.price || 0), 0);

  const [quotingInquiryId, setQuotingInquiryId] = useState<number | null>(null);
  const [expandedInquiryId, setExpandedInquiryId] = useState<number | null>(null);
  const [quoteSort, setQuoteSort] = useState<'recent' | 'expensive'>('recent');
  const [isUpdating, setIsUpdating] = useState(false);
  const [itemPrices, setItemPrices] = useState<{ [key: string]: string }>({});
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedInquiryIds, setSelectedInquiryIds] = useState<number[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [quoteSuccessModal, setQuoteSuccessModal] = useState<{ title: string; price: number; expiry: string } | null>(null);
  const [revisingQuote, setRevisingQuote] = useState<Quote | null>(null);

  const handleReviseQuote = useCallback((quote: Quote) => {
    setRevisingQuote(quote);
    setQuotingInquiryId(quote.inquiryId as any);
    handleTabClick('leads');
  }, [handleTabClick]);

  // A quote the provider has already sent but the buyer hasn't decided on
  // yet keeps its inquiry visible in Service Requests, badged "Quoted ·
  // Pending" — providers expect an in-flight quotation to still show under
  // requests, not vanish the moment it's submitted. Once the quote resolves
  // (accepted → it becomes a Paid Order; rejected/withdrawn → dead), the
  // inquiry drops off the requests feed. A pending revision supersedes a
  // resolved sibling on the same inquiry.
  const pendingQuoteByInquiryId = React.useMemo(() => {
    const map: Record<string, any> = {};
    for (const q of myQuotes) {
      if (q.status === 'PENDING' && !q.isArchived) map[String(q.inquiryId)] = q;
    }
    return map;
  }, [myQuotes]);

  // Filter leads by provider categories AND exclude RESOLVED quoted ones
  const leads = React.useMemo(() => {
    let filtered = allLeads;

    // Drop inquiries whose quote is already resolved (won/rejected/archived);
    // keep those with a still-pending quote so they remain on requests.
    const resolvedInquiryIds = new Set<string>();
    for (const q of myQuotes) {
      if (q.status !== 'PENDING' || q.isArchived) resolvedInquiryIds.add(String(q.inquiryId));
    }
    for (const id of Object.keys(pendingQuoteByInquiryId)) resolvedInquiryIds.delete(id);
    filtered = filtered.filter((lead) => !resolvedInquiryIds.has(String(lead.id)));

    // Filter by Archive Status
    const providerId = effectiveProviderId?.toString() || '';
    filtered = filtered.filter((lead) => !lead.archivedBy?.includes(providerId));

    // Filter by Delete Status
    filtered = filtered.filter((lead) => !lead.deletedBy?.includes(providerId));

    // The previous Provider-Nature and Variant-Level client-side filters
    // both keyed off lead.category (the legacy comma-joined display-name
    // string). After the matching refactor inquiries no longer carry
    // that field — they have categoryIds (junction-table backed) — so
    // both filters short-circuited to "drop the lead." That's why the
    // matched inquiry showed up on the right-rail calendar (which uses
    // useMatchedLeads directly) but the BUYER INQUIRIES tile and the
    // section card were empty.
    //
    // Both filters are intentionally removed. The server's MatchingService
    // is now the single authority on which inquiries reach a seller. The
    // PRODUCT-vs-SERVICE nature gate and the buy-new vs repair variant
    // gate are legitimate business rules but they belong server-side as
    // proper filters on the inquiry_categories join, not as fragile
    // client-side string parsing on a field that no longer exists.

    // Re-attach pending-quoted inquiries the backend dropped from the feed.
    // Submitting a quote flips the inquiry to status QUOTED (quotes.service),
    // and GET /inquiries/leads/me only returns status=OPEN — so an inquiry
    // this provider quoted vanishes from allLeads entirely. Rebuild those
    // rows from the provider's OWN joined quotes (myQuotes carries .inquiry)
    // so an in-flight quotation still shows on Service Requests, badged
    // pending. Provider-scoped: it never surfaces other providers' leads.
    const presentIds = new Set(filtered.map((l: any) => String(l.id)));
    for (const q of myQuotes) {
      if (q.status !== 'PENDING' || q.isArchived) continue;
      const inq: any = (q as any).inquiry;
      if (!inq?.id || presentIds.has(String(inq.id))) continue;
      if (inq.archivedBy?.includes(providerId) || inq.deletedBy?.includes(providerId)) continue;
      filtered.push(inq);
      presentIds.add(String(inq.id));
    }

    // Newest first — appended rows would otherwise trail out of date order.
    filtered.sort(
      (a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    );

    return filtered;
  }, [allLeads, myQuotes, effectiveProviderId, pendingQuoteByInquiryId]);

  // Collection Handshake State
  const [scanningQuoteId, setScanningQuoteId] = useState<number | null>(null);
  const [verifyingQuote, setVerifyingQuote] = useState<Quote | null>(null);
  const [activeChecklistQuote, setActiveChecklistQuote] = useState<Quote | null>(null);
  const [checklistSteps, setChecklistSteps] = useState({ photo: false, received: false });
  const [handoverCompleteQuote, setHandoverCompleteQuote] = useState<Quote | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
    isVisible: boolean;
  }>({
    message: '',
    type: 'success',
    isVisible: false,
  });

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type, isVisible: true });
  };
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const venueSpaces =
    useLiveQuery(async () => {
      // Temporarily disabled to stop 404 logs until backend route
      // /venue-spaces is implemented. Phase 2: gate by businessType (EVENTS
      // is now a derived value on a SELLER row, not a top-level role).
      if (!effectiveProviderId || !_bizTypesForFlow.includes('EVENTS')) return [];
      return [] as any[];
      /* 
      try {
        return await db.venueSpaces.where('providerId').equals(effectiveProviderId).toArray();
      } catch (e) {
        return [];
      }
      */
    }, [effectiveProviderId, user?.role]) || [];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const handleConfirmCollection = async (quoteId: string | number) => {
    if (!user) return;
    setIsUpdating(true);
    try {
      // Server-authoritative: transitions the quote to COMPLETED AND releases
      // escrow to the shop in one place (shared with the Collection Officer
      // flow). Replaces the old client-side db.quotes + db.transactions writes.
      await collectionService.complete(String(quoteId));
      const quote = activeChecklistQuote || (await db.quotes.get(quoteId)) || null;

      setHandoverCompleteQuote(quote);
      setActiveChecklistQuote(null);
      setChecklistSteps({ photo: false, received: false });
      setCapturedPhoto(null);
    } catch (error) {
      console.error('Failed to confirm collection:', error);
      showNotification('Failed to confirm collection. Please try again.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleArchiveSelected = async () => {
    if (selectedInquiryIds.length === 0) return;

    const providerId = effectiveProviderId?.toString() || '';
    for (const id of selectedInquiryIds) {
      const inquiry = await db.inquiries.get(id);
      if (inquiry) {
        const archivedBy = inquiry.archivedBy || [];
        if (!archivedBy.includes(providerId)) {
          await db.inquiries.update(id, { archivedBy: [...archivedBy, providerId] });
        }
      }
    }
    setSelectedInquiryIds([]);
    setIsSelectionMode(false);
    showNotification(`${selectedInquiryIds.length} inquiries archived`);
  };

  const handleDeleteSelected = async () => {
    if (selectedInquiryIds.length === 0) return;
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteSelected = async () => {
    const providerId = effectiveProviderId?.toString() || '';
    for (const id of selectedInquiryIds) {
      const inquiry = await db.inquiries.get(id);
      if (inquiry) {
        const deletedBy = inquiry.deletedBy || [];
        if (!deletedBy.includes(providerId)) {
          await db.inquiries.update(id, { deletedBy: [...deletedBy, providerId] });
        }
      }
    }
    setSelectedInquiryIds([]);
    setIsSelectionMode(false);
    showNotification(`${selectedInquiryIds.length} inquiries deleted`);
  };

  const handleStartScan = (quoteId: number) => {
    setScanningQuoteId(quoteId);
  };

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (scanningQuoteId) {
      scanner = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => {
          // Assume decodedText is the quote ID or a specific code
          if (decodedText.includes(`QT-${scanningQuoteId}`)) {
            scanner?.clear();
            setScanningQuoteId(null);
            db.quotes.get(scanningQuoteId).then((quote) => {
              if (quote) setVerifyingQuote(quote);
            });
          } else {
            showNotification('Invalid QR Code for this order.', 'error');
          }
        },
        (error) => {
          // Ignore errors
        }
      );
    }
    return () => {
      if (scanner) {
        scanner.clear().catch((err) => console.error('Failed to clear scanner', err));
      }
    };
  }, [scanningQuoteId]);

  const handleVerifyBuyer = async () => {
    if (!verifyingQuote?.id) return;
    setIsUpdating(true);
    try {
      // Server-authoritative (shared with the Collection Officer flow).
      await collectionService.verify(String(verifyingQuote.id));
      setActiveChecklistQuote(verifyingQuote);
      setVerifyingQuote(null);
      showNotification('Buyer identity verified successfully!');
    } catch (error) {
      console.error('Failed to update status:', error);
      showNotification('Failed to verify buyer. Please try again.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTakePhoto = () => {
    // Simulate taking a photo
    setCapturedPhoto(
      'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&q=80&w=400&h=400'
    );
    setChecklistSteps((prev) => ({ ...prev, photo: true }));
  };

  // EXPLICIT two-param signature — ProviderLeadsView calls this as (leadId, formData)
  const handleDynamicQuoteSubmit = async (leadId: any, submittedQuoteData: any) => {
    if (!leadId || !user) return;

    console.log('[Quote] leadId:', leadId, '| data:', submittedQuoteData);

    try {
      // Fetch the inquiry directly from DB so we are never stale
      const lead = await db.inquiries.get(leadId) || leads.find((l) => l.id === leadId);
      if (!lead) throw new Error('Inquiry not found: ' + leadId);

      // Parse items (may be array, JSON string, or missing)
      const leadItems: any[] = Array.isArray(lead.items)
        ? lead.items
        : typeof lead.items === 'string'
        ? (() => { try { return JSON.parse(lead.items); } catch { return []; } })()
        : [];

      const itemPricesArray = leadItems
        .map((item: any, idx: number) => ({
          itemId: item.id || `${lead.id}-item-${idx}`,
          price: Number(itemPrices[`${leadId}-${idx}`] || 0),
        }))
        .filter((ip: { itemId: string; price: number }) => ip.price > 0);

      // Price waterfall: item totals → calculatedTotal → price → venueHireFee → serviceFee
      const totalPrice =
        itemPricesArray.length > 0
          ? itemPricesArray.reduce((s: number, ip: { itemId: string; price: number }) => s + ip.price, 0)
          : Number(submittedQuoteData.calculatedTotal ?? submittedQuoteData.price ?? submittedQuoteData.venueHireFee ?? submittedQuoteData.serviceFee ?? 0);

      console.log('[Quote] totalPrice:', totalPrice, '| expiry:', submittedQuoteData.expiryDuration);

      const adminUser = user.parentProviderId ? await db.users.get(user.parentProviderId) : user;

      // IMPORTANT: Send raw objects/arrays — backend stores as JSON columns.
      // Do NOT JSON.stringify() these; the backend parseJsonFields() would double-parse them.
      const newQuote: any = {
        inquiryId: String(lead.id),                     // Must be the backend UUID string
        inquiryTitle: lead.title || 'Inquiry',
        price: totalPrice,
        condition: submittedQuoteData.condition || 'N/A',
        message: (submittedQuoteData.message || '').trim().length >= 10
          ? submittedQuoteData.message
          : 'Thank you for your inquiry. We are pleased to provide this quotation for your review.',
        expiryDuration: submittedQuoteData.expiryDuration || '1 Month',
        status: 'PENDING' as const,
        providerId: String(effectiveProviderId),
        providerName: adminUser?.name || user.name,
        itemPrices: itemPricesArray.length > 0 ? itemPricesArray : undefined,  // raw array
        requirements: [],
        dynamicFields: submittedQuoteData,              // raw object, not stringified
        ...(submittedQuoteData.venueSpaceId ? {
          venueSpaceId: String(submittedQuoteData.venueSpaceId), // UUID string, not number
          venueSpaceName: venueSpaces.find((v) => v.id === Number(submittedQuoteData.venueSpaceId))?.name,
          damageDeposit: submittedQuoteData.damageDeposit ? Number(submittedQuoteData.damageDeposit) : undefined,
          cleaningFee: submittedQuoteData.cleaningFee ? Number(submittedQuoteData.cleaningFee) : undefined,
        } : {}),
        delivery: {                                     // raw object, not stringified
          offered: submittedQuoteData.optionalDeliveryOffer === true || !!submittedQuoteData.deliveryFee,
          fee: Number(submittedQuoteData.optionalDeliveryFee || submittedQuoteData.deliveryFee || 0),
          method: submittedQuoteData.optionalDeliveryOffer === true || !!submittedQuoteData.deliveryFee ? 'SELLER_DELIVERY' : 'PICKUP',
          pickupInstructions: submittedQuoteData.pickupInstructions || '',
        },
        processType: submittedQuoteData.processType || 'STANDARD',
      };

      const quoteId = await db.quotes.add(newQuote, {
        idempotencyKey: newIdempotencyKey(),
        label: `Quote for ${lead.title || newQuote.inquiryTitle || 'inquiry'}`,
        changedEvent: 'tonse:quotes-changed',
      });
      setQuotesRefreshKey(k => k + 1);
      console.log('[Quote] saved with id:', quoteId);

      // Inquiry status transition to QUOTED happens server-side now —
      // QuotesService.create() flips it atomically. The previous
      // client-side PATCH /inquiries/:id 403'd for any caller who
      // wasn't the buyer (every seller, in other words), so we don't
      // run it from here anymore.

      try {
        await logAuditAction(user, 'QUOTE_SENT', quoteId, newQuote.inquiryTitle, lead.buyerName || 'Unknown Buyer', newQuote.price, `Quote sent for ${newQuote.inquiryTitle}`);
      } catch { /* audit failures are non-fatal */ }

      setQuotingInquiryId(null);
      setItemPrices({});
      setQuoteSuccessModal({ title: lead.title || 'Inquiry', price: totalPrice, expiry: submittedQuoteData.expiryDuration || '1 Month' });
      handleTabClick('my-quotes');
    } catch (error) {
      if ((error as Error)?.name === 'QueuedWrite') {
        setQuotingInquiryId(null);
        setItemPrices({});
        alert("You're offline — this quote is saved and will send automatically once you're back online.");
        handleTabClick('my-quotes');
        return;
      }
      console.error('[Quote] submit error:', error);
      alert(`Failed to submit quotation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const toggleExpand = async (id: number) => {
    if (expandedInquiryId === id) {
      setExpandedInquiryId(null);
    } else {
      setExpandedInquiryId(id);
    }
  };

  const handleArchiveQuote = async (quoteId: number) => {
    try {
      await db.quotes.update(quoteId, { status: 'ARCHIVED' });
    } catch (error) {
      console.error('Error archiving quote:', error);
    }
  };

  const handlePrintQuote = (quote: Quote, inquiry: Inquiry) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = inquiry.items
      .map((item, idx) => {
        const itemPrice = quote.itemPrices?.find(
          (ip: any) => ip.itemId === (item.id || `${inquiry.id}-item-${idx}`)
        )?.price;
        return `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">
              <div style="display: flex; gap: 12px; align-items: center;">
                ${item.images && item.images[0] ? `<img src="${item.images[0]}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px; border: 1px solid #eee;" />` : ''}
                <div>
                  <div style="font-weight: bold; color: #1e293b;">${item.title}</div>
                  <div style="font-size: 12px; color: #64748b;">${item.description || ''}</div>
                </div>
              </div>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; color: #1e293b;">${item.quantity}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; color: #d49b35; font-weight: bold;">${itemPrice ? `K${itemPrice.toLocaleString()}` : 'N/A'}</td>
          </tr>
        `;
      })
      .join('');

    const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Quotation #${quote.id}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
              body { font-family: 'Inter', system-ui, sans-serif; color: #1e293b; line-height: 1.5; padding: 40px; background: #fff; }
              .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 4px solid #d49b35; padding-bottom: 20px; }
              .logo { font-size: 28px; font-weight: 900; color: #d49b35; text-transform: uppercase; letter-spacing: -1.5px; }
              .quote-title { font-size: 36px; font-weight: 900; color: #1e293b; margin: 0; letter-spacing: -1px; }
              .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
              .section-title { font-size: 11px; font-weight: 900; text-transform: uppercase; color: #64748b; letter-spacing: 1.5px; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
              .info-box { background: #f8fafc; padding: 24px; border-radius: 16px; border: 1px solid #f1f5f9; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
              th { text-align: left; padding: 14px; background: #f1f5f9; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #475569; border-bottom: 2px solid #e2e8f0; }
              .total-section { display: flex; justify-content: space-between; border-top: 4px solid #d49b35; padding-top: 24px; margin-top: 40px; }
              .total-label { font-size: 16px; font-weight: 900; color: #64748b; margin-right: 24px; align-self: center; }
              .total-amount { font-size: 32px; font-weight: 900; color: #d49b35; }
              .footer { margin-top: 80px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 30px; }
              .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 120px; font-weight: 900; color: rgba(212, 155, 53, 0.03); z-index: -1; white-space: nowrap; }
              .qr-code { width: 100px; height: 100px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 8px; background: #fff; }
              @media print {
                body { padding: 0; }
                .no-print { display: none; }
                .info-box { background: #f8fafc !important; -webkit-print-color-adjust: exact; }
                th { background: #f1f5f9 !important; -webkit-print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            <div class="watermark">MARKETPLACE</div>
            <div class="header">
              <div>
                <div class="logo">Marketplace</div>
                <p style="margin: 4px 0 0; font-size: 14px; color: #64748b; font-weight: 600;">Digital Quotation System</p>
              </div>
              <div style="text-align: right;">
                <h1 class="quote-title">QUOTATION</h1>
                <p style="margin: 4px 0 0; font-size: 18px; font-weight: 900; color: #d49b35;">#QT-${quote.id?.toString().padStart(4, '0')}</p>
              </div>
            </div>

            <div class="details-grid">
              <div class="info-box">
                <div class="section-title">From (Provider)</div>
                <div style="font-weight: 900; font-size: 20px; color: #0f172a;">${quote.providerName}</div>
                <div style="font-size: 14px; color: #475569; margin-top: 8px; font-weight: 500;">
                  <div style="display: flex; align-items: center; gap: 6px;">📍 ${inquiry.location}</div>
                </div>
              </div>
              <div class="info-box">
                <div class="section-title">To (Buyer)</div>
                <div style="font-weight: 900; font-size: 20px; color: #0f172a;">${inquiry.buyerName}</div>
                <div style="font-size: 14px; color: #475569; margin-top: 8px; font-weight: 500;">
                  Date: <span style="color: #0f172a; font-weight: 700;">${new Date(quote.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                </div>
              </div>
            </div>

            <div class="info-box" style="margin-bottom: 40px; background: #fff; border-left: 4px solid #d49b35;">
              <div class="section-title">Inquiry Reference</div>
              <div style="font-weight: 800; font-size: 16px; color: #0f172a;">${inquiry.title}</div>
              <div style="font-size: 14px; color: #475569; margin-top: 6px;">${inquiry.description}</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Item Description</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div style="background: #fdf6e9; padding: 24px; border-radius: 20px; border: 1px solid #d49b35/10; margin-bottom: 40px;">
              <div class="section-title" style="color: #d49b35; border-bottom-color: #d49b35/10;">Seller Message & Terms</div>
              <div style="font-size: 15px; color: #1e293b; font-style: italic; font-weight: 500; line-height: 1.6;">"${quote.message}"</div>
              <div style="margin-top: 16px; display: flex; gap: 30px;">
                <div>
                  <span style="font-size: 11px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Condition:</span>
                  <span style="font-size: 13px; font-weight: 800; color: #d49b35; margin-left: 6px; background: #fff; padding: 2px 8px; border-radius: 6px;">${quote.condition}</span>
                </div>
                <div>
                  <span style="font-size: 11px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Validity:</span>
                  <span style="font-size: 13px; font-weight: 800; color: #d49b35; margin-left: 6px; background: #fff; padding: 2px 8px; border-radius: 6px;">${quote.expiryDuration || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div class="total-section">
              <div class="qr-code-container">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=QT-${quote.id}" class="qr-code" alt="Quote QR Code" />
                <p style="font-size: 9px; font-weight: 900; color: #94a3b8; text-align: center; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">Verify Quote</p>
              </div>
              <div style="text-align: right;">
                <span class="total-label">GRAND TOTAL (ZMW)</span>
                <div class="total-amount">K${quote.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
            </div>

            <div class="footer">
              <p style="font-weight: 700; color: #64748b;">This is a computer-generated quotation. No signature is required.</p>
              <p style="margin-top: 6px;">Generated via Marketplace Digital Platform • ${new Date().toLocaleString()}</p>
              <div style="margin-top: 20px; font-size: 10px; color: #cbd5e1;">&copy; ${new Date().getFullYear()} Marketplace Digital Quotation System. All rights reserved.</div>
            </div>

            <script>
              window.onload = () => {
                window.print();
              };
            </script>
          </body>
        </html>
      `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleReschedule = async () => {
    if (!selectedSchedule || !rescheduleDate || !rescheduleTime) return;

    await db.schedules.update(selectedSchedule.id, {
      date: rescheduleDate,
      startTime: rescheduleTime,
      status: 'RESCHEDULED',
      updatedAt: Date.now(),
    });

    setIsRescheduleModalOpen(false);
    setSelectedSchedule(null);
    setRescheduleDate('');
    setRescheduleTime('');
  };

  return (
    <div className="w-full pb-24 px-0 sm:px-0">
      {activeTab === 'collection' ? (
        <DynamicAccountRenderer
          schema={currentSchema}
          view="collection"
          data={{}}
          onAction={handleAction}
          onNavigate={handleTabClick}
          user={user}
        />
      ) : activeTab === 'home' ? (
        <DynamicAccountRenderer
          schema={currentSchema}
          view="home"
          data={{
            homeProps: {
              user,
              leads,
              myQuotes,
              products,
              schedules,
              availableBalance,
              pendingClearance,
              chartData,
              isSelectionMode,
              selectedInquiryIds,
              onTabClick: handleTabClick,
              onAction: handleAction,
              onSelectionToggle: () => {
                setIsSelectionMode(!isSelectionMode);
                setSelectedInquiryIds([]);
              },
              onSelectInquiry: (id: number, checked: boolean) =>
                checked
                  ? setSelectedInquiryIds([...selectedInquiryIds, id])
                  : setSelectedInquiryIds(selectedInquiryIds.filter((i) => i !== id)),
              onArchiveSelected: handleArchiveSelected,
              onDeleteSelected: handleDeleteSelected,
            },
          }}
          onAction={handleAction}
          onNavigate={handleTabClick}
          user={user}
        />
      ) : activeTab === 'leads' ? (
        <DynamicAccountRenderer
          schema={currentSchema}
          view="leads"
          data={{
            leadsProps: {
              user,
              leads,
              isSelectionMode,
              selectedInquiryIds,
              quotingInquiryId,
              itemPrices,
              venueSpaces,
              // Variant toggle: only owners with multiple archetypes
              // can switch. Staff with assignedArchetype see no toggle
              // (locked server-side anyway). Single-archetype owners
              // also see no toggle.
              variantOptions: sellerArchetypes,
              selectedVariant,
              onSetSelectedVariant: setSelectedVariant,
              // The persona switcher in the Profile popover is the
              // authoritative way to change archetype scope — lock the
              // in-view toggle when persona is set so we don't have two
              // competing controls. Staff with assignedArchetype lock
              // for the same reason.
              variantLocked:
                !!user?.assignedArchetype || activeContext.type === 'business',
              onArchiveSelected: handleArchiveSelected,
              onDeleteSelected: handleDeleteSelected,
              onSetSelectionMode: setIsSelectionMode,
              onSetSelectedInquiryIds: setSelectedInquiryIds,
              onSetItemPrices: setItemPrices,
              onSetQuotingInquiryId: setQuotingInquiryId,
              onQuoteSubmit: handleDynamicQuoteSubmit,
              renderSpecifications,
              revisingQuote,
              onSetRevisingQuote: setRevisingQuote,
              pendingQuoteByInquiryId,
              onReviseQuote: handleReviseQuote,
            },
          }}
          onAction={handleAction}
          onNavigate={handleTabClick}
          user={user}
        />
      ) : activeTab === 'paid-orders' ? (
        <DynamicAccountRenderer
          schema={currentSchema}
          view="paid-orders"
          data={{
            ordersProps: {
              user,
              displayQuotes,
              isBookingBased,
              onSetActiveChecklistQuote: setActiveChecklistQuote,
              onStartScan: handleStartScan,
            },
          }}
          onAction={handleAction}
          onNavigate={handleTabClick}
          user={user}
        />
      ) : activeTab === 'my-quotes' ? (
        <DynamicAccountRenderer
          schema={currentSchema}
          view="my-quotes"
          data={{
            quotesProps: {
              user,
              displayQuotes,
              quoteSort,
              expandedInquiryId,
              onSetQuoteSort: setQuoteSort,
              onToggleExpand: toggleExpand,
              onPrintQuote: handlePrintQuote,
              onArchiveQuote: handleArchiveQuote,
              onReviseQuote: handleReviseQuote,
              renderSpecifications,
            },
          }}
          onAction={handleAction}
          onNavigate={handleTabClick}
          user={user}
        />
      ) : activeTab === 'products' ? (
        <DynamicAccountRenderer
          schema={currentSchema}
          view="products"
          data={{
            productsProps: { user },
          }}
          onAction={handleAction}
          onNavigate={handleTabClick}
          user={user}
        />
      ) : activeTab === 'schedule' ? (
        <DynamicAccountRenderer
          schema={currentSchema}
          view="schedule"
          data={{
            scheduleProps: {
              user,
              schedules,
              selectedSchedule,
              isRescheduleModalOpen,
              rescheduleDate,
              rescheduleTime,
              onSetSelectedSchedule: setSelectedSchedule,
              onSetRescheduleModalOpen: setIsRescheduleModalOpen,
              onSetRescheduleDate: setRescheduleDate,
              onSetRescheduleTime: setRescheduleTime,
              onReschedule: handleReschedule,
            },
          }}
          onAction={handleAction}
          onNavigate={handleTabClick}
          user={user}
        />
      ) : activeTab === 'team' && hasPermission(user, PERMISSIONS.MANAGE_TEAM) ? (
        <DynamicAccountRenderer
          schema={currentSchema}
          view="team"
          data={{
            teamProps: { user },
          }}
          onAction={handleAction}
          onNavigate={handleTabClick}
          user={user}
        />
      ) : activeTab === 'financial' ? (
        <DynamicAccountRenderer
          schema={currentSchema}
          view="financial"
          data={{}}
          onAction={handleAction}
          onNavigate={handleTabClick}
          user={user}
        />
      ) : activeTab === 'advertise' ? (
        <DynamicAccountRenderer
          schema={currentSchema}
          view="advertise"
          data={{}}
          onAction={handleAction}
          onNavigate={handleTabClick}
          user={user}
        />
      ) : activeTab === 'loan-terms' ? (
        <DynamicAccountRenderer
          schema={currentSchema}
          view="loan-terms"
          data={{}}
          onAction={handleAction}
          onNavigate={handleTabClick}
          user={user}
        />
      ) : activeTab === 'archived-leads' ? (
        <DynamicAccountRenderer
          schema={currentSchema}
          view="archived-leads"
          data={{}}
          onAction={handleAction}
          onNavigate={handleTabClick}
          user={user}
        />
      ) : activeTab === 'my-clients' ? (
        <DynamicAccountRenderer
          schema={currentSchema}
          view="my-clients"
          data={{ myClientsProps: { user } }}
          onAction={handleAction}
          onNavigate={handleTabClick}
          user={user}
        />
      ) : activeTab === 'audit-trail' ? (
        <DynamicAccountRenderer
          schema={currentSchema}
          view="audit-trail"
          data={{}}
          onAction={handleAction}
          onNavigate={handleTabClick}
          user={user}
        />
      ) : activeTab === 'reporting' ? (
        <DynamicAccountRenderer
          schema={currentSchema}
          view="reporting"
          data={{}}
          onAction={handleAction}
          onNavigate={handleTabClick}
          user={user}
        />
      ) : ['dashboard', 'my-jobs', 'history', 'my-job-posts', 'find-jobs', 'my-applications'].includes(
          activeTab,
        ) ? (
        // Staff surfaces (Overview landing + technician job tabs) plus the
        // self-fetching job-board views. Without this branch the final else
        // hardcodes view="home", which the staff and labour schemas don't
        // define — every such login hit "View Not Found".
        <DynamicAccountRenderer
          schema={currentSchema}
          view={activeTab}
          data={{}}
          onAction={handleAction}
          onNavigate={handleTabClick}
          user={user}
        />
      ) : (
        <DynamicAccountRenderer
          schema={currentSchema}
          view="home"
          data={{
            homeProps: {
              user,
              leads,
              myQuotes,
              products,
              schedules,
              availableBalance,
              pendingClearance,
              chartData,
              isSelectionMode,
              selectedInquiryIds,
              onTabClick: handleTabClick,
              onAction: handleAction,
              onSelectionToggle: () => {
                setIsSelectionMode(!isSelectionMode);
                setSelectedInquiryIds([]);
              },
              onSelectInquiry: (id: number, checked: boolean) =>
                checked
                  ? setSelectedInquiryIds([...selectedInquiryIds, id])
                  : setSelectedInquiryIds(selectedInquiryIds.filter((i) => i !== id)),
              onArchiveSelected: handleArchiveSelected,
              onDeleteSelected: handleDeleteSelected,
            },
          }}
          onAction={handleAction}
          onNavigate={handleTabClick}
          user={user}
        />
      )}

      {/* Incoming-lead alert — uber-driver-style overlay. Fires when
          useMatchedLeads detects a new id in its poll. Fully blocks the
          UI until the provider taps Quote Now or Later. */}
      <IncomingLeadAlert
        lead={currentAlertLead}
        onAccept={acceptAlert}
        onDismiss={dismissAlert}
      />

      <AnimatePresence>
        {/* QR Scanner Modal */}
        {/* Notification System */}
        <Notification
          key="notificationModal"
          message={notification.message}
          type={notification.type}
          isVisible={notification.isVisible}
          onClose={() => setNotification((prev) => ({ ...prev, isVisible: false }))}
        />

        <ConfirmModal
          key="confirmDeleteModal"
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDeleteSelected}
          title="Delete Inquiries"
          message={`Are you sure you want to permanently delete ${selectedInquiryIds.length} selected inquiries from your view? You won't be able to see or attend to these inquiries anymore.`}
          confirmText="Delete Permanently"
          variant="danger"
        />

        {scanningQuoteId && (
          <motion.div
            key="scannerModal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-100 flex flex-col"
          >
            <div className="p-6 flex items-center justify-between text-white">
              <button
                onClick={() => setScanningQuoteId(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h3 className="text-lg font-bold">Scan Buyer QR Code</h3>
              <div className="w-10" />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="w-full max-w-sm aspect-square bg-black rounded-3xl overflow-hidden border-4 border-[#d49b35] relative shadow-2xl shadow-[#d49b35]/20">
                <div id="qr-reader" className="w-full h-full"></div>
                <div className="absolute inset-0 border-40 border-black/40 pointer-events-none"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-[#d49b35] border-dashed rounded-2xl animate-pulse"></div>
              </div>

              <div className="mt-12 text-center space-y-4 max-w-xs">
                <div className="w-12 h-12 bg-[#d49b35]/20 rounded-2xl flex items-center justify-center mx-auto">
                  <QrCode className="w-6 h-6 text-[#d49b35]" />
                </div>
                <p className="text-white/80 text-sm font-medium leading-relaxed">
                  Position the buyer's collection QR code within the frame to verify identity
                </p>
              </div>
            </div>
          </motion.div>
        )}
        {/* ── Quote Success Celebration Modal ── */}
        {quoteSuccessModal && (
          <motion.div
            key="quoteSuccessModal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-end sm:items-center justify-center p-4"
            onClick={() => setQuoteSuccessModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 60 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 60 }}
              transition={{ type: 'spring', damping: 16, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-sm rounded-[36px] overflow-hidden shadow-2xl"
            >
              {/* Golden header */}
              <div className="bg-gradient-to-br from-[#d49b35] via-[#e8b84b] to-[#c4892c] p-8 flex flex-col items-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 70% 20%, white 0%, transparent 60%)' }} />
                {/* Confetti dots */}
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full"
                    style={{ backgroundColor: ['#fff', '#fde68a', '#fff', '#fef3c7', '#fff', '#fbbf24', '#fff', '#fde68a'][i], top: `${[10, 20, 60, 80, 15, 70, 40, 55][i]}%`, left: `${[10, 85, 5, 90, 50, 20, 70, 45][i]}%` }}
                    animate={{ y: [-4, 4, -4], rotate: [0, 180, 360] }}
                    transition={{ duration: 2 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
                  />
                ))}
                <motion.img
                  src={owlTriumphant}
                  alt="Celebrating Owl"
                  className="w-36 h-36 object-contain drop-shadow-2xl relative z-10"
                  initial={{ scale: 0, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 10, stiffness: 180, delay: 0.1 }}
                />
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center mt-2 relative z-10"
                >
                  <p className="text-white/80 text-xs font-bold uppercase tracking-widest">Quotation Sent!</p>
                  <h3 className="text-2xl font-serif font-black text-white mt-1">You're on it! 🎉</h3>
                </motion.div>
              </div>

              {/* Details */}
              <div className="p-6 space-y-3">
                <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inquiry</span>
                    <span className="text-sm font-black text-slate-800 truncate max-w-[180px]">{quoteSuccessModal.title}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your Price</span>
                    <span className="text-lg font-black text-[#d49b35]">ZMW {quoteSuccessModal.price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valid For</span>
                    <span className="text-sm font-bold text-slate-600">{quoteSuccessModal.expiry}</span>
                  </div>
                </div>
                <p className="text-center text-xs text-slate-400 font-medium leading-relaxed">
                  The buyer will be notified. You'll be alerted once they respond.
                </p>
                <button
                  onClick={() => setQuoteSuccessModal(null)}
                  className="w-full py-3.5 bg-[#1e293b] text-white font-black text-sm rounded-2xl hover:bg-[#0f172a] transition-all shadow-lg active:scale-[0.98]"
                >
                  View My Quotes →
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Buyer Verification Modal */}
        {verifyingQuote && (
          <motion.div
            key="verifyingModal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-110 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white rounded-4xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-8 text-center border-b border-slate-50">
                <div className="w-20 h-20 bg-[#fdf6e9] rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-xl">
                  <ShieldCheck className="w-10 h-10 text-[#d49b35]" />
                </div>
                <h3 className="text-2xl font-serif font-black text-slate-900 mb-2">
                  Verify Buyer Identity
                </h3>
                <p className="text-slate-500 text-sm font-medium">
                  Please confirm the details match the person in front of you
                </p>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm">
                      <img
                        src={`https://picsum.photos/seed/${verifyingQuote.inquiryId}/100/100`}
                        alt="Buyer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Buyer Name
                      </p>
                      <p className="text-base font-black text-slate-900">
                        {(verifyingQuote as any).inquiry?.buyerName || 'Verified Buyer'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Quote ID
                      </p>
                      <p className="text-sm font-black text-slate-900">
                        #QT-{verifyingQuote.id?.toString().padStart(4, '0')}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Budget (ZMW)
                      </p>
                      <p className="text-sm font-black text-[#d49b35]">
                        {(verifyingQuote as any).inquiry?.attributes?.budget &&
                        (verifyingQuote as any).inquiry.attributes.budget > 0
                          ? `ZMW ${(verifyingQuote as any).inquiry.attributes.budget.toLocaleString()}`
                          : 'Not specified'}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Item Details
                    </p>
                    <p className="text-sm font-bold text-slate-700 truncate">
                      {verifyingQuote.inquiryTitle}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setVerifyingQuote(null)}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerifyBuyer}
                    className="flex-2 py-4 bg-[#d49b35] text-white font-bold rounded-2xl hover:bg-[#a37d35] transition-all shadow-lg shadow-[#d49b35]/20"
                  >
                    Confirm Identity
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Pickup Checklist Modal */}
        {activeChecklistQuote && (
          <motion.div
            key="checklistModal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-120 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white rounded-4xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-xl font-serif font-black text-slate-900">Pickup Checklist</h3>
                <button
                  onClick={() => setActiveChecklistQuote(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-8">
                <div className="space-y-12 relative">
                  {/* Vertical Line */}
                  <div className="absolute left-4.75 top-2 bottom-2 w-0.5 bg-slate-100"></div>

                  {/* Step 1 */}
                  <div className="relative flex gap-6">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center z-10 border-4 border-white shadow-sm transition-colors ${checklistSteps.photo ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}
                    >
                      {checklistSteps.photo ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <span className="text-sm font-black">1</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-black text-slate-900 text-lg mb-1">
                        Take Handover Photo
                      </h4>
                      <p className="text-slate-500 text-sm mb-4">
                        Capture the item being handed over to the buyer
                      </p>

                      {capturedPhoto ? (
                        <div className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md">
                          <img
                            src={capturedPhoto}
                            alt="Handover"
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => setCapturedPhoto(null)}
                            className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full backdrop-blur-md"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={handleTakePhoto}
                          className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-[#d49b35] hover:bg-[#fdf6e9] transition-all group"
                        >
                          <Camera className="w-6 h-6 text-slate-400 group-hover:text-[#d49b35]" />
                          <span className="text-xs font-bold text-slate-500 group-hover:text-[#d49b35]">
                            Tap to capture photo
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="relative flex gap-6">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center z-10 border-4 border-white shadow-sm transition-colors ${checklistSteps.received ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}
                    >
                      {checklistSteps.received ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <span className="text-sm font-black">2</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-black text-slate-900 text-lg mb-1">
                        Confirm Item Receipt
                      </h4>
                      <p className="text-slate-500 text-sm mb-4">
                        Buyer has inspected and received all items
                      </p>

                      <button
                        onClick={() =>
                          setChecklistSteps((prev) => ({ ...prev, received: !prev.received }))
                        }
                        className={`w-full py-4 rounded-2xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${checklistSteps.received ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                      >
                        {checklistSteps.received ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
                        )}
                        {checklistSteps.received ? 'Items Received' : 'Confirm Receipt'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-slate-50">
                  <button
                    disabled={!checklistSteps.photo || !checklistSteps.received || isUpdating}
                    onClick={() => handleConfirmCollection(activeChecklistQuote.id!)}
                    className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl transition-all flex items-center justify-center gap-3 ${!checklistSteps.photo || !checklistSteps.received ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' : 'bg-brand-dark text-white hover:bg-brand-navy-dark shadow-slate-200 active:scale-[0.98]'}`}
                  >
                    {isUpdating ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <CheckCircle className="w-6 h-6" />
                    )}
                    Confirm Handover
                  </button>
                  <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 flex items-center justify-center gap-2">
                    <Info className="w-3 h-3" />
                    Funds will be released immediately
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Handover Complete Screen */}
        {handoverCompleteQuote && (
          <motion.div
            key="handoverCompleteModal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-white z-200 flex flex-col"
          >
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 12 }}
                className="w-32 h-32 bg-emerald-500 rounded-[40px] flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/30"
              >
                <Check className="w-16 h-16 text-white" />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-4xl font-serif font-black text-slate-900 mb-4"
              >
                Handover Complete!
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-slate-500 font-medium max-w-xs mx-auto mb-12"
              >
                The items have been successfully collected and funds have been released to your
                account.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="w-full max-w-sm bg-white rounded-4xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6"
              >
                <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Amount Released
                  </span>
                  <span className="text-2xl font-black text-emerald-600">
                    ZMW {handoverCompleteQuote.price.toLocaleString()}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Order ID
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      #QT-{handoverCompleteQuote.id?.toString().padStart(4, '0')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Buyer
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      {(handoverCompleteQuote as any).inquiry?.buyerName || 'Verified Buyer'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Date
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="p-8">
              <button
                onClick={() => setHandoverCompleteQuote(null)}
                className="w-full py-5 bg-brand-dark text-white font-black text-lg rounded-2xl hover:bg-brand-navy-dark transition-all shadow-xl shadow-slate-200"
              >
                Back to Dashboard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
