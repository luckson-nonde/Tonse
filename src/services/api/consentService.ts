import { apiClient, tokenManager } from './client';

/**
 * Durable consent capture. The app gates collection behind the Universal
 * Consent Modal (session-scoped); this persists those grants server-side so
 * consent is DEMONSTRABLE under the Data Protection Act 2021 (who, what notice,
 * which version, when). All calls are best-effort — a failure must never block
 * the user's flow.
 */

/** Map the onboarding consent step keys → durable notice keys. */
export const CONSENT_NOTICE_BY_STEP: Record<string, string> = {
  identity: 'identity_nrc',
  location: 'location_gps',
  credentials: 'account_credentials',
  business: 'business_docs',
  businessVerification: 'business_verification',
  store: 'store_photos',
  banking: 'payment_details',
  inquiry: 'inquiry_details',
  profile: 'profile_info',
};

const CONSENT_VERSION = '1';

/** Record a single consent grant/withdrawal. Requires an authenticated session. */
export async function recordConsent(
  noticeKey: string,
  granted = true,
  method?: string,
): Promise<void> {
  // No session → the POST is GUARANTEED to 401; don't fire a doomed request
  // (it spammed the register page console). flushSessionConsents() persists
  // these grants right after login/registration instead.
  if (!tokenManager.getAccessToken()) return;
  try {
    await apiClient.post('/consents', { noticeKey, granted, version: CONSENT_VERSION, method });
  } catch {
    /* best-effort: transient errors are ignored;
       flushSessionConsents() re-persists them once the user is authenticated. */
  }
}

/** Current consent state for the signed-in user. */
export async function getMyConsents(): Promise<Record<string, { granted: boolean; version: string; at: string }>> {
  if (!tokenManager.getAccessToken()) return {}; // pre-auth: nothing to fetch
  try {
    const res = await apiClient.get<any>('/consents');
    return (res && 'data' in res ? res.data : res) ?? {};
  } catch {
    return {};
  }
}

/**
 * Persist any consents the user granted this session (they live in
 * sessionStorage as `tonse:consent:<step>` = 'granted'). Call right AFTER
 * login/registration so consents captured before the account existed (NRC,
 * credentials) are durably recorded now that we have an authenticated session.
 */
export async function flushSessionConsents(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const prefix = 'tonse:consent:';
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (!k || !k.startsWith(prefix)) continue;
      if (window.sessionStorage.getItem(k) !== 'granted') continue;
      const step = k.slice(prefix.length);
      const noticeKey = CONSENT_NOTICE_BY_STEP[step] || step;
      await recordConsent(noticeKey, true, 'onboarding');
    }
  } catch {
    /* best-effort */
  }
}
