import { User } from '../AuthContext';

export const PERMISSIONS = {
  VIEW_WALLET: 'VIEW_WALLET',
  MANAGE_SETTINGS: 'MANAGE_SETTINGS',
  MANAGE_QUOTES: 'MANAGE_QUOTES',
  VIEW_ANALYTICS: 'VIEW_ANALYTICS',
  MANAGE_TEAM: 'MANAGE_TEAM',
  MANAGE_COLLECTIONS: 'MANAGE_COLLECTIONS'
};

/**
 * Permission codes for restricted sub-admin ("User Manager") accounts —
 * role ADMIN with parentProviderId set. Mirrors the backend constants in
 * backend/src/modules/auth/constants/admin-permissions.ts; the server
 * enforces these via AdminPermissionsGuard, the admin console uses them
 * only to decide which tabs to show.
 */
export const ADMIN_PERMISSIONS = {
  USERS: 'ADMIN_USERS',
  VERIFICATIONS: 'ADMIN_VERIFICATIONS',
  REPORTS: 'ADMIN_REPORTS',
} as const;

export function hasPermission(user: User | null | undefined, requiredPermission: string): boolean {
  if (!user) return false;
  
  // Buyers don't use this RBAC system
  if (user.role === 'BUYER') return true;
  
  // If parentProviderId is not set, this user is the Admin/Owner of the shop
  if (!user.parentProviderId) return true;
  
  // If parentProviderId is set, this user is Staff. Check their permissions array.
  return user.permissions?.includes(requiredPermission) || false;
}
