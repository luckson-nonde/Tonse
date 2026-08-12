/**
 * Display-name overrides for the PUBLIC `/discover` surface only.
 *
 * "Labour & Skills" is the category's real name everywhere else — the
 * buyer's trade picker (`BuyerCategoryPicker`), admin, `VacancyComposerForm`
 * all keep it exactly as-is, because that's a working, already-tested flow.
 * On `/discover`, the category is now backed by real job postings with an
 * Apply button rather than shop cards with a quote form, so it reads as
 * "Employment" there — a presentation-only rename, not a change to the
 * category's actual `categories.name` value in the database.
 */
const PUBLIC_CATEGORY_LABEL_OVERRIDES: Record<string, string> = {
  labour: 'Employment',
};

export function publicCategoryLabel(id: string, fallback: string): string {
  return PUBLIC_CATEGORY_LABEL_OVERRIDES[id] ?? fallback;
}
