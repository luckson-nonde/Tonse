import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Persistent draft state for the multi-step registration wizard.
 *
 * Registration used to hold ~15 separate `useState` values in Register.tsx,
 * which meant (a) child steps that keep their own state — LocationDetails —
 * lost data on back-navigation, and (b) a page refresh wiped everything.
 * This hook makes the whole wizard a single source of truth and mirrors a
 * whitelisted subset to localStorage so a refresh / accidental close resumes
 * where the user left off.
 *
 * Deliberately NOT persisted:
 *  - password / confirmPassword — never written to disk (they aren't even
 *    part of the draft; Register keeps them in component memory).
 *  - base64 images (logo, nrcDocument) — kept in memory only so we stay well
 *    under the ~5MB localStorage quota. They survive forward/back within a
 *    session; after a hard refresh the user re-captures them (they're optional
 *    and only speed up admin verification).
 *
 * Follows the existing `tonse:` localStorage key convention
 * (see useActiveProfileContext.ts).
 */

export interface OnboardingDraft {
  // Step 1 — profile & identity
  name: string;
  nrc: string;
  phone: string;
  dob: string;
  logo: string; // base64 — in-memory only
  nrcDocument: { front?: string; back?: string }; // base64 — in-memory only

  // Step 2 — location
  province: string;
  city: string;
  address: string;
  latitude?: number;
  longitude?: number;
  radius?: number;

  // Step 3 — credentials (password is NOT stored here)
  email: string;
  agreeToTerms: boolean;

  // Navigation + role context (context comes from the URL each session)
  currentStep: number;
  role: string;
  subRole?: string;
  categoryIds: string[];
  /** Promoter referral attribution (?ref=CODE on the shared link). Small
   *  string, safe to persist — surviving a mid-wizard refresh is the point. */
  referralCode?: string;
}

export interface DraftSeed {
  role: string;
  subRole?: string;
  categoryIds: string[];
  referralCode?: string;
}

const STORAGE_KEY = 'tonse:onboardingDraft';
const DRAFT_VERSION = 1;
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // ignore drafts older than 7 days
const PERSIST_DEBOUNCE_MS = 350;

// Fields never mirrored to localStorage (large base64 blobs).
const OMIT_FROM_STORAGE: (keyof OnboardingDraft)[] = ['logo', 'nrcDocument'];

interface StoredEnvelope {
  version: number;
  savedAt: number;
  data: Partial<OnboardingDraft>;
}

function makeInitial(seed: DraftSeed): OnboardingDraft {
  return {
    name: '',
    nrc: '',
    phone: '',
    dob: '',
    logo: '',
    nrcDocument: {},
    province: '',
    city: '',
    address: '',
    latitude: undefined,
    longitude: undefined,
    radius: undefined,
    email: '',
    agreeToTerms: false,
    currentStep: 1,
    role: seed.role,
    subRole: seed.subRole,
    categoryIds: seed.categoryIds,
    referralCode: seed.referralCode,
  };
}

/** Read + validate the stored draft. Silently drops corrupt / expired / old-version drafts. */
function loadStored(): Partial<OnboardingDraft> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const env = JSON.parse(raw) as StoredEnvelope;
    if (!env || env.version !== DRAFT_VERSION || typeof env.savedAt !== 'number') {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (Date.now() - env.savedAt > TTL_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return env.data ?? null;
  } catch {
    return null;
  }
}

/** A stored draft only counts as "resume-worthy" if the user actually entered something. */
function hasMeaningfulProgress(d: Partial<OnboardingDraft> | null): boolean {
  return !!(d && (d.name || d.email || d.phone || d.province || d.nrc));
}

export interface UseOnboardingDraftResult {
  draft: OnboardingDraft;
  patch: (partial: Partial<OnboardingDraft>) => void;
  reset: () => void;
  /** True when a saved draft with real progress was found and applied on mount. */
  resumedFromStorage: boolean;
}

export function useOnboardingDraft(seed: DraftSeed): UseOnboardingDraftResult {
  // Compute the starting draft exactly once (synchronous hydration → no flicker).
  const init = useRef<{ draft: OnboardingDraft; resumed: boolean } | null>(null);
  if (init.current === null) {
    const base = makeInitial(seed);
    const stored = loadStored();
    const resumed = hasMeaningfulProgress(stored);
    init.current = {
      resumed,
      draft: resumed
        ? {
            ...base,
            ...stored,
            // The URL is the source of truth for role context this session —
            // never let a stale role/category set from an old draft leak in.
            role: seed.role,
            subRole: seed.subRole,
            categoryIds: seed.categoryIds,
            // Same rule for referral attribution — a fresh ?ref wins; only a
            // refresh with no ?ref falls back to the stored one.
            referralCode: seed.referralCode ?? stored?.referralCode,
          }
        : base,
    };
  }

  const [draft, setDraft] = useState<OnboardingDraft>(init.current.draft);
  const [resumedFromStorage, setResumedFromStorage] = useState(init.current.resumed);

  // Debounced mirror to localStorage (minus the omitted blob fields).
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        const data: Partial<OnboardingDraft> = { ...draft };
        for (const key of OMIT_FROM_STORAGE) delete (data as Record<string, unknown>)[key];
        const env: StoredEnvelope = { version: DRAFT_VERSION, savedAt: Date.now(), data };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(env));
      } catch {
        // Quota exceeded or serialization error — the draft still lives in
        // memory, so onboarding continues; we just can't refresh-proof it.
      }
    }, PERSIST_DEBOUNCE_MS);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [draft]);

  const patch = useCallback((partial: Partial<OnboardingDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  }, []);

  const seedKey = `${seed.role}|${seed.subRole ?? ''}|${seed.categoryIds.join(',')}`;
  const reset = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
    setDraft(makeInitial(seed));
    setResumedFromStorage(false);
    // seedKey captures the seed primitives; eslint can't see through it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

  return { draft, patch, reset, resumedFromStorage };
}
