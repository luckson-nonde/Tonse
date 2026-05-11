import { Box } from 'lucide-react';
import type { Category } from '../../../services/categories';

interface Props {
  items: Category[];
  selected: Set<string>;
  accent: string;
  onToggle: (sub: Category) => void;
}

const variantSuffix = (s: Category) => {
  if (!s.type) return '';
  if (s.type === 'buy') return ' • Buy';
  if (s.type === 'repair') return ' • Repair';
  return ' • Restore';
};

export default function SubChips({ items, selected, accent, onToggle }: Props) {
  return (
    <div className="flex flex-wrap gap-2 max-w-3xl mx-auto w-full">
      {items.map((s) => {
        const active = selected.has(s.id);
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onToggle(s)}
            className="rounded-full pl-3 pr-3.5 py-2.5 flex items-center gap-2 text-[13px] font-bold tracking-tight transition-all duration-150 active:scale-[0.97]"
            style={{
              background: active ? accent : '#fff',
              color: active ? '#fff' : '#1e293b',
              border: `1.5px solid ${active ? accent : '#E8ECF2'}`,
            }}
          >
            <Box size={14} strokeWidth={2} style={{ color: active ? '#fff' : accent }} />
            <span>
              {s.baseName ?? s.name}
              <span className="opacity-70">{variantSuffix(s)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
