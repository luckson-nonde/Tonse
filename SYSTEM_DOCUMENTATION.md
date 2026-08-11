# Nyuwe — System Documentation

**Last full revision: 2026-08-11.** This is the master, current-state document for the whole platform. Where an older `*.md` in the repo disagrees with this file, **this file wins** (see [Documentation index](#documentation-index) for what the older files are still good for).

Nyuwe (formerly ProQuote / Tonse Hub — the lowercase `tonse` in code, storage keys and event names is deliberate and kept) is a Zambian B2B/B2C marketplace: buyers post inquiries, sellers/service providers answer with quotes, payment funds escrow, and goods change hands against a collection code. Around that core sit a labour job board, event ticketing, shop subscriptions, seller advertising (banners + a Spotlight pop-up), financing/loans, and a full double-entry ledger with real mobile-money/card payments via DPO.

---

## 1. Tech stack & repo layout

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + TypeScript, Tailwind, `motion/react`, React Router, PWA (hand-rolled service worker `public/sw.js`) |
| Backend | NestJS + TypeORM, PostgreSQL 15/16 |
| Payments | DPO (Direct Pay Online) v6 XML API, plus an in-process sandbox provider |
| Storage | Local filesystem **or** DigitalOcean Spaces (S3-compatible), one driver interface |
| Hosting | DigitalOcean App Platform (primary, `nyuwe-g9vtf.ondigitalocean.app`) + legacy Render (`tonse-web.onrender.com`) |

```
/                     Vite frontend (src/), plus all *.md docs
/src/pages            Route-level pages (dashboards, discover, tickets, payment return…)
/src/components       UI. Schema-driven shells + feature views
/src/services         API clients (src/services/api/*), category catalog, event-bus helpers
/backend/src/modules  One NestJS module per domain (37 modules — see §3)
/backend/src/database/migrations  TypeORM migrations (prod runs these; dev uses synchronize)
/docker-compose.yml   Local Postgres (+ optional pgAdmin/backend containers)
```

Response envelope: every backend success is wrapped `{statusCode, message, data}` by a global interceptor; errors are raw Nest exception bodies. The frontend `apiClient` (`src/services/api/client.ts`) unwraps `.data` automatically — scripts driving the API directly must unwrap it themselves.

---

## 2. Frontend architecture

- **Schema-driven UI.** Dashboards are *generated*, not hand-written: `MasterAccountSchema` (per role) + archetype detection (per category) decide which tabs/views a user gets. To add or move a nav item you edit the schema files, not JSX. `DynamicAccountRenderer` renders views from those schemas (quote details, order details, venture account, ads manager, job posts…).
- **Event bus.** Cross-cutting signals are `window.dispatchEvent(new CustomEvent('tonse:<kebab>', {detail}))` with module-level helper files exporting the event name + a `subscribeToX()` that returns the unsubscriber. In use: `tonse:data-revalidated`, `tonse:quotes-changed`, `tonse:inquiries-changed`, `tonse:schedule-date-selected`, `tonse:ad-inquiry-intent`, `tonse:shopping-intent` (Spotlight trigger), `tonse:hosted-payment`, and more.
- **Global always-mounted widgets** live in `src/App.tsx` beside the router: `OfflineBanner`, `InstallAppBanner`, `FloatingHub` (minimize-to-bubble background mode), `SpotlightAd` (pop-up advert). All are zero-prop and self-gating.
- **Offline/PWA.** `public/sw.js` (plain JS on purpose) warms the app shell + images from `asset-manifest.json`; `apiClient` supports an SWR option that revalidates and fires `tonse:data-revalidated`. After your **own** mutation, refetch with network forced — the SWR cache may serve the pre-mutation body.
- **Page transitions.** `PageTransition.tsx` (200 ms fade+slide). React Router reuses same-typed elements, so every route needs a unique `transitionKey`.
- **Payments UI kit.** `PaymentSheet` (the one payment modal: amount, phone, MTN/Airtel/Zamtel, card), `PushPaymentWait` (approve-on-phone polling card), `beginHostedPayment()` (redirect hand-off to DPO's page + sessionStorage return context), `PaymentReturnPage` at `/payment/return` (public — guest ticket buyers land there too).

### Android rendering warning
Never use translucent border utilities (`border-…/NN`) on rounded cards — Chrome + Mali GPUs smear/ghost them on real phones. Opaque hex borders only. (Playbook: `.claude/skills/android-gpu-ghosting`.)

---

## 3. Backend modules (37)

`admin, ads, audit, auth, billing, calendar-events, care-plans, categories, collection, consents, files, financing, idempotency, identity-audit, inquiries, job-board, jobs, ledger, loans, notifications, orders, payments, portfolio, products, quotes, referrals, reports, reviews, schedules*, shops, site-settings, storage, storefront, team, tickets, users, venture`

\* `schedules` is legacy/dead — the live calendar feature is `calendar-events` + frontend-derived gig events. Don't build on `schedules`.

Roles (5 live): `BUYER`, `SELLER`, `SERVICE_PROVIDER`, `ADMIN`, `PROMOTER`. A company can hold up to 3 profile rows on one `users` row and switch the active one (header → Role Manager); one admin approval covers all its sides. Display IDs: inquiries get QIDs (charset deliberately skips 6/7/8/9), users get USER-ids — see `IDENTITY_AND_DISPLAY_IDS.md` (still authoritative for that subsystem).

---

## 4. Marketplace core: inquiry → quote → order

1. **Inquiry** (buyer): category-driven dynamic form (`attributes` json). `EXPRESS` (pay on quote, immediate) vs `STANDARD` (PO-style). Targeted inquiries go to one shop. Guests on the landing page can compose an inquiry that defers submission until after login (`pendingInquiry.ts`).
2. **Quote** (seller/provider): priced answer; statuses `PENDING → ACCEPTED → PAYMENT_PENDING → PAID → PENDING_COLLECTION/AWAITING_PICKUP → COMPLETED/HANDED_OVER`, with terminal exits `CANCELLED/REFUNDED`. `PAID` and other money statuses are **server-written only**.
3. **Payment** = escrow. `POST /payments/checkout {quoteId}` reads the price server-side and starts a PSP collection; on *verified* success `fundEscrow()` — in one transaction — posts the `ESCROW_FUNDED` journal, creates the **Order**, flips the quote `PAID`, closes the inquiry, and mints the **collection code** (`PQ-XXXXXXXX`).
4. **Collection.** The seller's handover flow looks the quote up **by** collection code (`collection` module); completion releases escrow to the seller's venture balance net of commission, after `PAYOUT_HOLD_HOURS`.

**Closed bypass (2026-08-11):** `POST /orders` used to flip any quote PAID with zero payment and was called from three UIs. It now rejects priced non-LOAN quotes; paid orders exist only via the payment flow. Direct product purchases use `direct-order.service.ts` (born-PAID quote + order + escrow journal in one transaction — the template `fundEscrow` mirrors).

Lifecycle views never duplicate an item across tabs — use the `lifecycleFilters` helpers; each item lives in exactly one stage bucket.

---

## 5. Payments (the one system every feature uses)

### 5.1 Provider abstraction
`PAYMENT_PROVIDER=sandbox|dpo` picks the adapter at boot behind one interface (`backend/src/modules/payments/providers/`):

- **sandbox** — no network; collections park as `pay-offline`/pending and are completed with in-app **Simulate approval** buttons (each simulate endpoint refuses when the live provider is configured).
- **dpo** — real money. `createToken` (hosted page URL) always; for **mobile money with a phone number** the adapter then calls `GetMobilePaymentOptions` + `ChargeTokenMobile` to push the charge to the payer's handset — the payer approves **inside our UI** (no redirect). MTN + Airtel Zambia confirmed on the test account; Zamtel (or any miss) falls back to the hosted page. Cards always use the hosted page (PCI stays DPO's problem). `RedirectOption=1` from DPO's v6 is deliberately ignored (it arrives with no URL and push instructions). DPO's Payment Notification is unsigned → it is only a *hint*; every settlement re-verifies with `verifyToken` first. Amount mismatches refuse to settle. Result-code map lives in `dpo.provider.ts` (000 paid; 901/903/904 dead; 801-804/902/950 = *our* request error → 503, never "failed").

### 5.2 CheckoutService: one engine, many pay points
Every initiator creates a `psp_transactions` row (`context.kind` is the discriminator), calls `initiateCollection`, and returns `{reference, provider, status, amount, fee, totalCharged, instruction?, redirectUrl?}`. Settlement arrives via the webhook (`POST /webhooks/psp?secret=…`), the payer's return/verify (`POST /payments/checkout/:ref/verify`), or sandbox simulate — all idempotent and re-verified. `verifyAndSettle` dispatches on `context.kind` to a `fund*` step (FOR-UPDATE lock, `SUCCESSFUL` short-circuit, ledger journal with `<kind>:${tx.id}` idempotency key, then the entity flip):

| Pay point | Initiator | kind / route | Funds |
|---|---|---|---|
| Quote/escrow | `checkout()` | quoteId set · `POST /payments/checkout` | `ESCROW_FUNDED` + Order + collection code |
| Venture deposit | `initiateVentureDeposit` | (default) | seller balance credit |
| Ad purchase | `initiateAdPurchase` | `AD_PURCHASE` · `POST /ads/:id/checkout` | `AD_REVENUE` |
| Job-post fee | `initiateJobPostFee` | `JOB_POST_FEE` · `POST /job-postings/:id/checkout` | `JOB_BOARD_REVENUE` |
| Ticket sale (guest) | `initiateTicketPurchase` | `TICKET_SALE` · `POST /tickets/public/checkout/:ref/pay` | commission + seller net, tickets minted |
| Subscription | `initiateSubscriptionFee` | `SUBSCRIPTION_FEE` · `POST /billing/subscription/checkout` | `SUBSCRIPTION_REVENUE` + paidUntil +30d |
| Loan disbursement | `initiateDisbursement` | LOAN context | escrow for the financed order (a *collection from the lender* — DPO has no payout API) |

Guest ticket payments: `psp_transactions.counterpartyId` is NULL; ownership = reference + kind, exposed only through unauthenticated routes on `TicketsPublicController` (the JWT-guarded generic routes are untouched). Reference prefixes: `CHK/ADV/JPF/TPF/SUB/DEP…` — `PaymentReturnPage` verifies `TPF-` via the public endpoint.

Balance-pay alternatives (no PSP round-trip): ads and job-post fees can be paid from the seller's venture balance (ledger transfer `SELLER_PAYABLE → *_REVENUE`).

**Never add a new instant-success payment path.** Copy the `initiateJobPostFee`/`fundJobPostFee` pair.

---

## 6. Ledger & money

Double-entry, append-only (`ledger` module). DB triggers enforce balanced journals; positions are derived views, never stored flags.

- **Accounts (11):** `PSP_HOLDING`, `ESCROW_LIABILITY`, `SELLER_PAYABLE`, `REFUND_PAYABLE`, `PSP_PAYOUT_IN_FLIGHT`, `PLATFORM_COMMISSION_REVENUE`, `AD_REVENUE`, `JOB_BOARD_REVENUE`, `SUBSCRIPTION_REVENUE`, `PSP_FEE_EXPENSE`, `SUSPENSE` (all `_ZMW`). Seeded insert-only at boot — adding one is just an array entry.
- **Journal types** (DB enum — new values need an `ALTER TYPE … ADD VALUE` migration): `ESCROW_FUNDED/RELEASED`, `VENTURE_DEPOSIT`, `AD_PURCHASE`, `AD_REJECTED_REFUND`, `JOB_POST_FEE`, `SUBSCRIPTION_FEE`, `TICKET_SALE`, `REFUND_*`, `PAYOUT_*`, `REVERSAL`, `ADJUSTMENT`, `OPENING_BALANCE`.
- **Venture account** (seller balance) = `seller_venture_positions` view over `SELLER_PAYABLE` entries. Credited by escrow releases, ticket net proceeds, direct deposits; debited by balance-pays. Withdrawals are deliberately deferred (off-platform).
- **Platform earnings** (the admin's own account): `GET /admin/platform-earnings` sums the four revenue accounts live; rendered as the "Platform Earnings" card atop Admin → Accounts. Commission % on ticket sales and escrow releases (`PLATFORM_COMMISSION_PERCENT`, ticket `commissionPercent`) are admin-set.
- The legacy `payments` table is a frozen history; the ledger is authoritative.

---

## 7. Advertising

Seller-purchased, admin-priced, admin-approved (`ads` module). Lifecycle `PENDING_PAYMENT → PENDING_APPROVAL → APPROVED/REJECTED` (+derived `EXPIRED`); approve slides the paid window forward if review was slow; reject refunds `totalPaidAmount` to the venture balance.

**Two products:**

1. **On-page placements** — `HOMEPAGE_CENTER`, `SECONDARY_SIDEBAR`, `CATEGORY_SIDEBAR` (category-targetable). One shared `baseRatePerDay`; tick as many placements as you like; duration discount tiers. Rendered by `AdCarousel` (+`AdRail`, `InlineAdSlot`), 10 s rotation, 60 s fetch cache.
2. **Spotlight pop-up** (`POPUP`, exclusive — cannot be mixed with on-page in one booking) — a modal ad shown at moments of shopping intent (`tonse:shopping-intent`, emitted when a buyer picks a category or a Discover visitor filters one). Own `popupRatePerDay`. **Anti-annoyance is server-enforced**: `ad_popup_impressions` records every hand-out per viewer (logged-in id or an anonymous browser key), the cap is `popupMaxPerSession` per `popupMinMinutesBetween` window, and selection is fair round-robin (least-recently-seen by this viewer, tie-broken by fewest global impressions; category-targeted ads win relevance). Global kill switch `popupEnabled` stops both booking and serving. Impressions prune at 30 days; clicks are stamped for engagement stats. Frontend: `SpotlightAd` (z-[280], 1.4 s delay, never for sellers/providers/admins or on payment/auth routes).

Click-through is ONE shared implementation (`adClickThrough.ts`): buyer → `saveAdInquiryIntent` → `/buyer/process-selection` pre-targeted at the advertiser; guest → via login; non-buyer → shop page `?ad=` attribution.

**Boot media sweep** deletes any ad whose media object is missing from storage (with an abort valve if storage lists zero objects) — every ad must carry a real uploaded file.

---

## 8. Job board (labour)

Any account may post; postings are labour-trades-only, admin-moderated (`PENDING_PAYMENT? → PENDING_APPROVAL → APPROVED → FILLED/CLOSED`, `REJECTED` → edit-and-resubmit without re-paying). Admin-controlled **posting fee** lives in `billing_settings` (`jobPostingFeeEnabled` + `jobPostingFee`, price snapshotted on the posting). The feed is the whole board (not trade-matched); applying self-gates on holding an employment account. Applications carry a mandatory **Application Letter** plus any poster-required documents (encrypted secure uploads); contact details reveal only on ACCEPT — both directions. Machinery-hire stayed on the inquiry funnel.

## 9. Event ticketing

Events-family sellers create events with priced tiers; guests buy through public share links `/e/EVT-XXXXXX` (no account). Two-step checkout: park a PENDING order server-priced, then **real PSP payment** (mobile push in-page / hosted card). On verified payment `commitPaidTicketOrder` — one locked transaction — re-checks stock, mints per-attendee QR ticket codes, posts the `TICKET_SALE` journal (gross → PSP holding; seller net → venture balance; commission → platform), emails tickets (best-effort). Check-in via scanner roles. Public simulate endpoint works only on the sandbox provider.

## 10. Billing & monetization switches (`billing_settings`, one row)

| Knob | Effect |
|---|---|
| `subscriptionsEnabled` | Master switch: ON → buyers pay tiered quotation fees per inquiry AND shops need an active monthly subscription (`SubscriptionPaywall` blocks the dashboard) |
| `quoteTiers` / `targetedInquiryFee` | Buyer-side fees |
| `monthlyFee` | Shop subscription (real payment → `SUBSCRIPTION_FEE` journal, paidUntil +30 d from max(now, paidUntil)) |
| `jobPostingFeeEnabled` / `jobPostingFee` | Job board fee |

Ad pricing + Spotlight knobs live in `ad_settings`; ticket commission in `event_ticket_settings`. All admin-edited, all fail toward their safe direction (fetch failure never waives fees platform-wide, but never falsely paywalls a paying shop either).

---

## 11. Files & storage

One `StorageDriver` interface, chosen by `STORAGE_DRIVER=filesystem|spaces`:
- **spaces** (production/DO): public uploads under `uploads/` (public-read, served from the CDN `SPACES_PUBLIC_BASE_URL`); sensitive files under `secure-uploads/` with **no public ACL**.
- **filesystem** (local/Render): served from `/uploads`; production boot logs a screaming ERROR if this driver runs with no mounted `UPLOADS_DIR` (the ephemeral-disk trap that once destroyed uploads).

Sensitive categories (KYC, payslips, job-application documents) are **AES-256-GCM encrypted above the driver** and served only through authenticated `GET /files/secure/:file`. Frontend: never `<img>` a secure URL — use `SecureFile` (PDF-aware via `allowPdf`), branch per-URL with `isSecureFileUrl`.

## 12. Notifications

`notifications` module + real Web Push (VAPID) off `notifyUsers()`; typed notification events per domain (new inquiry, quote, job match, application, order paid…). Remember: new notification types touch up to 4 places (enum, dispatch, frontend rendering, route mapping). Background mode: `FloatingHub` bubble keeps the session alive minimized.

## 13. Admin panel (`/admin`)

Overview stats · Users (User Manager, sub-admins deny-by-default via `AdminPermissionsGuard`, verification queue) · Inquiries/Quotes/Transactions · **Ledger** (accounts + Platform Earnings card, trial balance, journals, escrow positions) · Ads (pricing incl. Spotlight, approval queue) · Job board queue · Subscriptions (monetization switches) · Tickets (commission) · Site settings (landing page switch) · Reports/moderation · Audit log (every admin action). Undecorated admin routes = primary-admin-only; sub-admins need explicit permission codes.

---

## 14. Deployment & environments

**Primary: DigitalOcean App Platform** — app `nyuwe` (region `lon`): static site (Vite `dist/`) + `api` Docker service (`backend/Dockerfile`) + dev Postgres + Spaces bucket `nyuwe-media` (CDN). Ingress: `/api` → api, `/` → web. Deploys auto on push to `walandadev-tech/nyuwe` `main`. **Prod applies TypeORM migrations on boot** (`DB_RUN_MIGRATIONS=true`, `DB_SYNCHRONIZE=false`); dev uses synchronize. A failed migration fails the deploy — that's the safety.

**Legacy: Render** (`tonse-web.onrender.com` + `tonse-api`) — still running the older blueprint; don't verify new work against it.

**Git remotes:** push `main` to **all three** — `walanda` (deploys), `tonse`, `github`.

### Environment variables (backend, the ones that matter)
`DB_*` (+`DB_SSL=no-verify` on DO) · `JWT_SECRET/JWT_REFRESH_SECRET` · `JWT_EXPIRATION=1h` / `JWT_REFRESH_EXPIRATION=7d` — **ALWAYS with a unit**: a bare `3600` is parsed as *milliseconds* and logs everyone out in seconds · `PII_ENCRYPTION_KEY` (boot fails closed in prod without it) · `PAYMENT_PROVIDER` + `DPO_COMPANY_TOKEN/DPO_DEFAULT_SERVICE_TYPE/DPO_NOTIFICATION_SECRET/DPO_REDIRECT_URL/DPO_BACK_URL` (+optional `DPO_API_BASE_URL`, `DPO_PAYMENT_PAGE_URL=payv3.php`, `DPO_PTL_HOURS`) · `STORAGE_DRIVER` + `SPACES_*` · `PLATFORM_COMMISSION_PERCENT`, `PAYOUT_HOLD_HOURS` · `WEB_PUSH_*` · `ADMIN_EMAIL/PASSWORD/NAME` (seeder) · `PROMOTER_INVITE_KEY` · `CORS_ORIGINS` · SMTP (optional, tickets email). Keep values **unquoted with no trailing `#` comment** — dotenv truncates at `#`. Frontend build args: `VITE_API_URL=/api`, `VITE_VAPID_PUBLIC_KEY`.

DPO portal setup: set the Payment Notification URL to `https://<api-host>/api/webhooks/psp?secret=<DPO_NOTIFICATION_SECRET>`. Payments currently run on DPO **test** credentials — swap the company token to go live.

---

## 15. Local development & verification

```bash
# Postgres (root .env needs DB_PASSWORD, PII_ENCRYPTION_KEY for compose interpolation)
docker compose up -d postgres
# Backend (dev, synchronize on) — use a scratch port if 3001 is taken
cd backend && PORT=3099 npm run start:dev
# Frontend
npm run dev
```

- Type checks: `npx tsc --noEmit` in both roots; full bundle proof: `npm run build`.
- Auth routes are throttled 5/min — test scripts that register+login repeatedly will 429; wait out the window.
- E2E convention: standalone node scripts (see the `verify` skill) that drive the HTTP API on the scratch port and double-check persisted state directly via `pg` — fixtures inserted into Postgres, money flows driven over HTTP with the sandbox provider + simulate endpoints. The payments overhaul (30/30) and Spotlight (13/13) suites follow this pattern.
- The boot media sweep deletes ads whose media isn't in storage — local test ads need real uploads (or clean up fixtures).
- No browser automation available in the default environment: UI wiring is verified by tsc + vite build; visual checks are manual (check Android for the border rule).

---

## 16. Known gotchas (hard-won; don't relearn)

1. **JWT lifetimes need units** (`1h`, not `3600`).
2. **dotenv truncates at `#`** — no inline comments, no quotes on values.
3. **json columns are filtered in JS after load, never in SQL** (`placements`, `attributes`…) — and json-DISTINCT 500s (no equality operator).
4. **pg returns decimals as strings** — `Number()`-coerce before arithmetic that reaches the UI.
5. **DB enum values** need `ALTER TYPE … ADD VALUE IF NOT EXISTS` migrations; they can't be dropped. New migration timestamps must exceed the latest (currently `1786140000000`).
6. **Nested DTOs** need `@ValidateNested + @Type` classes or the global whitelist pipe silently blanks them.
7. **Money statuses are server-written only**; every funding step is idempotent; webhooks are hints — always re-verify with the provider.
8. **Opaque borders on rounded cards** (Android Mali smearing).
9. **Parallel AI/dev sessions share this checkout** — re-check `git status` before editing shared files; someone else may have pushed.
10. **Old docs lie** — check this file's date against theirs.

---

## Documentation index

**Current & authoritative:** this file · `DATABASE_SCHEMA.md` (canonical table reference — table count keeps growing) · `IDENTITY_AND_DISPLAY_IDS.md` · `docs/CATEGORY_IMPLEMENTATION_PATTERN.md` (consult before building any marketplace category) · `DPO_PAYMENTS_INTEGRATION.md` (deep DPO detail; this file supersedes its "simulate" remarks) · `DOCKER.md` / `QUICK_START.md` (local setup).

**Historical snapshots (kept for archaeology, do not trust as current):** `IMPLEMENTATION_COMPLETE.md`, `PROJECT_COMPLETION_SUMMARY.md`, `BACKEND_IMPLEMENTATION_COMPLETE.md`, `README_COMPLETE.md`, `API_ENDPOINTS_COMPLETE.md`, `REQUIRED_API_ENDPOINTS.md`, the JWT_* trio, `CLEANUP_*`, `ARCHITECTURE_AND_DEPENDENCIES.md`, `FRONTEND_BACKEND_INTEGRATION.md`, and similar — most predate the payments overhaul, the ads system, the job board, ticketing, and the DO deployment.
