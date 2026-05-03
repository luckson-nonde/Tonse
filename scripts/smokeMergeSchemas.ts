import { mergeSchemas, pickSchemasForUser, resolveSchemaForUser } from '../src/services/mergeAccountSchemas';

const cases = [
  { label: 'RETAIL only',            role: 'SELLER', types: ['RETAIL'],                primary: 'RETAIL' },
  { label: 'REPAIR only',            role: 'SELLER', types: ['REPAIR'],                primary: 'REPAIR' },
  { label: 'RETAIL + REPAIR',        role: 'SELLER', types: ['RETAIL', 'REPAIR'],      primary: 'REPAIR' },
  { label: 'RETAIL + EVENTS',        role: 'SELLER', types: ['RETAIL', 'EVENTS'],      primary: 'EVENTS' },
  { label: 'EVENTS + ENTERTAINMENT', role: 'SELLER', types: ['EVENTS', 'ENTERTAINMENT'], primary: 'EVENTS' },
  { label: 'WHOLESALE + RETAIL',     role: 'SELLER', types: ['WHOLESALE', 'RETAIL'],   primary: 'WHOLESALE' },
  { label: 'BUYER',                  role: 'BUYER',  types: ['BUYER'],                 primary: 'BUYER' },
  { label: 'LABOUR',                 role: 'SERVICE_PROVIDER', types: ['LABOUR'],      primary: 'LABOUR' },
  { label: 'empty (mid-onboarding)', role: 'SELLER', types: [],                        primary: 'UNKNOWN' },
];

const labelOf = (item: any) => (typeof item.label === 'function' ? item.label('') : item.label);

for (const c of cases) {
  const u = { role: c.role };
  const picked = pickSchemasForUser(u as any, c.types as any, c.primary as any);
  const merged = resolveSchemaForUser(u as any, c.types as any, c.primary as any);
  const navIds = merged.navigation.map((n) => n.id);
  console.log(c.label.padEnd(28), '| schemas=' + picked.length, '| nav(' + navIds.length + ') =', navIds.join(','));
  for (const id of ['leads', 'products', 'paid-orders', 'schedule', 'venue-spaces', 'collection']) {
    const item = merged.navigation.find((n) => n.id === id);
    if (item) console.log('   ', id.padEnd(15), '→', labelOf(item));
  }
  console.log('');
}
