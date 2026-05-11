import type { Category } from '../../../services/categories';
import { getMeta } from '../categoryMeta';
import MasterGrid from './MasterGrid';

interface Props {
  items: Category[];
  subCounts: Record<string, number>;
  selectedCounts: Record<string, number>;
  onPick: (master: Category) => void;
}

export default function MasterMosaic({ items, subCounts, selectedCounts, onPick }: Props) {
  if (!items.length) return null;
  const [hero, ...rest] = items;
  const heroMeta = getMeta(hero.id);
  const HeroIcon = heroMeta.icon;
  const heroSelected = selectedCounts[hero.id] ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => onPick(hero)}
        className="relative overflow-hidden bg-brand-dark text-white border-none rounded-[22px] sm:rounded-[24px] p-5 sm:p-6 text-left flex items-center gap-4 sm:gap-5 shadow-[0_10px_30px_-10px_rgba(30,41,59,0.4)] transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.99]"
      >
        <div
          aria-hidden
          className="absolute -right-5 -top-5 w-36 h-36 rounded-full"
          style={{ background: heroMeta.accent + '4d' }}
        />
        <div
          className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: heroMeta.accent }}
        >
          <HeroIcon size={28} strokeWidth={1.8} className="text-white" />
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="text-[10px] font-extrabold tracking-[0.2em]" style={{ color: heroMeta.accent }}>
            TOP CATEGORY
          </div>
          <div className="text-lg sm:text-xl font-extrabold mt-0.5 tracking-tight truncate">{hero.name}</div>
          <div className="text-xs sm:text-[13px] text-white/70 mt-1">{heroMeta.tagline || 'Tap to explore'}</div>
          {heroSelected > 0 && (
            <div className="inline-block mt-2 bg-brand-gold text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {heroSelected} selected
            </div>
          )}
        </div>
      </button>
      <MasterGrid items={rest} subCounts={subCounts} selectedCounts={selectedCounts} onPick={onPick} />
    </div>
  );
}
