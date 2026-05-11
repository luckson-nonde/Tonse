import { Check, Box } from 'lucide-react';
import type { Category } from '../../../services/categories';

interface Props {
  items: Category[];
  selected: Set<string>;
  accent: string;
  onToggle: (sub: Category) => void;
}

export default function SubList({ items, selected, accent, onToggle }: Props) {
  return (
    <div className="flex flex-col gap-2 max-w-3xl mx-auto w-full">
      {items.map((s) => {
        const active = selected.has(s.id);
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onToggle(s)}
            className="rounded-2xl px-3.5 sm:px-4 py-3.5 sm:py-4 flex items-center gap-3.5 text-left transition-all duration-150 active:scale-[0.99]"
            style={{
              background: active ? accent + '12' : '#fff',
              border: `1.5px solid ${active ? accent : '#E8ECF2'}`,
            }}
          >
            <div
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-[11px] flex items-center justify-center flex-shrink-0"
              style={{
                background: active ? accent : accent + '20',
                color: active ? '#fff' : accent,
              }}
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
            <div
              className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: active ? accent : 'transparent',
                border: active ? `1.5px solid ${accent}` : '1.5px solid #E8ECF2',
              }}
            >
              {active && <Check size={14} strokeWidth={2.5} className="text-white" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
