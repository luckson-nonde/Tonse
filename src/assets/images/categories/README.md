# Category artwork

Drop finished category artwork in THIS folder — file stem must equal the
category id from the catalog (`src/services/categories`), e.g.:

- `electronics.png`
- `home-decor.png`
- `automotive.png`

Formats: `.png` / `.jpg` / `.webp`. Square-ish (e.g. 512 × 512) works best.

Surfaces that show category tiles (e.g. the role-selection "Popular
Categories" teaser) look here FIRST; if a category has no file here they fall
back to the legacy icons in
`src/assets/images/empty-states/category_select_icon/` (numbered
`NN_name.png` files), and finally to a lettered tile.

## Labour track images (Skilled Labour "Choose a track" screen)

This folder is also the drop point for the six labour **track** images
(`LABOUR_CATEGORY_GROUPS` in `src/services/labourCategories.ts`), resolved via
`getLabourGroupImage(label)`. Unlike master categories (named for the id stem),
track files are named for the track **label** — `getLabourGroupImage` keys them
with the robust `normalizeSpecialtyKey`, so `Construction & Building.webp`
resolves without a rename:

- `Construction & Building.webp`, `Domestic & Household.webp`,
  `Industrial & Factory.webp`, `Skilled Trades.webp`, `Agricultural.webp`,
  `Transport & Logistics.webp`

A track becomes image-led once its file is present; otherwise it keeps the icon
chip. `4:3` crop, `object-cover`.
