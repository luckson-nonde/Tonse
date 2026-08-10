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
 *  location) — excluded so the specifications list doesn't repeat them. */
const SPEC_BLOCKLIST = new Set([
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

const formatValue = (raw: any): string =>
  typeof raw === 'boolean' ? (raw ? 'Yes' : 'No') : Array.isArray(raw) ? raw.join(', ') : String(raw);

/**
 * JOB SPECIFICATIONS: the work itself — the trade form's answers, labelled
 * from the trade's own schema (attributes are keyed by field id, e.g.
 * `carpentry_type` → "Carpentry Type"). Applicant-requirement keys (req_*)
 * are excluded; those render as their own block via getSeekerRequirements.
 * Unknown keys still render with a de-slugged fallback label so a posting
 * never silently drops what its poster answered.
 */
export function getJobSpecifications(
  tradeId: string | undefined,
  attributes: Record<string, any> | null | undefined,
): LabourRequirement[] {
  if (!attributes) return [];
  const schemaKey = LABOUR_CATEGORIES.find((c) => c.id === tradeId)?.inquirySchemaKey;
  const labelByName = new Map(getLabourFormFields(schemaKey).map((f) => [f.name, f.label]));

  return Object.entries(attributes)
    .filter(([key, raw]) => {
      if (SPEC_BLOCKLIST.has(key) || key.startsWith('req_')) return false;
      return raw !== null && raw !== undefined && raw !== '';
    })
    .map(([key, raw]) => ({
      label: labelByName.get(key) ?? key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()),
      value: formatValue(raw),
    }));
}

// ── Applicant requirements (what the WORKER must have) ────────────────────
// Uniform across all trades, collected in JobPostingDetailsForm and stored
// as req_* keys inside the posting's attributes json — no schema change and
// no per-trade drift. The apply modal derives its attach-proof slots from
// these, so what the poster demands is exactly what the seeker can answer.

export const EXPERIENCE_OPTIONS = ['Any level', '1+ years', '3+ years', '5+ years'] as const;

export const REQUIRED_DOCUMENT_OPTIONS = [
  'NRC / National ID',
  'Trade certificate',
  "Driver's licence",
  'Police clearance',
  'References',
] as const;

const SEEKER_REQUIREMENT_LABELS: Record<string, string> = {
  req_experience: 'Experience',
  req_own_tools: 'Own tools',
  req_certifications: 'Certification',
  req_documents: 'Documents to attach',
  req_other: 'Other requirements',
};

/** The posting's req_* keys as display rows, in a stable order. */
export function getSeekerRequirements(
  attributes: Record<string, any> | null | undefined,
): LabourRequirement[] {
  if (!attributes) return [];
  return Object.keys(SEEKER_REQUIREMENT_LABELS)
    .filter((key) => {
      const raw = attributes[key];
      return raw !== null && raw !== undefined && raw !== '' && !(Array.isArray(raw) && !raw.length);
    })
    .map((key) => ({
      label: SEEKER_REQUIREMENT_LABELS[key],
      value: key === 'req_own_tools' ? 'Must bring their own tools' : formatValue(attributes[key]),
    }));
}

/**
 * Attach-slot labels for the apply modal: one per demanded document, plus a
 * certification slot when one is required, plus a free extras slot.
 */
export function getAttachmentSlotLabels(
  attributes: Record<string, any> | null | undefined,
): string[] {
  const docs: string[] = Array.isArray(attributes?.req_documents) ? attributes!.req_documents : [];
  return [
    ...docs,
    ...(attributes?.req_certifications ? ['Certification'] : []),
    'Supporting document',
  ];
}
