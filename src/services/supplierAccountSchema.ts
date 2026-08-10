import { PERMISSIONS } from '../utils/rbac';
import { MasterAccountSchema } from './accountSchemaTypes';
import { REPORTING_NAV_ITEM, REPORTING_VIEW } from './reportingNavFragment';
import {
  JOB_BOARD_POSTER_NAV_ITEM,
  JOB_BOARD_POSTER_VIEW,
  JOB_SEEKER_APPLICATIONS_NAV_ITEM,
  JOB_SEEKER_APPLICATIONS_VIEW,
  JOB_SEEKER_FEED_NAV_ITEM,
  JOB_SEEKER_FEED_VIEW,
} from './jobBoardNavFragments';

export const MASTER_SUPPLIER_ACCOUNT_SCHEMA: MasterAccountSchema = {
  schemaType: 'PROVIDER', // Suppliers are a type of provider
  navigation: [
    { id: 'profile', label: 'Supplier Profile', icon: 'User' },
    { id: 'home', label: 'Supply Dashboard', icon: 'Home', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    { 
      id: 'leads', 
      label: 'Purchase Requests', 
      icon: 'FileText', 
      permissions: [PERMISSIONS.MANAGE_QUOTES] 
    },
    { id: 'my-quotes', label: 'Active Quotations', icon: 'MessageSquare', permissions: [PERMISSIONS.MANAGE_QUOTES] },
    { id: 'archived-leads', label: 'Archived Requests', icon: 'Archive', permissions: [PERMISSIONS.MANAGE_QUOTES] },
    { 
      id: 'paid-orders', 
      label: 'Purchase Orders', 
      icon: 'Truck', 
      permissions: [PERMISSIONS.VIEW_ANALYTICS] 
    },
    { id: 'collection', label: 'Fulfillment / Pickup', icon: 'QrCode', permissions: [PERMISSIONS.MANAGE_COLLECTIONS] },
    {
      id: 'products',
      label: 'Supply Catalog',
      icon: 'Store',
      permissions: [PERMISSIONS.VIEW_ANALYTICS]
    },
    { id: 'team', label: 'Operations Team', icon: 'Users', permissions: [PERMISSIONS.MANAGE_TEAM] },
    { id: 'financial', label: 'Settlements', icon: 'Wallet' },
    { id: 'advertise', label: 'Advertise', icon: 'Megaphone' },
    JOB_BOARD_POSTER_NAV_ITEM,
    JOB_SEEKER_FEED_NAV_ITEM,
    JOB_SEEKER_APPLICATIONS_NAV_ITEM,
    { id: 'audit-trail', label: 'Supply Audit', icon: 'History', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    REPORTING_NAV_ITEM,
  ],
  views: {
    home: {
      title: "Supply Operations Overview",
      subtitle: "Track corporate purchase requests and active quotations",
      componentType: 'provider_home',
      showWalletCard: true,
      showAnalyticsChart: true,
      metrics: [
        { id: 'inquiries_received', label: 'Requests Received', value: 0, icon: 'MessageSquare' },
        { id: 'quotes_sent', label: 'Quotations Sent', value: 0, icon: 'Check' },
        { id: 'total_quoted_value', label: 'Total Supply Value', value: 0, icon: 'TrendingUp' },
        { id: 'pending_collection', label: 'Awaiting Pickup', value: 0, icon: 'Clock' },
      ]
    },
    leads: {
      title: 'Purchase Requests',
      subtitle: "Open requests for your supply categories",
      componentType: 'provider_leads',
      dataKey: 'leads'
    },
    'paid-orders': {
      title: 'Active Purchase Orders',
      subtitle: "Orders awaiting supply fulfillment",
      componentType: 'provider_orders',
      dataKey: 'paidOrders'
    },
    'my-quotes': {
      title: "Sent Quotations",
      subtitle: "Track your active supply proposals",
      componentType: 'provider_quotes',
      dataKey: 'quotes'
    },
    products: {
      title: 'Supply Inventory Management',
      subtitle: "Manage your wholesale or supply stock levels",
      componentType: 'provider_products'
    },
    collection: {
      title: "Order Handover",
      subtitle: "Verify and complete supply collections",
      componentType: 'provider_collection'
    },
    profile: {
      title: "Supplier Profile",
      subtitle: "Manage your professional B2B presence",
      componentType: 'profile_renderer'
    },
    'audit-trail': {
      title: "Operations Audit",
      subtitle: "Track supply chain activities and changes",
      componentType: 'provider_placeholder'
    },
    financial: {
      title: "Financial Settlements",
      subtitle: "Track funds released from completed sales",
      componentType: 'venture_account_renderer'
    },
    advertise: {
      title: 'Advertise',
      subtitle: 'Promote your shop with a paid homepage or sidebar ad placement',
      componentType: 'ads_manager_renderer',
    },
    'my-job-posts': JOB_BOARD_POSTER_VIEW,
    'find-jobs': JOB_SEEKER_FEED_VIEW,
    'my-applications': JOB_SEEKER_APPLICATIONS_VIEW,
    reporting: REPORTING_VIEW,
  }
};
