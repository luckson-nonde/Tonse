import { NavigationItem, ViewDefinition } from './accountSchemaTypes';

/**
 * Job-board nav/view fragments, spliced into account schemas the same way
 * reportingNavFragment is — one definition so the many schema files can't
 * drift apart.
 *
 * POSTER side ("My Job Posts") goes into EVERY primary account schema
 * (buyer + all seller/provider/personal schemas — any registered user can
 * post a job); only the four scoped staff dashboards are excluded, same
 * rationale as the Advertise tab.
 *
 * SEEKER side ("Find Jobs" / "My Applications") is labour-only: the items
 * carry businessTypes ['LABOUR'] so on mixed-archetype schemas they appear
 * only for sellers who registered labour trades. labourAccountSchema (the
 * pure-labour dashboard) splices SEEKER_* unconditionally.
 *
 * NB: 'LABOUR' here gates who gets the Find Jobs TAB — it no longer says
 * anything about WHICH jobs they see. The feed is the entire board for every
 * employment account; registered trades are a filter, not a match.
 */
export const JOB_BOARD_POSTER_NAV_ITEM: NavigationItem = {
  id: 'my-job-posts',
  label: 'My Job Posts',
  icon: 'Briefcase',
};

export const JOB_BOARD_POSTER_VIEW: ViewDefinition = {
  title: 'My Job Posts',
  subtitle: 'Post jobs, track admin review, and manage applicants',
  componentType: 'job_posts_manager_renderer',
};

export const JOB_SEEKER_FEED_NAV_ITEM: NavigationItem = {
  id: 'find-jobs',
  label: 'Find Jobs',
  icon: 'Search',
  businessTypes: ['LABOUR'],
};

export const JOB_SEEKER_FEED_VIEW: ViewDefinition = {
  title: 'Find Jobs',
  subtitle: 'Every open vacancy posted on Nyuwe — search and filter the board',
  componentType: 'job_seeker_feed_renderer',
};

export const JOB_SEEKER_APPLICATIONS_NAV_ITEM: NavigationItem = {
  id: 'my-applications',
  label: 'My Applications',
  icon: 'ClipboardCheck',
  businessTypes: ['LABOUR'],
};

export const JOB_SEEKER_APPLICATIONS_VIEW: ViewDefinition = {
  title: 'My Applications',
  subtitle: 'Jobs you applied to and where each one stands',
  componentType: 'job_seeker_applications_renderer',
};
