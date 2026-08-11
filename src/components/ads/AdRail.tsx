import { useEffect, useRef, useState } from 'react';
import AdCarousel from './AdCarousel';
import type { AdPlacementLocation } from '../../services/api/adsService';

/** SPONSORED label height incl. its space-y gap, and the gap between slots —
 *  must track the classes below or fill-count math drifts. */
const LABEL_H = 24;
const GAP = 20;

interface AdRailProps {
  placement: AdPlacementLocation;
  /** CATEGORY_SIDEBAR only — the master category being browsed, so the rail
   *  shows ads bought for THAT category ahead of untargeted ones. */
  categoryId?: string;
  /** Fixed slot count (default 2). Ignored when `fill` is set. */
  slots?: number;
  /** Auto-populate: render as many slots as fit the rail's own height, which
   *  stretches to the content column beside it — long page, more ads. */
  fill?: boolean;
  className?: string;
}

/**
 * The sponsored side rail — a SPONSORED label over stacked 16:9 ad slots.
 * Each slot reads the same pool at its own phase offset, so neighbouring
 * slots show different advertisers (they repeat only when there are fewer
 * live ads than slots).
 *
 * Two modes:
 * - fixed `slots` (default 2) — the rail is normal flow and scrolls with the
 *   page, sized by its content.
 * - `fill` — the rail stretches to its flex row's height (i.e. the content
 *   column next to it) and derives the slot count from the measured box:
 *   however far the content runs, ads run with it. The inner wrapper is
 *   absolutely positioned so the added slots can never feed back into the
 *   very height they were computed from; a partial slot is clipped.
 *
 * Deliberately NOT sticky: the ads travel with the content instead of
 * hanging in place while the page moves under them.
 *
 * Hidden below xl: the content column is the page on narrow screens, and the
 * rail must never squeeze it.
 */
export default function AdRail({
  placement,
  categoryId,
  slots = 2,
  fill = false,
  className = '',
}: AdRailProps) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [fillCount, setFillCount] = useState(0);

  useEffect(() => {
    if (!fill) return;
    const el = boxRef.current;
    if (!el) return;
    const compute = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return; // hidden below xl — nothing to size against
      const slotH = (w * 9) / 16;
      setFillCount(Math.max(1, Math.floor((h - LABEL_H) / (slotH + GAP))));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fill]);

  const count = fill ? fillCount : slots;

  return (
    <aside
      className={`hidden xl:block flex-1 min-w-68 max-w-136 ${
        fill ? 'relative self-stretch' : ''
      } ${className}`}
    >
      <div ref={boxRef} className={fill ? 'absolute inset-0 overflow-hidden' : ''}>
        <div className="space-y-5">
          <p className="text-[10px] font-extrabold tracking-[0.18em] text-slate-400 px-1">
            SPONSORED
          </p>
          {Array.from({ length: count }).map((_, i) => (
            <AdCarousel
              key={i}
              placement={placement}
              variant="banner"
              categoryId={categoryId}
              offset={i}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
