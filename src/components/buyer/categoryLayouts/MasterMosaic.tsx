import type { Category } from '../../../services/categories';
import { getMeta, getCategoryArt } from '../categoryMeta';
import MasterGrid from './MasterGrid';
import CategoryGroupSections from './CategoryGroupSections';

interface Props {
  items: Category[];
  subCounts: Record<string, number>;
  onPick: (master: Category) => void;
  /** Section headers under the hero while browsing; flat during search. */
  grouped?: boolean;
}

export default function MasterMosaic({ items, subCounts, onPick, grouped = false }: Props) {
  if (!items.length) return null;
  // The hero is the first filtered category, deliberately pulled out of its
  // section as a cross-cutting spotlight — its group renders without it.
  const [hero, ...rest] = items;
  const heroMeta = getMeta(hero.id);
  const HeroIcon = heroMeta.icon;
  const heroArt = getCategoryArt(hero.id);

  return (
    <div className="flex flex-col gap-3">
      {heroArt ? (
        // Artwork hero: full-bleed render behind a navy gradient that keeps
        // the left text column legible while the art shows through the right.
        <button
          type="button"
          onClick={() => onPick(hero)}
          className="group relative overflow-hidden text-white border-none rounded-[22px] sm:rounded-[24px] text-left shadow-[0_10px_30px_-10px_rgba(30,41,59,0.4)] transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9973A]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-white"
        >
          <img
            src={heroArt}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-brand-dark via-brand-dark/80 to-brand-dark/15"
          />
          <div className="relative p-5 sm:p-6 min-h-[120px] sm:min-h-[136px] max-w-[75%] sm:max-w-[60%] flex flex-col justify-center">
            <div className="text-[10px] font-extrabold tracking-[0.2em] text-[#E5BA73]">TOP CATEGORY</div>
            <div className="text-lg sm:text-xl font-extrabold mt-0.5 tracking-tight truncate">{hero.name}</div>
            <div className="text-xs sm:text-[13px] text-white/70 mt-1">{heroMeta.tagline || 'Tap to explore'}</div>
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onPick(hero)}
          className="relative overflow-hidden bg-brand-dark text-white border-none rounded-[22px] sm:rounded-[24px] p-5 sm:p-6 text-left flex items-center gap-4 sm:gap-5 shadow-[0_10px_30px_-10px_rgba(30,41,59,0.4)] transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9973A]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-white"
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
          </div>
        </button>
      )}
      {grouped ? (
        <CategoryGroupSections
          items={rest}
          render={(g) => <MasterGrid items={g} subCounts={subCounts} onPick={onPick} />}
        />
      ) : (
        <MasterGrid items={rest} subCounts={subCounts} onPick={onPick} />
      )}
    </div>
  );
}
