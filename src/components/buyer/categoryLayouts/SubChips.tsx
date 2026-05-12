import { Box } from 'lucide-react';
import type { Category } from '../../../services/categories';

interface Props {
  items: Category[];
  accent: string;
  onPick: (sub: Category) => void;
}

const variantSuffix = (s: Category) => {
  if (!s.type) return '';
  if (s.type === 'buy') return ' • Buy';
  if (s.type === 'repair') return ' • Repair';
  return ' • Restore';
};

export default function SubChips({ items, accent, onPick }: Props) {
  return (
    <div className="flex flex-wrap gap-2 max-w-3xl mx-auto w-full">
      {items.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onPick(s)}
          className="bg-white border-[1.5px] border-slate-200 rounded-full pl-3 pr-3.5 py-2.5 flex items-center gap-2 text-[13px] font-bold tracking-tight text-brand-dark transition-all duration-150 hover:border-[#c9973a]/40 hover:shadow-sm active:scale-[0.97]"
        >
          <Box size={14} strokeWidth={2} style={{ color: accent }} />
          <span>
            {s.baseName ?? s.name}
            <span className="opacity-70">{variantSuffix(s)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
