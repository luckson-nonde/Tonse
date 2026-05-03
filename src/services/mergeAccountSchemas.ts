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

/**
 * Tie-breaker for nav items / views with shared `id` across multiple
 * schemas. Higher (earlier) wins. Mirrors BUSINESS_TYPE_PRIORITY in
 * services/categories.ts so the same archetype that gets primary
 * status for visual callers also wins shared-id ties in the merge.
 */
const MERGE_PRIORITY: BusinessType[] = [
  'EVENTS',
  'ENTERTAINMENT',
  'REPAIR',
  'WHOLESALE',
  'BOOKING',
  'RENTAL',
  'SERVICE',
  'RETAIL',
];

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
 * Pick the schema(s) that apply to a user, returning them in priority
 * order ready to feed straight into `mergeSchemas`. Single-schema
 * users get a one-element array; multi-archetype users get the
 * priority-ordered set.
 *
 * Top-level branches (BUYER, LABOUR) short-circuit to a single schema
 * because they don't compose with the seller-side archetype set.
 */
export function pickSchemasForUser(
  user: { role?: string } | null | undefined,
  businessTypes: BusinessType[],
  primaryBusinessType: BusinessType,
): MasterAccountSchema[] {
  if (!user) return [MASTER_PROVIDER_ACCOUNT_SCHEMA];
  if (user.role === 'BUYER') return [MASTER_BUYER_ACCOUNT_SCHEMA];
  if (primaryBusinessType === 'LABOUR') return [MASTER_LABOUR_ACCOUNT_SCHEMA];

  const matched: MasterAccountSchema[] = [];
  for (const archetype of MERGE_PRIORITY) {
    if (businessTypes.includes(archetype)) {
      const schema = ARCHETYPE_TO_SCHEMA[archetype];
      if (schema && !matched.includes(schema)) matched.push(schema);
    }
  }
  if (matched.length === 0) return [MASTER_PROVIDER_ACCOUNT_SCHEMA];
  return matched;
}

/**
 * Convenience wrapper: pick + merge in one call. Returns a single
 * MasterAccountSchema ready for the renderer / nav filter.
 */
export function resolveSchemaForUser(
  user: { role?: string } | null | undefined,
  businessTypes: BusinessType[],
  primaryBusinessType: BusinessType,
): MasterAccountSchema {
  return mergeSchemas(pickSchemasForUser(user, businessTypes, primaryBusinessType));
}
