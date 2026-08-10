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

/**
 * MASTER_ENTERTAINMENT_ACCOUNT_SCHEMA — dashboard for sellers whose
 * primary archetype is ENTERTAINMENT (DJs, live bands, MCs, hosts,
 * dancers, comedians, performers, influencers). Performers don't
 * stock physical inventory and the engagement is the performance
 * itself, not a product or a service-on-an-asset.
 *
 * Nav (10): Profile, Home, Performance Bookings, My Quotes, Archived,
 *           Performance Catalog, Schedule, Confirmed Gigs, Team,
 *           Financial, Audit.
 *
 * Why no `products` in the buyer's "things in stock" sense — the
 * performance catalog uses the `provider_products` renderer for
 * uniformity but the framing is "what acts/sets you offer", not
 * "what items you stock".
 */
export const MASTER_ENTERTAINMENT_ACCOUNT_SCHEMA: MasterAccountSchema = {
  schemaType: 'PROVIDER',
  navigation: [
    { id: 'profile', label: 'Profile', icon: 'User' },
    { id: 'home', label: 'Home', icon: 'Home', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    { id: 'leads', label: 'Performance Bookings', icon: 'FileText', permissions: [PERMISSIONS.MANAGE_QUOTES] },
    { id: 'my-quotes', label: 'My Quotes', icon: 'MessageSquare', permissions: [PERMISSIONS.MANAGE_QUOTES] },
    { id: 'archived-leads', label: 'Archived Leads', icon: 'Archive', permissions: [PERMISSIONS.MANAGE_QUOTES] },
    { id: 'products', label: 'Performance Catalog', icon: 'Music', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    { id: 'schedule', label: 'Gig Calendar', icon: 'Calendar', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    { id: 'paid-orders', label: 'Confirmed Gigs', icon: 'Check', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    { id: 'team', label: 'Team Management', icon: 'Users', permissions: [PERMISSIONS.MANAGE_TEAM] },
    { id: 'financial', label: 'Financial Account', icon: 'Wallet' },
    { id: 'advertise', label: 'Advertise', icon: 'Megaphone' },
    JOB_BOARD_POSTER_NAV_ITEM,
    JOB_SEEKER_FEED_NAV_ITEM,
    JOB_SEEKER_APPLICATIONS_NAV_ITEM,
    { id: 'audit-trail', label: 'Audit Trail', icon: 'History', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    REPORTING_NAV_ITEM,
  ],
  views: {
    home: {
      title: 'Performance Dashboard',
      subtitle: 'Track your performance bookings and confirmed gigs',
      componentType: 'provider_home',
      showWalletCard: true,
      showAnalyticsChart: true,
    },
    leads: {
      title: 'Performance Bookings',
      subtitle: 'Open requests from buyers planning events',
      componentType: 'provider_leads',
      dataKey: 'leads',
    },
    'my-quotes': {
      title: 'My Submitted Quotes',
      subtitle: 'Performance quotes you have submitted',
      componentType: 'provider_quotes',
      dataKey: 'quotes',
    },
    'archived-leads': {
      title: 'Archived Leads',
      subtitle: 'Performance bookings you previously dismissed or completed',
      componentType: 'provider_leads',
      dataKey: 'leads',
    },
    products: {
      title: 'Performance Catalog',
      subtitle: 'The acts and sets you offer',
      componentType: 'provider_products',
    },
    schedule: {
      title: 'Gig Calendar',
      subtitle: 'Upcoming gigs and confirmed dates',
      componentType: 'provider_schedule',
    },
    'paid-orders': {
      title: 'Confirmed Gigs',
      subtitle: 'Paid bookings awaiting the performance date',
      componentType: 'provider_orders',
      dataKey: 'paidOrders',
    },
    team: {
      title: 'Team Management',
      subtitle: 'Manage your crew and their permissions',
      componentType: 'provider_team',
    },
    profile: {
      title: 'Stage Profile',
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
    'my-job-posts': JOB_BOARD_POSTER_VIEW,
    'find-jobs': JOB_SEEKER_FEED_VIEW,
    'my-applications': JOB_SEEKER_APPLICATIONS_VIEW,
    'audit-trail': {
      title: 'Audit Trail',
      subtitle: 'Track all activities and changes',
      componentType: 'provider_placeholder',
    },
    reporting: REPORTING_VIEW,
  },
};
