import type { FieldSchema } from './categories';
import { getLabourInquirySchema } from './labourSchemaRegistry';
import { LABOUR_CATEGORIES } from './labourCategories';

/**
 * Adapt a per-trade labour schema into the shape DynamicInquiryForm renders.
 *
 * LabourInquiryField keys its fields `id`; DynamicInquiryForm renders by
 * `name` and SKIPS nameless fields — without this adapter every labour form
 * rendered empty. Shared by both entry points into the job-post flow (the
 * buyer funnel in BuyerDashboard and "Post a Job" in JobPostsManagerView) so
 * the two can't drift into asking different requirements for the same trade.
 */
export function getLabourFormFields(schemaKey: string | undefined): FieldSchema[] {
  const schema = getLabourInquirySchema(schemaKey || 'generic');
  return (schema?.fields || []).map((f) => ({
    name: f.id,
    label: f.label,
    type: f.type,
    required: f.required,
    placeholder: f.placeholder,
    options: f.options,
  })) as FieldSchema[];
}

/** Keys that are rendered as first-class card facts elsewhere (start date,
 *  location) — excluded so the requirements list doesn't repeat them. */
const REQUIREMENT_BLOCKLIST = new Set([
  'urgency',
  'preferredDateTime',
  'location',
  'site_location',
  'additional_notes',
]);

export interface LabourRequirement {
  label: string;
  value: string;
}

/**
 * Turn a job posting's stored `attributes` into display-ready
 * requirement rows, labelled from the trade's own schema (attributes are
 * keyed by field id, e.g. `has_own_tools` → "Must Have Own Tools").
 * Unknown keys still render with a de-slugged fallback label so a posting
 * never silently drops what its poster answered.
 */
export function getLabourRequirements(
  tradeId: string | undefined,
  attributes: Record<string, any> | null | undefined,
): LabourRequirement[] {
  if (!attributes) return [];
  const schemaKey = LABOUR_CATEGORIES.find((c) => c.id === tradeId)?.inquirySchemaKey;
  const labelByName = new Map(getLabourFormFields(schemaKey).map((f) => [f.name, f.label]));

  return Object.entries(attributes)
    .filter(([key, raw]) => {
      if (REQUIREMENT_BLOCKLIST.has(key)) return false;
      return raw !== null && raw !== undefined && raw !== '';
    })
    .map(([key, raw]) => ({
      label: labelByName.get(key) ?? key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()),
      value:
        typeof raw === 'boolean'
          ? raw
            ? 'Yes'
            : 'No'
          : Array.isArray(raw)
            ? raw.join(', ')
            : String(raw),
    }));
}
