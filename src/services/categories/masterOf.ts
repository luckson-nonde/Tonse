import { CATEGORIES_DB } from './index';

/**
 * Walk a category id up its parent chain to the MASTER it belongs to.
 *
 * Everything that targets advertising speaks in master slugs ('electronics'),
 * but the app mostly holds SUBcategory ids ('mobile-phones-sell') — the
 * seller's onboarding picks, the buyer's funnel selection. This is the one
 * translation between the two.
 *
 * Lifted out of AdsManagerView (where it was module-private as
 * `sellerMasterCategories`) so the Spotlight trigger resolves a category
 * exactly the way ad targeting stores it — two implementations would mean an
 * ad targeted at 'electronics' quietly failing to match a buyer shopping for
 * electronics.
 */
export function masterCategoriesFor(categoryIds: string[] | undefined): string[] {
  const out: string[] = [];
  for (const id of categoryIds ?? []) {
    let node = CATEGORIES_DB.find((c) => c.id === id);
    while (node?.parentId) {
      const parentId: string = node.parentId;
      node = CATEGORIES_DB.find((c) => c.id === parentId);
    }
    if (node && !out.includes(node.id)) out.push(node.id);
  }
  return out;
}

/** The single master slug for one category id, or undefined if unknown.
 *  Synthetic masters ('labour', 'machinery-hire') pass through unchanged
 *  because they are already roots in the catalog. */
export function masterCategoryOf(categoryId: string | undefined | null): string | undefined {
  if (!categoryId) return undefined;
  return masterCategoriesFor([categoryId])[0] ?? categoryId;
}
