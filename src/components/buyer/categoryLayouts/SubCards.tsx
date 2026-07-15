import { useState } from 'react';
import { Box, ChevronRight } from 'lucide-react';
import type { Category } from '../../../services/categories';
import { getBuyerSubImage } from '../categoryMeta';
import { groupSubVariants, variantLabel } from './variantGroups';

interface Props {
  items: Category[];
  accent: string;
  onPick: (sub: Category) => void;
}

// Lone subcategory (no buy/repair sibling) — image-led card, icon-chip fallback.
function SingleCard({ s, accent, onPick }: { s: Category; accent: string; onPick: (x: Category) => void }) {
  // Same artwork the provider registration shows for this entity.
  const img = getBuyerSubImage(s);

  if (img) {
    return (
      <button
        type="button"
        onClick={() => onPick(s)}
        className="relative bg-white border-[1.5px] border-slate-200 rounded-[18px] overflow-hidden flex flex-col text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-[#c9973a]/40 hover:shadow-md active:scale-[0.97]"
      >
        <div className="relative aspect-[4/3] bg-[#f5efe4]">
          <img src={img} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        </div>
        <div className="p-3">
          <div className="text-[13.5px] font-bold tracking-tight leading-tight line-clamp-2 text-brand-dark">
            {s.baseName ?? s.name}
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
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
  );
}

// Merged buy/repair(/restore) entity — one photo card that swaps its image via
// a Buy/Repair toggle (the seller Choose-Specialty pattern). Tapping the photo
// or title continues with the currently-selected variant; tapping a toggle
// segment only switches the mode (and swaps the photo) — it never navigates.
function VariantCard({
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
    <div className="relative bg-white border-[1.5px] border-slate-200 rounded-[18px] overflow-hidden flex flex-col transition-all duration-150 hover:border-[#c9973a]/40 hover:shadow-md">
      <button
        type="button"
        onClick={() => onPick(activeItem)}
        className="flex flex-col text-left focus:outline-none active:scale-[0.99] transition-transform"
      >
        <div className="relative aspect-[4/3] bg-[#f5efe4]">
          {img ? (
            // Keyed by variant id ⇒ a clean swap when the toggle flips (no
            // stacked compositor layers — safe on budget Android GPUs).
            <img
              key={activeItem.id}
              src={img}
              alt=""
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: accent + '1f', color: accent }}
            >
              <Box size={28} strokeWidth={1.6} />
            </div>
          )}
          <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center shadow-sm text-brand-dark">
            <ChevronRight size={15} strokeWidth={2.6} />
          </span>
        </div>
        <div className="px-3 pt-3">
          <div className="text-[13.5px] font-bold tracking-tight leading-tight line-clamp-2 text-brand-dark">
            {baseName}
          </div>
        </div>
      </button>

      {/* Buy / Repair mode toggle — swaps the photo above, no navigation. */}
      <div
        role="radiogroup"
        aria-label={`${baseName} — buy or repair`}
        className="flex gap-1 p-2 pt-2.5 mt-auto"
      >
        {items.map((it, i) => {
          const on = i === active;
          return (
            <button
              key={it.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setActive(i)}
              className={`flex-1 h-8 rounded-full text-[11px] font-bold tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9973a]/50 ${
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

export default function SubCards({ items, accent, onPick }: Props) {
  const units = groupSubVariants(items);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 items-start">
      {units.map((u) =>
        u.kind === 'variants' ? (
          <VariantCard key={u.key} baseName={u.baseName} items={u.items} accent={accent} onPick={onPick} />
        ) : (
          <SingleCard key={u.key} s={u.item} accent={accent} onPick={onPick} />
        ),
      )}
    </div>
  );
}
