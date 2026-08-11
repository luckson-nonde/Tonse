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

/**
 * Reserved attribute keys the VACANCY COMPOSER owns. A job post created by
 * the composer stamps `postShape: 'vacancy'` and these alongside it, inside
 * the same `attributes` json the trade answers used to occupy — no column,
 * no migration (nothing filters or sorts on them; the column is documented
 * as JS-filtered-after-load, never queried in SQL).
 */
export const VACANCY_RESERVED_KEYS = [
  'postShape',
  'resp_list',
  'min_requirements',
  'employment_type',
  'pay_note',
] as const;

/**
 * True for any attribute key the poster's form REBUILDS from scratch on every
 * submit. An edit-and-resubmit must strip these from the stored attributes
 * before merging fresh form state, or a bullet/requirement the poster DELETED
 * survives from the original posting. Single source of truth — used by
 * JobPostsManagerView.submitFlow.
 */
export function isPosterRebuiltAttributeKey(key: string): boolean {
  return key.startsWith('req_') || (VACANCY_RESERVED_KEYS as readonly string[]).includes(key);
}

/** Keys that are rendered as first-class card facts elsewhere (start date,
 *  location) — excluded so the specifications list doesn't repeat them. */
const SPEC_BLOCKLIST = new Set<string>([
  'urgency',
  'preferredDateTime',
  'location',
  'site_location',
  'additional_notes',
  ...VACANCY_RESERVED_KEYS,
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
// Uniform across all trades, collected in VacancyComposerForm and stored
// as req_* keys inside the posting's attributes json — no schema change and
// no per-trade drift. The apply modal derives its attach-proof slots from
// these, so what the poster demands is exactly what the seeker can answer.

export const EXPERIENCE_OPTIONS = ['Any level', '1+ years', '3+ years', '5+ years'] as const;

export const EMPLOYMENT_TYPE_OPTIONS = [
  'Full-time',
  'Part-time',
  'Contract',
  'Casual / Piece work',
  'Seasonal',
] as const;

/** Common documents a Zambian job ad asks for. The poster can also type any
 *  custom name ("Forklift operator permit"); both land in the same
 *  `req_documents` string array, and each entry becomes a MANDATORY upload
 *  slot in the application. Labels are matched exactly end to end — renaming
 *  one here does not migrate postings that already stored the old string. */
export const REQUIRED_DOCUMENT_PRESETS = [
  'NRC / National ID',
  'Grade 12 Certificate',
  'CV / Résumé',
  "Driver's Licence",
  'Trade certificate',
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

export interface VacancyDetails {
  responsibilities: string[];
  minimumRequirements: string[];
  employmentType: string | null;
  payNote: string | null;
}

/**
 * The vacancy-ad content of a posting, or NULL for legacy postings created
 * before the composer existed (they carry per-trade inquiry answers instead
 * — callers fall back to getJobSpecifications for those). `postShape` is the
 * discriminator; there is no backfill.
 */
export function getVacancyDetails(
  attributes: Record<string, any> | null | undefined,
): VacancyDetails | null {
  if (!attributes || attributes.postShape !== 'vacancy') return null;
  const bullets = (raw: any): string[] =>
    Array.isArray(raw) ? raw.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim()) : [];
  return {
    responsibilities: bullets(attributes.resp_list),
    minimumRequirements: bullets(attributes.min_requirements),
    employmentType:
      typeof attributes.employment_type === 'string' && attributes.employment_type.trim()
        ? attributes.employment_type
        : null,
    payNote:
      typeof attributes.pay_note === 'string' && attributes.pay_note.trim()
        ? attributes.pay_note.trim()
        : null,
  };
}

/** The universal first slot of every application — a letter, before any
 *  evidence. Matched EXACTLY (string equality) by the server-side gate. */
export const APPLICATION_LETTER_SLOT = 'Application Letter';

/**
 * MANDATORY upload slots for an application: the application letter first,
 * then one per demanded document, plus a certification slot when one is
 * required. Every slot must carry a file before the application can be
 * submitted — the apply modal blocks on it and JobBoardService.applyToJob
 * enforces the same list server-side (keep the two in lockstep: labels are
 * matched exactly, and the Set dedupes a poster who listed a document
 * literally named "Application Letter").
 */
export function getRequiredAttachmentSlots(
  attributes: Record<string, any> | null | undefined,
): string[] {
  const docs: string[] = Array.isArray(attributes?.req_documents) ? attributes!.req_documents : [];
  return Array.from(
    new Set([
      APPLICATION_LETTER_SLOT,
      ...docs,
      ...(attributes?.req_certifications ? ['Certification'] : []),
    ]),
  );
}
