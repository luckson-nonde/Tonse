import { User } from '../AuthContext';

export const PERMISSIONS = {
  VIEW_WALLET: 'VIEW_WALLET',
  MANAGE_SETTINGS: 'MANAGE_SETTINGS',
  MANAGE_QUOTES: 'MANAGE_QUOTES',
  VIEW_ANALYTICS: 'VIEW_ANALYTICS',
  MANAGE_TEAM: 'MANAGE_TEAM',
  MANAGE_COLLECTIONS: 'MANAGE_COLLECTIONS',
  MANAGE_LOANS: 'MANAGE_LOANS'
};

export function hasPermission(user: User | null | undefined, requiredPermission: string): boolean {
  if (!user) return false;

  // Buyers don't use this RBAC system
  if (user.role === 'BUYER') return true;

  // If parentProviderId is not set, this user is the Admin/Owner of the shop
  if (!user.parentProviderId) return true;

  // If parentProviderId is set, this user is Staff. Check their permissions array.
  return user.permissions?.includes(requiredPermission) || false;
}

/**
 * A Collection Officer is a staff member scoped to the handover job ONLY:
 * they hold MANAGE_COLLECTIONS and none of the broader permissions. This is
 * the single source of truth used to (a) pick their dedicated minimal
 * dashboard schema, (b) land/lock them on the Collection tab, and (c) render
 * their minimal mobile nav. Owners never match (no parentProviderId).
 */
export function isCollectionOfficer(user: User | null | undefined): boolean {
  if (!user || !user.parentProviderId) return false;
  const perms = user.permissions ?? [];
  return (
    perms.includes(PERMISSIONS.MANAGE_COLLECTIONS) &&
    !perms.includes(PERMISSIONS.MANAGE_QUOTES) &&
    !perms.includes(PERMISSIONS.VIEW_ANALYTICS) &&
    !perms.includes(PERMISSIONS.MANAGE_TEAM)
  );
}

/**
 * A Quotation Manager is a staff member scoped to the quoting job ONLY:
 * see incoming buyer inquiries, submit and track quotes. They hold
 * MANAGE_QUOTES but NOT collections or team, so they get a dedicated minimal
 * dashboard (Buyer Inquiries / My Quotes / Archived / Profile) and nothing
 * else. Owners never match (no parentProviderId). Legacy "Collection Manager"
 * staff (who also hold MANAGE_COLLECTIONS) are excluded and keep the full
 * dashboard.
 */
export function isQuotationManager(user: User | null | undefined): boolean {
  if (!user || !user.parentProviderId) return false;
  const perms = user.permissions ?? [];
  return (
    perms.includes(PERMISSIONS.MANAGE_QUOTES) &&
    !perms.includes(PERMISSIONS.MANAGE_COLLECTIONS) &&
    !perms.includes(PERMISSIONS.MANAGE_LOANS) &&
    !perms.includes(PERMISSIONS.MANAGE_TEAM)
  );
}

/**
 * A Loan Officer is lending staff scoped to the loan job ONLY: review loan
 * requests, make/track offers. Holds MANAGE_LOANS and none of the broader
 * permissions → gets a dedicated minimal dashboard. Owners never match.
 */
export function isLoanOfficer(user: User | null | undefined): boolean {
  if (!user || !user.parentProviderId) return false;
  const perms = user.permissions ?? [];
  return (
    perms.includes(PERMISSIONS.MANAGE_LOANS) &&
    !perms.includes(PERMISSIONS.MANAGE_QUOTES) &&
    !perms.includes(PERMISSIONS.MANAGE_COLLECTIONS) &&
    !perms.includes(PERMISSIONS.MANAGE_TEAM)
  );
}
