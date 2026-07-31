import { PERMISSIONS } from '../utils/rbac';
import { MasterAccountSchema } from './accountSchemaTypes';
import { REPORTING_NAV_ITEM, REPORTING_VIEW } from './reportingNavFragment';

export type ProviderViewType = 
  | 'home' 
  | 'leads' 
  | 'paid-orders' 
  | 'my-quotes' 
  | 'products' 
  | 'schedule' 
  | 'team'
  | 'collection'
  | 'financial'
  | 'profile'
  | 'archived-leads'
  | 'venue-spaces'
  | 'financial'
  | 'audit-trail';

export const MASTER_PROVIDER_ACCOUNT_SCHEMA: MasterAccountSchema = {
  schemaType: 'PROVIDER',
  navigation: [
    { id: 'profile', label: 'Profile', icon: 'User' },
    { id: 'home', label: 'Home', icon: 'Home', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    { 
      id: 'leads', 
      label: (role) => (role === 'ENTERTAINMENT' || role === 'EVENTS') ? 'Booking Requests' : 'Booking Requests', 
      icon: 'FileText', 
      permissions: [PERMISSIONS.MANAGE_QUOTES] 
    },
    { id: 'my-quotes', label: 'My Quotes', icon: 'MessageSquare', permissions: [PERMISSIONS.MANAGE_QUOTES] },
    { id: 'archived-leads', label: 'Archived Leads', icon: 'Archive', permissions: [PERMISSIONS.MANAGE_QUOTES] },
    { id: 'schedule', label: 'My Schedule', icon: 'Calendar', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    {
      id: 'venue-spaces',
      label: 'Venue Spaces',
      icon: 'MapPin',
      permissions: [PERMISSIONS.VIEW_ANALYTICS],
      // businessTypes-driven now (instead of roleFilter: ['EVENTS']) so a
      // SELLER who picked "Event Venues" — and therefore resolves to
      // businessType=EVENTS via category detection — also gets this nav item.
      // The categoryFilter still narrows it to venue-specific sellers within
      // the events bucket, so an Equipment Rental seller doesn't see it.
      businessTypes: ['EVENTS'],
      categoryFilter: ['event venues'],
    },
    {
      id: 'paid-orders',
      label: (role) => (role === 'ENTERTAINMENT' || role === 'EVENTS') ? 'Paid Bookings' : 'Paid Orders',
      icon: 'Truck',
      permissions: [PERMISSIONS.VIEW_ANALYTICS]
    },
    {
      id: 'my-clients',
      label: 'My Clients',
      icon: 'HeartPulse',
      permissions: [PERMISSIONS.MANAGE_QUOTES],
      // Home Care caregivers only (categoryFilter matches the 'home-care' id
      // after dash→space normalisation) — same gating pattern as venue-spaces.
      categoryFilter: ['home care'],
    },
    {
      id: 'collection',
      label: 'Collection',
      icon: 'QrCode',
      permissions: [PERMISSIONS.MANAGE_COLLECTIONS],
      // Pure service businesses don't have physical handover, so the QR
      // collection flow doesn't apply. Repair shops DO need it (parts /
      // device handoff), so we keep them in.
      excludeRoles: undefined,
      businessTypes: [
        'RETAIL',
        'WHOLESALE',
        'REPAIR',
        'EVENTS',
        'RENTAL',
        'BOOKING',
      ],
    },
    {
      id: 'products',
      label: 'My Catalog',
      icon: 'Store',
      permissions: [PERMISSIONS.VIEW_ANALYTICS],
      excludeRoles: ['ENTERTAINMENT'],
      // Phase 2 of the users-table restructure removed EVENTS from the
      // role enum; the dashboard variant is now driven by the
      // `archetype` field on the seller / service-provider profile,
      // recomputed by ArchetypeResolverService on every category
      // write. Per-archetype label / visibility overlays live in
      // DashboardLayout.getLabel(); this schema entry is now archetype-
      // agnostic.
    },
    { id: 'team', label: 'Team Management', icon: 'Users', permissions: [PERMISSIONS.MANAGE_TEAM] },
    { id: 'financial', label: 'Financial Account', icon: 'Wallet' },
    { id: 'audit-trail', label: 'Audit Trail', icon: 'History', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    REPORTING_NAV_ITEM,
  ],
  views: {
    home: {
      title: "Marketplace Overview",
      subtitle: "Track your active inquiries and received quotations",
      componentType: 'provider_home',
      showWalletCard: true,
      showAnalyticsChart: true,
      metrics: [
        { id: 'inquiries_received', label: 'Inquiries Received', value: 0, icon: 'MessageSquare', excludeRoles: ['EVENTS'] },
        { id: 'new_requests', label: 'New Requests', value: 0, icon: 'MessageSquare', roleFilter: ['EVENTS'] },
        { id: 'quotes_sent', label: 'Quotes Sent', value: 0, icon: 'Check', excludeRoles: ['EVENTS'] },
        { id: 'upcoming_events', label: 'Upcoming Events', value: 0, icon: 'Calendar', roleFilter: ['EVENTS'] },
        { id: 'total_quoted_value', label: 'Total Quoted Value', value: 0, icon: 'TrendingUp' },
        { id: 'pending_collection', label: 'Pending Collection', value: 0, icon: 'Clock', excludeRoles: ['EVENTS'] },
        { id: 'inventory_items', label: 'Inventory Items', value: 0, icon: 'PackageOpen', roleFilter: ['EVENTS'] },
      ]
    },
    leads: {
      title: (role) => (role === 'ENTERTAINMENT' || role === 'EVENTS') ? 'Booking Requests' : 'Booking Requests',
      subtitle: "Based on your categories",
      componentType: 'provider_leads',
      dataKey: 'leads'
    },
    'paid-orders': {
      title: (role) => (role === 'ENTERTAINMENT' || role === 'EVENTS') ? 'Paid Bookings' : 'Paid Orders (Escrow)',
      subtitle: "Orders awaiting collection or fulfillment",
      componentType: 'provider_orders',
      dataKey: 'paidOrders'
    },
    'my-quotes': {
      title: "My Submitted Quotes",
      subtitle: "Track your submissions and their status",
      componentType: 'provider_quotes',
      dataKey: 'quotes'
    },
    products: {
      title: (role) => role === 'EVENTS' ? 'Inventory Management' : 'Product Management',
      subtitle: (role) => role === 'EVENTS' ? 'Manage your event equipment and services' : "Manage your shop's listed products",
      componentType: 'provider_products'
    },
    schedule: {
      title: "My Schedule",
      subtitle: (role) => role === 'EVENTS' ? 'Manage your upcoming equipment rentals and bookings' : 'Manage your upcoming bookings and events',
      componentType: 'provider_schedule',
      dataKey: 'schedules'
    },
    team: {
      title: "Team Management",
      subtitle: "Manage your staff and their permissions",
      componentType: 'provider_team'
    },
    collection: {
      title: "Parcel Collection",
      subtitle: "Verify and complete order collections",
      componentType: 'provider_collection'
    },
    profile: {
      title: "Shop Profile",
      subtitle: "Manage your professional presence",
      componentType: 'profile_renderer'
    },
    'audit-trail': {
      title: "Audit Trail",
      subtitle: "Track all activities and changes",
      componentType: 'provider_placeholder'
    },
    'venue-spaces': {
      title: "Venue Spaces",
      subtitle: "Manage your venue's available spaces",
      componentType: 'venue_spaces_renderer'
    },
    'my-clients': {
      title: "My Clients",
      subtitle: "Care plans, visit schedules and duties for your home-care clients",
      componentType: 'home_care_clients'
    },
    financial: {
      title: "Financial Account",
      subtitle: "Track funds released from completed sales",
      componentType: 'venture_account_renderer'
    },
    reporting: REPORTING_VIEW,
  }
};

export interface QuoteStatusSchema {
  states: {
    [key: string]: {
      label: string;
      color: string;
      icon: string;
      nextActions: string[];
    };
  };
}

export const QUOTE_STATUS_SCHEMA: QuoteStatusSchema = {
  states: {
    'PENDING': {
      label: 'Pending Review',
      color: '#C9973A',
      icon: 'Clock',
      nextActions: ['CANCEL', 'EDIT']
    },
    'ACCEPTED': {
      label: 'Accepted',
      color: '#10b981',
      icon: 'CheckCircle',
      nextActions: ['VIEW_DETAILS']
    },
    'REJECTED': {
      label: 'Rejected',
      color: '#ef4444',
      icon: 'XCircle',
      nextActions: ['VIEW_DETAILS']
    },
    'PAID': {
      label: 'Paid - Awaiting Collection',
      color: '#3b82f6',
      icon: 'CreditCard',
      nextActions: ['START_SCAN']
    },
    'AWAITING_PICKUP': {
      label: 'Awaiting Pickup',
      color: '#f59e0b',
      icon: 'Package',
      nextActions: ['COMPLETE_CHECKLIST']
    },
    'ARCHIVED': {
      label: 'Archived',
      color: '#64748b',
      icon: 'Archive',
      nextActions: ['RESTORE']
    }
  }
};
