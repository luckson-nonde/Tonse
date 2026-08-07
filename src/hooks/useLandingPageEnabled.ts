import { useEffect, useState } from 'react';
import { getLastKnownSiteSettings, getSiteSettings } from '../services/api/siteSettingsService';

/**
 * Whether the public landing page is turned on.
 *
 * `enabled` is seeded from the last answer this browser actually received, so a
 * returning visitor gets the right page immediately instead of a spinner on
 * every load. `isLoading` still reports honestly — it stays true until the
 * network confirms — which lets a caller decide how much to trust the seed.
 *
 * The routing rule that pairs with this (see RootRedirect): act on `enabled`
 * the moment it's true, but WAIT on `isLoading` before acting on false. The
 * asymmetry is deliberate — being briefly wrong about showing the landing page
 * self-heals, while being briefly wrong about hiding it sends the visitor to
 * /login and they never come back to see it.
 */
export function useLandingPageEnabled() {
  const [state, setState] = useState<{ enabled: boolean; isLoading: boolean }>(() => {
    const seed = getLastKnownSiteSettings();
    return { enabled: seed?.landingPageEnabled ?? false, isLoading: true };
  });

  useEffect(() => {
    let isMounted = true;
    getSiteSettings()
      .then((settings) => {
        if (isMounted) setState({ enabled: settings.landingPageEnabled, isLoading: false });
      })
      .catch(() => {
        if (isMounted) setState((s) => ({ ...s, isLoading: false }));
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}
