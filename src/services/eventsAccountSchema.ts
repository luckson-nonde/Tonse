import { PERMISSIONS } from '../utils/rbac';
import { MasterAccountSchema } from './accountSchemaTypes';
import { REPORTING_NAV_ITEM, REPORTING_VIEW } from './reportingNavFragment';

/**
 * MASTER_EVENTS_ACCOUNT_SCHEMA — dashboard for sellers whose primary
 * archetype is EVENTS (event venues, event equipment rental, event
 * catering, decorators). Different from BOOKING because each event is
 * a single produced occasion with a date, not a recurring slot.
 * Different from ENTERTAINMENT because it's the venue/equipment side,
 * not the performance side.
 *
 * Nav (12): Profile, Home, Event Bookings, My Quotes, Archived,
 *           Schedule, Venue Spaces, Inventory, Paid Bookings,
 *           Collection, Team, Financial, Audit.
 *
 * The previous MASTER_PROVIDER_ACCOUNT_SCHEMA was effectively events-
 * shaped — every "Booking Requests" / "Paid Bookings" / "Venue Spaces"
 * label, every per-businessType filter on `venue-spaces`, was an
 * events accommodation. This schema makes that explicit so PROVIDER
 * can become a true generic fallback.
 */
export const MASTER_EVENTS_ACCOUNT_SCHEMA: MasterAccountSchema = {
  schemaType: 'PROVIDER',
  navigation: [
    { id: 'profile', label: 'Profile', icon: 'User' },
    { id: 'home', label: 'Home', icon: 'Home', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    { id: 'leads', label: 'Event Bookings', icon: 'FileText', permissions: [PERMISSIONS.MANAGE_QUOTES] },
    { id: 'my-quotes', label: 'My Quotes', icon: 'MessageSquare', permissions: [PERMISSIONS.MANAGE_QUOTES] },
    { id: 'archived-leads', label: 'Archived Leads', icon: 'Archive', permissions: [PERMISSIONS.MANAGE_QUOTES] },
    { id: 'schedule', label: 'My Schedule', icon: 'Calendar', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    {
      id: 'venue-spaces',
      label: 'Venue Spaces',
      icon: 'MapPin',
      permissions: [PERMISSIONS.VIEW_ANALYTICS],
      // Nav-level filter: only sellers in the events bucket who
      // actually picked a venue category see this. An equipment-rental
      // events seller doesn't.
      categoryFilter: ['event venues'],
    },
    { id: 'products', label: 'Equipment Catalog', icon: 'Package', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    { id: 'paid-orders', label: 'Paid Bookings', icon: 'Truck', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    { id: 'collection', label: 'Collection', icon: 'QrCode', permissions: [PERMISSIONS.MANAGE_COLLECTIONS] },
    { id: 'team', label: 'Team Management', icon: 'Users', permissions: [PERMISSIONS.MANAGE_TEAM] },
    { id: 'financial', label: 'Financial Account', icon: 'Wallet' },
    { id: 'advertise', label: 'Advertise', icon: 'Megaphone' },
    { id: 'audit-trail', label: 'Audit Trail', icon: 'History', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    REPORTING_NAV_ITEM,
  ],
  views: {
    home: {
      title: 'Events Dashboard',
      subtitle: 'Track your event bookings, calendar, and inventory',
      componentType: 'provider_home',
      showWalletCard: true,
      showAnalyticsChart: true,
    },
    leads: {
      title: 'Event Bookings',
      subtitle: 'Open requests from buyers planning events',
      componentType: 'provider_leads',
      dataKey: 'leads',
    },
    'my-quotes': {
      title: 'My Submitted Quotes',
      subtitle: 'Event quotes you have submitted',
      componentType: 'provider_quotes',
      dataKey: 'quotes',
    },
    'archived-leads': {
      title: 'Archived Leads',
      subtitle: 'Event bookings you previously dismissed or completed',
      componentType: 'provider_leads',
      dataKey: 'leads',
    },
    schedule: {
      title: 'My Schedule',
      subtitle: 'Upcoming events and rental returns',
      componentType: 'provider_schedule',
    },
    'venue-spaces': {
      title: 'Venue Spaces',
      subtitle: 'Manage the spaces buyers can book',
      componentType: 'venue_spaces_renderer',
    },
    products: {
      title: 'Inventory',
      subtitle: 'Manage your event equipment and packages',
      componentType: 'provider_products',
    },
    'paid-orders': {
      title: 'Paid Bookings',
      subtitle: 'Confirmed events awaiting their date',
      componentType: 'provider_orders',
      dataKey: 'paidOrders',
    },
    collection: {
      title: 'Collection',
      subtitle: 'Equipment and rental handover via QR scan',
      componentType: 'provider_collection',
    },
    team: {
      title: 'Team Management',
      subtitle: 'Manage your event staff and their permissions',
      componentType: 'provider_team',
    },
    profile: {
      title: 'Events Business Profile',
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
