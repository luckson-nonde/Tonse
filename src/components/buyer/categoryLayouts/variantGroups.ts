import type { Category } from '../../../services/categories';

/**
 * A rendered unit in a subcategory layout: either a lone subcategory, or a
 * group of buy/repair(/restore) variants of the SAME entity that should show as
 * one card/row with a mode toggle instead of duplicate tiles.
 */
export type SubUnit =
  | { kind: 'single'; key: string; item: Category }
  | { kind: 'variants'; key: string; baseName: string; items: Category[] };

// Toggle order within a group: Buy first, then Repair, then Restore.
const variantRank = (t?: string): number =>
  t === 'buy' ? 0 : t === 'repair' ? 1 : t === 'restore' ? 2 : 3;

/**
 * Collapse buy/repair variants of the same entity into one unit so the buyer
 * sees a single card with a Buy/Repair toggle instead of two duplicate cards
 * (mirrors the seller registration's Choose-Specialty card). Grouping key is
 * `baseName`, which catalog.ts sets only on split entities (electronics,
 * furniture); rows without a baseName — or a baseName that turns out to have
 * only one variant present (e.g. a buy-only entity) — stay single. First-seen
 * order is preserved; picking a variant forwards the real catalog `Category`
 * (its id/type intact) so the downstream schema/type lookup is unaffected.
 */
export function groupSubVariants(items: Category[]): SubUnit[] {
  const units: SubUnit[] = [];
  const groupAt = new Map<string, number>();
  for (const item of items) {
    const base = item.baseName;
    if (!base) {
      units.push({ kind: 'single', key: item.id, item });
      continue;
    }
    const at = groupAt.get(base);
    if (at != null) {
      (units[at] as Extract<SubUnit, { kind: 'variants' }>).items.push(item);
    } else {
      groupAt.set(base, units.length);
      units.push({ kind: 'variants', key: base, baseName: base, items: [item] });
    }
  }
  return units.map((u) => {
    if (u.kind !== 'variants') return u;
    if (u.items.length === 1) return { kind: 'single', key: u.items[0].id, item: u.items[0] };
    const items = [...u.items].sort((a, b) => variantRank(a.type) - variantRank(b.type));
    return { ...u, items };
  });
}

/** Short toggle-button label for a variant's `type`. */
export const variantLabel = (t?: string): string =>
  t === 'buy' ? 'Buy' : t === 'repair' ? 'Repair' : t === 'restore' ? 'Restore' : 'Select';
