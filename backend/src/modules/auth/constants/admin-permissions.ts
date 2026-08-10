/**
 * Permission codes for restricted sub-admin ("User Manager") accounts.
 *
 * A sub-admin is a User row with role='ADMIN' and parentProviderId set to
 * the primary admin's id; these codes live in its `permissions` column.
 * The primary admin (parentProviderId NULL) never needs them — the
 * AdminPermissionsGuard short-circuits to full access.
 *
 * Mirrored on the frontend in src/utils/rbac.ts ADMIN_PERMISSIONS — keep
 * the two in sync.
 */
export const ADMIN_PERMISSIONS = {
  /** Users tab: list/detail + suspend/unsuspend (never delete). */
  USERS: 'ADMIN_USERS',
  /** Verifications queue: list + approve/reject. */
  VERIFICATIONS: 'ADMIN_VERIFICATIONS',
  /** User-submitted reports: list + resolve/dismiss. */
  REPORTS: 'ADMIN_REPORTS',
  /** Job board moderation queue: list pending + approve/reject postings. */
  JOB_BOARD: 'ADMIN_JOB_BOARD',
} as const;

export type AdminPermissionCode =
  (typeof ADMIN_PERMISSIONS)[keyof typeof ADMIN_PERMISSIONS];

export const ALL_ADMIN_PERMISSIONS: string[] = Object.values(ADMIN_PERMISSIONS);
