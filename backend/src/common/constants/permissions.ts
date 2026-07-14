/**
 * Canonical staff permission codes.
 *
 * These MUST match the frontend `PERMISSIONS` in `src/utils/rbac.ts` — the
 * strings are stored verbatim on `users.permissions` (simple-array) and read
 * by both the frontend RBAC and the backend `PermissionsGuard`.
 */
export const PERMISSIONS = {
  VIEW_WALLET: 'VIEW_WALLET',
  MANAGE_SETTINGS: 'MANAGE_SETTINGS',
  MANAGE_QUOTES: 'MANAGE_QUOTES',
  VIEW_ANALYTICS: 'VIEW_ANALYTICS',
  MANAGE_TEAM: 'MANAGE_TEAM',
  MANAGE_COLLECTIONS: 'MANAGE_COLLECTIONS',
  MANAGE_LOANS: 'MANAGE_LOANS',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
