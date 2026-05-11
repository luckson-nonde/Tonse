import { ChevronRight, Check } from 'lucide-react';
import type { Category } from '../../../services/categories';
import { getMeta } from '../categoryMeta';

interface Props {
  items: Category[];
  subCounts: Record<string, number>;
  selectedCounts: Record<string, number>;
  onPick: (master: Category) => void;
}

export default function MasterList({ items, subCounts, selectedCounts, onPick }: Props) {
  return (
    <div className="flex flex-col gap-2 sm:gap-2.5 max-w-3xl mx-auto w-full">
      {items.map((c) => {
        const meta = getMeta(c.id);
        const Icon = meta.icon;
        const selected = selectedCounts[c.id] ?? 0;
        const total = subCounts[c.id] ?? 0;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onPick(c)}
            className="bg-white border border-slate-200 rounded-2xl px-3.5 sm:px-4 py-3.5 sm:py-4 text-left flex items-center gap-3.5 sm:gap-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-premium-md active:scale-[0.99]"
          >
            <div
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: meta.accent + '1f', color: meta.accent }}
            >
              <Icon size={22} strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14.5px] sm:text-[15px] font-bold text-brand-dark tracking-tight truncate">
                {c.name}
              </div>
              <div className="text-[11.5px] sm:text-xs text-slate-500 mt-0.5 truncate">
                {meta.tagline || (total > 0 ? `${total} subcategories` : 'Tap to explore')}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {selected > 0 ? (
                <span className="inline-flex items-center gap-1 bg-brand-gold text-white text-[11px] font-bold px-2 py-1 rounded-full">
                  <Check size={11} strokeWidth={3} />
                  {selected}
                </span>
              ) : total > 0 ? (
                <span className="text-[11px] font-bold text-slate-500 bg-brand-light px-2 py-1 rounded-full">
                  {total}
                </span>
              ) : null}
              <ChevronRight size={16} className="text-slate-300" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
