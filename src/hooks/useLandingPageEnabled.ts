import { useEffect, useState } from 'react';
import { getSiteSettings } from '../services/api/siteSettingsService';

/**
 * Whether the public /discover landing page is turned on. `enabled` starts
 * false (today's default) until the first fetch resolves — callers that must
 * avoid flashing the wrong redirect should also gate on `isLoading`.
 */
export function useLandingPageEnabled() {
  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getSiteSettings()
      .then((settings) => {
        if (isMounted) setEnabled(settings.landingPageEnabled);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return { enabled, isLoading };
}
