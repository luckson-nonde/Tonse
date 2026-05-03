import { mergeSchemas, pickSchemasForUser, resolveSchemaForUser } from '../src/services/mergeAccountSchemas';
import type { ActiveProfileContext } from '../src/hooks/useActiveProfileContext';

// Suppress unused warning for `mergeSchemas` (we use the higher-level
// resolveSchemaForUser, which calls mergeSchemas internally).
void mergeSchemas;

const ALL: ActiveProfileContext = { type: 'all' };
const PERSONAL: ActiveProfileContext = { type: 'personal' };
const BUSINESS_RETAIL: ActiveProfileContext = { type: 'business', archetype: 'RETAIL' as any };
const BUSINESS_REPAIR: ActiveProfileContext = { type: 'business', archetype: 'REPAIR' as any };

const cases = [
  // Phase 2.1 baseline — no context arg = default merged.
  { label: 'RETAIL+REPAIR (no context)',         role: 'SELLER', types: ['RETAIL','REPAIR'], primary: 'REPAIR', ctx: undefined },
  // Phase 4 — explicit contexts on the same multi-archetype seller.
  { label: 'RETAIL+REPAIR + ALL persona',        role: 'SELLER', types: ['RETAIL','REPAIR'], primary: 'REPAIR', ctx: ALL },
  { label: 'RETAIL+REPAIR + Personal persona',   role: 'SELLER', types: ['RETAIL','REPAIR'], primary: 'REPAIR', ctx: PERSONAL },
  { label: 'RETAIL+REPAIR + Business · RETAIL',  role: 'SELLER', types: ['RETAIL','REPAIR'], primary: 'REPAIR', ctx: BUSINESS_RETAIL },
  { label: 'RETAIL+REPAIR + Business · REPAIR',  role: 'SELLER', types: ['RETAIL','REPAIR'], primary: 'REPAIR', ctx: BUSINESS_REPAIR },
  // Single archetype — Personal works, Business · X works, ALL collapses to single.
  { label: 'RETAIL only + Personal persona',     role: 'SELLER', types: ['RETAIL'],          primary: 'RETAIL', ctx: PERSONAL },
  // BUYER short-circuits regardless of context.
  { label: 'BUYER + Personal persona (ignored)', role: 'BUYER',  types: ['BUYER'],           primary: 'BUYER',  ctx: PERSONAL },
];

const labelOf = (item: any) => (typeof item.label === 'function' ? item.label('') : item.label);

for (const c of cases) {
  const u = { role: c.role };
  const picked = pickSchemasForUser(u as any, c.types as any, c.primary as any, c.ctx);
  const merged = resolveSchemaForUser(u as any, c.types as any, c.primary as any, c.ctx);
  const navIds = merged.navigation.map((n) => n.id);
  console.log(c.label.padEnd(40), '| schemas=' + picked.length, '| nav(' + navIds.length + ') =', navIds.join(','));
  for (const id of ['leads', 'products', 'paid-orders', 'schedule', 'venue-spaces', 'collection', 'profile', 'financial']) {
    const item = merged.navigation.find((n) => n.id === id);
    if (item) console.log('   ', id.padEnd(15), '→', labelOf(item));
  }
  console.log('');
}
