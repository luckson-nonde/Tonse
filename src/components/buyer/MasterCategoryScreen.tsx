import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { Category } from '../../services/categories';
import { MasterLayoutToggle } from './LayoutToggle';
import MasterGrid from './categoryLayouts/MasterGrid';
import MasterMosaic from './categoryLayouts/MasterMosaic';
import MasterList from './categoryLayouts/MasterList';
import { getMeta } from './categoryMeta';
import type { MasterLayout } from './useLayoutPreference';

interface Props {
  masters: Category[];
  subCounts: Record<string, number>;
  layout: MasterLayout;
  onLayoutChange: (l: MasterLayout) => void;
  onPickMaster: (master: Category) => void;
}

const StepBar = ({ step, total }: { step: number; total: number }) => (
  <div className="flex gap-1.5 items-center">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className="flex-1 h-1 rounded-full"
        style={{
          background: i < step ? '#1e293b' : i === step ? '#c9973a' : '#E8ECF2',
        }}
      />
    ))}
    <div className="text-[11px] font-bold text-slate-500 ml-1.5 tracking-wider">
      {step}/{total}
    </div>
  </div>
);

export default function MasterCategoryScreen({
  masters,
  subCounts,
  layout,
  onLayoutChange,
  onPickMaster,
}: Props) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return masters;
    return masters.filter((c) => {
      const meta = getMeta(c.id);
      return c.name.toLowerCase().includes(q) || meta.tagline.toLowerCase().includes(q);
    });
  }, [masters, query]);

  return (
    <div className="w-full max-w-5xl mx-auto pb-8">
      <StepBar step={1} total={3} />

      <div className="mt-4 sm:mt-5">
        <h2 className="font-serif text-[22px] sm:text-2xl lg:text-[28px] font-bold text-brand-dark leading-tight tracking-tight">
          What are you sourcing?
        </h2>
        <p className="text-[13px] sm:text-sm text-slate-500 mt-1.5">
          Pick a category to drill into specific subcategories.
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2 bg-white border-[1.5px] border-slate-200 rounded-2xl pl-3.5 pr-1.5 py-1.5 focus-within:border-[#c9973a]/50 transition-colors">
        <Search size={16} className="text-slate-500 flex-shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search categories…"
          className="flex-1 min-w-0 border-none outline-none text-[13.5px] text-brand-dark bg-transparent placeholder-slate-400"
        />
        <MasterLayoutToggle value={layout} onChange={onLayoutChange} />
      </div>

      <div className="mt-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">
            No categories match &ldquo;{query}&rdquo;.
          </div>
        ) : (
          <>
            {layout === 'grid'   && <MasterGrid   items={filtered} subCounts={subCounts} onPick={onPickMaster} />}
            {layout === 'mosaic' && <MasterMosaic items={filtered} subCounts={subCounts} onPick={onPickMaster} />}
            {layout === 'list'   && <MasterList   items={filtered} subCounts={subCounts} onPick={onPickMaster} />}
          </>
        )}
      </div>
    </div>
  );
}
