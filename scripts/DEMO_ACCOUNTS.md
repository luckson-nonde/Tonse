# Demo / Template Accounts

Seeded by [`scripts/seed-demo-storefront.cjs`](./seed-demo-storefront.cjs) to populate the
landing-page storefront (category product grids, best-sellers band, hero slides) with image-rich
listings, and to serve as **reusable test accounts** — one seller per master category plus one buyer.

```
node scripts/seed-demo-storefront.cjs                 # local backend (:3001)
node scripts/seed-demo-storefront.cjs https://<api>   # any other environment
```

Safe to re-run: existing accounts are detected and skipped, so products and purchase counts never
duplicate. Registration is throttled 5/min server-side, so a full fresh run takes ~3 minutes.

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
| 11 | Demo Buyer | BUYER | `demo.buyer@nyuwe.demo` | Has ~10 direct purchases across the shops above |

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
