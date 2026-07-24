/**
 * Site settings API service — the public /discover landing-page switch.
 *
 * Read side is intentionally unauthenticated (`GET /site-settings` carries no
 * JWT) so the router can decide what an anonymous visitor sees at "/" before
 * any session exists. Fail-safe direction: on fetch failure, fall back to
 * `landingPageEnabled: false` — a hiccup must never change today's
 * straight-to-login behaviour (opposite of billingService's fail-toward-paid,
 * same underlying principle: fail toward the current default).
 */

import { apiClient } from './client';

export interface SiteSettingsPublic {
  landingPageEnabled: boolean;
}

const FALLBACK_SETTINGS: SiteSettingsPublic = {
  landingPageEnabled: false,
};

const CACHE_TTL_MS = 60_000;
let cached: SiteSettingsPublic | null = null;
let cachedAt = 0;
let inflight: Promise<SiteSettingsPublic> | null = null;

export async function getSiteSettings(force = false): Promise<SiteSettingsPublic> {
  if (!force && cached && Date.now() - cachedAt < CACHE_TTL_MS) return cached;
  if (inflight) return inflight;
  inflight = apiClient
    .get<SiteSettingsPublic>('/site-settings')
    .then((res) => {
      const settings = res.data ?? FALLBACK_SETTINGS;
      cached = settings;
      cachedAt = Date.now();
      return settings;
    })
    .catch(() => cached ?? FALLBACK_SETTINGS)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
