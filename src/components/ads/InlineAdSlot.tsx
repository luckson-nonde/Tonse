import AdCarousel from './AdCarousel';
import type { AdPlacementLocation } from '../../services/api/adsService';

interface InlineAdSlotProps {
  placement: AdPlacementLocation;
  /** CATEGORY_SIDEBAR only — targets the rail at the category being browsed. */
  categoryId?: string;
  /** Phase shift into the ad pool so successive rows show different
   *  advertisers rather than the same ad down the whole grid. */
  offset?: number;
}

/**
 * One product-grid cell given over to advertising — the landing-page grids
 * hand every row's last cell to this. Same footprint as the product cards
 * around it (the row's cards set the height; AdCarousel `fill` follows), with
 * a SPONSORED chip so a paid placement is never mistaken for a listing.
 *
 * The quiet background stands in while the pool loads, and sits behind the
 * "Want to advertise here?" fallback when nothing is booked.
 */
export default function InlineAdSlot({ placement, categoryId, offset = 0 }: InlineAdSlotProps) {
  return (
    <div className="relative h-full min-h-60 rounded-3xl bg-[#f8f6f1]">
      <span className="absolute top-2.5 left-2.5 z-10 pointer-events-none rounded-full bg-black/45 text-white text-[9px] font-extrabold tracking-[0.14em] px-2 py-0.5">
        SPONSORED
      </span>
      <AdCarousel placement={placement} categoryId={categoryId} offset={offset} fill />
    </div>
  );
}
