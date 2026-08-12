import { LABOUR_CATEGORIES } from '../../services/labourCategories';
import type { PublicJobFeedItem } from '../../services/api/jobBoardService';

/**
 * Formatting/labelling helpers shared by `JobCard`, `JobDetail` and
 * `ApplyModal` — split out so those three files (each usable standalone,
 * on both the authenticated feed and the public `/discover` surface) don't
 * duplicate them or create a circular import between each other. Plain
 * `.ts` (no JSX) — the one JSX-bearing helper, `AppliedBadge`, lives in
 * `AppliedBadge.tsx` alongside this file for that reason.
 */

export const tradeLabelOf = (id: string) =>
  LABOUR_CATEGORIES.find((c) => c.id === id)?.label ?? id.replace(/_/g, ' ');

export const formatPay = (payOffer: number | string | null, unit: string | null) => {
  const n = Number(payOffer);
  if (!payOffer || Number.isNaN(n) || n <= 0) return null;
  return `K${n.toLocaleString()} ${unit ?? ''}`.trim();
};

/** Rate units expressed as a per-day multiplier, so "highest pay" can rank a
 *  K50/hour job against a K4,000/month one instead of comparing raw figures
 *  across incompatible units. Zambian norms: 8h day, 5-day week, 22-day month. */
const PER_DAY_FACTOR: Record<string, number> = {
  'Per Hour': 8,
  'Per Day': 1,
  'Per Week': 1 / 5,
  'Per Month': 1 / 22,
};

export const payPerDay = (job: PublicJobFeedItem): number | null => {
  const n = Number(job.payOffer);
  if (!job.payOffer || Number.isNaN(n) || n <= 0) return null;
  return n * (PER_DAY_FACTOR[job.payRateUnit ?? 'Per Day'] ?? 1);
};

export const timeAgo = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (mins < 60) return `${mins || 1}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
};
