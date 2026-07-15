import type { Category } from './types';
import { CATEGORIES_DB } from './catalog';

// ─────────────────────────────────────────────────────────────────────────────
// Business-type derivation
//
// Tonse's onboarding captures four signals about a seller:
//   1. role     — auth identity (BUYER / SELLER / SUPPLIER / SERVICE_PROVIDER…)
//   2. subRole  — variant within the role (PRODUCT_SELLER / SERVICE_SELLER /
//                 HYBRID_SELLER / SUPPLIER_SELLER…)
//   3. categories — what they trade in (Electronics / Mobile Phones / …) where
//                   each entry is a sub-category whose name carries the
//                   action variant in parentheses, e.g.
//                   "Mobile Phones & Accessories (Repair)" or
//                   "Mobile Phones & Accessories (Buy New)"
//   4. specification — derived from the action variant in (3)
//
// The combination of the four resolves to a single BusinessType which every
// dashboard surface (sidebar, stat tiles, lead filters, form schemas) keys
// off of, so an Electronics retail shop and an Electronics repair shop see
// genuinely different UIs even though they share role+subRole+category name.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * BusinessType is now 1:1 with the backend `Archetype` enum, plus three
 * UI-only states (BUYER / ADMIN / UNKNOWN). The previous lossy mappings
 * (RENTAL → EVENTS, BOOKING → EVENTS) were the root cause behind sellers
 * landing on the wrong dashboard, and the legacy values WHOLESALE was a
 * subRole flag, HYBRID and PRODUCTS_AND_REPAIR were workarounds for the
 * single-archetype constraint. Multi-archetype now expresses the latter
 * two natively (e.g. archetypes=['RETAIL','REPAIR']).
 */
export type BusinessType =
  // 1:1 with backend Archetype (9 values)
  | 'RETAIL'
  | 'RENTAL'
  | 'BOOKING'
  | 'LABOUR'
  | 'REPAIR'
  | 'SERVICE'
  | 'EVENTS'
  | 'ENTERTAINMENT'
  | 'WHOLESALE'
  | 'LENDING'
  // UI-only states (no archetype equivalent)
  | 'BUYER'
  | 'ADMIN'
  | 'UNKNOWN';

/** Buyer preferences variant — drives which Section 1/2/3 config the
 *  inquiry-preferences screen renders. Matches CategoryType in
 *  components/InquiryPreferences.tsx. */
export type CategoryType = 'PRODUCTS' | 'SERVICES' | 'VENUES' | 'LABOR';

const MASTER_CATEGORY_TYPE: Record<string, CategoryType> = {
  electronics:         'PRODUCTS',
  furniture:           'PRODUCTS',
  fashion:             'PRODUCTS',
  'home-decor':        'PRODUCTS',
  automotive:          'PRODUCTS',
  groceries:           'PRODUCTS',
  beauty:              'PRODUCTS',
  construction:        'PRODUCTS',
  agriculture:         'PRODUCTS',
  'it-products':       'PRODUCTS',
  entertainment:       'SERVICES',
  events:              'SERVICES',
  telecommunications:  'SERVICES',
  'it-services':       'SERVICES',
  'drilling-services': 'SERVICES',
  'locksmith-key-services': 'SERVICES',
  loans:               'SERVICES',
};

const SUB_CATEGORY_TYPE_OVERRIDES: Record<string, CategoryType> = {
  // Booking a venue is structurally different from buying a product or
  // hiring a service — needs the VENUES preferences config (capacity,
  // accessibility, available dates, etc.).
  'event-venues':           'VENUES',
  // Lives under automotive (PRODUCTS) but is a callout/breakdown service.
  'car-breakdown-recovery': 'SERVICES',
};

/**
 * Resolve which preferences variant a buyer should see for a given
 * category id. Replaces the old substring-matching heuristic in
 * BuyerDashboard which silently mis-classified entertainment,
 * telecommunications, and it-services as PRODUCTS.
 *
 * Order: explicit sub override → repair/restore variants → master
 * map → PRODUCTS fallback.
 */
export function getCategoryType(categoryId: string | null | undefined): CategoryType {
  if (!categoryId) return 'PRODUCTS';
  const override = SUB_CATEGORY_TYPE_OVERRIDES[categoryId];
  if (override) return override;

  const cat = CATEGORIES_DB.find((c) => c.id === categoryId);
  if (!cat) return 'PRODUCTS';

  // Action variants are work performed on the buyer's existing item —
  // always a service interaction regardless of the master's nature.
  if (cat.type === 'repair' || cat.type === 'restore') return 'SERVICES';

  const masterId = cat.parentId ?? cat.id;
  return MASTER_CATEGORY_TYPE[masterId] ?? 'PRODUCTS';
}

export const REPAIR_ACTION_PATTERN =
  /\((repair|restoration|upholstery|recovery|service|maintenance|fix)\b[^)]*\)/i;
export const BUY_NEW_ACTION_PATTERN =
  /\((buy new|new|purchase|sell|sale|retail)\b[^)]*\)/i;

export function isRepairVariant(categoryName: string): boolean {
  return REPAIR_ACTION_PATTERN.test(categoryName);
}

export function isBuyNewVariant(categoryName: string): boolean {
  return BUY_NEW_ACTION_PATTERN.test(categoryName);
}

/**
 * Extract the action variant ("Buy New", "Repair", etc.) from a sub-category
 * name. Returns null if the name has no variant suffix in parentheses.
 */
export function getCategoryVariant(categoryName: string): string | null {
  const match = categoryName.match(/\(([^)]+)\)\s*$/);
  return match ? match[1].trim() : null;
}

interface MinimalUserForBusinessType {
  role?: string;
  subRole?: string;
  /** Legacy: display names. Older surfaces still pass these. */
  categories?: string[];
  /** Phase: matching — stable category IDs. Newer flows pass these. */
  categoryIds?: string[];
  /** Multi-archetype: the SET of archetypes the active profile serves.
   *  Backend recomputes on every category-junction write and ships in
   *  /auth/me. Empty array → fall through to the regex / role-based
   *  derivation below. */
  archetypes?: string[];
}

/**
 * Map a single persisted profile.archetype enum to its BusinessType.
 * Used by `archetypesToBusinessTypes` (the set form) and by direct
 * single-archetype callers; not exported because every caller should
 * be operating on the set the backend now ships.
 */
function archetypeToBusinessType(archetype: string | undefined): BusinessType | null {
  if (!archetype) return null;
  const upper = archetype.toUpperCase();
  switch (upper) {
    case 'RETAIL':
    case 'RENTAL':
    case 'BOOKING':
    case 'LABOUR':
    case 'REPAIR':
    case 'SERVICE':
    case 'EVENTS':
    case 'ENTERTAINMENT':
    case 'WHOLESALE':
    case 'LENDING':
      return upper as BusinessType;
    default:
      return null;
  }
}

/**
 * Multi-archetype: map the SET of archetypes a profile serves to the
 * SET of BusinessTypes downstream UI keys off. Now 1:1 (the lossy
 * RENTAL/BOOKING → EVENTS collapse was retired).
 */
function archetypesToBusinessTypes(archetypes: string[] | undefined): BusinessType[] {
  if (!archetypes || archetypes.length === 0) return [];
  const set = new Set<BusinessType>();
  for (const a of archetypes) {
    const bt = archetypeToBusinessType(a);
    if (bt) set.add(bt);
  }
  return Array.from(set);
}

/**
 * Tie-breaker priority for picking a single dominant BusinessType from
 * a set. Used only by `getPrimaryBusinessType` (visual callers — calendar
 * tone, page-title switches, single-config selectors). Composition-aware
 * callers should consume `getBusinessTypes` directly so a multi-archetype
 * seller (e.g. RETAIL + REPAIR) gets both surfaces.
 */
const BUSINESS_TYPE_PRIORITY: BusinessType[] = [
  'EVENTS',
  'ENTERTAINMENT',
  'REPAIR',
  'WHOLESALE',
  'LENDING',
  'BOOKING',
  'RENTAL',
  'SERVICE',
  'RETAIL',
  'LABOUR',
  'BUYER',
  'ADMIN',
  'UNKNOWN',
];

// Category-name predicates for events / entertainment trees. These match
// against the *names* (the only data we have on user.categories — see
// CategorySelection's onChange wiring). The patterns intentionally cover both
// the master ("Events" / "Entertainment") and any of the registered
// sub-categories ("Event Venues", "Event Equipment Rental", "Event Catering",
// "DJs", "Live Bands", "MCs & Hosts", etc.) so a SELLER who picks any of these
// resolves to the right businessType without needing role-rewriting upstream.
const EVENT_CATEGORY_PATTERN =
  /\b(events?|venues?|wedding|conference|stage)\b|^event\s|^events$/i;
const ENTERTAINMENT_CATEGORY_PATTERN =
  /\b(entertainment|dj|live\s?band|mc|host|dancer|comedian|spoken\s?word|performer|influencer|band|musician)\b/i;

function categoriesMatch(categories: string[], pattern: RegExp): boolean {
  return categories.some((c) => pattern.test(c));
}

// BOOKING-vertical master + sub ids, pinned by exact id. Two jobs: (1) keep
// booking ids out of the generic name regexes below — apartment tenure ids
// look rental-ish by NAME ('long-term-rentals') and would otherwise reroute
// an estate agent onto the machinery fleet dashboard; (2) short-circuit
// mid-onboarding rows to BOOKING before the backend publishes their
// archetype set (the SERVICE_PROVIDER fallback would otherwise land them on
// the generic SERVICE dashboard). Extend this list for every new BOOKING
// vertical — mirror of the seeder's PARENT_ARCHETYPE / SUB_ARCHETYPE pins.
const BOOKING_CATEGORY_ID =
  /^(apartments|long-term-rentals|short-stay-serviced|boarding-student-rooms|pastry-bakery|custom-cakes|bread-pastries)$/i;
function rentalCategoriesMatch(categories: string[]): boolean {
  return categories.some(
    (c) => !BOOKING_CATEGORY_ID.test(c) && /\b(rental|hire)s?\b/i.test(c),
  );
}

/**
 * Multi-archetype resolution. Returns the SET of BusinessType values
 * the user serves. Composition-aware UI surfaces (sidebar merge,
 * archetype-specific sections) read this directly — a seller offering
 * both `mobile-phones-buy` and `mobile-phones-repair` gets
 * `['RETAIL_PRODUCTS', 'REPAIR_SERVICE']` here, both surfaces visible.
 *
 * Priority of signals:
 *   1. BUYER / ADMIN role short-circuits to a single-element set.
 *   2. Multi-archetype set on the user (backend-cached) is the
 *      authoritative answer when present. Mapped 1:N via
 *      `archetypesToBusinessTypes`.
 *   3. Legacy fallback for mid-onboarding rows whose archetype set
 *      hasn't been written yet — derives from role + subRole +
 *      legacy categories display-name regex. Always returns a single
 *      element here; the multi-archetype resolution requires the
 *      backend's archetype set.
 *
 * Empty role → `[]` (UNKNOWN-equivalent; callers can default).
 */
export function getBusinessTypes(
  user: MinimalUserForBusinessType | null | undefined,
): BusinessType[] {
  if (!user || !user.role) return [];

  const role = user.role.toUpperCase();
  if (role === 'BUYER') return ['BUYER'];
  if (role === 'ADMIN') return ['ADMIN'];

  // Backend-cached set is the base — built from stable category IDs by
  // ArchetypeResolverService, recomputed on every category-junction
  // write. We then *reconcile* it with category-based detection so that
  // a frontend-known archetype (e.g. RENTAL for event-equipment-rental)
  // doesn't get lost when the backend resolver disagrees, and so that a
  // backend-spurious archetype (EVENTS lumped onto a rental-only seller)
  // gets dropped. The intent: one category picked → one persona; multiple
  // categories picked → multiple personas.
  const fromArchetypes = archetypesToBusinessTypes(user.archetypes);
  if (fromArchetypes.length > 0) {
    const augmented = new Set<BusinessType>(fromArchetypes);
    // Backend's flattenWithProfile ships category ids on `categoryIds`
    // (not `categories`). Legacy surfaces still pass `categories`. Read
    // both so the augmentation regex can actually see the seller's
    // selections — the previous version was always running on []
    // because /auth/me returns categoryIds, which silently disabled
    // the EVENTS-stripping / SERVICE-adding logic.
    const cats = (user.categoryIds && user.categoryIds.length > 0)
      ? user.categoryIds
      : (user.categories || []);
    if (rentalCategoriesMatch(cats)) augmented.add('RENTAL');
    if (categoriesMatch(cats, /\b(repair|restoration|recovery|upholstery)\b/i)) augmented.add('REPAIR');

    // Add SERVICE for the event sub-archetypes that are SERVICE on the
    // frontend (catering / decor / planning / management). Backends
    // sometimes lump them into EVENTS via a broad "event" match — that
    // routes the seller to the venue-themed events dashboard ("Buyer
    // Inquiries / Inventory / Orders") instead of MASTER_SERVICE_ACCOUNT_SCHEMA
    // which carries Service Requests / My Proposals / Service Catalog
    // / Active Engagements. Without this they look like a generic
    // retailer despite running a service practice.
    const hasServiceEvent = categoriesMatch(cats, /\b(catering|decor|planning|management)\b/i);
    if (hasServiceEvent) augmented.add('SERVICE');

    // EVENTS is meaningful only when the seller has a venue-shaped
    // category (its bespoke views — venue-spaces, paid bookings — live
    // in MASTER_EVENTS_ACCOUNT_SCHEMA). The 'events' master parent on
    // its own DOESN'T count: it's auto-added when a buyer picks any
    // event sub-category, so its presence is uninformative. Drop
    // EVENTS unless the seller actually offers a venue / wedding /
    // conference / stage.
    const hasVenueEvent = categoriesMatch(
      cats,
      /\bvenues?\b|\bwedding\b|\bconference\b|\bstage\b/i,
    );
    if (augmented.has('EVENTS') && !hasVenueEvent) {
      augmented.delete('EVENTS');
    }
    return Array.from(augmented);
  }

  // ===== Legacy fallback (single-element result) =====
  // Phase 2 tightened the role enum to BUYER / SELLER / SERVICE_PROVIDER /
  // ADMIN. Legacy values (EVENTS, ENTERTAINMENT, SUPPLIER, LABOUR) were
  // backfilled into the categories array, so detection happens entirely
  // through category-name predicates below. Runs only when the backend
  // hasn't published an archetype set yet (mid-onboarding rows). Read
  // categoryIds first (the modern shape from /auth/me) and fall back
  // to categories for legacy callers.
  const categories =
    (user.categoryIds && user.categoryIds.length > 0)
      ? user.categoryIds
      : (user.categories || []);
  const subRole = (user.subRole || '').toUpperCase();

  // RENTAL / SERVICE specific checks run BEFORE the EVENTS one so an
  // event-equipment-rental seller lands on RENTAL and an event-catering
  // (or decor / planning / management) seller lands on SERVICE.
  // EVENT_CATEGORY_PATTERN below otherwise catches the word "event" in
  // those slugs first and routes them to the venue dashboard.
  // Apartment agents/landlords and bakers are BOOKING even before the
  // backend publishes their archetype set (mid-onboarding rows).
  if (categories.some((c) => BOOKING_CATEGORY_ID.test(c))) return ['BOOKING'];
  if (rentalCategoriesMatch(categories)) return ['RENTAL'];
  if (categoriesMatch(categories, /\b(catering|decor|planning|management)\b/i)) return ['SERVICE'];
  if (categoriesMatch(categories, EVENT_CATEGORY_PATTERN)) return ['EVENTS'];
  if (categoriesMatch(categories, ENTERTAINMENT_CATEGORY_PATTERN)) return ['ENTERTAINMENT'];
  // Loan providers land on the lending dashboard (checked before the generic
  // SERVICE_PROVIDER → SERVICE fallback below).
  if (categoriesMatch(categories, /\bloans?\b|\blending\b/i)) return ['LENDING'];

  if (role === 'SERVICE_PROVIDER') {
    if (subRole === 'SKILLED_LABOUR') return ['LABOUR'];
    // Equipment hire is a rental business (fleet out → comes back), not a
    // generic service practice. The authoritative path is the backend
    // archetype set (machinery-hire categories seed as RENTAL); this
    // branch covers mid-onboarding rows whose set hasn't been written yet.
    if (subRole === 'MACHINERY_HIRE') return ['RENTAL'];
    if (categories.some(isRepairVariant)) return ['REPAIR'];
    if (categoriesMatch(categories, /\bskilled\s?labour\b|\blabour\b|\bworker\b|\bgig\b/i))
      return ['LABOUR'];
    return ['SERVICE'];
  }

  // SUPPLIER_SELLER / HYBRID_SELLER / SERVICE_SELLER subRoles retired in
  // Phase 1.5 — wholesale / multi-archetype / service-only are now
  // expressed via the `archetypes` set, not subRole.

  if (subRole === 'PRODUCT_SELLER' || role === 'SELLER') {
    const hasRepair = categories.some(isRepairVariant);
    const hasSales = categories.some((c) => !isRepairVariant(c));
    // Phase 1.5: hasRepair + hasSales returns the SET so the multi-
    // archetype UI composes both surfaces (replaces the old
    // PRODUCTS_AND_REPAIR collapse).
    if (hasRepair && hasSales) return ['RETAIL', 'REPAIR'];
    if (hasRepair) return ['REPAIR'];
    return ['RETAIL'];
  }

  return ['UNKNOWN'];
}

/**
 * Single-value form of `getBusinessTypes`. Use ONLY for visual callers
 * that genuinely need one answer (calendar tone, page-title switches,
 * single-config selectors like CompanyDocuments' docs-config picker).
 * For composition-aware surfaces (sidebar merging, archetype sections)
 * use `getBusinessTypes` and `.includes(...)` instead.
 *
 * Tie-breaker priority is `BUSINESS_TYPE_PRIORITY` (events-first, then
 * services, then retail). A multi-archetype seller will surface their
 * "heaviest" surface here — e.g. RETAIL+REPAIR collapses to REPAIR_SERVICE
 * for the calendar tone. That's intentional: visual callers want one
 * coherent style, not a merged one.
 */
export function getPrimaryBusinessType(
  user: MinimalUserForBusinessType | null | undefined,
): BusinessType {
  const all = getBusinessTypes(user);
  if (all.length === 0) return 'UNKNOWN';
  for (const candidate of BUSINESS_TYPE_PRIORITY) {
    if (all.includes(candidate)) return candidate;
  }
  return all[0];
}

/**
 * Persona-aware shape of `getPrimaryBusinessType`. Use this for any
 * DISPLAY decision (sidebar labels, page titles, stat tiles, hero
 * copy, button text) — basically anything that should reflect "what
 * mode the seller is currently acting in" rather than "what
 * archetypes the seller can serve".
 *
 *   - Persona = `business:X` → returns X.
 *   - Persona = `personal`   → returns RETAIL (the personal schema
 *                              renders its own surfaces, but if any
 *                              display caller still fires we default
 *                              to RETAIL labels rather than nothing).
 *   - Persona = unset        → returns RETAIL (Buy New) by default.
 *                              Sellers who don't actually serve
 *                              RETAIL fall back to their first
 *                              archetype so the dashboard isn't
 *                              empty.
 *
 * STRUCTURAL decisions (data fetch gates, junction-table membership,
 * "does this seller actually offer X") still use `getBusinessTypes`
 * + `.includes(...)`. Persona doesn't change what the seller IS,
 * only what they're VIEWING.
 */
export function getEffectiveBusinessType(
  user: MinimalUserForBusinessType | null | undefined,
  activeContext?:
    | { type: 'business'; archetype: BusinessType }
    | { type: 'personal' }
    | null,
): BusinessType {
  const types = getBusinessTypes(user);
  // Only honour the context archetype if the user actually serves it.
  // The default context is always { type: 'business', archetype: 'RETAIL' }
  // from localStorage — without this guard, a venue/events provider with
  // archetypes=['EVENTS'] would permanently read as RETAIL because they
  // never override the default context on first login.
  if (activeContext?.type === 'business' && types.includes(activeContext.archetype)) {
    return activeContext.archetype;
  }
  // No matching persona → default to the user's primary archetype.
  if (types.includes('RETAIL')) return 'RETAIL';
  return types[0] || 'RETAIL';
}

/**
 * Persona-aware shape of `getBusinessTypes`. Use this for set-
 * membership DISPLAY decisions (e.g. `isBookingBased = .includes(
 * 'EVENTS') || .includes('ENTERTAINMENT')` driving label switches).
 * In `business:X` persona, the effective set collapses to just
 * `[X]`, so a multi-archetype seller in RETAIL persona reads as
 * "not booking-based" even if they ALSO serve EVENTS.
 */
export function getEffectiveBusinessTypes(
  user: MinimalUserForBusinessType | null | undefined,
  activeContext?:
    | { type: 'business'; archetype: BusinessType }
    | { type: 'personal' }
    | null,
): BusinessType[] {
  const types = getBusinessTypes(user);
  // Same guard as getEffectiveBusinessType: only collapse to the context
  // archetype if the user actually serves it.
  if (activeContext?.type === 'business' && types.includes(activeContext.archetype)) {
    return [activeContext.archetype];
  }
  return types;
}

/**
 * Human-friendly label for a BusinessType — used in admin tools and headers.
 */
export function getBusinessTypeLabel(type: BusinessType): string {
  switch (type) {
    case 'BUYER':
      return 'Buyer';
    case 'LABOUR':
      return 'Skilled Labour';
    case 'EVENTS':
      return 'Events Provider';
    case 'ENTERTAINMENT':
      return 'Entertainment Provider';
    case 'WHOLESALE':
      return 'Wholesale Supplier';
    case 'LENDING':
      return 'Loan Provider';
    case 'SERVICE':
      return 'Service Provider';
    case 'REPAIR':
      return 'Repair Service';
    case 'RETAIL':
      return 'Retail Shop';
    case 'RENTAL':
      return 'Rental Provider';
    case 'BOOKING':
      return 'Booking Provider';
    case 'ADMIN':
      return 'Admin';
    default:
      return 'Unverified';
  }
}
