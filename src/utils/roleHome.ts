import type { Role } from '../AuthContext';

/**
 * Where a logged-in user's "/" ultimately resolves to, by role. Mirrors
 * RootRedirect's role branch (src/App.tsx) so the Discover pages' "Dashboard"
 * button and the profile menu's back-navigation land in the same place
 * without duplicating RootRedirect's JSX. Doesn't replicate RootRedirect's
 * mustChangePassword/onboarding checks — ProtectedRoute already re-enforces
 * mustChangePassword on whatever path this resolves to.
 */
export function getHomePathForRole(user: { role: Role } | null | undefined): string {
  if (!user) return '/login';
  if (user.role === 'ADMIN') return '/admin';
  if (user.role === 'PROMOTER') return '/promoter';
  if (user.role === 'BUYER') return '/buyer';
  return '/provider';
}
