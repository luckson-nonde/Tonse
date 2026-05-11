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
