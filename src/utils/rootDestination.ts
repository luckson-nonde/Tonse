import type { Role } from '../AuthContext';
import { getHomePathForRole } from './roleHome';

export interface RootDestinationInput {
  /** Auth session still resolving. */
  authLoading: boolean;
  user: { role: Role; mustChangePassword?: boolean } | null;
  /** Last known value of site_settings.landingPageEnabled. */
  landingEnabled: boolean;
  /** The landing flag is still being confirmed against the server. */
  landingLoading: boolean;
  isMobile: boolean;
  /** Whether this device has already seen the first-run slideshow. */
  onboarded: boolean;
}

export type RootDestination = { kind: 'wait' } | { kind: 'redirect'; to: string };

/**
 * What "/" resolves to. Extracted from RootRedirect so the policy is one
 * readable list of rules that can be exercised directly, rather than five
 * interleaved early-returns inside a component that only a browser can run.
 *
 * The governing rule: when an admin has the landing page switched on, it is
 * the front door for EVERYONE — signed in or not, first visit or hundredth,
 * phone or desktop. It previously showed only for logged-out desktop visitors
 * who had already dismissed onboarding, which is why it seemed to appear only
 * some of the time.
 */
export function resolveRootDestination(input: RootDestinationInput): RootDestination {
  const { authLoading, user, landingEnabled, landingLoading, isMobile, onboarded } = input;

  if (authLoading) return { kind: 'wait' };

  // A temporary password outranks everything, including the landing page:
  // /discover is a public route and wouldn't re-enforce the change.
  if (user?.mustChangePassword) return { kind: 'redirect', to: '/force-password-change' };

  if (landingEnabled) return { kind: 'redirect', to: '/discover' };

  // Only wait when the answer could still turn out to be "show it". Acting on
  // a stale `false` strands the visitor on /login and they never see the
  // landing page; acting on a stale `true` merely shows it for an instant
  // before LandingGate corrects course. The asymmetry is the point.
  if (landingLoading) return { kind: 'wait' };

  // Landing page off — everything below behaves exactly as it did before the
  // landing page existed.
  if (isMobile && !onboarded) return { kind: 'redirect', to: '/onboarding' };
  if (!user) return { kind: 'redirect', to: '/login' };
  return { kind: 'redirect', to: getHomePathForRole(user) };
}
