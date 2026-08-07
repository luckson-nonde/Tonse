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

/** How many master categories the Top Categories row shows at most. */
export const STOREFRONT_CATEGORY_LIMIT = 12;
