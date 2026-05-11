import { Check } from 'lucide-react';
import type { Category } from '../../../services/categories';
import { getMeta } from '../categoryMeta';

interface Props {
  items: Category[];
  /** Sub-count per master id (denominator shown when 0 selected). */
  subCounts: Record<string, number>;
  /** Selected sub-count per master id (overrides denominator when > 0). */
  selectedCounts: Record<string, number>;
  onPick: (master: Category) => void;
}

export default function MasterGrid({ items, subCounts, selectedCounts, onPick }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 lg:gap-4">
      {items.map((c) => {
        const meta = getMeta(c.id);
        const Icon = meta.icon;
        const selected = selectedCounts[c.id] ?? 0;
        const total    = subCounts[c.id] ?? 0;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onPick(c)}
            className="group relative bg-white border border-slate-200 rounded-[20px] p-4 sm:p-5 text-left flex flex-col gap-2.5 min-h-[130px] sm:min-h-[140px] lg:min-h-[150px] shadow-[0_1px_0_rgba(30,41,59,0.02)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-premium-md active:scale-[0.97]"
          >
            {selected > 0 && (
              <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 bg-brand-gold text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-gold-glow">
                <Check size={10} strokeWidth={3} />
                {selected}
              </span>
            )}
            <div
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: meta.accent + '1f', color: meta.accent }}
            >
              <Icon size={22} strokeWidth={1.8} />
            </div>
            <div className="mt-auto min-w-0">
              <div className="text-[13.5px] sm:text-sm font-bold text-brand-dark leading-tight tracking-tight line-clamp-2">
                {c.name}
              </div>
              <div className="text-[10.5px] sm:text-[11px] text-slate-500 mt-1 font-semibold tracking-wide">
                {selected > 0 ? `${selected} selected` : total > 0 ? `${total} item types` : 'Custom'}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
