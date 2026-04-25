let counter = 0;

/**
 * Generate a unique key for React list items
 * @param prefix - prefix for the key (e.g. 'home-product')
 * @param id - primary identifier
 * @param fallback - secondary fallback value or object with alternative id fields
 * @returns unique string key
 */
export function uniqueKey(
  prefix: string,
  id?: string | number,
  fallback?: string | number | any
): string {
  // Primary: use id if available and not empty
  if (id !== undefined && id !== null && id !== '' && id !== 0) {
    return `${prefix}-${id}`;
  }

  // Secondary: extract id from fallback object if provided
  if (fallback !== undefined && fallback !== null) {
    if (typeof fallback === 'object') {
      // Try common id field names
      const idValue =
        fallback.id ||
        fallback.itemId ||
        fallback.productId ||
        fallback.quoteId ||
        fallback.inquiryId ||
        fallback.scheduleId;
      if (idValue) {
        return `${prefix}-${idValue}`;
      }
      // Fallback to stringified object (first 50 chars for brevity)
      const serialized = JSON.stringify(fallback).slice(0, 50);
      return `${prefix}-obj-${serialized}`;
    }
    // If fallback is a string/number, use it
    return `${prefix}-fb-${fallback}`;
  }

  // Tertiary: auto-increment (should rarely be needed, consider as error indicator)
  return `${prefix}-auto-${counter++}`;
}
