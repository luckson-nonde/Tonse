import { MASTER_BUYER_ACCOUNT_SCHEMA } from '../services/buyerAccountSchema';
import { MASTER_LABOUR_ACCOUNT_SCHEMA } from '../services/labourAccountSchema';
import { MASTER_PROVIDER_ACCOUNT_SCHEMA } from '../services/providerAccountSchema';
import { MASTER_RETAIL_ACCOUNT_SCHEMA } from '../services/retailAccountSchema';
import { MASTER_SUPPLIER_ACCOUNT_SCHEMA } from '../services/supplierAccountSchema';
import { NavigationItem } from '../services/accountSchemaTypes';
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
} from 'lucide-react';
import Logo from './Logo';
import ConfirmModal from './ConfirmModal';
import DashboardCalendar, { CalendarTone } from './DashboardCalendar';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'motion/react';
import { useDashboard } from '../DashboardContext';
import { hasPermission, PERMISSIONS } from '../utils/rbac';
import { getBusinessTypes, getPrimaryBusinessType, BusinessType } from '../services/categories';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import React, { useState, useMemo, useEffect } from 'react';
import { useUserInquiries, useMatchedLeads } from '../hooks/useInquiries';
import { useUserQuotes } from '../hooks/useQuotes';
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
  const { inquiries: ownInquiries } = useUserInquiries(isBuyer ? user?.id : undefined);
  const { inquiries: matchedInquiries } = useMatchedLeads(
    isBuyer ? undefined : user?.id,
  );
  const inquiries = isBuyer ? ownInquiries : matchedInquiries;
  const { quotes } = useUserQuotes(user?.id);

  const tone = useMemo<CalendarTone>(
    () => businessTypeToCalendarTone(getPrimaryBusinessType(user as any)),
    [user]
  );

  const events = useMemo(() => {
    const evts: any[] = [];

    if (inquiries) {
      inquiries.forEach((inq) => {
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
        if (quote.status === 'PAID' || quote.status === 'COMPLETED' || quote.status === 'HANDED_OVER') {
          evts.push({
            date: new Date(quote.updatedAt),
            title: quote.inquiryTitle || 'Order',
            type: 'order',
            color: 'emerald',
          });
        } else {
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
  }, [inquiries, quotes]);

  return <DashboardCalendar events={events} tone={tone} />;
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const [notificationCounts, setNotificationCounts] = useState<{
    inquiries: number;
    quotes: number;
    activeInquiry: Partial<Inquiry> | null;
  }>({
    inquiries: 0,
    quotes: 0,
    activeInquiry: null,
  });

  // TODO: Implement badge counts from backend API
  // For Buyers: unquoted open inquiries, unread pending quotes
  // For Sellers: relevant open inquiries not yet quoted by this seller
  useEffect(() => {
    // Placeholder: Set counts to 0
    // Once backend endpoints are ready, fetch actual counts
    setNotificationCounts({ inquiries: 0, quotes: 0, activeInquiry: null });
  }, [user]);

  // Single source of truth for what kind of seller/buyer/etc this user is —
  // derived from role + subRole + categories (incl. specification variants).
  // See services/categories.ts → getBusinessType().
  // The label / page-title switches further down are single-value
  // consumers — they pick one string per tab. Composition-aware
  // surfaces (the schema-selection block above for retail vs others)
  // operate on `businessTypes` (the set) so a multi-archetype seller
  // (e.g. RETAIL + REPAIR) merges schemas instead of collapsing to one.
  const businessTypes: BusinessType[] = useMemo(() => getBusinessTypes(user), [user]);
  const businessType: BusinessType = useMemo(() => getPrimaryBusinessType(user), [user]);

  const navItems = useMemo(() => {
    if (!user) return [];
    let schema;
    // Schema selection. Order matters — labour wins before supplier wins
    // before retail wins before the generic provider fallback. Each new
    // archetype that gets its own schema slots in here.
    //
    // The labour check used to read `user.categories` (legacy display-name
    // array) directly. Since the matching refactor moved categories to
    // junction tables that field can be empty on a flatten path, so we
    // route via getBusinessType() which already prefers the cached
    // archetype over name regex.
    if (user.role === 'BUYER') schema = MASTER_BUYER_ACCOUNT_SCHEMA;
    else if (businessType === 'LABOUR') schema = MASTER_LABOUR_ACCOUNT_SCHEMA;
    else if (businessTypes.includes('WHOLESALE')) schema = MASTER_SUPPLIER_ACCOUNT_SCHEMA;
    else if (businessType === 'RETAIL') schema = MASTER_RETAIL_ACCOUNT_SCHEMA;
    // TODO: author MASTER_RENTAL_ACCOUNT_SCHEMA — RENTAL falls through to
    //       MASTER_PROVIDER_ACCOUNT_SCHEMA (the generic booking-shaped
    //       fallback). Aliasing to EVENTS would be a lossy collapse.
    // TODO: author MASTER_BOOKING_ACCOUNT_SCHEMA — same situation as RENTAL.
    else schema = MASTER_PROVIDER_ACCOUNT_SCHEMA;

    return schema.navigation.filter((item) => {
      if (item.permissions && Array.isArray(item.permissions)) {
        // Check if user has ALL required permissions
        if (!item.permissions.every((perm) => hasPermission(user, perm))) return false;
      } else if (item.permissions && typeof item.permissions === 'string') {
        if (!hasPermission(user, item.permissions)) return false;
      }
      if (item.roleFilter && !item.roleFilter.includes(user.role)) return false;
      if (item.excludeRoles && item.excludeRoles.includes(user.role)) return false;

      if (item.categoryFilter && user.categories) {
        if (typeof item.categoryFilter === 'function') {
          if (!item.categoryFilter(user.role, user.categories)) return false;
        } else {
          const userCategoriesLower = user.categories.map((c: string) => c.toLowerCase());
          const hasMatchingCategory = item.categoryFilter.some((filterCat) =>
            userCategoriesLower.some((userCat: string) => userCat.includes(filterCat.toLowerCase()))
          );
          if (!hasMatchingCategory) return false;
        }
      }

      // BusinessType-based filtering — lets a schema item declare "only show
      // for repair shops" or "only show for wholesale" without needing
      // separate role/subRole conditionals.
      if (item.businessTypes && item.businessTypes.length > 0) {
        if (!item.businessTypes.includes(businessType)) return false;
      }

      return true;
    });
  }, [user, businessType]);

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
      switch (businessType) {
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
      switch (businessType) {
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
      switch (businessType) {
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
    // businessType the same way the sidebar / home tiles already do.
    const isBookingBased =
      businessType === 'EVENTS' || businessType === 'ENTERTAINMENT';
    switch (activeTab) {
      case 'home':
      case 'dashboard':
        return 'MARKETPLACE OVERVIEW';
      case 'quotes':
        return 'RECEIVED QUOTATIONS';
      case 'inquiries':
        return 'MY INQUIRIES';
      case 'create-inquiry':
        return 'EVENT BOOKING REQUEST';
      case 'inquiry-items':
        return 'ITEM LIST';
      case 'category-selection':
        return 'SELECT CATEGORY';
      case 'shops':
        return 'SHOPS & RETAILERS';
      case 'suppliers':
        return 'VERIFIED SUPPLIERS';
      case 'paid-orders':
        if (businessType === 'EVENTS') return 'PAID RENTALS';
        return isBookingBased ? 'PAID BOOKINGS' : 'PAID ORDERS (ESCROW)';
      case 'collection':
        return 'PARCEL COLLECTION';
      case 'products':
        if (businessTypes.includes('WHOLESALE')) return 'SUPPLY INVENTORY';
        return businessType === 'EVENTS' ? 'INVENTORY' : 'MY PRODUCTS';
      case 'venue-spaces':
        return 'VENUE SPACES';
      case 'archived':
        return businessTypes.includes('WHOLESALE') ? 'ARCHIVED REQUESTS' : 'ARCHIVED QUOTES';
      case 'profile':
        return businessTypes.includes('WHOLESALE') ? 'SUPPLIER PROFILE' : 'SHOP PROFILE';
      case 'leads':
        if (businessTypes.includes('WHOLESALE')) return 'PURCHASE REQUESTS';
        return 'BOOKING REQUESTS';
      case 'my-quotes':
        return businessTypes.includes('WHOLESALE') ? 'ACTIVE QUOTATIONS' : 'MY QUOTES';
      case 'schedule':
        return 'MY SCHEDULE';
      case 'audit-trail':
        return businessTypes.includes('WHOLESALE') ? 'SUPPLY AUDIT' : 'AUDIT TRAIL';
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
              let badgeCount;
              if (item.id === 'inquiries') badgeCount = notificationCounts?.inquiries;
              else if (item.id === 'my-quotes' || item.id === 'quotes')
                badgeCount = notificationCounts?.quotes;

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
                    <span className="absolute top-2.75 right-2.75 w-1.5 h-1.5 bg-[#C9973A] rounded-full"></span>
                  </button>
                </div>
              </div>
            </div>
          </header>
        )}

        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 px-4 sm:px-5 pt-4 sm:pt-6 pb-24 md:pb-8 relative overflow-x-hidden overflow-y-auto">
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

              {hasPermission(user, PERMISSIONS.VIEW_ANALYTICS) && (
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

              {user?.parentProviderId && !hasPermission(user, PERMISSIONS.MANAGE_COLLECTIONS) && (
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
                    <button className="text-[11px] font-bold text-[#C9973A] uppercase tracking-wider hover:underline">
                      Mark all read
                    </button>
                  </div>

                  {/* Notification Items */}
                  <div className="p-4 rounded-2xl bg-brand-white border border-[#C9973A]/10 hover:border-[#C9973A]/30 transition-all cursor-pointer group">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#C9973A]/10 flex items-center justify-center shrink-0 text-xl">
                        💬
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-sm font-bold text-brand-dark">New Quote Received</p>
                          <span className="text-[10px] font-bold text-[#C9973A]">2m</span>
                        </div>
                        <p className="text-xs text-[#64748b] leading-relaxed">
                          SolarTech Zambia sent a quote for your "50 Solar Panels" inquiry.
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <button className="text-[10px] font-bold text-[#C9973A] uppercase tracking-wider px-3 py-1.5 bg-white border border-[#C9973A]/20 rounded-lg hover:bg-[#C9973A] hover:text-white transition-all">
                            View Quote
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-100 hover:border-[#C9973A]/20 transition-all cursor-pointer group">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 text-xl">
                        ⏳
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-sm font-bold text-brand-dark">Inquiry Expiring Soon</p>
                          <span className="text-[10px] font-bold text-slate-400">1h</span>
                        </div>
                        <p className="text-xs text-[#64748b] leading-relaxed">
                          Your inquiry for "Office Laptops" expires in 24 hours.
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <button className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg hover:bg-slate-100 transition-all">
                            Extend
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-100 hover:border-[#C9973A]/20 transition-all cursor-pointer group">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 text-xl">
                        📦
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-sm font-bold text-brand-dark">Order Dispatched</p>
                          <span className="text-[10px] font-bold text-slate-400">3h</span>
                        </div>
                        <p className="text-xs text-[#64748b] leading-relaxed">
                          Your order #ORD-7721 has been dispatched by the supplier.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-brand-white">
                  <button className="w-full py-4 bg-brand-dark text-white rounded-2xl font-bold text-sm hover:bg-brand-navy-dark transition-all shadow-lg shadow-slate-200 uppercase tracking-widest">
                    View All Activity
                  </button>
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
