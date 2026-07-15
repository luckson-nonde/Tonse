/**
 * Whitelists a client-supplied "sort" query param against a fixed set of
 * column names before it reaches `.orderBy()`. TypeORM's query builder
 * string-interpolates the column name into the generated SQL with no
 * escaping — an unvalidated value here is a SQL-injection sink, not just a
 * bad-input case, so this returns the safe fallback for anything that
 * isn't an exact allowlist match rather than trying to sanitize it.
 */
export function resolveSortField(
  requested: unknown,
  allowed: readonly string[],
  fallback: string,
): string {
  return typeof requested === 'string' && allowed.includes(requested) ? requested : fallback;
}

/** Same idea for ASC/DESC — anything else silently falls back to `fallback`. */
export function resolveSortOrder(requested: unknown, fallback: 'ASC' | 'DESC' = 'DESC'): 'ASC' | 'DESC' {
  const upper = typeof requested === 'string' ? requested.toUpperCase() : '';
  return upper === 'ASC' || upper === 'DESC' ? upper : fallback;
}
