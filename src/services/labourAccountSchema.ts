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
 * Pure-labour seller dashboard — rebuilt around the JOB BOARD flow: buyers
 * post moderated job posts, labour providers find + apply to the ones
 * matching their registered trades, posters accept. The old inquiry/quote
 * views (job_requests / my_quotes / schedule) are gone with the flow that
 * fed them.
 *
 * Seeker items are spliced WITHOUT their businessTypes gate (this schema
 * only ever renders for labour-only sellers, and mergeAccountSchemas picks
 * it before archetype resolution). View ids must stay aligned with
 * ProviderDashboard's LABOUR tab branch + catch-all array.
 */
export const MASTER_LABOUR_ACCOUNT_SCHEMA: MasterAccountSchema = {
  schemaType: 'LABOUR',
  navigation: [
    { id: 'dashboard', label: 'Overview', icon: 'LayoutDashboard' },
    { ...JOB_SEEKER_FEED_NAV_ITEM, businessTypes: undefined },
    { ...JOB_SEEKER_APPLICATIONS_NAV_ITEM, businessTypes: undefined },
    JOB_BOARD_POSTER_NAV_ITEM,
    { id: 'financial', label: 'Financial', icon: 'Wallet' },
    { id: 'advertise', label: 'Advertise', icon: 'Megaphone' },
    { id: 'profile', label: 'My Profile', icon: 'User' },
    REPORTING_NAV_ITEM,
  ],
  views: {
    dashboard: {
      title: 'Labour Overview',
      subtitle: 'Jobs matching your trades and your applications at a glance',
      componentType: 'labour_home',
      showWalletCard: true,
      metrics: [
        { id: 'matched_jobs', label: 'Jobs For You', value: 0, icon: 'Search' },
        { id: 'open_applications', label: 'Open Applications', value: 0, icon: 'ClipboardCheck' },
        { id: 'accepted_jobs', label: 'Accepted', value: 0, icon: 'CheckCircle' },
      ],
    },
    'find-jobs': JOB_SEEKER_FEED_VIEW,
    'my-applications': JOB_SEEKER_APPLICATIONS_VIEW,
    'my-job-posts': JOB_BOARD_POSTER_VIEW,
    financial: {
      title: 'Financial Overview',
      subtitle: 'Manage your earnings and withdrawals',
      componentType: 'financial_renderer',
    },
    advertise: {
      title: 'Advertise',
      subtitle: 'Promote your services with a paid homepage or sidebar ad placement',
      componentType: 'ads_manager_renderer',
    },
    profile: {
      title: 'My Profile',
      subtitle: 'Manage your skills, rates and availability',
      componentType: 'profile_renderer',
    },
    reporting: REPORTING_VIEW,
  },
};
