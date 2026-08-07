import { PERMISSIONS } from '../utils/rbac';
import { MasterAccountSchema } from './accountSchemaTypes';

/**
 * MASTER_PERSONAL_ACCOUNT_SCHEMA — dashboard for the "Personal
 * Profile" persona. Activated by the Profile popover in the sidebar.
 *
 * What's here is identity / financial / personal-history surfaces:
 * the bits that belong to *you the human*, not *you the business*.
 * What's NOT here: leads, products, orders, schedule, team — those
 * are business-side surfaces that show up in the per-archetype
 * schemas instead.
 *
 * Nav (4): Profile, Financial Account, Audit Trail, (back to business
 * via the Profile popover — the popover itself is the way out).
 */
export const MASTER_PERSONAL_ACCOUNT_SCHEMA: MasterAccountSchema = {
  schemaType: 'PROVIDER',
  navigation: [
    { id: 'profile', label: 'Personal Profile', icon: 'User' },
    { id: 'financial', label: 'Financial Account', icon: 'Wallet' },
    { id: 'advertise', label: 'Advertise', icon: 'Megaphone' },
    { id: 'audit-trail', label: 'Audit Trail', icon: 'History', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
  ],
  views: {
    profile: {
      title: 'Personal Profile',
      subtitle: 'Manage your identity, contact details, and password',
      componentType: 'profile_renderer',
    },
    financial: {
      title: 'Financial Account',
      subtitle: 'Manage your virtual wallet and transaction security',
      componentType: 'financial_renderer',
    },
    advertise: {
      title: 'Advertise',
      subtitle: 'Promote your shop with a paid homepage or sidebar ad placement',
      componentType: 'ads_manager_renderer',
    },
    'audit-trail': {
      title: 'Audit Trail',
      subtitle: 'Activity log of changes to your account',
      componentType: 'provider_placeholder',
    },
  },
};
