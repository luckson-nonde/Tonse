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
  ChevronLeft,
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
import { getLabourProfileSchema } from '../services/labourSchemaRegistry';
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
  Calendar,
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
  user,
}: DynamicAccountRendererProps) {
  const viewSchema = schema.views[view];

  if (!viewSchema) {
    return (
      <div className="p-12 text-center bg-white rounded-4xl border border-slate-200">
        <h3 className="text-xl font-serif font-bold text-brand-dark mb-2">View Not Found</h3>
        <p className="text-slate-400 mb-6">
          The requested view "{view}" is not defined in the account schema.
        </p>
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
      <div className="space-y-10 lg:space-y-14">
        {/* Virtual Account Card */}
        {viewSchema.showWalletCard && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onAction('view_financial')}
            whileHover={{ y: -6 }}
            className="bg-gradient-to-r from-brand-dark via-slate-700 to-slate-800 rounded-3xl p-12 shadow-premium-xl text-white relative overflow-hidden group cursor-pointer transition-shadow duration-300 hover:shadow-premium-xl"
          >
            {/* Premium gradient overlays */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-brand-gold/30 via-brand-gold/12 to-transparent rounded-bl-full z-0 opacity-60 group-hover:opacity-80 transition-opacity duration-500 group-hover:scale-125 transform"></div>
            <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-gradient-to-tr from-brand-gold/15 to-transparent rounded-tr-full z-0 opacity-40"></div>
            <div
              className="absolute inset-0 opacity-25 group-hover:opacity-50 transition-opacity duration-300"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 20% 50%, rgba(201,151,58,0.12) 0%, transparent 50%)',
              }}
            ></div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="flex-1 min-w-0">
                <motion.div className="flex items-center gap-3 mb-3" whileHover={{ x: 5 }}>
                  <div className="p-2 bg-brand-gold/20 rounded-lg backdrop-blur-sm">
                    <Wallet className="w-5 h-5 text-brand-gold" />
                  </div>
                  <p className="text-brand-gold text-[11px] font-bold font-sans uppercase tracking-[0.3em]">
                    Virtual Account Balance
                  </p>
                </motion.div>
                <motion.h2
                  className="text-5xl md:text-6xl font-serif font-black mb-4 truncate"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  ZMW {(data?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </motion.h2>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-slate-300 font-mono tracking-[0.25em] text-xs">
                    {user?.virtualAccountNumber
                      ? user.virtualAccountNumber.match(/.{1,4}/g)?.join(' ')
                      : `**** **** **** ${user?.id?.toString().padStart(4, '0') || '0000'}`}
                  </p>
                  {data?.escrowBalance > 0 && (
                    <motion.div
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider text-emerald-300"
                      whileHover={{ scale: 1.05 }}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      ZMW {(data.escrowBalance || 0).toLocaleString()} in Escrow
                    </motion.div>
                  )}
                  <motion.div
                    className="px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider text-slate-200"
                    whileHover={{ scale: 1.05 }}
                  >
                    {user?.role} ACCOUNT
                  </motion.div>
                </div>
              </div>

              <motion.div className="flex items-center gap-4" whileHover={{ x: 5 }}>
                <div className="hidden sm:flex -space-x-3 mr-2">
                  <motion.div
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 border-3 border-slate-700 shadow-lg flex items-center justify-center text-white text-xs font-bold"
                    whileHover={{ y: -4 }}
                  >
                    B
                  </motion.div>
                  <motion.div
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-gold to-amber-600 border-3 border-slate-700 shadow-lg flex items-center justify-center text-white text-xs font-bold"
                    whileHover={{ y: -4 }}
                    transition={{ delay: 0.1 }}
                  >
                    P
                  </motion.div>
                </div>
                <motion.div whileHover={{ scale: 1.05 }}>
                  <Button
                    variant="outline"
                    className="border-2 border-white/30 text-white hover:bg-white/15 hover:border-white/50 rounded-2xl px-7 py-3 font-medium transition-all duration-300 backdrop-blur-sm"
                  >
                    Manage Account
                  </Button>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-7 lg:gap-8">
          {viewSchema.metrics?.map((metric, idx) => {
            let metricValue = metric.value;
            if (metric.id === 'active_inquiries') {
              metricValue =
                data?.inquiries?.filter(
                  (i: any) => i.status !== 'CLOSED' && i.status !== 'CANCELLED'
                ).length || 0;
            } else if (metric.id === 'pending_quotes') {
              metricValue = data?.quotes?.filter((q: any) => q.status === 'PENDING').length || 0;
            } else if (metric.id === 'completed_orders') {
              metricValue = data?.orders?.length || 0;
            }

            // Determine color scheme based on metric type
            let bgColor = 'bg-blue-50';
            let borderColor = 'border-blue-200';
            let iconBg = 'bg-blue-100';
            let iconColor = 'text-blue-600';

            if (metric.id === 'active_inquiries') {
              bgColor = 'bg-amber-50';
              borderColor = 'border-amber-200';
              iconBg = 'bg-gradient-to-br from-amber-100 to-amber-50';
              iconColor = 'text-amber-600';
            } else if (metric.id === 'pending_quotes') {
              bgColor = 'bg-purple-50';
              borderColor = 'border-purple-200';
              iconBg = 'bg-gradient-to-br from-purple-100 to-purple-50';
              iconColor = 'text-purple-600';
            } else if (metric.id === 'completed_orders') {
              bgColor = 'bg-emerald-50';
              borderColor = 'border-emerald-200';
              iconBg = 'bg-gradient-to-br from-emerald-100 to-emerald-50';
              iconColor = 'text-emerald-600';
            }

            return (
              <motion.div
                key={uniqueKey('metric', metric.id, idx)}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                whileHover={{
                  y: -6,
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12), 0 12px 32px rgba(0, 0, 0, 0.08)',
                }}
                onClick={() => {
                  // Navigate to appropriate view based on metric type
                  if (metric.id === 'active_inquiries') {
                    onNavigate('inquiries');
                  } else if (metric.id === 'pending_quotes') {
                    onNavigate('quotes');
                  } else if (metric.id === 'completed_orders') {
                    onNavigate('paid-orders');
                  }
                }}
                className={`${bgColor} p-8 rounded-3xl border-2 ${borderColor} shadow-premium hover:shadow-premium-lg transition-all duration-300 cursor-pointer relative overflow-hidden group`}
              >
                {/* Animated background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div
                      className={`p-4 ${iconBg} rounded-2xl border border-current border-opacity-20 shadow-premium transform group-hover:scale-110 transition-transform duration-300`}
                    >
                      {renderIcon(metric.icon, `w-7 h-7 ${iconColor}`)}
                    </div>
                    {metric.trend && (
                      <motion.span
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-premium ${metric.trend.isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}
                      >
                        {metric.trend.isPositive ? '↑' : '↓'}
                        {metric.trend.value}%
                      </motion.span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em] mb-2">
                    {metric.label}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-5xl font-serif font-black text-brand-dark">
                      {metricValue}
                    </h3>
                    {metric.unit && (
                      <span className="text-sm text-slate-400 font-medium">{metric.unit}</span>
                    )}
                  </div>
                  {metricValue === 0 && (
                    <p className="text-xs text-slate-400 mt-3 italic">
                      {metric.id === 'active_inquiries' && 'No active inquiries yet'}
                      {metric.id === 'pending_quotes' && 'No pending quotes'}
                      {metric.id === 'completed_orders' && 'No orders completed'}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          whileHover={{ y: -2 }}
          className="bg-gradient-to-br from-white via-brand-white to-slate-50 p-12 rounded-3xl border-2 border-brand-gold/30 shadow-premium-lg hover:shadow-premium-xl transition-all duration-300 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-brand-gold/15 via-brand-gold/8 to-transparent rounded-bl-full z-0 opacity-50 group-hover:opacity-70 group-hover:scale-110 transition-all duration-500"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-tr from-brand-gold/8 to-transparent rounded-tr-full z-0 opacity-40"></div>

          <div className="relative z-10">
            <div className="mb-3">
              <h3 className="text-2xl md:text-3xl font-serif font-bold text-brand-dark mb-2">
                Ready to start something new?
              </h3>
              <div className="w-16 h-1.5 bg-gradient-to-r from-brand-gold via-brand-accent to-transparent rounded-full"></div>
            </div>
            <p className="text-slate-600 mb-8 max-w-md leading-relaxed font-medium">
              Create a new inquiry to receive tailored quotes from our network of verified
              providers.
            </p>
            <div className="flex flex-wrap gap-4">
              {viewSchema.actions?.map((action, idx) => (
                <motion.div
                  key={uniqueKey('action', action.id, idx)}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ scale: 1.08, y: -3 }}
                >
                  <Button
                    variant={action.variant}
                    onClick={() => onAction(action.id)}
                    className={`px-8 py-3.5 flex items-center gap-2 font-medium rounded-2xl transition-all duration-300 shadow-premium ${
                      action.variant === 'primary'
                        ? 'bg-gradient-to-r from-brand-gold to-brand-accent hover:shadow-gold-glow text-white'
                        : 'border-2 border-brand-gold/40 text-brand-gold hover:border-brand-gold hover:bg-brand-gold/8 hover:shadow-premium-md'
                    }`}
                  >
                    {renderIcon(action.icon, 'w-5 h-5')}
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
            className="bg-gradient-to-br from-slate-50 to-white rounded-3xl border-2 border-dashed border-slate-200 shadow-premium hover:shadow-premium-md hover:border-brand-gold/40 transition-all duration-300 divide-y divide-slate-100 overflow-hidden"
          >
            {data?.recentActivity?.length > 0 ? (
              data.recentActivity.map((activity: any, idx: number) => (
                <motion.div
                  key={uniqueKey('activity', activity.id, idx)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-6 flex items-center justify-between hover:bg-gradient-to-r hover:from-amber-50/40 to-transparent transition-colors duration-300 cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-gold/25 to-brand-gold/8 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-premium">
                      {renderIcon(activity.icon || 'MessageSquare', 'w-6 h-6 text-brand-gold')}
                    </div>
                    <div>
                      <p className="font-bold text-brand-dark group-hover:text-brand-gold transition-colors duration-300">
                        {activity.title}
                      </p>
                      <p className="text-xs text-slate-500">{activity.subtitle}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400 group-hover:text-slate-600 transition-colors duration-300">
                    {activity.time}
                  </span>
                </motion.div>
              ))
            ) : (
              <div className="p-14 text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-50 rounded-full flex items-center justify-center mx-auto mb-7 shadow-premium"
                >
                  <Clock className="w-12 h-12 text-slate-400" />
                </motion.div>
                <h3 className="text-lg font-serif font-bold text-slate-600 mb-2">
                  No activity yet
                </h3>
                <p className="text-slate-500 text-sm mb-8 max-w-xs mx-auto leading-relaxed">
                  Your activity log will appear here once you create inquiries or receive quotes.
                </p>
                <Button
                  variant="primary"
                  onClick={() => onAction('create_inquiry')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-brand-gold hover:bg-brand-accent text-white rounded-2xl font-medium transition-all hover:shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  Create Your First Inquiry
                </Button>
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
        <div className="flex items-center justify-between px-2">
          <div>
            <h2 className="text-3xl font-serif font-black text-brand-dark">
              {resolveValue(viewSchema.title)}
            </h2>
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
                {renderIcon(action.icon, 'w-4 h-4')}
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
                <div
                  key={uniqueKey('item', item.id, idx)}
                  className="bg-white p-6 rounded-4xl border border-slate-200 shadow-sm"
                >
                  <p>{item.title || item.name || 'Untitled Item'}</p>
                </div>
              );
            })
          ) : (
            <div className="bg-white p-20 rounded-4xl border border-slate-200 shadow-sm text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                {renderIcon(
                  view === 'inquiries' ? 'MessageSquare' : 'FileText',
                  'w-10 h-10 text-slate-200'
                )}
              </div>
              <h3 className="text-xl font-serif font-bold text-brand-dark mb-2">
                Nothing here yet
              </h3>
              <p className="text-slate-400 mb-8">
                Start by creating a new inquiry to see it listed here.
              </p>
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
          className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-brand-gold transition-colors"
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
      case 'profile_renderer':
        const profileSchema =
          user?.role === 'LABOUR'
            ? getLabourProfileSchema(user?.labourSubTypes?.[0] ?? 'generic')
            : getProfileSchema(user?.role, user?.subRole);

        console.log('PROFILE SCHEMA:', JSON.stringify(profileSchema));
        console.log('PROFILE SCHEMA TYPE:', typeof profileSchema);

        if (!profileSchema) {
          return <div className="p-8 text-center text-slate-400">Profile schema not found</div>;
        }

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
