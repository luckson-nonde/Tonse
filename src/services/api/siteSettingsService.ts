/**
 * Site settings API service — the public /discover landing-page switch.
 *
 * Read side is intentionally unauthenticated (`GET /site-settings` carries no
 * JWT) so the router can decide what a visitor sees at "/" before any session
 * exists.
 *
 * The last known answer is PERSISTED to localStorage, and that matters more
 * than it looks. The in-memory cache is module state, so it's cold on every
 * full page load — meaning every cold load re-fetches, and any hiccup used to
 * fall all the way back to `landingPageEnabled: false` and send the visitor to
 * /login instead of the landing page. That's how the front door ended up
 * appearing only *some* of the time. Persisting means a flaky network reuses
 * the last real answer instead of inventing "off"; only a visitor who has
 * never successfully loaded the setting can still fall back.
 */

import { apiClient } from './client';

export interface SiteSettingsPublic {
  landingPageEnabled: boolean;
}

const FALLBACK_SETTINGS: SiteSettingsPublic = {
  landingPageEnabled: false,
};

const STORAGE_KEY = 'tonse_site_settings';
const CACHE_TTL_MS = 60_000;
let cached: SiteSettingsPublic | null = null;
let cachedAt = 0;
let inflight: Promise<SiteSettingsPublic> | null = null;

function readPersisted(): SiteSettingsPublic | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Only trust a real boolean — a half-written or hand-edited value must not
    // be able to decide routing.
    return typeof parsed?.landingPageEnabled === 'boolean'
      ? { landingPageEnabled: parsed.landingPageEnabled }
      : null;
  } catch {
    return null;
  }
}

function persist(settings: SiteSettingsPublic): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private browsing / quota — persistence is an optimisation, never required.
  }
}

/**
 * The last answer we actually got from the server, without waiting on a
 * request. `null` means this browser has never successfully read the setting.
 * Lets the router render the right thing immediately instead of showing a
 * spinner on every single visit.
 */
export function getLastKnownSiteSettings(): SiteSettingsPublic | null {
  return cached ?? readPersisted();
}

export async function getSiteSettings(force = false): Promise<SiteSettingsPublic> {
  if (!force && cached && Date.now() - cachedAt < CACHE_TTL_MS) return cached;
  if (inflight) return inflight;
  inflight = apiClient
    .get<SiteSettingsPublic>('/site-settings')
    .then((res) => {
      const settings = res.data ?? FALLBACK_SETTINGS;
      cached = settings;
      cachedAt = Date.now();
      persist(settings);
      return settings;
    })
    .catch(() => cached ?? readPersisted() ?? FALLBACK_SETTINGS)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
