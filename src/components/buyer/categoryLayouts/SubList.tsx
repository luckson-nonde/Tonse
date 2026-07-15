import { useState } from 'react';
import { ChevronRight, Box } from 'lucide-react';
import type { Category } from '../../../services/categories';
import { getBuyerSubImage } from '../categoryMeta';
import { groupSubVariants, variantLabel } from './variantGroups';

interface Props {
  items: Category[];
  accent: string;
  onPick: (sub: Category) => void;
}

function IconChip({ accent }: { accent: string }) {
  return (
    <div
      className="w-10 h-10 sm:w-11 sm:h-11 rounded-[11px] flex items-center justify-center flex-shrink-0"
      style={{ background: accent + '20', color: accent }}
    >
      <Box size={20} strokeWidth={1.8} />
    </div>
  );
}

// Lone subcategory row — same artwork the provider registration shows.
function SingleRow({ s, accent, onPick }: { s: Category; accent: string; onPick: (x: Category) => void }) {
  const img = getBuyerSubImage(s);
  return (
    <button
      type="button"
      onClick={() => onPick(s)}
      className="bg-white border-[1.5px] border-slate-200 rounded-2xl px-3.5 sm:px-4 py-3.5 sm:py-4 flex items-center gap-3.5 text-left transition-all duration-150 hover:border-[#c9973a]/40 hover:shadow-sm active:scale-[0.99]"
    >
      {img ? (
        <img src={img} alt="" loading="lazy" className="w-10 h-10 sm:w-11 sm:h-11 rounded-[11px] object-cover flex-shrink-0" />
      ) : (
        <IconChip accent={accent} />
      )}
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
  );
}

// Merged buy/repair row — thumbnail swaps with the toggle; tapping the left
// region continues with the active variant, the toggle only switches mode.
function VariantRow({
  baseName,
  items,
  accent,
  onPick,
}: {
  baseName: string;
  items: Category[];
  accent: string;
  onPick: (x: Category) => void;
}) {
  const [active, setActive] = useState(0);
  const activeItem = items[active] ?? items[0];
  const img = getBuyerSubImage(activeItem);
  return (
    <div className="bg-white border-[1.5px] border-slate-200 rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 flex items-center gap-3 transition-all duration-150 hover:border-[#c9973a]/40 hover:shadow-sm">
      <button
        type="button"
        onClick={() => onPick(activeItem)}
        className="flex items-center gap-3.5 text-left flex-1 min-w-0 active:scale-[0.99] transition-transform"
      >
        {img ? (
          <img
            key={activeItem.id}
            src={img}
            alt=""
            loading="lazy"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-[11px] object-cover flex-shrink-0"
          />
        ) : (
          <IconChip accent={accent} />
        )}
        <div className="text-[14px] sm:text-[14.5px] font-bold text-brand-dark tracking-tight min-w-0 truncate">
          {baseName}
        </div>
      </button>
      <div role="radiogroup" aria-label={`${baseName} — buy or repair`} className="flex gap-1 flex-shrink-0">
        {items.map((it, i) => {
          const on = i === active;
          return (
            <button
              key={it.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setActive(i)}
              className={`h-8 px-3 rounded-full text-[11px] font-bold tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9973a]/50 ${
                on
                  ? 'bg-gradient-to-b from-[#D5A547] to-[#C9973A] text-white shadow-[0_3px_10px_-5px_rgba(201,151,58,0.6)]'
                  : 'bg-[#f5efe4] text-slate-500 hover:text-brand-dark'
              }`}
            >
              {variantLabel(it.type)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function SubList({ items, accent, onPick }: Props) {
  const units = groupSubVariants(items);
  return (
    <div className="flex flex-col gap-2 max-w-3xl mx-auto w-full">
      {units.map((u) =>
        u.kind === 'variants' ? (
          <VariantRow key={u.key} baseName={u.baseName} items={u.items} accent={accent} onPick={onPick} />
        ) : (
          <SingleRow key={u.key} s={u.item} accent={accent} onPick={onPick} />
        ),
      )}
    </div>
  );
}
