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
  const isBookingBased = user?.role === 'ENTERTAINMENT' || user?.role === 'EVENTS';
  const displayQuotes = React.useMemo(() => {
    return myQuotes.filter((q) => !q.isArchived);
  }, [myQuotes]);

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
              My Account{' '}
              {user?.virtualAccountNumber
                ? `${user.virtualAccountNumber.substring(0, 4)}********${user.virtualAccountNumber.substring(12)}`
                : `**** **** **** ${user?.id?.toString().padStart(4, '0') || '0000'}`}
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
              <AreaChart data={chartData}>
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
            TOTAL QUOTED VALUE
          </p>
          <div className="flex items-end gap-3 mb-1 min-w-0">
            <h2
              className="text-[clamp(1.25rem,5vw,2.25rem)] font-black text-[#d49b35] leading-none truncate"
              title={`ZMW ${displayQuotes.reduce((sum, q) => sum + q.price, 0).toLocaleString()}`}
            >
              ZMW {displayQuotes.reduce((sum, q) => sum + q.price, 0).toLocaleString()}
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

      {/* Incoming Booking Requests Section */}
      <div>
        <div className="flex justify-between items-center mb-3 sm:mb-4 px-1">
          <h3 className="text-lg font-serif font-black text-slate-900">
            {user?.role === 'EVENTS' ? 'Incoming Rental Requests' : 'Incoming Booking Requests'}
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
    if (user?.role === 'EVENTS') return renderEventsHome();

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
                My Account{' '}
                {user?.virtualAccountNumber
                  ? `${user.virtualAccountNumber.substring(0, 4)}********${user.virtualAccountNumber.substring(12)}`
                  : `**** **** **** ${user?.id?.toString().padStart(4, '0') || '0000'}`}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div
            onClick={() => onTabClick('leads')}
            className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-[#d49b35]/50 transition-all duration-300"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#fdf6e9] rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-[#d49b35]" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">
              {isBookingBased ? 'INCOMING BOOKING REQUESTS' : 'INQUIRIES RECEIVED'}
            </p>
            <div className="flex items-end gap-3 mb-1 min-w-0">
              <h2
                className="text-[clamp(1.25rem,5vw,2.25rem)] font-black text-slate-900 leading-none truncate"
                title={leads.length.toString()}
              >
                {leads.length}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">New requests available</p>
          </div>

          <div
            onClick={() => onTabClick('my-quotes')}
            className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-emerald-500/50 transition-all duration-300"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
              <Check className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">
              QUOTES SENT
            </p>
            <div className="flex items-end gap-3 mb-1 min-w-0">
              <h2
                className="text-[clamp(1.25rem,5vw,2.25rem)] font-black text-emerald-600 leading-none truncate"
                title={displayQuotes.length.toString()}
              >
                {displayQuotes.length}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Track your submissions</p>
          </div>

          <div
            onClick={() => onTabClick('my-quotes')}
            className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-[#d49b35]/50 transition-all duration-300"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#fffaf5] rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 border border-[#d49b35]/10">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-[#d49b35]" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">
              TOTAL QUOTED VALUE
            </p>
            <div className="flex items-end gap-3 mb-1 min-w-0">
              <h2
                className="text-[clamp(1.25rem,5vw,2.25rem)] font-black text-[#d49b35] leading-none truncate"
                title={`ZMW ${displayQuotes.reduce((sum, q) => sum + q.price, 0).toLocaleString()}`}
              >
                ZMW {displayQuotes.reduce((sum, q) => sum + q.price, 0).toLocaleString()}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Potential revenue</p>
          </div>

          <div
            onClick={() => onTabClick('paid-orders')}
            className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-[#d49b35]/50 transition-all duration-300"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#fdf6e9] rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-[#d49b35]" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">
              {isBookingBased ? 'PENDING COMPLETION' : 'PENDING COLLECTION'}
            </p>
            <div className="flex items-end gap-3 mb-1 min-w-0">
              <h2
                className="text-[clamp(1.25rem,5vw,2.25rem)] font-black text-[#d49b35] leading-none truncate"
                title={displayQuotes
                  .filter((q) => q.status === 'PAID' || q.status === 'PENDING')
                  .length.toString()}
              >
                {displayQuotes.filter((q) => q.status === 'PAID' || q.status === 'PENDING').length}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Awaiting event date</p>
          </div>
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
                  Today's Sales
                </p>
                <h4
                  className="text-[clamp(1rem,4vw,1.5rem)] font-black text-slate-900 mb-1 truncate"
                  title="$1,240.00"
                >
                  $1,240.00
                </h4>
                <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-bold">
                  <TrendingUp className="w-3 h-3" />
                  12.5%
                </div>
              </div>
              <div className="bg-slate-50/50 rounded-2xl sm:rounded-3xl p-3 sm:p-6 border border-slate-100 min-w-0">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1 truncate">
                  Active Quotes
                </p>
                <h4
                  className="text-[clamp(1rem,4vw,1.5rem)] font-black text-slate-900 mb-1 truncate"
                  title="18"
                >
                  18
                </h4>
                <div className="flex items-center gap-1 text-[#d49b35] text-[10px] font-bold">
                  <Zap className="w-3 h-3" />4 pending
                </div>
              </div>
            </div>

            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
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

        {/* Incoming Booking Requests Section */}
        <div>
          <div className="flex justify-between items-center mb-3 sm:mb-4 px-1">
            <h3 className="text-lg font-serif font-black text-slate-900">
              {isBookingBased ? 'Incoming Booking Requests' : 'Incoming Leads'}
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
