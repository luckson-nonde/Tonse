import { MasterAccountSchema } from './accountSchemaTypes';

export type ViewType = 
  | 'dashboard' 
  | 'profile' 
  | 'inquiries'
  | 'quotes'
  | 'loan_offers'
  | 'orders'
  | 'settings'
  | 'inquiry_details'
  | 'quote_details'
  | 'order_details'
  | 'financial'
  | 'shops';

export const MASTER_BUYER_ACCOUNT_SCHEMA: MasterAccountSchema = {
  schemaType: 'BUYER',
  navigation: [
    { id: 'dashboard', label: 'Overview', icon: 'LayoutDashboard' },
    { id: 'inquiries', label: 'My Inquiries', icon: 'MessageSquare' },
    { id: 'quotes', label: 'Received Quotes', icon: 'FileText' },
    { id: 'loan_offers', label: 'Loan Offers', icon: 'Landmark' },
    { id: 'orders', label: 'Order History', icon: 'ShoppingBag' },
    { id: 'shops', label: 'Browse Shops', icon: 'Store' },
    { id: 'profile', label: 'Account Settings', icon: 'User' },
    { id: 'financial', label: 'Financial Account', icon: 'Wallet' },
  ],
  views: {
    dashboard: {
      title: "Marketplace Overview",
      subtitle: "Track your active inquiries and received quotations",
      componentType: 'dashboard_grid',
      showWalletCard: true,
      metrics: [
        { id: 'active_inquiries', label: 'Active Inquiries', value: 0, icon: 'MessageSquare' },
        { id: 'pending_quotes', label: 'Pending Quotes', value: 0, icon: 'FileText' },
        { id: 'completed_orders', label: 'Completed Orders', value: 0, icon: 'CheckCircle' },
      ],
      actions: [
        // "New Inquiry" (not "Create New Inquiry") so the label fits the
        // half-width pill on a 360px phone — matches the inquiries view.
        { id: 'new_inquiry', label: 'New Inquiry', icon: 'Plus', type: 'navigate', target: '/categories', variant: 'primary' },
        { id: 'browse_shops', label: 'Browse Shops', icon: 'Store', type: 'navigate', target: '/shops', variant: 'secondary' },
      ]
    },
    inquiries: {
      title: "My Inquiries",
      subtitle: "Manage your requests for quotes and services",
      componentType: 'list_renderer',
      dataKey: 'inquiries',
      actions: [
        { id: 'new_inquiry', label: 'New Inquiry', icon: 'Plus', type: 'navigate', target: '/categories', variant: 'primary' },
        { id: 'browse_shops', label: 'Browse Shops', icon: 'Store', type: 'navigate', target: '/shops', variant: 'secondary' },
      ]
    },
    quotes: {
      title: "Received Quotes",
      subtitle: "Review and compare offers from verified providers",
      componentType: 'list_renderer',
      dataKey: 'quotes'
    },
    loan_offers: {
      title: "Loan Offers",
      subtitle: "Review and respond to loan offers from lenders",
      componentType: 'list_renderer',
      dataKey: 'loanOffers'
    },
    orders: {
      title: "Order History",
      subtitle: "View your past transactions and archived quotes",
      componentType: 'list_renderer',
      dataKey: 'orders'
    },
    shops: {
      title: "Shops & Retailers",
      subtitle: "Browse and discover verified shops and service providers",
      componentType: 'list_renderer',
      dataKey: 'shops'
    },
    profile: {
      title: "Account Settings",
      subtitle: "Refine your professional presence and security",
      componentType: 'profile_renderer'
    },
    financial: {
      title: "Financial Account",
      subtitle: "Manage your virtual wallet and transaction security",
      componentType: 'financial_renderer'
    },
    settings: {
      title: "Preferences",
      subtitle: "Manage notifications and app behavior",
      componentType: 'profile_renderer'
    },
    inquiry_details: {
      title: "Inquiry Details",
      subtitle: "Full breakdown of your request and responses",
      componentType: 'details_renderer',
      dataKey: 'selectedInquiry'
    },
    quote_details: {
      title: "Quote Details",
      subtitle: "Review the full offer from the provider",
      componentType: 'details_renderer',
      dataKey: 'selectedQuote'
    },
    order_details: {
      title: "Order Details",
      subtitle: "Transaction history and collection details",
      componentType: 'details_renderer',
      dataKey: 'selectedOrder'
    }
  }
};

export interface InquiryStatusSchema {
  states: {
    [key: string]: {
      label: string;
      color: string;
      icon: string;
      nextActions: string[];
    };
  };
}

export const INQUIRY_STATUS_SCHEMA: InquiryStatusSchema = {
  states: {
    'PENDING': {
      label: 'Awaiting Quotes',
      color: '#C9973A',
      icon: 'Clock',
      nextActions: ['CANCEL']
    },
    'QUOTED': {
      label: 'Quotes Received',
      color: '#10b981',
      icon: 'FileCheck',
      nextActions: ['VIEW_QUOTES', 'CANCEL']
    },
    'ACCEPTED': {
      label: 'Quote Accepted',
      color: '#3b82f6',
      icon: 'CheckCircle',
      nextActions: ['PROCEED_TO_PAYMENT']
    },
    'COMPLETED': {
      label: 'Completed',
      color: '#64748b',
      icon: 'Archive',
      nextActions: ['VIEW_DETAILS']
    },
    'CANCELLED': {
      label: 'Cancelled',
      color: '#ef4444',
      icon: 'XCircle',
      nextActions: ['REOPEN']
    }
  }
};
