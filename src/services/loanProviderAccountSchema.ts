import { PERMISSIONS } from '../utils/rbac';
import { MasterAccountSchema } from './accountSchemaTypes';

/**
 * MASTER_LOAN_PROVIDER_ACCOUNT_SCHEMA — dashboard for a Loan Company (a
 * SERVICE_PROVIDER whose archetype is LENDING). The lifecycle is
 * request → offer → accept: borrowers post loan requests, the lender's loan
 * officers review them and make offers (or decline), the borrower accepts one.
 *
 * Loan requests/offers render via the dedicated `loan_requests` / `loan_offers`
 * views (backed by loanService → /loans, guarded MANAGE_LOANS) so the exact
 * same surface serves the owner AND a scoped Loan Officer.
 */
export const MASTER_LOAN_PROVIDER_ACCOUNT_SCHEMA: MasterAccountSchema = {
  schemaType: 'PROVIDER',
  navigation: [
    { id: 'profile', label: 'Profile', icon: 'User' },
    { id: 'home', label: 'Home', icon: 'Home', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    { id: 'leads', label: 'Loan Requests', icon: 'FileText', permissions: [PERMISSIONS.MANAGE_LOANS] },
    { id: 'my-quotes', label: 'Loan Offers', icon: 'MessageSquare', permissions: [PERMISSIONS.MANAGE_LOANS] },
    { id: 'archived-leads', label: 'Archived Requests', icon: 'Archive', permissions: [PERMISSIONS.MANAGE_LOANS] },
    { id: 'team', label: 'Team Management', icon: 'Users', permissions: [PERMISSIONS.MANAGE_TEAM] },
    { id: 'financial', label: 'Financial Account', icon: 'Wallet' },
    { id: 'audit-trail', label: 'Audit Trail', icon: 'History', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
  ],
  views: {
    home: {
      title: 'Lending Overview',
      subtitle: 'Track incoming loan requests and the offers you have made',
      componentType: 'loan_home',
    },
    leads: {
      title: 'Loan Requests',
      subtitle: 'Borrower applications matched to your lending products',
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
      subtitle: 'Requests you previously declined or that closed',
      componentType: 'loan_requests',
      dataKey: 'leads',
    },
    team: {
      title: 'Team Management',
      subtitle: 'Manage your loan officers and their permissions',
      componentType: 'provider_team',
    },
    profile: {
      title: 'Lender Profile',
      subtitle: 'Manage your lending brand and compliance details',
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
