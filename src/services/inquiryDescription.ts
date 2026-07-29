import type { FieldSchema } from './categories/types';

/**
 * Turns a buyer's form answers into a `title` + `description` the backend
 * will accept.
 *
 * CreateInquiryDto enforces `@MinLength(10)` on description and
 * `@MinLength(3)/@MaxLength(255)` on title. The old derivation was an `||`
 * probe chain, which tests TRUTHINESS rather than length: a buyer who typed
 * "None" or "wound" sent 4–5 chars straight to the API and ate a 400 —
 * after having already paid the quotation fee.
 *
 * Two rules here, both deliberate:
 *
 *  1. Pick the candidate FROM THE CATEGORY SCHEMA, not a hardcoded name
 *     list. Every category names its free-text field differently
 *     (`conditionDetails` for Home Care, `issueDescription`, `requestItems`,
 *     `projectDescription`…), and the old five-name list matched almost none
 *     of them — those categories silently shipped a generic sentinel to the
 *     seller instead of the buyer's actual words.
 *  2. NEVER discard a short answer. If the buyer typed fewer than 10
 *     characters, keep their words and append a generated summary sentence
 *     rather than replacing them. Short input is legitimate ("wound",
 *     "Panadol") — the API floor is our problem to satisfy, not theirs.
 */

/** Backend `@MinLength(10)` on CreateInquiryDto.description. */
const MIN_DESCRIPTION = 10;
/** Backend `@MinLength(3)` / `@MaxLength(255)` on CreateInquiryDto.title. */
const MIN_TITLE = 3;
const MAX_TITLE = 255;
/** Guard rail for the `text` column — long enough for any real request. */
const MAX_DESCRIPTION = 4000;

/**
 * Ordered fallback for callers with no schema to hand (legacy inquiries, the
 * generic fallback schema). Superseded by schema-driven selection whenever a
 * schema is available. `notes` is deliberately absent — no schema defines it.
 */
const DESCRIPTION_FIELD_PRIORITY = [
  'description',
  'conditionDetails',
  'incidentReport',
  'symptoms',
  'issueDescription',
  'projectDescription',
  'requestItems',
  'specialRequirements',
  'specialRequests',
  'partDescription',
  'additionalDetails',
];

const asText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/**
 * Free-text answers in the order we'd rather show them: schema textareas
 * (required first, then optional, each in schema order), then any legacy
 * priority name the schema didn't already cover.
 */
function collectCandidates(
  attributes: Record<string, any>,
  schema?: FieldSchema[],
): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  if (schema?.length) {
    const textareas = schema.filter((f) => f.type === 'textarea');
    for (const field of [
      ...textareas.filter((f) => f.required),
      ...textareas.filter((f) => !f.required),
    ]) {
      if (!seen.has(field.name)) {
        seen.add(field.name);
        names.push(field.name);
      }
    }
  }

  for (const name of DESCRIPTION_FIELD_PRIORITY) {
    if (!seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }

  return names.map((name) => asText(attributes[name])).filter(Boolean);
}

/**
 * A neutral sentence describing the request, used to top up a short answer
 * (or to stand alone when the buyer typed nothing). Always well over the
 * 10-char floor, so the returned description can never fail validation.
 */
function summarySentence(title: string, categoryName?: string): string {
  const subject = asText(title) || asText(categoryName) || 'this request';
  return `Request for ${subject}. See the request details for the full specification.`;
}

export interface BuildInquiryDescriptionParams {
  /** The raw form values captured by DynamicInquiryForm. */
  attributes: Record<string, any>;
  /** The category's FieldSchema[] — drives which answer is picked. */
  schema?: FieldSchema[];
  /** The inquiry headline, used to compose the summary sentence. */
  title?: string;
  /** Human-readable category name, used when there's no usable title. */
  categoryName?: string;
}

/**
 * Builds a description that is ALWAYS at least {@link MIN_DESCRIPTION}
 * characters, without ever throwing away what the buyer typed.
 */
export function buildInquiryDescription({
  attributes,
  schema,
  title,
  categoryName,
}: BuildInquiryDescriptionParams): string {
  const candidates = collectCandidates(attributes || {}, schema);

  // Prefer the first answer that already stands on its own.
  const sufficient = candidates.find((text) => text.length >= MIN_DESCRIPTION);
  if (sufficient) return sufficient.slice(0, MAX_DESCRIPTION);

  // Otherwise keep the buyer's words (if any) and top them up to a valid
  // length with the generated summary.
  const shortAnswer = candidates[0];
  const summary = summarySentence(title ?? '', categoryName);
  const composed = shortAnswer ? `${shortAnswer} — ${summary}` : summary;
  return composed.slice(0, MAX_DESCRIPTION);
}

/**
 * Keeps a derived title inside the backend's 3–255 character window: falls
 * back to `fallback` when the buyer's text is too short to be meaningful,
 * and truncates rather than 400-ing on an unusually long one.
 */
export function clampInquiryTitle(title: string, fallback: string): string {
  const trimmed = asText(title);
  const safe = trimmed.length >= MIN_TITLE ? trimmed : asText(fallback) || 'Inquiry';
  return safe.slice(0, MAX_TITLE);
}
