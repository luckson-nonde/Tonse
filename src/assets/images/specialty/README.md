# Specialty preview images

Dynamic preview images on the **Choose Specialty** step of seller/provider
onboarding. Each specialty card shows a 1:1 preview that crossfades between
Sell New / Repair / Both as the seller picks their capability.

## Folder layout

Images are organized into per-category subfolders **purely for tidiness** —
the resolver (`categoryMeta.ts`) globs recursively and keys off the **bare
filename**, so an image resolves identically from any subfolder. Drop new
images in the folder that matches their category (or loose in the root — it
still works):

```
specialty/
├── electronics/        mobile-phones-*, laptops-*, home-appliances-*, audio-video-*, gaming-sell
├── automotive/         vehicles, car-parts-*, car-accessories, motorcycles-parts, …
├── entertainment/      DJs, Live Bands, mc-hosts, Dancers, Comedians, …
├── events/             Event Catering, Event Planning, event-venues, …
├── telecommunications/ Internet Service Providers, Mobile Network Services, …
├── it-services/        software-web-development, networking-security, IT Support & Maintenance
├── drilling-services/  Borehole Drilling, Mining Exploration, Geotechnical Drilling
├── labour/
│   ├── construction/   Carpenter, bricklayer, Electrician, Plumber, …
│   ├── domestic/       House Cleaner, nanny, cook, gardener, …
│   ├── industrial/     Machine Operator, Forklift Operator, Warehouse Worker, …
│   ├── agricultural/   Crop Harvesting, farm-worker, Livestock Handler, …
│   └── transport/      driver-light, driver-heavy, Delivery Rider, loader
├── machinery-hire/     Excavator, bulldozer, wheel-loader, Tipper Truck, …
└── _archive/           superseded browser-copy duplicates — EXCLUDED from the
                        glob, never bundled; kept only for provenance
```

One rule: **filenames must stay unique across all subfolders** (the key is the
basename, so two folders shipping `generator.webp` would collide — last glob
entry wins only via the copy-suffix tiebreak).

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

All Events items now ship artwork (`event-venues.webp` included).

## Naming convention — LABOUR trades (Skilled Labour flow)

The *Choose Trade* screen (Skilled Labour sub-role) reuses this folder and
resolver via `getLabourImage(id)`. Trades live in
`src/services/labourCategories.ts` with **underscore ids** (`general_labourer`,
`steel_fixer`). `normalizeSpecialtyKey` collapses `_` in the id and spaces/`&`/`/`
in the filename to the same `-`, so a display-name file usually resolves with no
rename — `General Labourer.webp` → `general-labourer` matches id
`general_labourer`. Rename to the **id stem** only when the label carries words
the id omits: `Bricklayer / Mason` → `bricklayer.webp`, `Painter & Decorator` →
`painter.webp`, `Steel Fixer / Reinforcement` → `steel-fixer.webp`.

A track becomes image-led (photo cards) only once its trades ship artwork;
otherwise trades keep the icon-chip card. **Currently shipped (Construction &
Building):** general-labourer, bricklayer, carpenter, electrician, plumber,
welder, steel-fixer, painter, tiler, roofer (all 10). Other labour tracks
(Domestic, Industrial, Skilled Trades, Agricultural, Transport) have no images
yet — icon fallback. Image-led trade cards use a **4:3** crop with the label +
description beneath.

## Naming convention — HEAVY MACHINERY FOR HIRE (equipment-hire provider)

The *Select Machinery* screen (Machinery-Hire provider sub-role) also reuses this
folder + `getLabourImage(id)`. Items live in `src/services/labourCategories.ts`
(`category: 'MACHINERY_HIRE'`) with underscore ids; same lenient matching, so a
display-name file usually resolves — `Motor Grader.webp` → `motor-grader`,
`Water Bowser.webp` → `water-bowser`. Renamed to the **id stem** where the label
carried extra words: `Backhoe Loader (TLB)` → `backhoe-loader.webp`,
`Concrete Mixer Truck` → `concrete-mixer.webp`, `Diesel Generator` →
`generator.webp`.

Two files were **mislabelled and reassigned** (verified by viewing each image):
the file dropped as `Bulldozer.webp` actually depicts a **wheel loader** → it
became `wheel-loader.webp` (filling the otherwise-missing slot), and its distinct
alternate `Bulldozer (1).webp` was the real crawler dozer → `bulldozer.webp`.

Currently shipped (all 13): excavator, bulldozer, wheel-loader, backhoe-loader,
motor-grader, roller-compactor, mobile-crane, forklift, tipper-truck,
concrete-mixer, water-bowser, generator, tractor. Machinery cards use the same
**4:3** image-led layout as labour trades.

## Specs
- **1:1 square** (≥ 800×800) for specialty items; **4:3** for labour trades. The
  card crops with `object-cover`.
- `.webp` strongly preferred (`.png` / `.jpg` also load).
- Consistent lighting + warm premium grading across a stem's three states so
  the crossfade reads as one environment.

## Adding a new specialty
Drop images named for the item's stem and it lights up automatically
(glob-loaded, no code change). An item shows whichever options its catalog
variants support — Sell New / Repair / Both for buy+repair items, a single
option for buy-only or repair-only items. Items with no artwork at all
(non-electronics services) keep the icon + chip card.
