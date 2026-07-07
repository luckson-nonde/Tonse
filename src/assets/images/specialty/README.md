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

## Naming convention — SERVICE items (single image, no Sell/Repair/Both)

Service subcategories (Entertainment, Events, Telecommunications, IT Services,
Drilling Services, …) have no buy/repair split — they show **one image**. Name
the file for the subcategory **id stem** (`<stem>.webp`), e.g. `event-catering`
→ `Event Catering.webp`.

Filename matching is lenient (`normalizeSpecialtyKey` in
`src/components/buyer/categoryMeta.ts`): it lower-cases, drops a trailing
`" (n)"` copy suffix, and collapses every run of non-alphanumerics (spaces, `_`,
`&`, `()`, `/`) to a single `-`. So a file named for the **display name** usually
resolves to the id with no rename — `Software & Web Development.webp` →
`software-web-development`, `IT Support & Maintenance.webp` →
`it-support-maintenance`, `Satellite & VSAT Installation.webp` →
`satellite-vsat-installation`.

It only fails when the display name and the catalog id differ semantically — then
name the file for the **id**. Renamed here for that reason:
`MCs & Hosts` → `mc-hosts.webp`, `Spoken Word Artists` → `spoken-word.webp`,
`Event Equipment Rental` → `event-equipment-rental.webp`. The original
`Software & Web Development.webp` actually depicted a server room, so it was
reassigned to `networking-security.webp`, and a genuine dev-team image took the
`software-web-development.webp` slot.

Currently shipped (Services): entertainment (djs, live-bands, mc-hosts, dancers,
public-speaker, comedians, influencers, spoken-word), events
(event-equipment-rental, event-management, event-catering, event-planning,
event-decor), telecommunications (internet-service-providers,
mobile-network-services, satellite-vsat-installation), it-services
(software-web-development, networking-security, it-support-maintenance),
drilling-services (borehole-drilling, mining-exploration, geotechnical-drilling).

**Still missing an image** (falls back to the icon + chip card):
- `event-venues` (Events) — needs `event-venues.webp`

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
