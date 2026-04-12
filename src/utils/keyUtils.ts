let counter = 0;

export function uniqueKey(prefix: string, id?: string | number, fallback?: string | number): string {
  if (id !== undefined && id !== null && id !== '') {
    return `${prefix}-${id}`;
  }
  if (fallback !== undefined) {
    return `${prefix}-fb-${fallback}`;
  }
  return `${prefix}-auto-${counter++}`;
}
