import { PERMISSIONS } from '../utils/rbac';
import { MasterAccountSchema } from './accountSchemaTypes';

/**
 * Dedicated, minimal dashboard for a Loan Officer (lending-only staff). Only
 * the loan job: review incoming loan requests, make/track offers (+ their own
 * profile). No home analytics, financial, team, etc. — because it is a
 * purpose-built schema, the ungated `financial` item never appears for them.
 *
 * Resolved by `pickSchemasForUser` when `isLoanOfficer(user)` is true.
 */
export const MASTER_LOAN_OFFICER_ACCOUNT_SCHEMA: MasterAccountSchema = {
  schemaType: 'PROVIDER',
  navigation: [
    { id: 'leads', label: 'Loan Requests', icon: 'FileText', permissions: [PERMISSIONS.MANAGE_LOANS] },
    { id: 'my-quotes', label: 'Loan Offers', icon: 'MessageSquare', permissions: [PERMISSIONS.MANAGE_LOANS] },
    { id: 'archived-leads', label: 'Archived Requests', icon: 'Archive', permissions: [PERMISSIONS.MANAGE_LOANS] },
    { id: 'profile', label: 'Profile', icon: 'User' },
  ],
  views: {
    leads: {
      title: 'Loan Requests',
      subtitle: 'Review applications and make an offer or decline',
      componentType: 'loan_requests',
      dataKey: 'leads',
    },
    'my-quotes': {
      title: 'Loan Offers',
      subtitle: 'Offers you have made and their status',
      componentType: 'loan_offers',
      dataKey: 'quotes',
    },
    'archived-leads': {
      title: 'Archived Requests',
      subtitle: 'Requests previously declined or closed',
      componentType: 'loan_requests',
      dataKey: 'leads',
    },
    profile: {
      title: 'My Profile',
      subtitle: 'Manage your contact details',
      componentType: 'profile_renderer',
    },
  },
};
