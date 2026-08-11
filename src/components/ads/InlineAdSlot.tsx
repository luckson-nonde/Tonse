import AdCarousel from './AdCarousel';
import type { AdPlacementLocation } from '../../services/api/adsService';

/** One cell of an interleaved product grid: a product by stream index, or an
 *  ad slot phase-shifted by `offset`. */
export type GridCell = { kind: 'product'; index: number } | { kind: 'ad'; offset: number };

/** The ad's column per row on the lg 4-column grid — front, middle-right,
 *  middle-left, end, repeat. Deliberately not a single column: a fixed
 *  position reads as a sponsored STRIPE down one side; walking it across
 *  the rows reads as ads woven through the catalog. */
const AD_COLUMN_PATTERN = [0, 2, 1, 3];

/**
 * Lay out `productCount` products in rows of (3 products + 1 ad), the ad
 * cell walking AD_COLUMN_PATTERN across successive rows. Every row gets
 * exactly one ad — including a short final row, where the position clamps
 * into range. Denser breakpoints reflow the same stream, keeping the ads
 * scattered rather than columnar.
 */
export function interleaveAdCells(productCount: number): GridCell[] {
  const cells: GridCell[] = [];
  let product = 0;
  let row = 0;
  while (product < productCount) {
    const productsThisRow = Math.min(3, productCount - product);
    const adCol = Math.min(AD_COLUMN_PATTERN[row % AD_COLUMN_PATTERN.length], productsThisRow);
    for (let col = 0; col <= productsThisRow; col++) {
      if (col === adCol) cells.push({ kind: 'ad', offset: row });
      else cells.push({ kind: 'product', index: product++ });
    }
    row++;
  }
  return cells;
}

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
