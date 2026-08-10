import { MasterAccountSchema } from './accountSchemaTypes';
import { REPORTING_NAV_ITEM, REPORTING_VIEW } from './reportingNavFragment';
import { JOB_BOARD_POSTER_NAV_ITEM, JOB_BOARD_POSTER_VIEW } from './jobBoardNavFragments';

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
  | 'shops'
  | 'favorites'
  | 'my-job-posts'
  | 'reporting';

export const MASTER_BUYER_ACCOUNT_SCHEMA: MasterAccountSchema = {
  schemaType: 'BUYER',
  navigation: [
    { id: 'dashboard', label: 'Overview', icon: 'LayoutDashboard' },
    { id: 'inquiries', label: 'My Inquiries', icon: 'MessageSquare' },
    { id: 'quotes', label: 'Received Quotes', icon: 'FileText' },
    // Two independent pages (NOT tabs on one screen): Active = paid orders
    // still awaiting collection; History = collected purchases + expired
    // quotes + closed/cancelled requests.
    { id: 'active_transactions', label: 'Active Transactions', icon: 'ShoppingBag' },
    { id: 'orders', label: 'Transaction History', icon: 'History' },
    { id: 'shops', label: 'Browse Shops', icon: 'Store' },
    // Routes to the /schedule page (calendar on top, day schedule below) —
    // same destination as the provider's "My Schedule" nav item. On
    // desktop the dashboard also embeds the calendar (right rail) +
    // timeline (main column); this item is the mobile/tablet path where
    // the rail is hidden.
    { id: 'schedule', label: 'Calendar', icon: 'Calendar' },
    { id: 'profile', label: 'Account Settings', icon: 'User' },
    { id: 'financial', label: 'Financial Account', icon: 'Wallet' },
    JOB_BOARD_POSTER_NAV_ITEM,
    REPORTING_NAV_ITEM,
    // Contextual tab — hidden until the buyer actually engages the Loans
    // category (a loan inquiry) or receives a loan offer. Rendered in the
    // "Your Activity" section below the core tabs. See requiresActivity +
    // activitySignals in DashboardLayout; future category tabs (e.g. event
    // tickets) drop in here the same way.
    { id: 'loan_offers', label: 'Loan Offers', icon: 'Landmark', group: 'contextual', requiresActivity: 'loans' },
    // Surfaces once the buyer engages the events family (venue inquiry, event
    // quote, …) — an event organiser sells their tickets right here; proceeds
    // land in their Financial Account.
    { id: 'sell_tickets', label: 'Sell Event Tickets', icon: 'Ticket', group: 'contextual', requiresActivity: 'events' },
  ],
  views: {
    dashboard: {
      title: "Marketplace Overview",
      subtitle: "Track your active inquiries and received quotations",
      componentType: 'dashboard_grid',
      showWalletCard: true,
      // Four activity tiles. Values + the small caption under each number are
      // computed at runtime from live data (see `metricStats` in
      // BuyerDashboard.tsx) — the `value: 0` here is only a placeholder.
      // "Ready to Collect" (paid, not yet handed over) and "Completed"
      // (collected) are split by the order's collection status, NOT the
      // order's own `status` (which never advances past PENDING).
      metrics: [
        { id: 'active_inquiries', label: 'Active Inquiries', value: 0, icon: 'MessageSquare' },
        { id: 'quotes_received', label: 'Quotes Received', value: 0, icon: 'FileText' },
        { id: 'ready_to_collect', label: 'Ready to Collect', value: 0, icon: 'QrCode' },
        { id: 'completed_orders', label: 'Completed', value: 0, icon: 'CheckCircle' },
      ],
      // Promo copy for the "Need a price?" card (schema-driven so the wording
      // lives here, not buried in the renderer JSX).
      ctaTitle: 'Need a price?',
      ctaSubtitle:
        'Send one inquiry and every verified shop in your area sends you a quote — no walking shop to shop.',
      actions: [
        // "Send Inquiry" (not "Create New Inquiry") so the label fits the
        // half-width pill on a 360px phone — matches the inquiries view.
        { id: 'new_inquiry', label: 'Send Inquiry', icon: 'Plus', type: 'navigate', target: '/categories', variant: 'primary' },
        { id: 'browse_shops', label: 'Browse Shops', icon: 'Store', type: 'navigate', target: '/shops', variant: 'secondary' },
      ]
    },
    inquiries: {
      title: "My Inquiries",
      subtitle: "Manage your requests for quotes and services",
      componentType: 'list_renderer',
      dataKey: 'inquiries',
      actions: [
        { id: 'new_inquiry', label: 'Send Inquiry', icon: 'Plus', type: 'navigate', target: '/categories', variant: 'primary' },
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
    sell_tickets: {
      title: "Sell Event Tickets",
      subtitle: "Create your event, share the link, and sell tickets — proceeds land in your Financial Account",
      componentType: 'ticket_manager_renderer'
    },
    active_transactions: {
      title: "Active Transactions",
      subtitle: "Paid orders waiting to be collected",
      componentType: 'active_transactions_renderer',
    },
    orders: {
      title: "Transaction History",
      subtitle: "Collected purchases, expired quotes, and closed requests",
      componentType: 'transaction_history_renderer',
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
    'my-job-posts': JOB_BOARD_POSTER_VIEW,
    reporting: REPORTING_VIEW,
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
