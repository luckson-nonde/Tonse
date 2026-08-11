# Demo / Template Accounts

Seeded by [`scripts/seed-demo-storefront.cjs`](./seed-demo-storefront.cjs) to populate the
landing-page storefront (category product grids, best-sellers band, hero slides) with image-rich
listings, and to serve as **reusable test accounts** — sellers across every master category plus
one buyer. Wave 1 = one seller for each of the 10 original categories; wave 2 fills the remaining
12 masters and adds second shops to the busy categories.

```
node scripts/seed-demo-storefront.cjs                 # local backend (:3001)
node scripts/seed-demo-storefront.cjs https://<api>   # any other environment
```

Safe to re-run: existing accounts are detected (login-first) and skipped, so products and purchase
counts never duplicate — a re-run seeds only accounts added to the script since the last run.
Auth endpoints are throttled 5/min server-side, so a full fresh run takes ~15 minutes.

## Credentials

**Password for every demo account: `Demo#1234`**

Email pattern: `demo.<category>@nyuwe.demo` · phones `0955000101…` · NRCs `900001/10/1…` (sequential, in table order)

| # | Account | Role / Category | Email | Products |
|---|---------|-----------------|-------|----------|
| 1 | Kwacha Gadget Hub | SELLER · electronics | `demo.electronics@nyuwe.demo` | Laptop, JBL speaker, PS5, stove |
| 2 | Zambezi Plant Hire | SELLER · machinery-hire | `demo.machinery-hire@nyuwe.demo` | Excavator, crane, tipper, forklift (daily hire) |
| 3 | Lusaka Care Diagnostics | SELLER · clinical-services | `demo.clinical-services@nyuwe.demo` | Lab panel, prescription fulfilment |
| 4 | Savanna Events Co. | SELLER · events | `demo.events@nyuwe.demo` | Venue, catering, decor, PA rental |
| 5 | Kabulonga Stays | SELLER · apartments | `demo.apartments@nyuwe.demo` | Short-stay, long-term rental, boarding room |
| 6 | Ngoma Entertainment | SELLER · entertainment | `demo.entertainment@nyuwe.demo` | DJ, live band, MC, dance crew |
| 7 | Mulungushi Works Crew | SELLER · labour | `demo.labour@nyuwe.demo` | Construction crew, welder, cleaning team |
| 8 | Kamwala Threads | SELLER · fashion | `demo.fashion@nyuwe.demo` | Chitenge set, suit, loafers, jewelry |
| 9 | Ndola Furniture Works | SELLER · furniture | `demo.furniture@nyuwe.demo` | Sofa suite, office set, bedroom suite |
| 10 | Soweto Fresh Market | SELLER · groceries | `demo.groceries@nyuwe.demo` | Produce box, staples, beverages, snacks |
| 11 | Great North Auto Spares | SELLER · automotive | `demo.automotive@nyuwe.demo` | Brake pads, accessories, recovery, tool kit |
| 12 | Mona Beauty Studio | SELLER · beauty | `demo.beauty@nyuwe.demo` | Skincare, makeup, haircare, fragrance |
| 13 | Buildmart Zambia | SELLER · construction | `demo.construction@nyuwe.demo` | Materials, tools, plumbing, electrical |
| 14 | Chisamba Agro Supplies | SELLER · agriculture | `demo.agriculture@nyuwe.demo` | Seed pack, broilers, vet visit, irrigation |
| 15 | Salama Home & Decor | SELLER · home-decor | `demo.home-decor@nyuwe.demo` | Curtains, lighting, rug, wall art |
| 16 | TechPoint Zambia | SELLER · it-products | `demo.it-products@nyuwe.demo` | Desktop, printer, networking, licences |
| 17 | Digital Mine IT Solutions | SELLER · it-services | `demo.it-services@nyuwe.demo` | Website build, support retainer, security setup |
| 18 | AirLink Communications | SELLER · telecommunications | `demo.telecommunications@nyuwe.demo` | Fibre install, VSAT, mobile fleet |
| 19 | Kafue Borehole Drillers | SELLER · drilling-services | `demo.drilling-services@nyuwe.demo` | Borehole, geotech, exploration |
| 20 | Sunrise Bakery Lusaka | SELLER · pastry-bakery | `demo.pastry-bakery@nyuwe.demo` | Bread box, custom cake |
| 21 | Pamodzi Micro-Finance | SELLER · loans | `demo.loans@nyuwe.demo` | Salary, collateral, civil-servant loans |
| 22 | SecureKey Locksmiths | SELLER · locksmith-key-services | `demo.locksmith@nyuwe.demo` | Emergency lockout call-out |
| 23 | Cairo Road Electronics | SELLER · electronics (2nd) | `demo.electronics-2@nyuwe.demo` | Galaxy A56, ThinkPad, TV combo, phone repair |
| 24 | Zed Streetwear | SELLER · fashion (2nd) | `demo.fashion-2@nyuwe.demo` | Sneakers, accessories, Ankara dress |
| 25 | Chelstone Grocers | SELLER · groceries (2nd) | `demo.groceries-2@nyuwe.demo` | Bulk beverages, snack basket, wholesale pack |
| 26 | Lusaka Event Masters | SELLER · events (2nd) | `demo.events-2@nyuwe.demo` | Event planning, corporate management |
| 27 | Copperbelt Plant & Machinery | SELLER · machinery-hire (2nd) | `demo.machinery-hire-2@nyuwe.demo` | Bulldozer, grader, bowser, generator (daily hire) |
| 28 | Woodcraft Living | SELLER · furniture (2nd) | `demo.furniture-2@nyuwe.demo` | Patio set, reupholstery service |
| — | Demo Buyer | BUYER | `demo.buyer@nyuwe.demo` | Direct purchases across the shops above |

Numbering: wave-1 sellers hold phones `0955000101–110` / NRCs `900001–900010`; the buyer holds
`…111` on environments seeded before wave 2 existed (`…129` on a fresh full run). Wave-2 sellers
are offset to `0955000131–148` / NRCs `900031–900048` so they can never collide with the buyer's
historical `…111` slot (phone and NRC are unique-indexed).

## What the seed produces

- **~35 products with real images** — repo assets from `src/assets/images/specialty/` and
  `src/assets/images/categories/`, embedded as base64 data URLs (the `products.images` convention).
  Several carry `originalPrice > price`, so `SAVE n%` badges render.
- **Sales signal the honest way**: Demo Buyer purchases via `POST /products/:id/buy` — the only
  path that increments `salesCount` — so the best-sellers band and "Best Selling" sort rank on
  real data, escrow journals and all. A few product views seed the "Trending" sort likewise.
- **Category coverage**: every seller registers under its master category id, so the
  seller-subscription join (`provider_master`) attributes their products to the right
  Top-Categories tile and category product grid.

## Notes

- These are ordinary accounts created through the public register endpoint — nothing special
  server-side. Deleting them (admin User Manager) removes the demo data with them.
- The buyer's purchases put real money movements in the ledger (simulated payments, real
  journals): each seller has escrow positions; completing collections would release to their
  venture balances — useful for testing that flow end-to-end.
- Don't reuse the `demo.*@nyuwe.demo` pattern for real users; test tooling may assume it's safe
  to modify these accounts.
