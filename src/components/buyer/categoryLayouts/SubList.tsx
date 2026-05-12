import { ChevronRight, Box } from 'lucide-react';
import type { Category } from '../../../services/categories';

interface Props {
  items: Category[];
  accent: string;
  onPick: (sub: Category) => void;
}

export default function SubList({ items, accent, onPick }: Props) {
  return (
    <div className="flex flex-col gap-2 max-w-3xl mx-auto w-full">
      {items.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onPick(s)}
          className="bg-white border-[1.5px] border-slate-200 rounded-2xl px-3.5 sm:px-4 py-3.5 sm:py-4 flex items-center gap-3.5 text-left transition-all duration-150 hover:border-[#c9973a]/40 hover:shadow-sm active:scale-[0.99]"
        >
          <div
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-[11px] flex items-center justify-center flex-shrink-0"
            style={{ background: accent + '20', color: accent }}
          >
            <Box size={20} strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] sm:text-[14.5px] font-bold text-brand-dark tracking-tight">
              {s.baseName ?? s.name}
            </div>
            {s.type && (
              <div className="text-[11.5px] text-slate-500 mt-0.5 capitalize">
                {s.type === 'buy' ? 'Buy new / supply' : s.type === 'repair' ? 'Repair / service' : 'Restoration'}
              </div>
            )}
            {!s.type && s.baseName !== s.name && (
              <div className="text-[11.5px] text-slate-500 mt-0.5 truncate">{s.name}</div>
            )}
          </div>
          <ChevronRight size={18} className="text-slate-300 flex-shrink-0" />
        </button>
      ))}
    </div>
  );
}
