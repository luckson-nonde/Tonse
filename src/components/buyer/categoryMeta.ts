import {
  Smartphone,
  Armchair,
  Shirt,
  Lamp,
  Car,
  ShoppingBasket,
  Sparkles,
  Hammer,
  Music,
  PartyPopper,
  Radio,
  Server,
  Laptop,
  Droplets,
  Sprout,
  Stethoscope,
  Building2,
  Croissant,
  Box,
  type LucideIcon,
} from 'lucide-react';

export interface CategoryMeta {
  icon: LucideIcon;
  /** Tile accent — desaturated to harmonize with cream `#f5f2ed` background. */
  accent: string;
  /** Short description shown on List & Mosaic layouts. */
  tagline: string;
}

/**
 * Per-master metadata. Keys must match `Category.id` in
 * src/services/categories.ts (BASE_CATEGORIES_DB). Anything not listed
 * falls back to FALLBACK_META so we never crash on a future seed.
 */
export const CATEGORY_META: Record<string, CategoryMeta> = {
  electronics:           { icon: Smartphone,     accent: '#3399C9', tagline: 'Phones, laptops, audio, parts' },
  furniture:             { icon: Armchair,       accent: '#8E6FD8', tagline: 'Office, home, hospitality' },
  fashion:               { icon: Shirt,          accent: '#D9609B', tagline: 'Clothing, footwear, accessories' },
  'home-decor':          { icon: Lamp,           accent: '#E8884B', tagline: 'Lighting, art, rugs, blinds' },
  automotive:            { icon: Car,            accent: '#1e293b', tagline: 'Parts, tyres, accessories' },
  groceries:             { icon: ShoppingBasket, accent: '#3FA98B', tagline: 'Produce, staples, drinks' },
  beauty:                { icon: Sparkles,       accent: '#D9609B', tagline: 'Skincare, makeup, fragrance' },
  construction:          { icon: Hammer,         accent: '#6B7280', tagline: 'Materials, tools, machinery' },
  entertainment:         { icon: Music,          accent: '#8E6FD8', tagline: 'DJs, bands, MCs, dancers' },
  events:                { icon: PartyPopper,    accent: '#D9534F', tagline: 'Venues, planning, decor' },
  telecommunications:    { icon: Radio,          accent: '#3399C9', tagline: 'Networks, airtime, devices' },
  'it-services':         { icon: Server,         accent: '#1e293b', tagline: 'Support, hosting, dev work' },
  'it-products':         { icon: Laptop,         accent: '#3399C9', tagline: 'Hardware, software, peripherals' },
  'drilling-services':   { icon: Droplets,       accent: '#3399C9', tagline: 'Boreholes, water systems' },
  agriculture:           { icon: Sprout,         accent: '#3FA98B', tagline: 'Seeds, inputs, machinery' },
  'clinical-services':   { icon: Stethoscope,    accent: '#3FA98B', tagline: 'Lab tests, medication, prescriptions' },
  apartments:            { icon: Building2,      accent: '#8E6FD8', tagline: 'Rentals, short stay, boarding' },
  'pastry-bakery':       { icon: Croissant,      accent: '#E8884B', tagline: 'Custom cakes, bread, pastries' },
};

export const FALLBACK_META: CategoryMeta = {
  icon: Box,
  accent: '#64748B',
  tagline: '',
};

export const getMeta = (id: string): CategoryMeta => CATEGORY_META[id] ?? FALLBACK_META;

/**
 * Finished category artwork, dropped in src/assets/images/categories/ with
 * the category id as the file stem (see that folder's README). Stems are
 * normalized (lowercase, spaces/underscores → hyphens) so a drop named
 * "Home Decor.webp" still resolves to `home-decor` without a rename.
 * Categories without artwork keep the icon-chip treatment.
 */
const CATEGORY_ART = import.meta.glob('../../assets/images/categories/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const ART_BY_ID: Record<string, string> = {};
for (const [path, url] of Object.entries(CATEGORY_ART)) {
  const stem = path
    .split('/')
    .pop()!
    .replace(/\.(png|jpe?g|webp)$/i, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-');
  ART_BY_ID[stem] = url;
}

export const getCategoryArt = (id: string): string | undefined => ART_BY_ID[id];

/**
 * Specialty preview artwork (Choose Specialty step). Files live in
 * src/assets/images/specialty/ named `<stem>-<state>.<ext>` where state is
 * `sell` | `repair` | `both` and stem is the catalog sub id minus its
 * `-buy`/`-repair` suffix (e.g. `mobile-phones-sell.webp`). See that folder's
 * README. Same stem normalization as the category art above.
 */
export type SpecialtyState = 'sell' | 'repair' | 'both';

// Recursive: images are organized into per-category subfolders (electronics/,
// machinery-hire/, labour/<track>/, …) purely for tidiness — the lookup key is
// still the bare filename, so folder placement never affects resolution.
// _archive/ holds superseded browser-copy duplicates and is excluded so its
// dead assets are never bundled.
const SPECIALTY_ART = import.meta.glob(
  [
    '../../assets/images/specialty/**/*.{png,jpg,jpeg,webp}',
    '!**/_archive/**',
  ],
  {
    eager: true,
    import: 'default',
  },
) as Record<string, string>;

/**
 * Normalize a specialty filename to its lookup key. Lower-cases, drops a
 * trailing `" (n)"` copy suffix (browser re-downloads), DELETES apostrophes
 * (catalog ids drop them: "Men's Clothing" → `mens-clothing`, so `'`/`’` must
 * vanish rather than become a hyphen), and collapses every remaining run of
 * non-alphanumeric characters — spaces, underscores, `&`, `()`, `/` — into a
 * single hyphen. So a file named for the item's *display name*
 * ("Software & Web Development.webp", "Men's Clothing.webp") keys to the same
 * stem as its catalog **id** (`software-web-development`, `mens-clothing`)
 * with no manual rename. State-suffixed electronics stems
 * (`mobile-phones-sell`) are unaffected — their hyphens re-collapse to
 * themselves.
 */
export const normalizeSpecialtyKey = (fileName: string): string =>
  fileName
    .replace(/\.(png|jpe?g|webp)$/i, '')
    .toLowerCase()
    .replace(/\s*\(\d+\)\s*$/, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// True for a browser copy download ("… (1).webp"). When several files collapse
// to one key, a canonical (non-copy) file wins deterministically — regardless
// of glob iteration order — so a stray duplicate never shadows the real asset.
const isCopySuffixed = (fileName: string): boolean => /\s\(\d+\)\.\w+$/i.test(fileName);

const SPECIALTY_BY_KEY: Record<string, string> = {};
const SPECIALTY_SRC: Record<string, string> = {};
for (const [path, url] of Object.entries(SPECIALTY_ART)) {
  const file = path.split('/').pop()!;
  const key = normalizeSpecialtyKey(file);
  const prior = SPECIALTY_SRC[key];
  if (prior && isCopySuffixed(file) && !isCopySuffixed(prior)) continue;
  SPECIALTY_SRC[key] = file;
  SPECIALTY_BY_KEY[key] = url;
}

export const getSpecialtyPreview = (
  stem: string,
  state: SpecialtyState,
): string | undefined => SPECIALTY_BY_KEY[`${stem}-${state}`];

/**
 * Single image for a single-variant specialty item (no Buy/Repair/Both split —
 * e.g. automotive items, gaming). Prefers a bare `<stem>.webp`, falling back to
 * `<stem>-sell.webp` so an item shipped with the `-sell` suffix still resolves.
 */
export const getSpecialtyImage = (stem: string): string | undefined =>
  SPECIALTY_BY_KEY[stem] ?? SPECIALTY_BY_KEY[`${stem}-sell`];

/**
 * Labour trade preview image (Choose Trade step, Skilled Labour flow). Trades
 * live in src/services/labourCategories.ts with underscore ids
 * (`general_labourer`, `steel_fixer`); their images share the specialty/ folder
 * and resolver. The id is run through the SAME `normalizeSpecialtyKey`, so its
 * `_` collapses to `-` exactly like a filename's spaces/`&` do — e.g. id
 * `general_labourer` and file `General Labourer.webp` both key to
 * `general-labourer`. Trades whose display name adds words the id omits
 * (`Bricklayer / Mason` → id `bricklayer`) are named for the id stem. Missing
 * ⇒ the trade card keeps its icon-chip. No labour id collides with a specialty
 * stem, so sharing the key map is safe.
 */
export const getLabourImage = (id: string): string | undefined =>
  SPECIALTY_BY_KEY[normalizeSpecialtyKey(id)];

/**
 * Labour TRACK image (Choose-a-track screen, Skilled Labour flow). The six
 * tracks live in src/services/labourCategories.ts (LABOUR_CATEGORY_GROUPS) with
 * short uppercase ids (`CONSTRUCTION`, `DOMESTIC`), but their images are dropped
 * in the categories/ folder named for the track LABEL
 * (`Construction & Building.webp`). Keyed here off the label through the robust
 * `normalizeSpecialtyKey`, so `Construction & Building` → `construction-building`
 * matches the file with no rename. No track key collides with a master-category
 * filename (e.g. `agricultural` ≠ master `agriculture`). Missing ⇒ the track
 * keeps its icon chip.
 */
const LABOUR_GROUP_BY_KEY: Record<string, string> = {};
for (const [path, url] of Object.entries(CATEGORY_ART)) {
  LABOUR_GROUP_BY_KEY[normalizeSpecialtyKey(path.split('/').pop()!)] = url;
}

export const getLabourGroupImage = (label: string): string | undefined =>
  LABOUR_GROUP_BY_KEY[normalizeSpecialtyKey(label)];
