import { PERMISSIONS } from '../utils/rbac';
import { MasterAccountSchema } from './accountSchemaTypes';

/**
 * Dedicated, minimal dashboard for a Quotation Manager (quoting-only staff).
 * Only what the quoting job needs: see incoming buyer inquiries, submit a
 * quote, and track/revise submitted quotes (+ their own profile). No home
 * analytics, products/inventory, paid orders, schedule, financial, collection
 * or team. Because this is a purpose-built schema (not the seller schema with
 * items hidden), the ungated `financial` nav item never appears for them.
 *
 * Resolved by `pickSchemasForUser` when `isQuotationManager(user)` is true.
 */
export const MASTER_QUOTATION_MANAGER_ACCOUNT_SCHEMA: MasterAccountSchema = {
  schemaType: 'PROVIDER',
  navigation: [
    {
      id: 'leads',
      label: 'Buyer Inquiries',
      icon: 'FileText',
      permissions: [PERMISSIONS.MANAGE_QUOTES],
    },
    {
      id: 'my-quotes',
      label: 'My Quotes',
      icon: 'MessageSquare',
      permissions: [PERMISSIONS.MANAGE_QUOTES],
    },
    {
      id: 'archived-leads',
      label: 'Archived Leads',
      icon: 'Archive',
      permissions: [PERMISSIONS.MANAGE_QUOTES],
    },
    { id: 'profile', label: 'Profile', icon: 'User' },
  ],
  views: {
    leads: {
      title: 'Buyer Inquiries',
      subtitle: 'Respond to matched inquiries with a quote',
      componentType: 'provider_leads',
      dataKey: 'leads',
    },
    'my-quotes': {
      title: 'My Submitted Quotes',
      subtitle: 'Track and revise your quotations',
      componentType: 'provider_quotes',
      dataKey: 'quotes',
    },
    profile: {
      title: 'My Profile',
      subtitle: 'Manage your contact details',
      componentType: 'profile_renderer',
    },
  },
};
