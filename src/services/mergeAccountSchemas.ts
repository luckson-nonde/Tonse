import { MasterAccountSchema, NavigationItem, ViewDefinition } from './accountSchemaTypes';
import { BusinessType } from './categories';
import { MASTER_BUYER_ACCOUNT_SCHEMA } from './buyerAccountSchema';
import { MASTER_LABOUR_ACCOUNT_SCHEMA } from './labourAccountSchema';
import { MASTER_SUPPLIER_ACCOUNT_SCHEMA } from './supplierAccountSchema';
import { MASTER_RETAIL_ACCOUNT_SCHEMA } from './retailAccountSchema';
import { MASTER_REPAIR_ACCOUNT_SCHEMA } from './repairAccountSchema';
import { MASTER_RENTAL_ACCOUNT_SCHEMA } from './rentalAccountSchema';
import { MASTER_BOOKING_ACCOUNT_SCHEMA } from './bookingAccountSchema';
import { MASTER_SERVICE_ACCOUNT_SCHEMA } from './serviceAccountSchema';
import { MASTER_EVENTS_ACCOUNT_SCHEMA } from './eventsAccountSchema';
import { MASTER_ENTERTAINMENT_ACCOUNT_SCHEMA } from './entertainmentAccountSchema';
import { MASTER_PROVIDER_ACCOUNT_SCHEMA } from './providerAccountSchema';
import { MASTER_PERSONAL_ACCOUNT_SCHEMA } from './personalAccountSchema';
import type { ActiveProfileContext } from '../hooks/useActiveProfileContext';

/**
 * Map an Archetype/BusinessType (the seller side ones) to the schema
 * that owns that archetype's nav + views. Order doesn't matter — the
 * priority order lives in `MERGE_PRIORITY` below.
 */
const ARCHETYPE_TO_SCHEMA: Partial<Record<BusinessType, MasterAccountSchema>> = {
  WHOLESALE: MASTER_SUPPLIER_ACCOUNT_SCHEMA,
  EVENTS: MASTER_EVENTS_ACCOUNT_SCHEMA,
  ENTERTAINMENT: MASTER_ENTERTAINMENT_ACCOUNT_SCHEMA,
  REPAIR: MASTER_REPAIR_ACCOUNT_SCHEMA,
  BOOKING: MASTER_BOOKING_ACCOUNT_SCHEMA,
  RENTAL: MASTER_RENTAL_ACCOUNT_SCHEMA,
  SERVICE: MASTER_SERVICE_ACCOUNT_SCHEMA,
  RETAIL: MASTER_RETAIL_ACCOUNT_SCHEMA,
};

// MERGE_PRIORITY removed when the simplified persona model dropped
// the merged 'all' view — schemas are no longer composed at the
// dashboard level. mergeSchemas() still merges N inputs in case we
// reintroduce composition later, but no caller currently passes >1.

/**
 * Merge two or more schemas into one. Rules:
 *   - Walk schemas in given order (highest-priority first).
 *   - For each nav item: first occurrence of an `id` wins; later
 *     occurrences with the same id are dropped (the higher-priority
 *     archetype's labels survive).
 *   - Items with ids unique to a single schema are appended in the
 *     encounter order — this is the multi-archetype payoff: an
 *     events-and-retail seller gets Venue Spaces (EVENTS-only) AND
 *     Inventory (shared id `products`, EVENTS wins the label).
 *   - Same dedup-by-id rule for the `views` map.
 *   - `schemaType` comes from the first schema; the consumers don't
 *     branch on it for sellers anyway (only BUYER vs LABOUR vs
 *     PROVIDER, and merge only runs on PROVIDER schemas).
 */
export function mergeSchemas(schemas: MasterAccountSchema[]): MasterAccountSchema {
  if (schemas.length === 0) return MASTER_PROVIDER_ACCOUNT_SCHEMA;
  if (schemas.length === 1) return schemas[0];

  const navById = new Map<string, NavigationItem>();
  for (const schema of schemas) {
    for (const item of schema.navigation) {
      if (!navById.has(item.id)) navById.set(item.id, item);
    }
  }

  const viewsById: Record<string, ViewDefinition> = {};
  for (const schema of schemas) {
    for (const [id, view] of Object.entries(schema.views)) {
      if (!(id in viewsById)) viewsById[id] = view;
    }
  }

  return {
    schemaType: schemas[0].schemaType,
    navigation: Array.from(navById.values()),
    views: viewsById,
  };
}

/**
 * Pick the schema(s) that apply to a user. With the simplified persona
 * model, this almost always returns a single-element array — the
 * merged "all archetypes" view is gone. Multi-element results are
 * vestigial; mergeSchemas still works on N inputs in case we ever
 * reintroduce a composed view.
 *
 * Top-level branches (BUYER, LABOUR) short-circuit because they
 * don't have a persona-driven archetype to switch through.
 *
 * `activeContext` is the dashboard persona switch:
 *   - 'personal'        → identity-only schema; archetype set ignored.
 *   - 'business' + arch → just that archetype's schema.
 *   - undefined         → default to RETAIL (Buy New). If the seller
 *                         doesn't actually serve RETAIL, fall back
 *                         to their first archetype's schema so the
 *                         dashboard isn't empty.
 */
export function pickSchemasForUser(
  user: { role?: string } | null | undefined,
  businessTypes: BusinessType[],
  _primaryBusinessType: BusinessType,
  activeContext?: ActiveProfileContext,
): MasterAccountSchema[] {
  if (!user) return [MASTER_PROVIDER_ACCOUNT_SCHEMA];
  if (user.role === 'BUYER') return [MASTER_BUYER_ACCOUNT_SCHEMA];

  // Personal persona overrides everything — even labour users see the
  // personal schema when they're in this mode.
  if (activeContext?.type === 'personal') return [MASTER_PERSONAL_ACCOUNT_SCHEMA];

  // LABOUR sellers don't have a persona switch (single-purpose role).
  if (businessTypes.includes('LABOUR') && businessTypes.length === 1) {
    return [MASTER_LABOUR_ACCOUNT_SCHEMA];
  }

  // Business persona: pick the active archetype's schema, but ONLY
  // if the user actually serves that archetype. The context defaults
  // to { type: 'business', archetype: 'RETAIL' } in localStorage, so
  // a venue provider with archetypes=['EVENTS'] would get the RETAIL
  // schema on first login. Guard: if the context archetype is not in
  // the user's set, ignore it and fall through to the primary archetype.
  const contextArchetype: BusinessType | null =
    activeContext?.type === 'business' && businessTypes.includes(activeContext.archetype)
      ? activeContext.archetype
      : null;

  const archetype: BusinessType =
    contextArchetype
      ?? (businessTypes.includes('RETAIL')
        ? 'RETAIL'
        : (businessTypes[0] ?? 'RETAIL'));

  const schema = ARCHETYPE_TO_SCHEMA[archetype];
  if (schema) return [schema];
  // Picked archetype isn't a known schema (e.g. RENTAL/BOOKING with
  // no own schema) — fall back to PROVIDER rather than crashing.
  return [MASTER_PROVIDER_ACCOUNT_SCHEMA];
}

/**
 * Convenience wrapper: pick + merge in one call. Returns a single
 * MasterAccountSchema ready for the renderer / nav filter.
 */
export function resolveSchemaForUser(
  user: { role?: string } | null | undefined,
  businessTypes: BusinessType[],
  primaryBusinessType: BusinessType,
  activeContext?: ActiveProfileContext,
): MasterAccountSchema {
  return mergeSchemas(
    pickSchemasForUser(user, businessTypes, primaryBusinessType, activeContext),
  );
}
