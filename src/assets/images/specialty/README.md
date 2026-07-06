# Specialty preview images

Dynamic preview images on the **Choose Specialty** step of seller/provider
onboarding. Each specialty card shows a 1:1 preview that crossfades between
Sell New / Repair / Both as the seller picks their capability.

## Naming convention — PER ITEM

Files are named `<stem>-<state>.<ext>`:
- **`<stem>`** = the catalog subcategory id with its `-buy`/`-repair` suffix
  removed (e.g. `mobile-phones-buy` → `mobile-phones`). See
  `src/services/categories/catalog.ts`.
- **`<state>`** = `sell` (brand-new retail), `repair` (workshop), or `both`
  (sells + repairs in one scene).

Currently shipped (Electronics):

| stem | offers | files |
|------|--------|-------|
| `mobile-phones`   | Sell / Repair / Both | `mobile-phones-{sell,repair,both}.webp` |
| `laptops`         | Sell / Repair / Both | `laptops-{sell,repair,both}.webp` |
| `home-appliances` | Sell / Repair / Both | `home-appliances-{sell,repair,both}.webp` |
| `audio-video`     | Sell / Repair / Both | `audio-video-{sell,repair,both}.webp` |
| `gaming`          | Sell only (buy-only item) | `gaming-sell.webp` |

An item with only a `-buy` catalog variant (like `gaming`) shows a single
**Sell New** option, so it only needs a `-sell` image.

## Specs
- **1:1 square** (≥ 800×800). The card crops with `object-cover`.
- `.webp` strongly preferred (`.png` / `.jpg` also load).
- Consistent lighting + warm premium grading across a stem's three states so
  the crossfade reads as one environment.

## Adding a new specialty
Drop images named for the item's stem and it lights up automatically
(glob-loaded, no code change). An item shows whichever options its catalog
variants support — Sell New / Repair / Both for buy+repair items, a single
option for buy-only or repair-only items. Items with no artwork at all
(non-electronics services) keep the icon + chip card.
