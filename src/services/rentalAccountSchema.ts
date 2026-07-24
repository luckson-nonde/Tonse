import { PERMISSIONS } from '../utils/rbac';
import { MasterAccountSchema } from './accountSchemaTypes';
import { REPORTING_NAV_ITEM, REPORTING_VIEW } from './reportingNavFragment';

/**
 * MASTER_RENTAL_ACCOUNT_SCHEMA — dashboard for sellers whose primary
 * archetype is RENTAL (e.g. car rental, equipment rental, property /
 * short-term rental). Different from EVENTS — a rental shop doesn't
 * book sessions, it tracks fleet utilisation, return dates, and
 * deposits. Different from RETAIL — items return after use, not sold.
 *
 * Nav (11): Profile, Home, Rental Requests, My Quotes, Archived,
 *           Rental Fleet, Active Rentals, Return Schedule, Team,
 *           Financial, Audit.
 *
 * Why `schedule` is included (vs RETAIL/REPAIR which drop it): rental
 * businesses live and die by knowing when items come back. The
 * calendar is the operational heartbeat.
 */
export const MASTER_RENTAL_ACCOUNT_SCHEMA: MasterAccountSchema = {
  schemaType: 'PROVIDER',
  navigation: [
    { id: 'profile', label: 'Profile', icon: 'User' },
    { id: 'home', label: 'Home', icon: 'Home', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    { id: 'leads', label: 'Rental Requests', icon: 'FileText', permissions: [PERMISSIONS.MANAGE_QUOTES] },
    { id: 'my-quotes', label: 'My Quotes', icon: 'MessageSquare', permissions: [PERMISSIONS.MANAGE_QUOTES] },
    { id: 'archived-leads', label: 'Archived Leads', icon: 'Archive', permissions: [PERMISSIONS.MANAGE_QUOTES] },
    { id: 'products', label: 'Rental Fleet', icon: 'Package', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    { id: 'paid-orders', label: 'Active Rentals', icon: 'Truck', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    { id: 'schedule', label: 'Return Schedule', icon: 'Calendar', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    { id: 'team', label: 'Team Management', icon: 'Users', permissions: [PERMISSIONS.MANAGE_TEAM] },
    { id: 'financial', label: 'Financial Account', icon: 'Wallet' },
    { id: 'audit-trail', label: 'Audit Trail', icon: 'History', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    REPORTING_NAV_ITEM,
  ],
  views: {
    home: {
      title: 'Rental Dashboard',
      subtitle: 'Track your rental requests, fleet, and returns',
      componentType: 'provider_home',
      showWalletCard: true,
      showAnalyticsChart: true,
    },
    leads: {
      title: 'Rental Requests',
      subtitle: 'Open requests from buyers wanting to rent',
      componentType: 'provider_leads',
      dataKey: 'leads',
    },
    'my-quotes': {
      title: 'My Submitted Quotes',
      subtitle: 'Rental quotes you have submitted',
      componentType: 'provider_quotes',
      dataKey: 'quotes',
    },
    'archived-leads': {
      title: 'Archived Leads',
      subtitle: 'Rental requests you previously dismissed or completed',
      componentType: 'provider_leads',
      dataKey: 'leads',
    },
    products: {
      title: 'Rental Fleet',
      subtitle: 'Manage your rental inventory and pricing',
      componentType: 'provider_products',
    },
    'paid-orders': {
      title: 'Active Rentals',
      subtitle: 'Paid rentals out with customers',
      componentType: 'provider_orders',
      dataKey: 'paidOrders',
    },
    schedule: {
      title: 'Return Schedule',
      subtitle: 'Upcoming returns and rental availability',
      componentType: 'provider_schedule',
    },
    team: {
      title: 'Team Management',
      subtitle: 'Manage your staff and their permissions',
      componentType: 'provider_team',
    },
    profile: {
      title: 'Rental Business Profile',
      subtitle: 'Manage your professional presence',
      componentType: 'profile_renderer',
    },
    financial: {
      title: 'Financial Account',
      subtitle: 'Track funds released from completed sales',
      componentType: 'venture_account_renderer',
    },
    'audit-trail': {
      title: 'Audit Trail',
      subtitle: 'Track all activities and changes',
      componentType: 'provider_placeholder',
    },
    reporting: REPORTING_VIEW,
  },
};
