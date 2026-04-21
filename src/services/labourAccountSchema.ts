import { MasterAccountSchema } from './accountSchemaTypes';

export const MASTER_LABOUR_ACCOUNT_SCHEMA: MasterAccountSchema = {
  schemaType: 'LABOUR',
  navigation: [
    { id: 'dashboard', label: 'Overview', icon: 'LayoutDashboard' },
    { id: 'job_requests', label: 'Job Requests', icon: 'MessageSquare' },
    { id: 'my_quotes', label: 'My Proposals', icon: 'FileText' },
    { id: 'schedule', label: 'My Schedule', icon: 'Calendar' },
    { id: 'financial', label: 'Financial', icon: 'Wallet' },
    { id: 'profile', label: 'My Profile', icon: 'User' },
  ],
  views: {
    dashboard: {
      title: 'Labour Overview',
      subtitle: 'Track your job requests and active proposals',
      componentType: 'labour_home',
      showWalletCard: true,
      metrics: [
        { id: 'job_requests', label: 'Job Requests', value: 0, icon: 'MessageSquare' },
        { id: 'active_proposals', label: 'Active Proposals', value: 0, icon: 'FileText' },
        { id: 'confirmed_jobs', label: 'Confirmed Jobs', value: 0, icon: 'CheckCircle' },
      ]
    },
    job_requests: {
      title: 'Job Requests',
      subtitle: 'Incoming requests matching your skills',
      componentType: 'labour_jobs',
      dataKey: 'jobRequests'
    },
    my_quotes: {
      title: 'My Proposals',
      subtitle: 'Track proposals you have sent to employers',
      componentType: 'labour_quotes',
      dataKey: 'quotes'
    },
    schedule: {
      title: 'My Schedule',
      subtitle: 'View your confirmed jobs and availability',
      componentType: 'labour_schedule',
      dataKey: 'schedules'
    },
    financial: {
      title: 'Financial Overview',
      subtitle: 'Manage your earnings and withdrawals',
      componentType: 'financial_renderer',
    },
    profile: {
      title: 'My Profile',
      subtitle: 'Manage your skills, rates and availability',
      componentType: 'profile_renderer'
    }
  }
};
