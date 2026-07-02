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
