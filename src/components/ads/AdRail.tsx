import AdCarousel from './AdCarousel';
import type { AdPlacementLocation } from '../../services/api/adsService';

interface AdRailProps {
  placement: AdPlacementLocation;
  /** CATEGORY_SIDEBAR only — the master category being browsed, so the rail
   *  shows ads bought for THAT category ahead of untargeted ones. */
  categoryId?: string;
  /** How many stacked slots. Two by default: one above, one below. */
  slots?: number;
  className?: string;
}

/**
 * The sponsored side rail on a funnel page — a SPONSORED label over N stacked
 * ad slots. Each slot reads the same pool at its own phase offset, so the top
 * and bottom slots show different advertisers (they repeat only when there
 * are fewer live ads than slots).
 *
 * Hidden below xl: the funnel column is the page on narrow screens, and the
 * rail must never squeeze it. Sticky so it stays in view down a long form.
 */
export default function AdRail({ placement, categoryId, slots = 2, className = '' }: AdRailProps) {
  return (
    <aside className={`hidden xl:block w-72 shrink-0 ${className}`}>
      <div className="sticky top-4 space-y-4">
        <p className="text-[10px] font-extrabold tracking-[0.18em] text-slate-400 px-1">
          SPONSORED
        </p>
        {Array.from({ length: slots }).map((_, i) => (
          <AdCarousel
            key={i}
            placement={placement}
            variant="sidebar"
            categoryId={categoryId}
            offset={i}
          />
        ))}
      </div>
    </aside>
  );
}
