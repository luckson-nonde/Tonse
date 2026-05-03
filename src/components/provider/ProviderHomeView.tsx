import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  MessageSquare,
  PackageOpen,
  MapPin,
  Clock,
  Calendar,
  ChevronRight,
  ArrowRight,
  Zap,
  Check,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { hasPermission, PERMISSIONS } from '../../utils/rbac';
import { uniqueKey } from '../../utils/keyUtils';
import { generateVirtualAccount } from '../../utils/financeUtils';
import { getBusinessType, BusinessType } from '../../services/categories';

interface ProviderHomeViewProps {
  user: any;
  leads: any[];
  myQuotes: any[];
  products: any[];
  schedules: any[];
  availableBalance: number;
  pendingClearance: number;
  chartData: any[];
  isSelectionMode: boolean;
  selectedInquiryIds: number[];
  onTabClick: (tab: string) => void;
  onAction: (actionId: string, payload?: any) => void;
  onSelectionToggle: () => void;
  onSelectInquiry: (id: number, checked: boolean) => void;
  onArchiveSelected: () => void;
  onDeleteSelected: () => void;
}

export default function ProviderHomeView({
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
  onTabClick,
  onAction,
  onSelectionToggle,
  onSelectInquiry,
  onArchiveSelected,
  onDeleteSelected,
}: ProviderHomeViewProps) {
  const navigate = useNavigate();
  // isBookingBased reads businessType so a SELLER who picked Event Catering /
  // Event Venues / DJs flows into the booking-style home. Phase 2 dropped
  // role='EVENTS'/'ENTERTAINMENT' from the enum — those are category strings.
  const isBookingBased =
    getBusinessType(user as any) === 'EVENTS' ||
    getBusinessType(user as any) === 'ENTERTAINMENT';

  // The four-signal pipeline lands here: every dashboard surface that wants
  // to differentiate a repair shop from a retail shop from a wholesaler reads
  // this single value. See services/categories.ts → getBusinessType().
  const businessType: BusinessType = React.useMemo(
    () => getBusinessType(user as any),
    [user]
  );

  const displayQuotes = React.useMemo(() => {
    return myQuotes.filter((q) => !q.isArchived);
  }, [myQuotes]);

  const salesStats = React.useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const todaysSales = displayQuotes
      .filter(q => (q.status === 'PAID' || q.status === 'COMPLETED') && new Date(q.updatedAt || q.createdAt).getTime() >= startOfToday)
      .reduce((sum, q) => sum + Number(q.price || 0), 0);

    const activeQuotes = displayQuotes.filter(q => q.status === 'PENDING' || q.status === 'ACCEPTED').length;
    const pendingQuotes = displayQuotes.filter(q => q.status === 'PENDING').length;

    return { todaysSales, activeQuotes, pendingQuotes };
  }, [displayQuotes]);

  // Derived metrics surfaced as Tile 3 / Tile 4 for non-retail business types.
  // Computing them here (not inline in the JSX) lets the tiles config stay
  // declarative and lets these reuse the existing displayQuotes filter.
  const turnaroundDaysAvg = React.useMemo(() => {
    const completed = displayQuotes.filter(
      (q) => q.status === 'COMPLETED' || q.status === 'HANDED_OVER'
    );
    if (completed.length === 0) return null;
    const totalDays = completed.reduce((sum, q) => {
      const start = new Date(q.createdAt).getTime();
      const end = new Date(q.updatedAt || q.createdAt).getTime();
      return sum + Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
    }, 0);
    return Math.round(totalDays / completed.length);
  }, [displayQuotes]);

  const hoursThisMonth = React.useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return displayQuotes
      .filter((q) => new Date(q.updatedAt || q.createdAt).getTime() >= startOfMonth)
      .reduce((sum, q) => sum + Number((q as any).hoursBooked || 0), 0);
  }, [displayQuotes]);

  const totalQuotedValue = React.useMemo(
    () => displayQuotes.reduce((sum, q) => sum + Number(q.price || 0), 0),
    [displayQuotes]
  );

  const pendingPickupCount = React.useMemo(
    () =>
      displayQuotes.filter(
        (q) => q.status === 'PAID' || q.status === 'PENDING_COLLECTION' || q.status === 'AWAITING_PICKUP'
      ).length,
    [displayQuotes]
  );

  const activeJobsCount = React.useMemo(
    () => displayQuotes.filter((q) => q.status === 'ACCEPTED' || q.status === 'PAID').length,
    [displayQuotes]
  );

  // Stat-tile config — one row per BusinessType. Each tile declares its
  // label, the value to display, an optional trailing caption, and the tab
  // it should jump to on click. Lets the JSX stay a flat .map() while the
  // labels/metrics swap per business identity.
  type Tile = {
    label: string;
    value: string;
    caption: string;
    tab: string;
    /** lucide icon component */
    icon: typeof MessageSquare;
    /** color preset for the icon block */
    palette: 'gold' | 'emerald' | 'gold-soft';
  };

  const fmtZMW = (n: number) =>
    `ZMW ${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const statTiles: Tile[] = React.useMemo(() => {
    const t1Common = {
      value: leads.length.toString(),
      tab: 'leads',
      icon: MessageSquare,
      palette: 'gold' as const,
    };
    const t2Common = {
      value: displayQuotes.length.toString(),
      caption: 'Track your submissions',
      tab: 'my-quotes',
      icon: Check,
      palette: 'emerald' as const,
    };

    switch (businessType) {
      case 'REPAIR_SERVICE':
        return [
          { ...t1Common, label: 'Repair Requests', caption: 'New repair leads' },
          { ...t2Common, label: 'Quotes Sent' },
          {
            label: 'Active Repairs',
            value: activeJobsCount.toString(),
            caption: 'In progress now',
            tab: 'paid-orders',
            icon: TrendingUp,
            palette: 'gold-soft',
          },
          {
            label: 'Avg Turnaround',
            value: turnaroundDaysAvg === null ? '—' : `${turnaroundDaysAvg}d`,
            caption: 'Across completed jobs',
            tab: 'paid-orders',
            icon: Clock,
            palette: 'gold',
          },
        ];
      case 'WHOLESALE':
        return [
          { ...t1Common, label: 'Purchase Requests', caption: 'New supply leads' },
          { ...t2Common, label: 'Bulk Quotes' },
          {
            label: 'Total Supply Value',
            value: fmtZMW(totalQuotedValue),
            caption: 'Across all quotes',
            tab: 'my-quotes',
            icon: TrendingUp,
            palette: 'gold-soft',
          },
          {
            label: 'Awaiting Pickup',
            value: pendingPickupCount.toString(),
            caption: 'Buyers ready to collect',
            tab: 'paid-orders',
            icon: Clock,
            palette: 'gold',
          },
        ];
      case 'PRO_SERVICES':
        return [
          { ...t1Common, label: 'Service Requests', caption: 'New client briefs' },
          { ...t2Common, label: 'Quotes Sent' },
          {
            label: 'Active Engagements',
            value: activeJobsCount.toString(),
            caption: 'In delivery now',
            tab: 'paid-orders',
            icon: TrendingUp,
            palette: 'gold-soft',
          },
          {
            label: 'Hours This Month',
            value: hoursThisMonth > 0 ? `${hoursThisMonth}h` : '—',
            caption: 'Logged from quotes',
            tab: 'my-quotes',
            icon: Clock,
            palette: 'gold',
          },
        ];
      case 'PRODUCTS_AND_REPAIR':
        return [
          { ...t1Common, label: 'Mixed Requests', caption: 'Sales + repair leads' },
          { ...t2Common, label: 'Quotes Sent' },
          {
            label: 'Pipeline Value',
            value: fmtZMW(totalQuotedValue),
            caption: 'Across all quotes',
            tab: 'my-quotes',
            icon: TrendingUp,
            palette: 'gold-soft',
          },
          {
            label: 'Active Jobs',
            value: activeJobsCount.toString(),
            caption: 'Sales + repairs in flight',
            tab: 'paid-orders',
            icon: Clock,
            palette: 'gold',
          },
        ];
      case 'RETAIL_PRODUCTS':
        return [
          { ...t1Common, label: 'Buyer Inquiries', caption: 'New buyer requests' },
          { ...t2Common, label: 'Quotes Sent' },
          {
            label: 'Potential Revenue',
            value: fmtZMW(totalQuotedValue),
            caption: 'Across open quotes',
            tab: 'my-quotes',
            icon: TrendingUp,
            palette: 'gold-soft',
          },
          {
            label: 'Pending Fulfilment',
            value: pendingPickupCount.toString(),
            caption: 'Orders awaiting collection',
            tab: 'paid-orders',
            icon: Clock,
            palette: 'gold',
          },
        ];
      default:
        return [
          { ...t1Common, label: 'Booking Requests', caption: 'New requests available' },
          { ...t2Common, label: 'Quotes Sent' },
          {
            label: 'Potential Revenue',
            value: fmtZMW(totalQuotedValue),
            caption: 'Potential revenue',
            tab: 'my-quotes',
            icon: TrendingUp,
            palette: 'gold-soft',
          },
          {
            label: isBookingBased ? 'Pending Completion' : 'Pending Pickup',
            value: pendingPickupCount.toString(),
            caption: isBookingBased ? 'Awaiting event date' : 'Awaiting buyer pickup',
            tab: 'paid-orders',
            icon: Clock,
            palette: 'gold',
          },
        ];
    }
  }, [
    businessType,
    leads.length,
    displayQuotes.length,
    activeJobsCount,
    turnaroundDaysAvg,
    totalQuotedValue,
    pendingPickupCount,
    hoursThisMonth,
    isBookingBased,
  ]);

  // Section header for the leads block + Sales Summary header — same
  // vocabulary the sidebar is using via getLabel() in DashboardLayout.
  const inboxHeading = React.useMemo(() => {
    switch (businessType) {
      case 'REPAIR_SERVICE':
        return 'Repair Requests';
      case 'PRODUCTS_AND_REPAIR':
        return 'Sales & Repair Requests';
      case 'WHOLESALE':
        return 'Purchase Requests';
      case 'PRO_SERVICES':
        return 'Service Requests';
      case 'EVENTS':
        return 'Event Bookings';
      case 'ENTERTAINMENT':
        return 'Performance Bookings';
      case 'RETAIL_PRODUCTS':
        return 'Buyer Inquiries';
      default:
        return 'Buyer Inquiries';
    }
  }, [businessType]);

  const todaysSalesLabel = React.useMemo(() => {
    switch (businessType) {
      case 'REPAIR_SERVICE':
        return "Today's Repairs Completed";
      case 'PRO_SERVICES':
        return "Today's Service Hours";
      case 'WHOLESALE':
        return "Today's Bulk Sales";
      default:
        return "Today's Sales";
    }
  }, [businessType]);

  const renderEventsHome = () => (
    <div className="space-y-6">
      {/* Virtual Account Card - Only for Admins/Managers with Wallet Permission */}
      {hasPermission(user, PERMISSIONS.VIEW_WALLET) && (
        <div className="bg-[#1e293b] rounded-2xl p-6 sm:p-8 shadow-sm text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#C9973A]/20 to-transparent rounded-bl-full -z-0 opacity-50"></div>
          <div className="relative z-10 min-w-0">
            <p className="text-[#C9973A] text-[11px] font-bold font-sans uppercase tracking-wider mb-2 truncate">
              AVAILABLE BALANCE
            </p>
            <h2
              className="text-[42px] font-bold mb-2 truncate font-serif text-white leading-none"
              title={`ZMW ${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            >
              ZMW {availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h2>
            <p className="text-[#94a3b8] text-[13px] font-sans mb-6 truncate">
              {pendingClearance > 0
                ? `ZMW ${pendingClearance.toLocaleString(undefined, { minimumFractionDigits: 2 })} pending clearance`
                : 'No pending clearance'}
            </p>
            <button
              onClick={() => navigate('/provider/financial')}
              className="border border-[#C9973A] text-[#C9973A] bg-transparent font-medium font-sans py-2.5 px-6 rounded-[8px] text-[13px] hover:bg-[#C9973A]/10 transition-colors"
            >
              My Account {user?.phone}
            </button>
          </div>
        </div>
      )}

      {/* Sales Analytics Chart - Only for Admins/Managers */}
      {hasPermission(user, PERMISSIONS.VIEW_ANALYTICS) && (
        <div className="bg-white rounded-2xl sm:rounded-[32px] p-4 sm:p-8 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-serif font-black text-slate-900">Sales Analytics</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                Revenue performance over the last 7 days
              </p>
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} width={800} height={250}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d49b35" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#d49b35" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  tickFormatter={(value) => `K${value}`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '16px',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: '700',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#d49b35"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSales)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => onTabClick('schedule')}
          className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-[#d49b35]/50 transition-all duration-300"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#fdf6e9] rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-[#d49b35]" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">
            UPCOMING EVENTS
          </p>
          <div className="flex items-end gap-3 mb-1 min-w-0">
            <h2 className="text-[clamp(1.25rem,5vw,2.25rem)] font-black text-slate-900 leading-none truncate">
              {schedules.length}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">Confirmed bookings</p>
        </div>

        <div
          onClick={() => onTabClick('leads')}
          className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-emerald-500/50 transition-all duration-300"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">
            NEW REQUESTS
          </p>
          <div className="flex items-end gap-3 mb-1 min-w-0">
            <h2 className="text-[clamp(1.25rem,5vw,2.25rem)] font-black text-emerald-600 leading-none truncate">
              {leads.length}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">Awaiting your quote</p>
        </div>

        <div
          onClick={() => onTabClick('my-quotes')}
          className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-[#d49b35]/50 transition-all duration-300"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#fffaf5] rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 border border-[#d49b35]/10">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-[#d49b35]" />
          </div>
            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">
            POTENTIAL REVENUE
          </p>
          <div className="flex items-end gap-3 mb-1 min-w-0">
            <h2
              className="text-[clamp(1.25rem,5vw,2.25rem)] font-black text-[#d49b35] leading-none truncate"
              title={`ZMW ${displayQuotes.reduce((sum, q) => sum + Number(q.price || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            >
              ZMW {displayQuotes.reduce((sum, q) => sum + Number(q.price || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">Potential revenue</p>
        </div>

        <div
          onClick={() => onTabClick('products')}
          className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-[#d49b35]/50 transition-all duration-300"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#fdf6e9] rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
            <PackageOpen className="w-5 h-5 sm:w-6 sm:h-6 text-[#d49b35]" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">
            INVENTORY ITEMS
          </p>
          <div className="flex items-end gap-3 mb-1 min-w-0">
            <h2
              className="text-[clamp(1.25rem,5vw,2.25rem)] font-black text-[#d49b35] leading-none truncate"
              title={products.length.toString()}
            >
              {products.length}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">Active equipment</p>
        </div>
      </div>

      {/* Recent Inventory Items - Only for Equipment Rental */}
      {user?.categories?.some((c: string) => c.toLowerCase().includes('equipment rental')) && (
        <div className="bg-white rounded-2xl sm:rounded-[32px] p-4 sm:p-8 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-serif font-black text-slate-900">Recent Equipment</h3>
            <button
              onClick={() => onTabClick('products')}
              className="text-[#d49b35] text-xs font-bold hover:underline"
            >
              Manage All
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {products.length === 0 ? (
              <div className="col-span-full py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-400 text-xs font-medium italic">No items in inventory.</p>
              </div>
            ) : (
              products.slice(0, 3).map((product, idx) => (
                <div
                  key={uniqueKey('home-product', product.id, idx)}
                  className="group cursor-pointer"
                  onClick={() => onTabClick('products')}
                >
                  <div className="aspect-square rounded-2xl overflow-hidden bg-slate-100 mb-2 border border-slate-100">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 truncate">{product.name}</h4>
                  <p className="text-[10px] font-black text-[#d49b35]">
                    K{product.price.toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Booking Requests Section */}
      <div>
        <div className="flex justify-between items-center mb-3 sm:mb-4 px-1">
          <h3 className="text-lg font-serif font-black text-slate-900">Booking Requests</h3>
          <div className="flex items-center gap-2">
            {isSelectionMode && selectedInquiryIds.length > 0 && (
              <>
                <button
                  onClick={onArchiveSelected}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-[#d49b35] rounded-md hover:bg-[#b8862d] transition-colors"
                >
                  Archive {selectedInquiryIds.length}
                </button>
                <button
                  onClick={onDeleteSelected}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-rose-500 rounded-md hover:bg-rose-600 transition-colors"
                >
                  Delete {selectedInquiryIds.length}
                </button>
              </>
            )}
            <button onClick={onSelectionToggle} className="text-xs font-bold text-[#d49b35]">
              {isSelectionMode ? 'Cancel' : 'Select'}
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {leads.length === 0 ? (
            <div className="bg-white rounded-2xl sm:rounded-[24px] p-6 sm:p-8 text-center border border-slate-100">
              <p className="text-slate-400 text-xs font-medium italic">
                No booking requests found.
              </p>
            </div>
          ) : (
            leads.slice(0, 3).map((lead, idx) => {
              return (
                <div
                  key={uniqueKey('home-events-lead', lead.id, idx)}
                  className={`bg-white rounded-2xl sm:rounded-[24px] p-4 sm:p-5 shadow-sm border ${selectedInquiryIds.includes(lead.id!) ? 'border-[#d49b35] bg-[#fffaf5]' : 'border-slate-100'} flex items-start gap-4 transition-colors`}
                >
                  {isSelectionMode && (
                    <input
                      type="checkbox"
                      checked={selectedInquiryIds.includes(lead.id!)}
                      onChange={(e) => onSelectInquiry(lead.id!, e.target.checked)}
                      className="w-5 h-5 accent-[#d49b35] mt-1"
                    />
                  )}
                  <div
                    className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0 w-full cursor-pointer"
                    onClick={() => !isSelectionMode && onTabClick('leads')}
                  >
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#fdf6e9] text-[#d49b35] flex items-center justify-center flex-shrink-0 font-black overflow-hidden border border-[#d49b35]/10`}
                    >
                      <img
                        src={`https://picsum.photos/seed/${lead.buyerId}/100/100`}
                        alt={lead.buyerName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-slate-900 text-sm truncate">
                          {lead.buyerName}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-bold">
                          {Math.floor((Date.now() - lead.createdAt) / 60000) < 60
                            ? `${Math.floor((Date.now() - lead.createdAt) / 60000)}m ago`
                            : `${Math.floor((Date.now() - lead.createdAt) / 3600000)}h ago`}
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 text-sm truncate">{lead.title}</p>
                      <p className="text-xs text-slate-500">{lead.category}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  const renderHome = () => {
    // Use the derived businessType, not raw role — a new SELLER who picked
    // events-tree categories should also hit the events home, while a SELLER
    // who picked Mobile Phones (Repair) absolutely should not.
    if (businessType === 'EVENTS') return renderEventsHome();

    return (
      <div className="space-y-6">
        {/* Virtual Account Card - Only for Admins/Managers with Analytics Permission */}
        {hasPermission(user, PERMISSIONS.VIEW_ANALYTICS) && (
          <div className="bg-[#1e293b] rounded-2xl p-6 sm:p-8 shadow-sm text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#C9973A]/20 to-transparent rounded-bl-full -z-0 opacity-50"></div>
            <div className="relative z-10 min-w-0">
              <p className="text-[#C9973A] text-[11px] font-bold font-sans uppercase tracking-wider mb-2 truncate">
                AVAILABLE BALANCE
              </p>
              <h2
                className="text-[42px] font-bold mb-2 truncate font-serif text-white leading-none"
                title={`ZMW ${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              >
                ZMW {availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h2>
              <p className="text-[#94a3b8] text-[13px] font-sans mb-6 truncate">
                {pendingClearance > 0
                  ? `ZMW ${pendingClearance.toLocaleString(undefined, { minimumFractionDigits: 2 })} pending clearance`
                  : 'No pending clearance'}
              </p>
              <button
                onClick={() => navigate('/provider/financial')}
                className="border border-[#C9973A] text-[#C9973A] bg-transparent font-medium font-sans py-2.5 px-6 rounded-[8px] text-[13px] hover:bg-[#C9973A]/10 transition-colors"
              >
                My Account {user?.phone}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statTiles.map((tile, idx) => {
            const TileIcon = tile.icon;
            const palette = {
              gold: {
                hover: 'hover:border-[#d49b35]/50',
                blockBg: 'bg-[#fdf6e9]',
                blockExtra: '',
                iconClass: 'text-[#d49b35]',
                valueClass: 'text-slate-900',
              },
              emerald: {
                hover: 'hover:border-emerald-500/50',
                blockBg: 'bg-emerald-50',
                blockExtra: '',
                iconClass: 'text-emerald-600',
                valueClass: 'text-emerald-600',
              },
              'gold-soft': {
                hover: 'hover:border-[#d49b35]/50',
                blockBg: 'bg-[#fffaf5]',
                blockExtra: 'border border-[#d49b35]/10',
                iconClass: 'text-[#d49b35]',
                valueClass: 'text-[#d49b35]',
              },
            }[tile.palette];

            return (
              <div
                key={`tile-${idx}-${tile.label}`}
                onClick={() => onTabClick(tile.tab)}
                className={`bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md ${palette.hover} transition-all duration-300`}
              >
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 ${palette.blockBg} ${palette.blockExtra} rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4`}
                >
                  <TileIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${palette.iconClass}`} />
                </div>
                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">
                  {tile.label}
                </p>
                <div className="flex items-end gap-3 mb-1 min-w-0">
                  <h2
                    className={`text-[clamp(1.25rem,5vw,2.25rem)] font-black ${palette.valueClass} leading-none truncate`}
                    title={tile.value}
                  >
                    {tile.value}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">{tile.caption}</p>
              </div>
            );
          })}
        </div>

        {/* Sales Summary Card - Only for Sellers with Analytics Permission */}
        {!isBookingBased && hasPermission(user, PERMISSIONS.VIEW_ANALYTICS) && (
          <div className="bg-white rounded-2xl p-5 sm:p-7 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6 sm:mb-8">
              <h3 className="text-xl font-serif font-black text-slate-900">Sales Summary</h3>
              <div className="bg-[#fdf6e9] text-[#d49b35] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                Weekly
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="bg-slate-50/50 rounded-2xl sm:rounded-3xl p-3 sm:p-6 border border-slate-100 min-w-0">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1 truncate">
                  {todaysSalesLabel}
                </p>
                <h4
                  className="text-[clamp(1rem,4vw,1.5rem)] font-black text-slate-900 mb-1 truncate"
                  title={`ZMW ${salesStats.todaysSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                >
                  ZMW {salesStats.todaysSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h4>
                <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-bold">
                  <TrendingUp className="w-3 h-3" />
                  Live Data
                </div>
              </div>
              <div className="bg-slate-50/50 rounded-2xl sm:rounded-3xl p-3 sm:p-6 border border-slate-100 min-w-0">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1 truncate">
                  Active Quotes
                </p>
                <h4
                  className="text-[clamp(1rem,4vw,1.5rem)] font-black text-slate-900 mb-1 truncate"
                  title={salesStats.activeQuotes.toString()}
                >
                  {salesStats.activeQuotes}
                </h4>
                <div className="flex items-center gap-1 text-[#d49b35] text-[10px] font-bold">
                  <Zap className="w-3 h-3" />{salesStats.pendingQuotes} pending
                </div>
              </div>
            </div>

            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} width={800} height={200}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d49b35" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#d49b35" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '16px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    }}
                    labelStyle={{ fontWeight: 800, color: '#1e293b' }}
                    formatter={(value: any) =>
                      [`ZMW ${(value || 0).toLocaleString()}`, 'Sales'] as any
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#d49b35"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorSales)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Inbox Section — heading mirrors the sidebar label for this user's
            business type, so a repair shop sees "Repair Requests" here too. */}
        <div>
          <div className="flex justify-between items-center mb-3 sm:mb-4 px-1">
            <h3 className="text-lg font-serif font-black text-slate-900">
              {inboxHeading}
            </h3>
            <div className="flex items-center gap-2">
              {isSelectionMode && selectedInquiryIds.length > 0 && (
                <>
                  <button
                    onClick={onArchiveSelected}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-[#d49b35] rounded-md hover:bg-[#b8862d] transition-colors"
                  >
                    Archive {selectedInquiryIds.length}
                  </button>
                  <button
                    onClick={onDeleteSelected}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-rose-500 rounded-md hover:bg-rose-600 transition-colors"
                  >
                    Delete {selectedInquiryIds.length}
                  </button>
                </>
              )}
              <button onClick={onSelectionToggle} className="text-xs font-bold text-[#d49b35]">
                {isSelectionMode ? 'Cancel' : 'Select'}
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {leads.length === 0 ? (
              <div className="bg-white rounded-2xl sm:rounded-[24px] p-6 sm:p-8 text-center border border-slate-100">
                <p className="text-slate-400 text-xs font-medium italic">
                  No booking requests found.
                </p>
              </div>
            ) : (
              leads.slice(0, 3).map((lead, idx) => {
                return (
                  <div
                    key={uniqueKey('home-lead', lead.id, idx)}
                    className={`bg-white rounded-2xl sm:rounded-[24px] p-4 sm:p-5 shadow-sm border ${selectedInquiryIds.includes(lead.id!) ? 'border-[#d49b35] bg-[#fffaf5]' : 'border-slate-100'} flex items-start gap-4 transition-colors`}
                  >
                    {isSelectionMode && (
                      <input
                        type="checkbox"
                        checked={selectedInquiryIds.includes(lead.id!)}
                        onChange={(e) => onSelectInquiry(lead.id!, e.target.checked)}
                        className="w-5 h-5 accent-[#d49b35] mt-1"
                      />
                    )}
                    <div
                      className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0 w-full cursor-pointer"
                      onClick={() => !isSelectionMode && onTabClick('leads')}
                    >
                      <div
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#fdf6e9] text-[#d49b35] flex items-center justify-center flex-shrink-0 font-black overflow-hidden border border-[#d49b35]/10`}
                      >
                        <img
                          src={`https://picsum.photos/seed/${lead.buyerId}/100/100`}
                          alt={lead.buyerName}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-slate-900 text-sm truncate">
                            {lead.buyerName}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-bold">
                            {Math.floor((Date.now() - lead.createdAt) / 60000) < 60
                              ? `${Math.floor((Date.now() - lead.createdAt) / 60000)}m ago`
                              : `${Math.floor((Date.now() - lead.createdAt) / 3600000)}h ago`}
                          </span>
                        </div>
                        <p className="font-bold text-slate-900 text-sm truncate">{lead.title}</p>
                        <p className="text-xs text-slate-500">{lead.category}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  return renderHome();
}
