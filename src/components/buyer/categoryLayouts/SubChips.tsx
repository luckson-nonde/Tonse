import { Box } from 'lucide-react';
import type { Category } from '../../../services/categories';
import { groupSubVariants, variantLabel } from './variantGroups';

interface Props {
  items: Category[];
  accent: string;
  onPick: (sub: Category) => void;
}

export default function SubChips({ items, accent, onPick }: Props) {
  const units = groupSubVariants(items);
  return (
    <div className="flex flex-wrap gap-2 max-w-3xl mx-auto w-full">
      {units.map((u) =>
        u.kind === 'variants' ? (
          // One chip per entity; the Buy/Repair pills each continue directly
          // (chips carry no image, so there's nothing to preview-toggle).
          <div
            key={u.key}
            className="bg-white border-[1.5px] border-slate-200 rounded-full pl-3 pr-1.5 py-1.5 flex items-center gap-2"
          >
            <Box size={14} strokeWidth={2} style={{ color: accent }} />
            <span className="text-[13px] font-bold tracking-tight text-brand-dark">{u.baseName}</span>
            <span className="flex gap-1">
              {u.items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => onPick(it)}
                  className="h-7 px-2.5 rounded-full text-[11px] font-bold bg-[#f5efe4] text-slate-600 hover:bg-[#c9973a] hover:text-white transition-colors active:scale-[0.97]"
                >
                  {variantLabel(it.type)}
                </button>
              ))}
            </span>
          </div>
        ) : (
          <button
            key={u.key}
            type="button"
            onClick={() => onPick(u.item)}
            className="bg-white border-[1.5px] border-slate-200 rounded-full pl-3 pr-3.5 py-2.5 flex items-center gap-2 text-[13px] font-bold tracking-tight text-brand-dark transition-all duration-150 hover:border-[#c9973a]/40 hover:shadow-sm active:scale-[0.97]"
          >
            <Box size={14} strokeWidth={2} style={{ color: accent }} />
            <span>{u.item.baseName ?? u.item.name}</span>
          </button>
        ),
      )}
    </div>
  );
}
