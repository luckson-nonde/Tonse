import type { Category } from './types';

/**
 * Display-level grouping of the root categories into marketplace sections.
 *
 * This is presentation metadata only — it lives beside the catalog, not in
 * it. CATEGORIES_DB keeps its flat 2-level tree and its array order (other
 * surfaces slice it positionally), the backend knows nothing about sections,
 * and inquiries/quotes/matching keep keying on the same category ids.
 */
export interface CategoryGroup {
  id: string;
  label: string;
  /** Root category ids in this group, in display order. */
  categoryIds: string[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'shopping',
    label: 'Shopping',
    categoryIds: [
      'electronics',
      'fashion',
      'furniture',
      'home-decor',
      'groceries',
      'beauty',
      'it-products',
    ],
  },
  {
    id: 'professional-services',
    label: 'Professional Services',
    categoryIds: ['construction', 'it-services', 'drilling-services', 'telecommunications', 'clinical-services'],
  },
  {
    id: 'business-industry',
    label: 'Business & Industry',
    categoryIds: ['agriculture', 'automotive'],
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle',
    categoryIds: ['entertainment', 'events', 'apartments'],
  },
  {
    // Synthetic masters injected by BuyerCategoryPicker (not CATEGORIES_DB
    // rows): labour trades + machinery-hire equipment from
    // labourCategories.ts. Ids match the backend catalog rows, so admin
    // category-control toggles apply to them like any other master.
    id: 'people-equipment',
    label: 'People & Equipment',
    categoryIds: ['labour', 'machinery-hire'],
  },
  {
    id: 'finance',
    label: 'Finance',
    categoryIds: ['loans'],
  },
];

export interface GroupedCategories {
  group: CategoryGroup;
  items: Category[];
}

/**
 * Buckets an already-filtered list of root categories into CATEGORY_GROUPS
 * order. Availability filtering happens upstream (BuyerCategoryPicker) —
 * this stays a pure reshuffle so a disabled category simply never arrives.
 *
 * - Within a group, items follow the group's categoryIds order, not the
 *   input order.
 * - Groups with no surviving items are dropped (their header must not
 *   render over an empty grid).
 * - Ids not claimed by any group land in a trailing "More" section, so a
 *   root category added to the catalog before it's assigned a group still
 *   shows up instead of silently vanishing.
 */
export function groupCategories(items: Category[]): GroupedCategories[] {
  const byId = new Map(items.map((c) => [c.id, c]));
  const claimed = new Set<string>();

  const sections: GroupedCategories[] = [];
  for (const group of CATEGORY_GROUPS) {
    const groupItems: Category[] = [];
    for (const id of group.categoryIds) {
      const item = byId.get(id);
      if (item) {
        groupItems.push(item);
        claimed.add(id);
      }
    }
    if (groupItems.length > 0) sections.push({ group, items: groupItems });
  }

  const leftover = items.filter((c) => !claimed.has(c.id));
  if (leftover.length > 0) {
    sections.push({ group: { id: 'more', label: 'More', categoryIds: [] }, items: leftover });
  }

  return sections;
}
