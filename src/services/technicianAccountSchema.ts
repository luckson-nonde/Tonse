import { PERMISSIONS } from '../utils/rbac';
import { MasterAccountSchema } from './accountSchemaTypes';

/**
 * Dedicated, minimal dashboard for a Technician (field staff scoped to job
 * evidence). Landing tab is the shared staff "control centre" Overview
 * (metrics + job run-down); the actual work — capturing before/after photos
 * and video on assigned jobs — lives on My Jobs, with completed jobs under
 * History. Purpose-built schema, so none of the owner surfaces (financial,
 * team, products…) exist for this user.
 *
 * Resolved by `pickSchemasForUser` when `isTechnician(user)` is true.
 */
export const MASTER_TECHNICIAN_ACCOUNT_SCHEMA: MasterAccountSchema = {
  schemaType: 'PROVIDER',
  navigation: [
    { id: 'dashboard', label: 'Overview', icon: 'LayoutDashboard' },
    {
      id: 'my-jobs',
      label: 'My Jobs',
      icon: 'Camera',
      permissions: [PERMISSIONS.MANAGE_JOBS],
    },
    {
      id: 'history',
      label: 'History',
      icon: 'Archive',
      permissions: [PERMISSIONS.MANAGE_JOBS],
    },
    { id: 'profile', label: 'Profile', icon: 'User' },
  ],
  views: {
    dashboard: {
      title: 'Technician Overview',
      subtitle: 'Your assigned jobs at a glance',
      componentType: 'staff_overview',
    },
    'my-jobs': {
      title: 'My Jobs',
      subtitle: 'Capture before & after evidence on your assigned jobs',
      componentType: 'technician_jobs',
    },
    history: {
      title: 'Job History',
      subtitle: 'Jobs you completed evidence on',
      componentType: 'technician_jobs',
    },
    profile: {
      title: 'My Profile',
      subtitle: 'Manage your contact details',
      componentType: 'profile_renderer',
    },
  },
};
