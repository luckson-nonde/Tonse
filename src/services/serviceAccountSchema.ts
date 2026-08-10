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
 * MASTER_SERVICE_ACCOUNT_SCHEMA — dashboard for sellers whose primary
 * archetype is SERVICE (e.g. consultants, designers, lawyers, tutors,
 * accountants — any non-repair, non-event professional service). Work
 * is project-based: a brief comes in, a quote/proposal goes out, an
 * engagement runs. No fleet, no schedule of returns, no event date.
 *
 * Nav (10): Profile, Home, Service Requests, My Proposals, Archived,
 *           Service Catalog, Active Engagements, Team, Financial, Audit.
 *
 * Why no `schedule`: service work is project-based, not slot-based.
 * If the practitioner wants a calendar they can use a separate tool.
 */
export const MASTER_SERVICE_ACCOUNT_SCHEMA: MasterAccountSchema = {
  schemaType: 'PROVIDER',
  navigation: [
    { id: 'profile', label: 'Profile', icon: 'User' },
    { id: 'home', label: 'Home', icon: 'Home', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    { id: 'leads', label: 'Service Requests', icon: 'FileText', permissions: [PERMISSIONS.MANAGE_QUOTES] },
    { id: 'my-quotes', label: 'My Proposals', icon: 'MessageSquare', permissions: [PERMISSIONS.MANAGE_QUOTES] },
    { id: 'archived-leads', label: 'Archived Leads', icon: 'Archive', permissions: [PERMISSIONS.MANAGE_QUOTES] },
    { id: 'products', label: 'Service Catalog', icon: 'Briefcase', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    { id: 'paid-orders', label: 'Active Engagements', icon: 'TrendingUp', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    {
      id: 'my-clients',
      label: 'My Clients',
      icon: 'HeartPulse',
      permissions: [PERMISSIONS.MANAGE_QUOTES],
      // Home Care caregivers only — care plans, visit schedule, client duties.
      // Matches the id 'home-care' after the dash→space normalisation in
      // DashboardLayout's categoryFilter matcher.
      categoryFilter: ['home care'],
    },
    { id: 'team', label: 'Team Management', icon: 'Users', permissions: [PERMISSIONS.MANAGE_TEAM] },
    { id: 'financial', label: 'Financial Account', icon: 'Wallet' },
    { id: 'advertise', label: 'Advertise', icon: 'Megaphone' },
    JOB_BOARD_POSTER_NAV_ITEM,
    JOB_SEEKER_FEED_NAV_ITEM,
    JOB_SEEKER_APPLICATIONS_NAV_ITEM,
    // Events-family sellers only (catering/decor/planning/management resolve
    // to the SERVICE archetype). 'event' substring-matches every event-*
    // category id after dash→space normalization; see DashboardLayout.
    { id: 'tickets', label: 'Ticket Manager', icon: 'Ticket', categoryFilter: ['event'] },
    { id: 'audit-trail', label: 'Audit Trail', icon: 'History', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    REPORTING_NAV_ITEM,
  ],
  views: {
    home: {
      title: 'Practice Overview',
      subtitle: 'Track your service requests, proposals, and active engagements',
      componentType: 'provider_home',
      showWalletCard: true,
      showAnalyticsChart: true,
    },
    leads: {
      title: 'Service Requests',
      subtitle: 'Open client briefs in your areas of practice',
      componentType: 'provider_leads',
      dataKey: 'leads',
    },
    'my-quotes': {
      title: 'My Proposals',
      subtitle: 'Proposals you have submitted and their status',
      componentType: 'provider_quotes',
      dataKey: 'quotes',
    },
    'archived-leads': {
      title: 'Archived Leads',
      subtitle: 'Briefs you previously dismissed or completed',
      componentType: 'provider_leads',
      dataKey: 'leads',
    },
    products: {
      title: 'Service Catalog',
      subtitle: 'Services you offer to clients',
      componentType: 'provider_products',
    },
    'paid-orders': {
      title: 'Active Engagements',
      subtitle: 'Paid engagements in delivery',
      componentType: 'provider_orders',
      dataKey: 'paidOrders',
    },
    'my-clients': {
      title: 'My Clients',
      subtitle: 'Care plans, visit schedules and duties for your home-care clients',
      componentType: 'home_care_clients',
    },
    team: {
      title: 'Team Management',
      subtitle: 'Manage your associates and their permissions',
      componentType: 'provider_team',
    },
    profile: {
      title: 'Practice Profile',
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
    tickets: {
      title: 'Ticket Manager',
      subtitle: 'Create events, sell tickets through a share link, and track attendees',
      componentType: 'ticket_manager_renderer',
    },
    'audit-trail': {
      title: 'Audit Trail',
      subtitle: 'Track all activities and changes',
      componentType: 'provider_placeholder',
    },
    reporting: REPORTING_VIEW,
  },
};
