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
 * Deliberately NOT sticky: the rail is part of the same scrolling panel as the
 * funnel column, so the ads travel with the content instead of hanging in
 * place while the list moves under them.
 *
 * Sizing: `flex-1` swallows whatever width is left after the funnel column
 * takes its reading width, so the slots grow into the dead space on wide
 * screens instead of sitting at a fixed 288px. Capped at max-w so an ultrawide
 * monitor doesn't hand the ads more room than the content, floored at min-w so
 * they never squash into a strip. 16:9 slots (`banner`) rather than the old
 * portrait card — at this width a 4:5 ad would be taller than the viewport.
 *
 * Hidden below xl: the funnel column is the page on narrow screens, and the
 * rail must never squeeze it.
 */
export default function AdRail({ placement, categoryId, slots = 2, className = '' }: AdRailProps) {
  return (
    <aside className={`hidden xl:block flex-1 min-w-68 max-w-136 ${className}`}>
      <div className="space-y-5">
        <p className="text-[10px] font-extrabold tracking-[0.18em] text-slate-400 px-1">
          SPONSORED
        </p>
        {Array.from({ length: slots }).map((_, i) => (
          <AdCarousel
            key={i}
            placement={placement}
            variant="banner"
            categoryId={categoryId}
            offset={i}
          />
        ))}
      </div>
    </aside>
  );
}
