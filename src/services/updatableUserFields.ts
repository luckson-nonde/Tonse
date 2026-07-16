/**
 * Client-side mirror of the backend's UpdateUserDto (the single source of
 * truth for what PATCH /users/:id accepts). The backend runs
 * `forbidNonWhitelisted: true`, so ONE stray key — e.g. a schema-only form
 * field like `country` or `storePhotoFront` — 400s the ENTIRE save and the
 * user's profile-picture/logo edit silently dies. The profile forms are
 * schema-driven and legitimately carry display-only fields, so the pages
 * filter through this list right before submitting.
 *
 * If a new field should persist: add the column + UpdateUserDto entry on
 * the backend FIRST, then add the key here.
 */
export const UPDATABLE_USER_FIELDS = [
  'name',
  'nrc',
  'categories',
  'socialLinks',
  'isActive',
  'pin',
  'phone',
  'profilePicture',
  'logo',
  'coverImage',
  'subRole',
  'province',
  'city',
  'area',
  'latitude',
  'longitude',
  'radius',
  'companyName',
  'tpin',
  'incorporationCertUrl',
  'labourCategory',
  'labourSubTypes',
  'categoryIds',
  'archetype',
] as const;

/** Keep only keys the backend accepts; log what was dropped so a field
 *  that "doesn't save" is diagnosable from the console. */
export function filterToUpdatableUserFields(
  payload: Record<string, any>
): Record<string, any> {
  const allowed = new Set<string>(UPDATABLE_USER_FIELDS as readonly string[]);
  const filtered: Record<string, any> = {};
  const dropped: string[] = [];
  for (const [key, value] of Object.entries(payload)) {
    if (allowed.has(key)) filtered[key] = value;
    else dropped.push(key);
  }
  if (dropped.length > 0) {
    console.debug(
      `[profile-save] dropped non-persistable form fields: ${dropped.join(', ')}`
    );
  }
  return filtered;
}
