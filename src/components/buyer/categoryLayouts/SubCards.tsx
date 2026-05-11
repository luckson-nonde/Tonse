import { Check, Box } from 'lucide-react';
import type { Category } from '../../../services/categories';

interface Props {
  items: Category[];
  selected: Set<string>;
  accent: string;
  onToggle: (sub: Category) => void;
}

export default function SubCards({ items, selected, accent, onToggle }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
      {items.map((s) => {
        const active = selected.has(s.id);
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onToggle(s)}
            className="relative rounded-[18px] p-4 flex flex-col gap-2.5 text-left min-h-[130px] transition-all duration-150 active:scale-[0.97]"
            style={{
              background: active ? accent : '#fff',
              color: active ? '#fff' : '#1e293b',
              border: `1.5px solid ${active ? accent : '#E8ECF2'}`,
            }}
          >
            {active && (
              <div className="absolute top-3 right-3 w-[22px] h-[22px] rounded-full bg-white flex items-center justify-center">
                <Check size={14} strokeWidth={2.5} style={{ color: accent }} />
              </div>
            )}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: active ? 'rgba(255,255,255,0.2)' : accent + '1f',
              }}
            >
              <Box size={20} strokeWidth={1.8} style={{ color: active ? '#fff' : accent }} />
            </div>
            <div className="mt-auto">
              <div className="text-[13.5px] font-bold tracking-tight leading-tight line-clamp-2">
                {s.baseName ?? s.name}
              </div>
              {s.type && (
                <div
                  className="text-[10.5px] mt-1 font-semibold capitalize"
                  style={{ color: active ? 'rgba(255,255,255,0.8)' : '#64748b' }}
                >
                  {s.type === 'buy' ? 'Buy / supply' : s.type === 'repair' ? 'Repair' : 'Restore'}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
