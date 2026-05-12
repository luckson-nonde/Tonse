import { Box } from 'lucide-react';
import type { Category } from '../../../services/categories';

interface Props {
  items: Category[];
  accent: string;
  onPick: (sub: Category) => void;
}

export default function SubCards({ items, accent, onPick }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
      {items.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onPick(s)}
          className="relative bg-white border-[1.5px] border-slate-200 rounded-[18px] p-4 flex flex-col gap-2.5 text-left min-h-[130px] transition-all duration-150 hover:-translate-y-0.5 hover:border-[#c9973a]/40 hover:shadow-md active:scale-[0.97]"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: accent + '1f' }}
          >
            <Box size={20} strokeWidth={1.8} style={{ color: accent }} />
          </div>
          <div className="mt-auto">
            <div className="text-[13.5px] font-bold tracking-tight leading-tight line-clamp-2 text-brand-dark">
              {s.baseName ?? s.name}
            </div>
            {s.type && (
              <div className="text-[10.5px] mt-1 font-semibold capitalize text-slate-500">
                {s.type === 'buy' ? 'Buy / supply' : s.type === 'repair' ? 'Repair' : 'Restore'}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
