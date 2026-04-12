import React from 'react';
import { motion } from 'motion/react';
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
  ChevronLeft
} from 'lucide-react';
import { INQUIRY_STATUS_SCHEMA } from '../services/buyerAccountSchema';
import { MasterAccountSchema } from '../services/accountSchemaTypes';
import Button from './Button';
import InquiryCard from './InquiryCard';
import QuoteCard from './QuoteCard';
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
import CollectionPage from '../pages/CollectionPage';
import { Inquiry, Quote } from '../types';
import { getProfileSchema } from '../services/userSchemas';
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
  Calendar
};

import LabourHomeView from './labour/LabourHomeView';
import LabourJobsView from './labour/LabourJobsView';
import LabourQuotesView from './labour/LabourQuotesView';
import LabourScheduleView from './labour/LabourScheduleView';

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
  user 
}: DynamicAccountRendererProps) {
  const viewSchema = schema.views[view];

  if (!viewSchema) {
    return (
      <div className="p-12 text-center bg-white rounded-[32px] border border-slate-200">
        <h3 className="text-xl font-serif font-bold text-[#1e293b] mb-2">View Not Found</h3>
        <p className="text-slate-400 mb-6">The requested view "{view}" is not defined in the account schema.</p>
        <Button onClick={() => onNavigate('dashboard')}>Back to Overview</Button>
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
    return (
      <div className="space-y-8">
        {/* Virtual Account Card */}
        {viewSchema.showWalletCard && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onAction('view_financial')}
            className="bg-[#1e293b] rounded-[32px] p-8 shadow-xl text-white relative overflow-hidden group cursor-pointer"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#C9973A]/20 to-transparent rounded-bl-full -z-0 opacity-50 transition-transform group-hover:scale-110 duration-500"></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-[#C9973A]" />
                  <p className="text-[#C9973A] text-[10px] font-bold font-sans uppercase tracking-[0.2em]">Virtual Account Balance</p>
                </div>
                <h2 className="text-4xl md:text-5xl font-serif font-black mb-2 truncate">
                  ZMW {(data?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h2>
                <div className="flex flex-wrap items-center gap-4">
                  <p className="text-slate-400 font-mono tracking-[0.2em] text-xs">
                    {user?.virtualAccountNumber 
                      ? user.virtualAccountNumber.match(/.{1,4}/g)?.join(' ') 
                      : `**** **** **** ${user?.id?.toString().padStart(4, '0') || '0000'}`}
                  </p>
                  {data?.escrowBalance > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                      <ShieldCheck className="w-3 h-3" />
                      ZMW {data.escrowBalance.toLocaleString()} in Escrow
                    </div>
                  )}
                  <div className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-[9px] font-bold uppercase tracking-widest text-slate-300">
                    {user?.role} ACCOUNT
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex -space-x-2 mr-4">
                  <div className="w-8 h-8 rounded-full bg-rose-500/80 border-2 border-[#1e293b]"></div>
                  <div className="w-8 h-8 rounded-full bg-[#C9973A]/80 border-2 border-[#1e293b]"></div>
                </div>
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 rounded-2xl px-6">
                  Manage Account
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {viewSchema.metrics?.map((metric, idx) => {
            let metricValue = metric.value;
            if (metric.id === 'active_inquiries') {
              metricValue = data?.inquiries?.filter((i: any) => i.status !== 'CLOSED' && i.status !== 'CANCELLED').length || 0;
            } else if (metric.id === 'pending_quotes') {
              metricValue = data?.quotes?.filter((q: any) => q.status === 'PENDING').length || 0;
            } else if (metric.id === 'completed_orders') {
              metricValue = data?.orders?.length || 0;
            }

            return (
              <motion.div
                key={uniqueKey('metric', metric.id, idx)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-[#fffaf5] rounded-2xl border border-[#C9973A]/10">
                    {renderIcon(metric.icon, "w-6 h-6 text-[#C9973A]")}
                  </div>
                  {metric.trend && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${metric.trend.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {metric.trend.isPositive ? '+' : ''}{metric.trend.value}%
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">{metric.label}</p>
                <h3 className="text-3xl font-serif font-black text-[#1e293b]">{metricValue}</h3>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#C9973A]/5 to-transparent rounded-bl-full -z-0"></div>
          <div className="relative z-10">
            <h3 className="text-xl font-serif font-bold text-[#1e293b] mb-2">Ready to start something new?</h3>
            <p className="text-slate-500 mb-6 max-w-md">Create a new inquiry to receive tailored quotes from our network of verified providers.</p>
            <div className="flex flex-wrap gap-4">
              {viewSchema.actions?.map((action, idx) => (
                <Button
                  key={uniqueKey('action', action.id, idx)}
                  variant={action.variant}
                  onClick={() => onAction(action.id)}
                  className="px-8 py-4 flex items-center gap-2"
                >
                  {renderIcon(action.icon, "w-5 h-5")}
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity Placeholder */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Recent Activity</h4>
            <button onClick={() => onNavigate('inquiries')} className="text-xs font-bold text-[#C9973A] hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm divide-y divide-slate-100">
            {data?.recentActivity?.length > 0 ? (
              data.recentActivity.map((activity: any, idx: number) => (
                <div key={uniqueKey('activity', activity.id, idx)} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
                      {renderIcon(activity.icon || 'MessageSquare', "w-6 h-6 text-slate-400")}
                    </div>
                    <div>
                      <p className="font-bold text-[#1e293b]">{activity.title}</p>
                      <p className="text-xs text-slate-400">{activity.subtitle}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-300">{activity.time}</span>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <p className="text-slate-400 italic">No recent activity to show.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderList = () => {
    const items = data?.[viewSchema.dataKey || ''] || [];
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div>
            <h2 className="text-3xl font-serif font-black text-[#1e293b]">{resolveValue(viewSchema.title)}</h2>
            <p className="text-slate-500">{resolveValue(viewSchema.subtitle)}</p>
          </div>
          <div className="flex gap-2">
          {viewSchema.actions?.map((action, idx) => (
              <Button
                key={uniqueKey('action-top', action.id, idx)}
                variant={action.variant}
                onClick={() => onAction(action.id)}
                className="flex items-center gap-2"
              >
                {renderIcon(action.icon, "w-4 h-4")}
                {action.label}
              </Button>
            ))}
          </div>
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
                    onAction={() => onAction('view_details', item)}
                    onDelete={() => onAction('delete_inquiry', item)}
                  />
                );
              }
              if (view === 'quotes') {
                return (
                  <QuoteCard
                    key={uniqueKey('quote', item.id, idx)}
                    quote={item}
                    onView={() => onAction('view_quote', item)}
                    onPrint={() => onAction('print_quote', item)}
                    onArchive={() => onAction('archive_quote', item)}
                  />
                );
              }
              if (view === 'orders') {
                return (
                  <InquiryCard
                    key={uniqueKey('order', item.id, idx)}
                    inquiry={item}
                    state="paid"
                    paidQuote={item.paidQuote}
                    onAction={() => onAction('view_order', item)}
                    onDelete={() => onAction('delete_inquiry', item)}
                  />
                );
              }
              return (
                <div key={uniqueKey('item', item.id, idx)} className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                  <p>{item.title || item.name || 'Untitled Item'}</p>
                </div>
              );
            })
          ) : (
            <div className="bg-white p-20 rounded-[32px] border border-slate-200 shadow-sm text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                {renderIcon(view === 'inquiries' ? 'MessageSquare' : 'FileText', "w-10 h-10 text-slate-200")}
              </div>
              <h3 className="text-xl font-serif font-bold text-[#1e293b] mb-2">Nothing here yet</h3>
              <p className="text-slate-400 mb-8">Start by creating a new inquiry to see it listed here.</p>
              {viewSchema.actions?.[0] && (
                <Button onClick={() => onAction(viewSchema.actions![0].id)}>
                  {viewSchema.actions![0].label}
                </Button>
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

    return (
      <div className="space-y-8">
        <button 
          onClick={() => onNavigate(view.replace('_details', 's'))}
          className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-[#C9973A] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to {view.replace('_details', 's')}
        </button>
        
        {view === 'inquiry_details' ? (
          <InquiryDetails 
            inquiry={item} 
            quotes={data?.quotes?.filter((q: Quote) => q.inquiryId === item.id) || []} 
            onAction={onAction} 
          />
        ) : view === 'quote_details' ? (
          <QuoteDetails 
            quote={item} 
            inquiry={data?.inquiries?.find((i: Inquiry) => i.id === item.inquiryId)}
            onAction={onAction} 
          />
        ) : view === 'order_details' ? (
          <OrderDetails 
            order={item} 
            inquiry={data?.inquiries?.find((i: Inquiry) => i.id === item.inquiryId)}
            onAction={onAction} 
          />
        ) : (
          <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
            <h2 className="text-3xl font-serif font-black text-[#1e293b] mb-2">{item.title || item.providerName}</h2>
            <p className="text-slate-500 mb-8">{item.description || item.message}</p>
            
            <div className="p-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400">
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
      case 'profile_renderer':
        const profileSchema = getProfileSchema(user?.role, user?.subRole);
        return (
          <div className="space-y-8">
            <div className="px-2">
              <h2 className="text-3xl font-serif font-black text-[#1e293b]">{resolveValue(viewSchema.title)}</h2>
              <p className="text-slate-500">{resolveValue(viewSchema.subtitle)}</p>
            </div>
            <DynamicProfileForm 
              schema={profileSchema} 
              initialData={user} 
              onSubmit={(updatedData) => onAction('save_profile', updatedData)} 
            >
              <div className="flex justify-end pt-6">
                <Button type="submit" className="px-12 py-4">
                  Save Changes
                </Button>
              </div>
            </DynamicProfileForm>
          </div>
        );
      case 'provider_placeholder':
        return (
          <div className="p-12 text-center bg-white rounded-[32px] border border-dashed border-slate-200">
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
      case 'provider_collection':
        return <CollectionPage />;
      case 'labour_home':
        return <LabourHomeView {...data?.homeProps} />;
      case 'labour_jobs':
        return <LabourJobsView {...data?.jobsProps} />;
      case 'labour_quotes':
        return <LabourQuotesView {...data?.quotesProps} />;
      case 'labour_schedule':
        return <LabourScheduleView {...data?.scheduleProps} />;
      default:
        return <div>Unknown View Type</div>;
    }
  };

  return (
    <motion.div
      key={view}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-5xl mx-auto"
    >
      {renderContent()}
    </motion.div>
  );
}
