/**
 * How many cards the landing-page storefront grid holds (2 rows of 4 on
 * desktop). Purely a layout number — it is NOT a "has the platform started
 * selling yet?" threshold. There deliberately isn't one of those: the grid
 * fills with best-sellers first and tops up with promo tiles, so every
 * intermediate state between "no sales" and "a full grid of sales" already
 * renders correctly without a stored flag that could disagree with the
 * salesCount data itself.
 */
export const STOREFRONT_GRID_SIZE = 8;

/** How many master categories the Top Categories row shows at most. Was 12
 *  (sized for a 2-row desktop grid); the row is now a single scrollable
 *  line with no wrap, so that ceiling just silently drops lower-volume
 *  categories once the platform has more than 12 populated ones — raised
 *  with headroom rather than removed, so the query still has a bound. */
export const STOREFRONT_CATEGORY_LIMIT = 40;

/** Default page size for the category-filtered product grid — divisible by
 *  2, 3 and 4 so every breakpoint's last row is full. */
export const STOREFRONT_PRODUCTS_PAGE_SIZE = 12;

/** Upper bound a client can request per page. */
export const STOREFRONT_PRODUCTS_PAGE_SIZE_MAX = 24;
