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

const SPECIALTY_ART = import.meta.glob('../../assets/images/specialty/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const SPECIALTY_BY_KEY: Record<string, string> = {};
for (const [path, url] of Object.entries(SPECIALTY_ART)) {
  const key = path
    .split('/')
    .pop()!
    .replace(/\.(png|jpe?g|webp)$/i, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-');
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
