import React from 'react';
import { motion } from 'motion/react';
import { usePageTransitionProps } from './PageTransition';
import defaultEmptyImage from '../assets/images/empty-states/owl_reading.webp';
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  ShoppingBag,
  User,
  Plus,
  TrendingUp,
  CheckCircle,
  Clock,
  ChevronRight,
  ArrowRight,
  Star,
  MapPin,
  Calendar,
  ShieldCheck,
  Eye,
  EyeOff,
  Wallet,
  Settings,
  Music,
  FileCheck,
  XCircle,
  Archive,
  ChevronLeft,
  Store,
  QrCode,
  ArrowUpRight,
} from 'lucide-react';
import { INQUIRY_STATUS_SCHEMA } from '../services/buyerAccountSchema';
import { MasterAccountSchema } from '../services/accountSchemaTypes';
import Button from './Button';
import InquiryCard from './InquiryCard';
import QuoteCard from './QuoteCard';
import LoanOfferCard from './loan/LoanOfferCard';
import DynamicProfileForm from './DynamicProfileForm';
import InquiryDetails from './InquiryDetails';
import QuoteDetails from './QuoteDetails';
import OrderDetails from './OrderDetails';
import ProviderHomeView from './provider/ProviderHomeView';
import ProviderLeadsView from './provider/ProviderLeadsView';
import ProviderQuotesView from './provider/ProviderQuotesView';
import ProviderOrdersView from './provider/ProviderOrdersView';
import ProviderProductsView from './provider/ProviderProductsView';
import ProviderScheduleView from './provider/ProviderScheduleView';
import ProviderTeamView from './provider/ProviderTeamView';
import VenueManagementView from './provider/VenueManagementView';
import HomeCareClientsView from './provider/HomeCareClientsView';
import CollectionPage from '../pages/CollectionPage';
import { LoanRequestsView, LoanOffersView } from './loan/LoanViews';
import { LoanHomeView } from './loan/LoanHomeView';
import LoanTermsEditor from './loan/LoanTermsEditor';
import DeleteAccountSection from './DeleteAccountSection';
import LoanOfferDetail from './loan/LoanOfferDetail';
import FinancialPage from '../pages/FinancialPage';
import VentureAccountView from './provider/VentureAccountView';
import ActiveTransactionsView from './ActiveTransactionsView';
import TransactionHistoryView from './TransactionHistoryView';
import ReportManagerView from './ReportManagerView';
import { Inquiry, Quote } from '../types';
import { getLabourProfileSchema } from '../services/labourSchemaRegistry';
import { getProfileSchema } from '../services/userSchemas';
import { generateVirtualAccount, formatCurrency } from '../utils/financeUtils';
import { uniqueKey } from '../utils/keyUtils';

const ICON_MAP: Record<string, any> = {
  LayoutDashboard,
  MessageSquare,
  FileText,
  ShoppingBag,
  User,
  Plus,
  TrendingUp,
  CheckCircle,
  Clock,
  Eye,
  Settings,
  Music,
  FileCheck,
  XCircle,
  Archive,
  MapPin,
  Calendar,
  Store,
  QrCode,
};

// Per-tile accent for the buyer Overview activity grid. Backgrounds are opaque
// hexes/palette tints (NOT translucent border-…/NN on the rounded card) so the
// tiles don't smear on Android/Mali GPUs — see the android-ghosting playbook.
const METRIC_PALETTE: Record<string, { chip: string }> = {
  active_inquiries: { chip: 'bg-[#fdf6e9] text-[#c9973a]' },
  quotes_received: { chip: 'bg-blue-50 text-blue-600' },
  ready_to_collect: { chip: 'bg-violet-50 text-violet-600' },
  completed_orders: { chip: 'bg-emerald-50 text-emerald-600' },
  default: { chip: 'bg-slate-100 text-slate-500' },
};

// Status-dot color for the Recent Activity feed, keyed by the `tone` the
// buyer dashboard tags each item with.
const ACTIVITY_DOT: Record<string, string> = {
  gold: 'bg-[#c9973a]',
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
};

import LabourHomeView from './labour/LabourHomeView';
import LabourJobsView from './labour/LabourJobsView';
import LabourQuotesView from './labour/LabourQuotesView';
import LabourScheduleView from './labour/LabourScheduleView';
import StaffOverview from './staff/StaffOverview';
import TechnicianJobsView from './technician/TechnicianJobsView';

interface DynamicAccountRendererProps {
  schema: MasterAccountSchema;
  view: string;
  data?: any;
  onAction: (actionId: string, payload?: any) => void;
  onNavigate: (viewId: string) => void;
  user?: any;
}

export default function DynamicAccountRenderer({
  schema,
  view,
  data,
  onAction,
  onNavigate,
  user,
}: DynamicAccountRendererProps) {
  const viewSchema = schema.views[view];
  const pageTransitionProps = usePageTransitionProps();

  if (!viewSchema) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-12 text-center bg-white rounded-4xl border border-slate-200 shadow-sm animate-in fade-in duration-500">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-brand-gold/10 rounded-full blur-3xl scale-150 animate-pulse"></div>
          <img 
            src={defaultEmptyImage} 
            alt="Reading Owl" 
            className="w-48 h-48 sm:w-64 sm:h-64 object-contain relative z-10 drop-shadow-xl"
          />
        </div>
        <h3 className="text-2xl font-serif font-black text-brand-dark mb-3">View Not Found</h3>
        <p className="text-slate-500 mb-8 max-w-sm mx-auto leading-relaxed font-medium">
          The requested view <span className="font-mono text-brand-gold bg-brand-gold/5 px-2 py-0.5 rounded">"{view}"</span> is not defined in your account schema.
        </p>
        <Button 
          onClick={() => onNavigate('dashboard')}
          className="px-10 py-4 bg-brand-dark text-white rounded-full font-bold shadow-xl hover:shadow-brand-gold/20 transition-all"
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const resolveValue = (val: any) => {
    if (typeof val === 'function') return val(user?.role || 'BUYER');
    return val;
  };

  const renderIcon = (iconName: string, className?: string) => {
    const Icon = ICON_MAP[iconName] || LayoutDashboard;
    return <Icon className={className} />;
  };

  const renderDashboardGrid = () => {
    // Masked virtual-account number (derived from the phone, last 6 digits
    // shown as "•••• NNN NNN") — replaces the raw phone on the balance card.
    const acctDigits = generateVirtualAccount(user?.phone).replace(/\D/g, '');
    const maskedAccount =
      acctDigits.length >= 6
        ? `•••• ${acctDigits.slice(-6, -3)} ${acctDigits.slice(-3)}`
        : '•••• ••••';
    return (
      <div className="space-y-6 lg:space-y-8">
        {/* Virtual Account Card */}
        {viewSchema.showWalletCard && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onAction('view_financial')}
            className="bg-[#1B3068] rounded-4xl p-6 sm:p-8 shadow-premium-xl text-white relative overflow-hidden group cursor-pointer transition-all duration-500"
          >
            {/* Subtle premium gradient/pattern overlays */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.15) 0%, transparent 60%)' }}></div>
            
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-2.5">
                  <Wallet className="w-4 h-4 text-white/90" strokeWidth={2} />
                  <p className="text-white/80 text-[10px] sm:text-[11px] font-bold font-sans uppercase tracking-[0.25em]">
                    Account Balance
                  </p>
                </div>
                {/* Single role pill (no functional BUYER/SELLER toggle). */}
                <div className="px-3.5 py-1.5 rounded-full bg-[#2a407a] border border-[#3a508f] text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] text-white/90 shrink-0">
                  {user?.role || 'BUYER'} ACCOUNT
                </div>
              </div>

              <h2 className="text-[clamp(2rem,7vw,3.25rem)] font-serif font-black mb-5 tracking-tight leading-none truncate">
                ZMW {formatCurrency(data?.balance || 0)}
              </h2>

              <div className="flex items-end justify-between gap-4">
                <p className="text-white/55 font-mono tracking-[0.28em] text-xs sm:text-sm">
                  {maskedAccount}
                </p>
                <Button
                  variant="outline"
                  className="border-white/40 text-white hover:bg-white/10 hover:border-white rounded-xl px-6 py-2.5 font-bold text-[13px] transition-all duration-300 shrink-0"
                >
                  Manage
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Activity tiles — value + caption come from live data
            (data.metricStats, computed in BuyerDashboard); the per-id block
            below is only a fallback for schemas that don't supply it. */}
        <div>
          <p className="px-1 mb-3 text-[11px] font-bold text-slate-400 uppercase tracking-[0.22em]">
            Your Activity
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
            {viewSchema.metrics?.map((metric, idx) => {
              const stat = data?.metricStats?.[metric.id];
              let metricValue: number | string | undefined = stat?.value;
              if (metricValue == null) {
                if (metric.id === 'active_inquiries') {
                  metricValue =
                    data?.inquiries?.filter(
                      (i: any) => !['CLOSED', 'CANCELLED', 'PAID'].includes(i.status),
                    ).length || 0;
                } else if (metric.id === 'quotes_received') {
                  metricValue = data?.quotes?.length || 0;
                } else if (metric.id === 'completed_orders') {
                  metricValue = data?.orders?.length || 0;
                } else {
                  metricValue = metric.value ?? 0;
                }
              }
              const hint: string | undefined = stat?.hint;
              const palette = METRIC_PALETTE[metric.id] || METRIC_PALETTE.default;
              return (
                <motion.div
                  key={uniqueKey('metric', metric.id, idx)}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.4, delay: idx * 0.06 }}
                  whileHover={{ y: -4 }}
                  onClick={() => {
                    if (metric.id === 'active_inquiries') onNavigate('inquiries');
                    else if (metric.id === 'quotes_received') onNavigate('quotes');
                    // Both land on the Transaction History page, but on the
                    // tab that actually matches the tile's own label.
                    else if (metric.id === 'ready_to_collect') onNavigate('active_transactions');
                    else if (metric.id === 'completed_orders') onAction('view_transaction_tab', 'PURCHASED');
                  }}
                  className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-premium hover:border-[#e2c185] hover:shadow-premium-lg transition-all duration-300 cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4 sm:mb-5">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center ${palette.chip}`}
                    >
                      {renderIcon(metric.icon, 'w-5 h-5')}
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-brand-gold transition-colors duration-300" />
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-serif font-black text-brand-dark leading-none">
                    {metricValue}
                  </h3>
                  <p className="mt-2 text-[13px] font-bold text-brand-dark">
                    {metric.label}
                  </p>
                  {hint && (
                    <p className="mt-0.5 text-[11px] text-slate-400 font-medium truncate">
                      {hint}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          whileHover={{ y: -2 }}
          className="bg-gradient-to-br from-white via-brand-white to-slate-50 p-6 sm:p-12 rounded-3xl border-2 border-brand-gold/30 shadow-premium-lg hover:shadow-premium-xl transition-all duration-300 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-brand-gold/15 via-brand-gold/8 to-transparent rounded-bl-full z-0 opacity-50 group-hover:opacity-70 group-hover:scale-110 transition-all duration-500 pointer-events-none"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-tr from-brand-gold/8 to-transparent rounded-tr-full z-0 opacity-40 pointer-events-none"></div>

          <div className="relative z-10">
            <div className="mb-3">
              <h3 className="text-2xl md:text-3xl font-serif font-bold text-brand-dark mb-2">
                {viewSchema.ctaTitle || 'Ready to start something new?'}
              </h3>
              <div className="w-16 h-1.5 bg-gradient-to-r from-brand-gold via-brand-accent to-transparent rounded-full"></div>
            </div>
            <p className="text-slate-600 mb-8 max-w-md leading-relaxed font-medium">
              {viewSchema.ctaSubtitle ||
                'Create a new inquiry to receive tailored quotes from our network of verified providers.'}
            </p>
            {/* One line even on mobile (no wrap): each action gets flex-1 so
                the pair renders at matching sizes; desktop keeps auto-width. */}
            <div className="flex flex-row gap-3 sm:gap-4">
              {viewSchema.actions?.map((action, idx) => (
                <motion.div
                  key={uniqueKey('action', action.id, idx)}
                  className="flex-1 sm:flex-initial min-w-0"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ scale: 1.08, y: -3 }}
                >
                  <Button
                    variant={action.variant}
                    onClick={() => onAction(action.id)}
                    className={`w-full justify-center whitespace-nowrap px-2 sm:px-8 py-3.5 flex items-center gap-1.5 sm:gap-2 font-medium text-[13px] sm:text-base rounded-2xl transition-all duration-300 shadow-premium ${
                      action.variant === 'primary'
                        ? 'bg-gradient-to-r from-brand-gold to-brand-accent hover:shadow-gold-glow text-white'
                        : 'border-2 border-brand-gold/40 text-brand-gold hover:border-brand-gold hover:bg-brand-gold/8 hover:shadow-premium-md'
                    }`}
                  >
                    {renderIcon(action.icon, 'w-4 h-4 sm:w-5 sm:h-5 shrink-0')}
                    {action.label}
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Recent Activity Placeholder */}
        <div className="space-y-5">
          <div className="flex items-center justify-between px-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-[0.25em]">
              Recent Activity
            </h4>
            <button
              onClick={() => onNavigate('inquiries')}
              className="text-xs font-bold text-brand-gold hover:text-brand-accent transition-colors flex items-center gap-1 group"
            >
              View All{' '}
              <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-premium divide-y divide-slate-100 overflow-hidden"
          >
            {data?.recentActivity?.length > 0 ? (
              data.recentActivity.map((activity: any, idx: number) => (
                <motion.div
                  key={uniqueKey('activity', activity.id, idx)}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  onClick={() => onAction('view_details', { id: activity.inquiryId })}
                  className="px-4 sm:px-5 py-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors duration-200 cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-[#fdf6e9] transition-colors duration-200">
                      {renderIcon(activity.icon || 'MessageSquare', 'w-5 h-5 text-slate-500 group-hover:text-[#c9973a] transition-colors duration-200')}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-brand-dark truncate group-hover:text-brand-gold transition-colors duration-200">
                        {activity.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ACTIVITY_DOT[activity.tone] || 'bg-slate-300'}`}></span>
                        <p className="text-xs text-slate-500 truncate">{activity.subtitle}</p>
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 shrink-0">
                    {activity.time}
                  </span>
                </motion.div>
              ))
            ) : (
              <div className="p-16 text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative mb-10"
                >
                  <div className="absolute inset-0 bg-brand-gold/5 rounded-full blur-3xl scale-150 animate-pulse"></div>
                  <img 
                    src={defaultEmptyImage} 
                    alt="Reading Owl" 
                    className="w-40 h-40 object-contain relative z-10 mx-auto opacity-90 drop-shadow-lg"
                  />
                </motion.div>
                <h3 className="text-xl font-serif font-black text-brand-dark mb-3">
                  No activity yet
                </h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed font-medium">
                  Your activity log will appear here once you create inquiries or receive quotes from our network.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    );
  };

  const renderList = () => {
    const items = data?.[viewSchema.dataKey || ''] || [];

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-2">
          <div>
            <h2 className="text-3xl font-serif font-black text-brand-dark">
              {resolveValue(viewSchema.title)}
            </h2>
            <p className="text-slate-500">{resolveValue(viewSchema.subtitle)}</p>
          </div>
          {/* Always visible — even once the list is populated — so the buyer
              can send another inquiry without scrolling back to an empty
              state. Stacks full-width below the title on mobile; sits at the
              top-right next to the title from md up. */}
          {(viewSchema.actions?.length ?? 0) > 0 && (
            <div className="flex flex-row gap-3">
              {viewSchema.actions?.map((action, idx) => (
                <Button
                  key={uniqueKey('action-top', action.id, idx)}
                  variant={action.variant}
                  onClick={() => onAction(action.id)}
                  className={`flex-1 md:flex-initial min-w-0 flex items-center justify-center gap-2 sm:gap-2.5 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full font-bold text-sm sm:text-base whitespace-nowrap shadow-lg transition-all duration-300 hover:-translate-y-0.5 ${
                    action.variant === 'primary'
                      ? '!bg-[#C9973A] !text-white hover:!bg-[#1e3a8a] shadow-[#C9973A]/30 hover:shadow-[#1e3a8a]/30'
                      // `!` overrides are load-bearing (same as the primary branch):
                      // Button's own variant="secondary" ships bg-brand-dark +
                      // text-white, and without !important the class-order
                      // coin-flip left WHITE text on the white pill (invisible
                      // until hover recolored it).
                      : '!bg-white border-2 !border-slate-200 !text-slate-700 hover:!border-[#1e3a8a] hover:!text-[#1e3a8a]'
                  }`}
                >
                  {renderIcon(action.icon || 'Plus', 'w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0')}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {items.length > 0 ? (
            items.map((item: any, idx: number) => {
              if (view === 'inquiries') {
                return (
                  <InquiryCard
                    key={uniqueKey('inquiry', item.id, idx)}
                    inquiry={item}
                    state={item.status?.toLowerCase() || 'open'}
                    hideSpecifications
                    onAction={() => onAction('view_details', item)}
                    onDelete={() => onAction('delete_inquiry', item)}
                    onReleaseReserve={() => onAction('release_reserve', item)}
                  />
                );
              }
              if (view === 'quotes') {
                return (
                  <QuoteCard
                    key={uniqueKey('quote', item.id, idx)}
                    quote={item}
                    onView={() => onAction('view_quote', item)}
                    onPay={() => onAction('pay_quote', item)}
                    onDelete={() => onAction('delete_quote', item)}
                  />
                );
              }
              if (view === 'loan_offers') {
                return (
                  <LoanOfferCard
                    key={uniqueKey('loan-offer', item.id, idx)}
                    offer={item}
                    onView={() => onAction('view_quote', item)}
                  />
                );
              }
              // 'orders' no longer routes through this generic list_renderer —
              // it now mounts TransactionHistoryView (componentType
              // 'transaction_history_renderer'), which owns its own
              // Awaiting Collection / Purchased Items / Requests / Expired
              // tabs and reuses this same InquiryCard rendering internally.
              return (
                <div
                  key={uniqueKey('item', item.id, idx)}
                  className="bg-white p-6 rounded-4xl border border-slate-200 shadow-sm"
                >
                  <p>{item.title || item.name || 'Untitled Item'}</p>
                </div>
              );
            })
          ) : (
            <div className="bg-white p-6 sm:p-20 rounded-4xl border border-slate-200 shadow-premium flex flex-col items-center justify-center text-center min-h-[60vh] animate-in fade-in duration-700">
              <div className="relative mb-10">
                <div className="absolute inset-0 bg-brand-gold/5 rounded-full blur-3xl scale-150 animate-pulse"></div>
                <img 
                  src={defaultEmptyImage} 
                  alt="Empty state" 
                  className="w-48 h-48 sm:w-64 sm:h-64 object-contain relative z-10 opacity-90 drop-shadow-lg"
                />
              </div>
              <h3 className="text-2xl font-serif font-black text-brand-dark mb-3">
                Nothing here yet
              </h3>
              <p className="text-slate-500 mb-10 max-w-sm mx-auto text-lg leading-relaxed font-medium">
                {view === 'inquiries' ? 'Start by creating a new inquiry to receive quotes from providers.' :
                 view === 'quotes' ? 'No quotes received yet for your inquiries.' :
                 view === 'loan_offers' ? 'No loan offers yet. Once a lender responds to your loan request, their offer appears here.' :
                 view === 'orders' ? 'No completed orders yet.' :
                 'There is no data to display here yet.'}
              </p>
              {/* All schema actions, side by side on ONE line even on mobile.
                  flex-1 on every button keeps the pair identically sized;
                  whitespace-nowrap stops labels wrapping inside the pills. */}
              {(viewSchema.actions?.length ?? 0) > 0 && (
                <div className="flex flex-row items-stretch justify-center gap-3 w-full max-w-md">
                  {viewSchema.actions!.map((action, idx) => (
                    <Button
                      key={uniqueKey('empty-action', action.id, idx)}
                      onClick={() => onAction(action.id)}
                      className={`flex-1 min-w-0 px-2 sm:px-8 py-3.5 sm:py-4 rounded-full font-bold text-[13px] sm:text-base whitespace-nowrap hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 ${
                        action.variant === 'secondary'
                          ? '!bg-brand-gold hover:!bg-brand-accent !text-white shadow-xl shadow-brand-gold/15 hover:shadow-brand-gold/25'
                          : '!bg-brand-dark hover:!bg-[#1e3a8a] !text-white shadow-xl shadow-brand-dark/10 hover:shadow-[#1e3a8a]/20'
                      }`}
                    >
                      {renderIcon(action.icon || 'Plus', 'w-4 h-4 sm:w-5 sm:h-5 shrink-0')}
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDetails = () => {
    const item = data?.[viewSchema.dataKey || ''];
    if (!item) return <div className="p-12 text-center text-slate-400">Item not found</div>;

    // Map details view back to list view
    const getBackView = () => {
      if (view === 'inquiry_details') return 'inquiries';
      if (view === 'quote_details') return 'quotes';
      if (view === 'order_details') return 'orders';
      return view.replace('_details', 's');
    };

    return (
      <div className="space-y-8">
        {/* LoanOfferDetail renders its own "Back to offers" — showing this
            generic one too gives a loan a duplicate, mislabeled "Back to
            quotes" that lands on the wrong (empty-of-this-item) surface. */}
        {!(view === 'quote_details' && (item as any).condition === 'LOAN') && (
          <button
            onClick={() => onNavigate(getBackView())}
            className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-brand-gold transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to {getBackView()}
          </button>
        )}

        {view === 'inquiry_details' ? (
          <InquiryDetails
            inquiry={item}
            quotes={data?.quotes?.filter((q: Quote) => q.inquiryId === item.id) || []}
            onAction={onAction}
          />
        ) : view === 'quote_details' ? (
          (item as any).condition === 'LOAN' ? (
            <LoanOfferDetail
              quote={item}
              inquiry={data?.inquiries?.find((i: Inquiry) => i.id === item.inquiryId)}
              onAction={onAction}
            />
          ) : (
            <QuoteDetails
              quote={item}
              inquiry={data?.inquiries?.find((i: Inquiry) => i.id === item.inquiryId)}
              onAction={onAction}
              autoOpenPay={data?.autoPayQuoteId === item.id}
            />
          )
        ) : view === 'order_details' ? (
          <OrderDetails
            order={item}
            inquiry={data?.inquiries?.find((i: Inquiry) => i.id === item.inquiryId)}
            onAction={onAction}
          />
        ) : (
          <div className="bg-white p-8 rounded-4xl border border-slate-200 shadow-sm">
            <h2 className="text-3xl font-serif font-black text-brand-dark mb-2">
              {item.title || item.providerName}
            </h2>
            <p className="text-slate-500 mb-8">{item.description || item.message}</p>

            <div className="p-12 bg-slate-50 rounded-4xl border border-dashed border-slate-200 text-center text-slate-400">
              Details for {view} coming soon...
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (viewSchema.componentType) {
      case 'dashboard_grid':
        return renderDashboardGrid();
      case 'list_renderer':
        return renderList();
      case 'details_renderer':
        return renderDetails();
      case 'profile_renderer': {
        // Phase 2: LABOUR is no longer a top-level role. Labour users
        // register as SERVICE_PROVIDER but still carry labourCategory /
        // labourSubTypes as typed columns — detect by labourCategory
        // presence and route to the labour profile schema.
        const profileSchema = user?.labourCategory
          ? getLabourProfileSchema(user?.labourSubTypes?.[0] ?? 'generic')
          : getProfileSchema(user?.role, user?.subRole);

        if (!profileSchema) {
          return <div className="p-8 text-center text-slate-400">Profile schema not found</div>;
        }

        // Map backend column names → form field names so defaultValues populate.
        // Backend returns: profilePicture, dateOfBirth, nrcNumber, latitude, longitude
        // Form fields expect: logo, dob, nrc, gps: { latitude, longitude }
        const normalizedProfile = user
          ? {
              ...user,
              logo: user.profilePicture ?? user.logo,
              nrc: user.nrcNumber ?? user.nrc,
              dob: user.dateOfBirth ?? user.dob,
              ownerName: user.ownerName ?? user.name,
              gps:
                user.latitude != null && user.longitude != null
                  ? { latitude: user.latitude, longitude: user.longitude }
                  : user.gps,
            }
          : user;

        return (
          <div className="space-y-8">
            <div className="px-2">
              <h2 className="text-3xl font-serif font-black text-brand-dark">
                {resolveValue(viewSchema.title)}
              </h2>
              <p className="text-slate-500">{resolveValue(viewSchema.subtitle)}</p>
            </div>
            <DynamicProfileForm
              schema={profileSchema as any}
              initialData={normalizedProfile}
              onSubmit={(updatedData) => onAction('save_profile', updatedData)}
            >
              <div className="flex justify-end pt-6">
                <Button type="submit" className="px-12 py-4">
                  Save Changes
                </Button>
              </div>
            </DynamicProfileForm>
            <DeleteAccountSection />
          </div>
        );
      }
      case 'provider_placeholder':
        return (
          <div className="p-12 text-center bg-white rounded-4xl border border-dashed border-slate-200">
            <p className="text-slate-400 font-mono text-sm">
              [{resolveValue(viewSchema.title)} — Provider component to be connected in Step 3]
            </p>
          </div>
        );
      case 'provider_home':
        return <ProviderHomeView {...data?.homeProps} />;
      case 'provider_leads':
        return <ProviderLeadsView {...data?.leadsProps} />;
      case 'provider_quotes':
        return <ProviderQuotesView {...data?.quotesProps} />;
      case 'provider_orders':
        return <ProviderOrdersView {...data?.ordersProps} />;
      case 'provider_products':
        return <ProviderProductsView {...data?.productsProps} />;
      case 'provider_schedule':
        return <ProviderScheduleView {...data?.scheduleProps} />;
      case 'provider_team':
        return <ProviderTeamView {...data?.teamProps} />;
      case 'venue_spaces_renderer':
        return <VenueManagementView />;
      case 'home_care_clients':
        return <HomeCareClientsView {...data?.myClientsProps} />;
      case 'provider_collection':
        return <CollectionPage />;
      case 'loan_home':
        return <LoanHomeView />;
      case 'loan_requests':
        return <LoanRequestsView />;
      case 'loan_offers':
        return <LoanOffersView />;
      case 'loan_terms':
        return <LoanTermsEditor />;
      case 'labour_home':
        return <LabourHomeView {...data?.homeProps} />;
      case 'labour_jobs':
        return <LabourJobsView {...data?.jobsProps} />;
      case 'labour_quotes':
        return <LabourQuotesView {...data?.quotesProps} />;
      case 'financial_renderer':
        return <FinancialPage isInsideDashboard={true} />;
      case 'venture_account_renderer':
        return <VentureAccountView />;
      case 'active_transactions_renderer':
        return <ActiveTransactionsView data={data} onAction={onAction} />;
      case 'transaction_history_renderer':
        return (
          <TransactionHistoryView
            data={data}
            onAction={onAction}
            initialTab={data?.transactionHistoryInitialTab}
          />
        );
      case 'report_manager':
        return <ReportManagerView />;
      case 'staff_overview':
        return <StaffOverview onNavigate={onNavigate} />;
      case 'technician_jobs':
        return <TechnicianJobsView historyOnly={view === 'history'} />;
      case 'labour_schedule':
        return <LabourScheduleView {...data?.scheduleProps} />;
      default:
        return <div>Unknown View Type</div>;
    }
  };

  return (
    <motion.div key={view} data-page-transition className="w-full" {...pageTransitionProps}>
      {renderContent()}
    </motion.div>
  );
}
