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
 * MASTER_BOOKING_ACCOUNT_SCHEMA — dashboard for sellers whose primary
 * archetype is BOOKING (e.g. hotels, B&Bs, salon appointments, gym
 * sessions, doctor visits). Different from RENTAL because nothing
 * physical is handed over for return; the seller is selling time slots.
 * Different from EVENTS because it's recurring/granular slots, not
 * single dated event productions.
 *
 * Nav (11): Profile, Home, Booking Requests, My Quotes, Archived,
 *           Services & Slots, Confirmed Bookings, Schedule, Team,
 *           Financial, Audit.
 */
export const MASTER_BOOKING_ACCOUNT_SCHEMA: MasterAccountSchema = {
  schemaType: 'PROVIDER',
  navigation: [
    { id: 'profile', label: 'Profile', icon: 'User' },
    { id: 'home', label: 'Home', icon: 'Home', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    { id: 'leads', label: 'Booking Requests', icon: 'FileText', permissions: [PERMISSIONS.MANAGE_QUOTES] },
    { id: 'my-quotes', label: 'My Quotes', icon: 'MessageSquare', permissions: [PERMISSIONS.MANAGE_QUOTES] },
    { id: 'archived-leads', label: 'Archived Leads', icon: 'Archive', permissions: [PERMISSIONS.MANAGE_QUOTES] },
    { id: 'products', label: 'Service Catalog', icon: 'Package', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    { id: 'paid-orders', label: 'Confirmed Bookings', icon: 'Check', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    { id: 'schedule', label: 'Booking Calendar', icon: 'Calendar', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
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
      title: 'Booking Overview',
      subtitle: 'Track your booking requests, calendar, and confirmed sessions',
      componentType: 'provider_home',
      showWalletCard: true,
      showAnalyticsChart: true,
    },
    leads: {
      title: 'Booking Requests',
      subtitle: 'Open requests from buyers wanting to book',
      componentType: 'provider_leads',
      dataKey: 'leads',
    },
    'my-quotes': {
      title: 'My Submitted Quotes',
      subtitle: 'Booking quotes you have submitted',
      componentType: 'provider_quotes',
      dataKey: 'quotes',
    },
    'archived-leads': {
      title: 'Archived Leads',
      subtitle: 'Booking requests you previously dismissed or completed',
      componentType: 'provider_leads',
      dataKey: 'leads',
    },
    products: {
      title: 'Services & Slots',
      subtitle: 'Manage what you offer and your slot pricing',
      componentType: 'provider_products',
    },
    'paid-orders': {
      title: 'Confirmed Bookings',
      subtitle: 'Paid bookings awaiting the session date',
      componentType: 'provider_orders',
      dataKey: 'paidOrders',
    },
    schedule: {
      title: 'Booking Calendar',
      subtitle: 'Upcoming sessions and slot availability',
      componentType: 'provider_schedule',
    },
    team: {
      title: 'Team Management',
      subtitle: 'Manage your staff and their permissions',
      componentType: 'provider_team',
    },
    profile: {
      title: 'Business Profile',
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
