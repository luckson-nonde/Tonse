/**
 * Robust JSON parsing utility to handle double-stringified data
 * Peels back layers of stringification until an actual object/array is found
 */
export function robustParse<T = any>(data: any, fallback: T = {} as T): T {
  if (data === null || data === undefined || data === '') return fallback;
  
  let current = data;
  let iterations = 0;
  const maxIterations = 5; // Safety limit

  while (typeof current === 'string' && iterations < maxIterations) {
    try {
      const next = JSON.parse(current);
      // If parsing resulted in the same string, it's not a JSON string (e.g., "Hello")
      if (typeof next === 'string' && next === current) break;
      current = next;
      iterations++;
    } catch {
      // If it's a string but not JSON-parseable, stop here
      break;
    }
  }

  // Handle cases where the final result is an empty object or array-as-string
  if (typeof current === 'string') {
    if (current === '{}' || current === '[]') return fallback;
    // If it looks like JSON but wasn't caught by the loop
    if (current.startsWith('{') && current.endsWith('}')) {
        try { return JSON.parse(current); } catch { return fallback; }
    }
  }

  // If the final result is an object (and not null), return it
  if (typeof current === 'object' && current !== null) {
    // If it's an empty object, return fallback (helps with "rendering nothing" requests)
    if (!Array.isArray(current) && Object.keys(current).length === 0) return fallback;
    return current as T;
  }

  // If we ended up with a primitive but the caller expected an object, return fallback
  return (typeof current === typeof fallback) ? current : fallback;
}
