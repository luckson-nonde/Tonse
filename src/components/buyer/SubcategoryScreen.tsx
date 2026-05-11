import { useMemo, useState } from 'react';
import { Search, Plus, ChevronRight, ChevronLeft } from 'lucide-react';
import type { Category } from '../../services/categories';
import { SubLayoutToggle } from './LayoutToggle';
import SubList from './categoryLayouts/SubList';
import SubCards from './categoryLayouts/SubCards';
import SubChips from './categoryLayouts/SubChips';
import { getMeta } from './categoryMeta';
import type { SubLayout } from './useLayoutPreference';

interface Props {
  master: Category;
  subs: Category[];
  selected: Set<string>;
  totalSelected: number;
  subLayout: SubLayout;
  onSubLayoutChange: (l: SubLayout) => void;
  onToggleSub: (sub: Category) => void;
  onBackToMasters: () => void;
  onContinue: () => void;
  isEntryPoint: boolean;
  onExit: () => void;
}

const StepBar = ({ step, total }: { step: number; total: number }) => (
  <div className="flex gap-1.5 items-center">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className="flex-1 h-1 rounded-full"
        style={{ background: i < step ? '#1e293b' : i === step ? '#c9973a' : '#E8ECF2' }}
      />
    ))}
    <div className="text-[11px] font-bold text-slate-500 ml-1.5 tracking-wider">
      {step}/{total}
    </div>
  </div>
);

export default function SubcategoryScreen({
  master,
  subs,
  selected,
  totalSelected,
  subLayout,
  onSubLayoutChange,
  onToggleSub,
  onBackToMasters,
  onContinue,
  isEntryPoint,
  onExit,
}: Props) {
  const [query, setQuery] = useState('');
  const meta = getMeta(master.id);
  const Icon = meta.icon;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subs;
    return subs.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.baseName ?? '').toLowerCase().includes(q),
    );
  }, [subs, query]);

  const localSelected = subs.filter((s) => selected.has(s.id)).length;
  const ctaDisabled = totalSelected === 0;

  return (
    <div className="w-full max-w-5xl mx-auto pb-32">
      <div className="flex items-center gap-3 mb-3">
        <button
          type="button"
          onClick={isEntryPoint ? onExit : onBackToMasters}
          aria-label={isEntryPoint ? 'Exit' : 'Back to categories'}
          className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-brand-dark hover:bg-brand-light transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1">
          <StepBar step={2} total={3} />
        </div>
      </div>

      <div
        className="relative overflow-hidden rounded-[20px] px-4 py-3.5 flex items-center gap-3 text-white shadow-[0_16px_40px_-16px_rgba(30,41,59,0.5)]"
        style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' }}
      >
        <div
          aria-hidden
          className="absolute -right-7 -top-7 w-36 h-36 rounded-full"
          style={{ background: meta.accent + '4d' }}
        />
        <div
          className="relative w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: meta.accent }}
        >
          <Icon size={22} strokeWidth={1.8} className="text-white" />
        </div>
        <div className="relative flex-1 min-w-0">
          <div className="text-[10px] font-extrabold tracking-[0.18em]" style={{ color: meta.accent }}>
            SOURCING FROM
          </div>
          <div className="text-base font-extrabold tracking-tight mt-0.5 truncate">{master.name}</div>
        </div>
        {!isEntryPoint && (
          <button
            type="button"
            onClick={onBackToMasters}
            className="relative bg-white/15 hover:bg-white/25 border-none text-white text-[11px] font-bold px-2.5 py-1.5 rounded-[10px] tracking-wider transition-colors"
          >
            CHANGE
          </button>
        )}
      </div>

      <div className="mt-4">
        <h2 className="font-serif text-[20px] sm:text-2xl lg:text-[26px] font-bold text-brand-dark leading-tight tracking-tight">
          Tell us exactly what you need.
        </h2>
        <p className="text-[13px] sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
          Pick one or more subcategories so vendors can quote accurately.
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2 bg-white border-[1.5px] border-slate-200 rounded-2xl pl-3.5 pr-1.5 py-1.5 focus-within:border-brand-gold/50 transition-colors">
        <Search size={16} className="text-slate-500 flex-shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search in ${master.name}…`}
          className="flex-1 min-w-0 border-none outline-none text-[13px] text-brand-dark bg-transparent placeholder-slate-400"
        />
        <SubLayoutToggle value={subLayout} onChange={onSubLayoutChange} />
      </div>

      <div className="mt-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">
            No subcategories match &ldquo;{query}&rdquo;.
          </div>
        ) : (
          <>
            {subLayout === 'list'  && <SubList  items={filtered} selected={selected} accent={meta.accent} onToggle={onToggleSub} />}
            {subLayout === 'cards' && <SubCards items={filtered} selected={selected} accent={meta.accent} onToggle={onToggleSub} />}
            {subLayout === 'chips' && <SubChips items={filtered} selected={selected} accent={meta.accent} onToggle={onToggleSub} />}
          </>
        )}

        <button
          type="button"
          onClick={onBackToMasters}
          className="mt-4 w-full max-w-3xl mx-auto block bg-transparent border-[1.5px] border-dashed border-slate-300 text-brand-dark rounded-2xl py-3.5 text-[13px] font-bold flex items-center justify-center gap-1.5 hover:border-brand-gold/60 hover:text-brand-gold transition-colors"
        >
          <Plus size={16} strokeWidth={2.4} />
          Can&apos;t find it? Browse other categories
        </button>
      </div>

      <div className="sticky bottom-4 mt-6 z-10">
        <div className="max-w-3xl mx-auto flex flex-col gap-2">
          {!isEntryPoint && localSelected > 0 && (
            <button
              type="button"
              onClick={onBackToMasters}
              className="w-full px-4 py-2.5 bg-white/85 backdrop-blur-md border border-slate-200 text-brand-dark rounded-xl text-[12.5px] font-bold transition-colors hover:bg-white"
            >
              Done — {localSelected} selected in {master.name}
            </button>
          )}
          <button
            type="button"
            disabled={ctaDisabled}
            onClick={onContinue}
            className={[
              'w-full px-4 py-3.5 border-none rounded-2xl text-[14.5px] font-extrabold tracking-tight flex items-center justify-center gap-2 transition-all duration-200',
              ctaDisabled
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-brand-gold text-white shadow-gold-glow hover:brightness-110 active:scale-[0.99]',
            ].join(' ')}
          >
            {ctaDisabled
              ? 'Pick a subcategory'
              : `Continue with ${totalSelected} ${totalSelected === 1 ? 'item' : 'items'}`}
            {!ctaDisabled && <ChevronRight size={18} strokeWidth={2.2} />}
          </button>
        </div>
      </div>
    </div>
  );
}
