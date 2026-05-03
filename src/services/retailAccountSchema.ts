import { PERMISSIONS } from '../utils/rbac';
import { MasterAccountSchema } from './accountSchemaTypes';

/**
 * MASTER_RETAIL_ACCOUNT_SCHEMA — dashboard for sellers whose archetype
 * resolves to RETAIL_PRODUCTS (e.g. Electronics retailer, fashion shop,
 * groceries store). The previous shared MASTER_PROVIDER_ACCOUNT_SCHEMA
 * was booking-shaped — `My Schedule`, `Collection`, `Venue Spaces` —
 * which made an Electronics shop look like an event-venue dashboard
 * with retail items wedged in. This schema strips the booking surfaces
 * and keeps the surfaces a retail shop actually uses.
 *
 * Nav (10): Profile, Home, Buyer Inquiries, My Quotes, Archived Leads,
 *           Inventory, Orders, Financial Account, Team, Audit Trail.
 *
 * Notable removals vs. provider:
 *   - `schedule`        — retail doesn't book sessions.
 *   - `venue-spaces`    — events-only.
 *   - `collection`      — retail handover happens via Order status
 *                         transitions, not a separate QR-scan flow.
 *
 * componentType values reuse the existing `provider_*` renderers in
 * DynamicAccountRenderer; only the surrounding nav structure and the
 * view titles / subtitles change.
 */
export const MASTER_RETAIL_ACCOUNT_SCHEMA: MasterAccountSchema = {
  schemaType: 'PROVIDER',
  navigation: [
    { id: 'profile', label: 'Profile', icon: 'User' },
    { id: 'home', label: 'Home', icon: 'Home', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    { id: 'leads', label: 'Buyer Inquiries', icon: 'FileText', permissions: [PERMISSIONS.MANAGE_QUOTES] },
    { id: 'my-quotes', label: 'My Quotes', icon: 'MessageSquare', permissions: [PERMISSIONS.MANAGE_QUOTES] },
    { id: 'archived-leads', label: 'Archived Leads', icon: 'Archive', permissions: [PERMISSIONS.MANAGE_QUOTES] },
    { id: 'products', label: 'Inventory', icon: 'Store', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    { id: 'paid-orders', label: 'Orders', icon: 'Truck', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    { id: 'team', label: 'Team Management', icon: 'Users', permissions: [PERMISSIONS.MANAGE_TEAM] },
    { id: 'financial', label: 'Financial Account', icon: 'Wallet' },
    { id: 'audit-trail', label: 'Audit Trail', icon: 'History', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
  ],
  views: {
    home: {
      title: 'Marketplace Overview',
      subtitle: 'Track your buyer inquiries, quotes, and orders',
      componentType: 'provider_home',
      showWalletCard: true,
      showAnalyticsChart: true,
    },
    leads: {
      title: 'Buyer Inquiries',
      subtitle: 'Open inquiries from buyers in your categories',
      componentType: 'provider_leads',
      dataKey: 'leads',
    },
    'my-quotes': {
      title: 'My Submitted Quotes',
      subtitle: 'Track your submissions and their status',
      componentType: 'provider_quotes',
      dataKey: 'quotes',
    },
    'archived-leads': {
      title: 'Archived Leads',
      subtitle: 'Inquiries you previously dismissed or completed',
      componentType: 'provider_leads',
      dataKey: 'leads',
    },
    products: {
      title: 'Inventory',
      subtitle: "Manage what's in stock and pricing",
      componentType: 'provider_products',
    },
    'paid-orders': {
      title: 'Orders',
      subtitle: 'Paid orders awaiting handover or completed',
      componentType: 'provider_orders',
      dataKey: 'paidOrders',
    },
    team: {
      title: 'Team Management',
      subtitle: 'Manage your staff and their permissions',
      componentType: 'provider_team',
    },
    profile: {
      title: 'Shop Profile',
      subtitle: 'Manage your professional presence',
      componentType: 'profile_renderer',
    },
    financial: {
      title: 'Financial Account',
      subtitle: 'Manage your virtual wallet and transaction security',
      componentType: 'financial_renderer',
    },
    'audit-trail': {
      title: 'Audit Trail',
      subtitle: 'Track all activities and changes',
      componentType: 'provider_placeholder',
    },
  },
};
