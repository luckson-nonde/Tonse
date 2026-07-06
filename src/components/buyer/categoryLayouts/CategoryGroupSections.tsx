import type { ReactNode } from 'react';
import type { Category } from '../../../services/categories';
import { groupCategories } from '../../../services/categories';

interface Props {
  items: Category[];
  /** Renders one group's categories in whatever layout the caller uses. */
  render: (groupItems: Category[]) => ReactNode;
}

/**
 * Wraps a master-category layout in titled marketplace sections (Shopping,
 * Professional Services, …). Layout-agnostic: MasterGrid, MasterList and
 * MasterMosaic's tail all pass through the same render callback.
 */
export default function CategoryGroupSections({ items, render }: Props) {
  if (items.length === 0) return null;

  return (
    <div>
      {groupCategories(items).map(({ group, items: groupItems }) => {
        const headingId = `cat-group-${group.id}`;
        return (
          <section key={group.id} aria-labelledby={headingId} className="mb-7 last:mb-0">
            <div className="flex items-center gap-3 mb-3">
              <p
                id={headingId}
                className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#C9973A] shrink-0"
              >
                {group.label}
              </p>
              <div className="h-px flex-1 bg-[#e8e4dc]" />
            </div>
            {render(groupItems)}
          </section>
        );
      })}
    </div>
  );
}
