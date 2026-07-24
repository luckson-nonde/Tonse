/**
 * Human-friendly relative time — "just now", "5m ago", "3h ago", "2d ago",
 * then an absolute "18 Jul" once it's a week or more old.
 *
 * Extracted from the page-local helper in admin/AdminDashboard.tsx so the
 * buyer dashboard activity feed (and anywhere else) can share one formatter.
 * Accepts an ISO string, an epoch number, or undefined (returns '').
 */
export const formatRelativeTime = (s?: string | number): string => {
  if (!s && s !== 0) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  // Guard against clock skew / future timestamps reading as a huge "ago".
  if (diff < 0) return 'just now';
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
