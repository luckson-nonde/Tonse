import { PERMISSIONS } from '../utils/rbac';
import { MasterAccountSchema } from './accountSchemaTypes';
import { REPORTING_NAV_ITEM, REPORTING_VIEW } from './reportingNavFragment';

/**
 * MASTER_REPAIR_ACCOUNT_SCHEMA — dashboard for sellers whose primary
 * archetype is REPAIR (e.g. a phone repair shop, laptop repair bench,
 * appliance repair service). Before this schema existed, REPAIR sellers
 * fell through to MASTER_PROVIDER_ACCOUNT_SCHEMA (booking-shaped) and
 * saw "My Schedule", "Venue Spaces" etc. — surfaces that don't apply
 * when you're fixing devices, not booking events.
 *
 * Nav (10): Profile, Home, Repair Requests, My Quotes, Archived Leads,
 *           Service Catalog, Active Repairs, Team, Financial, Audit.
 *
 * Notable removals vs. provider:
 *   - `schedule`        — repair shops queue jobs in `paid-orders`,
 *                         not on a calendar.
 *   - `venue-spaces`    — events-only.
 *   - `collection`      — repair handover happens via Order status
 *                         transitions (PAID → AWAITING_PICKUP →
 *                         COMPLETED), not a separate QR flow.
 *
 * componentType values reuse the existing `provider_*` renderers in
 * DynamicAccountRenderer; only nav structure + view titles differ.
 *
 * Multi-archetype RETAIL+REPAIR sellers currently land here (REPAIR has
 * priority over RETAIL in BUSINESS_TYPE_PRIORITY). Phase 2.1 will merge
 * the two schemas so the seller sees both surfaces; until then, primary-
 * archetype-wins is the explicit single-surface choice.
 */
export const MASTER_REPAIR_ACCOUNT_SCHEMA: MasterAccountSchema = {
  schemaType: 'PROVIDER',
  navigation: [
    { id: 'profile', label: 'Profile', icon: 'User' },
    { id: 'home', label: 'Home', icon: 'Home', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    { id: 'leads', label: 'Repair Requests', icon: 'Wrench', permissions: [PERMISSIONS.MANAGE_QUOTES] },
    { id: 'my-quotes', label: 'My Estimates', icon: 'MessageSquare', permissions: [PERMISSIONS.MANAGE_QUOTES] },
    { id: 'archived-leads', label: 'Archived Leads', icon: 'Archive', permissions: [PERMISSIONS.MANAGE_QUOTES] },
    { id: 'products', label: 'Service Catalog', icon: 'Wrench', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    { id: 'paid-orders', label: 'Active Repairs', icon: 'Tool', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    { id: 'team', label: 'Team Management', icon: 'Users', permissions: [PERMISSIONS.MANAGE_TEAM] },
    { id: 'financial', label: 'Financial Account', icon: 'Wallet' },
    { id: 'advertise', label: 'Advertise', icon: 'Megaphone' },
    { id: 'audit-trail', label: 'Audit Trail', icon: 'History', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    REPORTING_NAV_ITEM,
  ],
  views: {
    home: {
      title: 'Repair Workshop Overview',
      subtitle: 'Track your repair requests, estimates, and active jobs',
      componentType: 'provider_home',
      showWalletCard: true,
      showAnalyticsChart: true,
    },
    leads: {
      title: 'Repair Requests',
      subtitle: 'Open requests from buyers needing repair work',
      componentType: 'provider_leads',
      dataKey: 'leads',
    },
    'my-quotes': {
      title: 'My Estimates',
      subtitle: 'Quotes you have submitted and their status',
      componentType: 'provider_quotes',
      dataKey: 'quotes',
    },
    'archived-leads': {
      title: 'Archived Leads',
      subtitle: 'Repair requests you previously dismissed or completed',
      componentType: 'provider_leads',
      dataKey: 'leads',
    },
    products: {
      title: 'Service Catalog',
      subtitle: 'Repair services you offer to customers',
      componentType: 'provider_products',
    },
    'paid-orders': {
      title: 'Active Repairs',
      subtitle: 'Paid jobs awaiting handover or in progress',
      componentType: 'provider_orders',
      dataKey: 'paidOrders',
    },
    team: {
      title: 'Team Management',
      subtitle: 'Manage your technicians and their permissions',
      componentType: 'provider_team',
    },
    profile: {
      title: 'Workshop Profile',
      subtitle: 'Manage your professional presence',
      componentType: 'profile_renderer',
    },
    financial: {
      title: 'Financial Account',
      subtitle: 'Track funds released from completed sales',
      componentType: 'venture_account_renderer',
    },
    advertise: {
      title: 'Advertise',
      subtitle: 'Promote your shop with a paid homepage or sidebar ad placement',
      componentType: 'ads_manager_renderer',
    },
    'audit-trail': {
      title: 'Audit Trail',
      subtitle: 'Track all activities and changes',
      componentType: 'provider_placeholder',
    },
    reporting: REPORTING_VIEW,
  },
};
