# Identity & Display IDs (Canonical)

> **Single source of truth as of 2026-07-02.** This document replaces 8 fragmented, partially-stale docs (see "Superseded documents" below) with one canonical description of the ProQuote Zambia identity model and display-ID system, verified directly against the current codebase.
>
> Related docs:
> - [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md) — table shapes for `users`, `user_emails`, `identity_audits`, and related entities.
> - [`THREE_TIER_IDENTITY_DEVELOPER_REFERENCE.md`](THREE_TIER_IDENTITY_DEVELOPER_REFERENCE.md) — service-method cheat-sheet (which service to call for lookups, creation, and verification).

---

## 1. The three identifiers

ProQuote Zambia identifies a user (or an inquiry) with **three distinct fields**, not two. Prior docs split the first one into two names — "System Identifier" and "Internal ID" — as if they were separate tiers. **They are not.** Both terms refer to the exact same database column: the UUID primary key. This document uses **Internal ID** exclusively going forward; if you see "System Identifier" elsewhere in older material, read it as a synonym for the same `id` column.

| Identifier | Column | Shown to users? | Mutable? | Purpose |
|---|---|---|---|---|
| **Internal ID** (a.k.a. "System Identifier" — same column, one term) | `id` (UUID, `@PrimaryGeneratedColumn('uuid')`) | No — never displayed, never accepted as user input/search | No — immutable once generated | The one true primary key. FK target for every relation (inquiries, `user_emails`, `identity_audits`, buyer/seller/service-provider profiles). TypeORM's row identity. |
| **Display ID** | `displayId` (varchar, unique, nullable at the DB level, populated immediately after insert) | Yes — the friendly, user-facing/support-facing identifier | No — generated once at creation and persisted; not recomputed on read | Short, deterministic, one-way hash derivation of `id`. What users see in the UI and what support/lookup flows should accept. Two incompatible formats depending on entity type (see §2). |
| **NRC number** | `nrcNumber` (varchar, unique, nullable) | Not typically shown in casual UI copy | In principle no — it's a real-world government ID, though the column allows updates for correction/re-verification flows | The real-world anchor (Zambian National Registration Card number). Exists **only on `User`**, not on inquiries. Purpose is fraud/duplicate-account prevention (one real person = one NRC = one account) — not routing or display. Normalized via `UserDisplayIdUtil.normalizeIdentifier()` before every write and every lookup comparison. |

**Storage / display / lookup summary:**
- `id` — stored, FK-joined everywhere, never displayed, never user-searched.
- `displayId` — stored, displayed, user-searchable (it's the actual DB lookup key for `findByDisplayId`).
- `nrcNumber` — stored, normalized, used as a uniqueness/lookup anchor for identity verification — not a routing or display mechanism.

A historical note worth keeping: the identity migration's `up()` method back-fills a `LEGACY_<uuid-prefix>` placeholder into `nrcNumber` for pre-existing rows that lack a real NRC (`UPDATE users SET "nrcNumber" = 'LEGACY_' || SUBSTRING(id::text, 1, 12) WHERE "nrcNumber" IS NULL`, in `server/db/migrations/1704000000000-CreateIdentitySystem.ts` around line 394-398) — a sign this field was retrofitted onto older data rather than present from day one. (The `down()` method in that same file only drops columns/tables/indexes for rollback and contains no backfill logic.)

---

## 2. Display ID generation

Two **independent, non-interoperable** hash-based encoders exist. Neither is Crockford Base32, neither is sequential, and neither is a registry/lookup-table scheme — both are deterministic, one-way SHA-256 derivations of the UUID that discard entropy, so a display ID can never be reversed back into its source UUID.

Earlier docs in this cluster referenced a generic `DisplayIdGenerator` class (paths like `utils/idGenerator.ts`, `backend/src/utils/displayIdGenerator.ts`) parameterized by entity type. **That class does not exist anywhere in the repo.** The real, shipped implementation is two separate, purpose-specific static utility classes:

### 2.1 Inquiries — `DisplayIdUtil`

**File:** `backend/src/utils/display-id.util.ts`

```ts
export class DisplayIdUtil {
  static generateDisplayId(uuid: string): string;
  private static hashToAlphanumeric(hex: string, length: number): string;
  static isValidDisplayId(displayId: string): boolean;
  static extractHash(displayId: string): string;
}
```

**Algorithm:**
1. Strip hyphens from the UUID.
2. Compute the SHA-256 hex digest of the cleaned string.
3. `hashToAlphanumeric`: for each of 6 output characters, pull a 5-bit window out of the hex byte stream (`byteIndex = floor(i*5/8)`, `bitOffset = (i*5) % 8`), mask with `& 31` (yielding 0–31), and index into the 36-character charset `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789` (mod 36).
4. Prepend `QID-`.

**Format:** `QID-XXXXXX` — prefix `QID`, hyphen, 6 uppercase-alphanumeric characters. DB column budget is 20 chars.

**Charset caveat:** because the 5-bit mask caps every selected index at 0–31, and the charset has 36 entries, **the last 4 charset entries (`6`, `7`, `8`, `9`, i.e. indices 32–35) are structurally unreachable** via this path. In practice, only the first 32 of the 36 charset characters (`A`–`Z`, `0`–`5`) ever appear in a generated inquiry display ID.

**Validation:** `isValidDisplayId` uses the regex `^QID-[A-Z0-9]{6}$` (the regex itself still accepts the full A–Z0–9 range even though generation can't produce `6789` — useful to know if you're validating externally-supplied IDs, not just internally-generated ones).

**Extraction:** `extractHash(displayId)` returns the substring after the hyphen. It does **not** validate the format first — call `isValidDisplayId` yourself if you need that guarantee.

**Example** (from the source code comment): `fce43de0-339c-4706-a2e2-c9d70260061e` → `QID-8F2D3K`.

### 2.2 Users — `UserDisplayIdUtil`

**File:** `backend/src/utils/user-display-id.util.ts`

```ts
export class UserDisplayIdUtil {
  static generateDisplayId(uuid: string): string;
  static isValidDisplayId(displayId: string): boolean;
  static extractHash(displayId: string): string;
  static normalizeIdentifier(value: string): string;
}
```

**Algorithm:**
1. Compute the SHA-256 hex digest of the **raw** UUID (hyphens are *not* stripped — this is a real difference from the inquiry algorithm).
2. Take the first 8 hex characters, parse as a 32-bit integer.
3. Reduce modulo `36^6` (~2.18 billion).
4. Convert to base-36, uppercase, left-pad with `'0'` to 6 characters.
5. Prepend `USER-`.

**Format:** `USER-XXXXXX` — prefix `USER`, hyphen, 6 characters over the **full** base-36 alphabet (`0-9A-Z`, all 36 symbols reachable — unlike the inquiry variant).

**Validation:** `isValidDisplayId` uses the regex `^USER-[A-Z0-9]{6}$`.

**Extraction:** `extractHash(displayId)` behaves differently from the inquiry version — it **throws** `Invalid display ID format: <value>` if the format check fails, rather than silently returning an empty/partial string.

**Example** (from the source code comment): `USER-A3K9F2`.

### 2.3 `normalizeIdentifier` — not a display-ID operation

`UserDisplayIdUtil.normalizeIdentifier(value)` is colocated in the same file but is unrelated to display-ID generation. It uppercases the input, strips every character that isn't `A-Z0-9`, and truncates to 50 characters. This is the NRC-number normalizer — it's what's applied to `nrcNumber` before every write and every lookup comparison (see §1).

Example: `normalizeIdentifier('rc-123 456')` → `'RC123456'`.

### 2.4 Side-by-side comparison

| | Inquiry (`DisplayIdUtil`) | User (`UserDisplayIdUtil`) |
|---|---|---|
| File | `backend/src/utils/display-id.util.ts` | `backend/src/utils/user-display-id.util.ts` |
| Prefix | `QID` | `USER` |
| Hash input | UUID with hyphens **stripped** | UUID **as-is** (hyphens kept) |
| Hash | SHA-256 hex digest, 5-bit-window bit-packing across the full digest | SHA-256 hex digest, first 8 hex chars only, parsed as int, mod `36^6` |
| Reachable charset | `A-Z0-9`, but effectively only indices 0–31 (`A-Z`, `0-5`) — `6789` unreachable | Full `0-9A-Z` (all 36 symbols) |
| Validation regex | `^QID-[A-Z0-9]{6}$` | `^USER-[A-Z0-9]{6}$` |
| `extractHash` on invalid input | Returns whatever's after the hyphen (or `''`), no throw | Throws `Invalid display ID format: ...` |
| DB column budget | `varchar(20)` | (see `DATABASE_SCHEMA.md` for the `users` table) |

The two algorithms are **not interchangeable and not cross-compatible** — running a user's UUID through `DisplayIdUtil` will not produce the same result as `UserDisplayIdUtil`, and vice versa. Always use the utility that matches the entity type.

### 2.5 What generates and persists these IDs

Both classes are pure static utilities — no instances, no DB access. Persistence and uniqueness enforcement happen in the calling services: `inquiries.service.ts`, `users.service.ts`, `auth.service.ts`, `team.service.ts`. The pattern in each case:

1. Save the entity once, to get the generated UUID back from the DB.
2. Compute `displayId = DisplayIdUtil.generateDisplayId(saved.id)` (or the user equivalent).
3. Write `displayId` back and save again.
4. Rely on a DB-level unique index/column for collision safety.

**Collisions are theoretically possible.** Both algorithms are lossy hash-truncations, not sequence-guaranteed-unique schemes, and nothing in either util class or any of the call sites retries on collision today. If collision-handling is ever added, it belongs in the calling service (e.g., regenerate with a suffix and retry the save), not in the static util classes.

---

## 3. Best practices (dual-column ID strategy)

These are the durable, still-applicable rules distilled from `ID_MANAGEMENT_BEST_PRACTICES.md` and the wider doc cluster — kept because they reflect what the code actually does, not aspirational/unbuilt proposals.

- **Never expose the Internal ID (`id`) in user-facing UI, URLs, or customer communication.** Always resolve to `displayId`. The UUID remains correct for internal FK relationships, service-to-service calls, and TypeORM operations — it was never meant to be read by a human.
- **Dual-column, not derive-on-the-fly.** `displayId` is a real, indexed, unique DB column — generated once at creation and persisted — not something recomputed on every read. This is what makes `findByDisplayId` a simple indexed query instead of a full-table hash-and-compare scan.
- **Support lookup by either ID at API boundaries that accept an "id"-shaped parameter**, where practical: an internal/API caller can pass the UUID, while a support agent or end user can paste the display ID. Both should resolve to the same row.
- **Determinism is scoped to one generation method at a time.** "Same UUID → same display ID" only holds when you call the *same* utility (`DisplayIdUtil` for inquiries, `UserDisplayIdUtil` for users) — it is not a claim that any two hashing schemes in this system agree with each other.
- **Non-sequential by design.** Neither format leaks creation order or total record volume, and neither is trivially enumerable — this was the reason a hash-derived approach was chosen over an auto-incrementing or sequential-per-type counter scheme.
- **Not a security boundary.** The one-way hash is an obfuscation/UX layer, not an authorization mechanism. Access control must still be enforced against the Internal ID (`id`) and normal auth/ownership checks — never infer permission from possession of a valid-looking `displayId`.
- **NRC normalization is mandatory at every write and lookup.** Always pass `nrcNumber` input through `UserDisplayIdUtil.normalizeIdentifier()` before comparing or storing it, so that formatting differences (dashes, spaces, casing) don't create duplicate-account gaps.
- **Indexing:** `displayId` and `nrcNumber` should both carry unique DB-level constraints/indexes (see `DATABASE_SCHEMA.md` for the live column definitions) — the unique index is the actual collision safety net today, since neither util class nor its callers retry on a generation collision.

---

## 4. Examples

| Input (Internal ID / UUID) | Entity type | Utility called | Output |
|---|---|---|---|
| `fce43de0-339c-4706-a2e2-c9d70260061e` | Inquiry | `DisplayIdUtil.generateDisplayId(...)` | `QID-8F2D3K` |
| *(any user UUID)* | User | `UserDisplayIdUtil.generateDisplayId(...)` | `USER-A3K9F2` |
| `'rc-123 456'` (raw NRC input) | — | `UserDisplayIdUtil.normalizeIdentifier(...)` | `'RC123456'` |

Both example outputs above are the literal examples given in the source code's own doc comments — reproduce them if you're writing a unit test fixture, since they're already the checked-in "known answer."

---

## 5. FAQ

**Q: Can I convert a `displayId` back into the original UUID?**
No. Both algorithms are one-way SHA-256 derivations that discard entropy (the inquiry algorithm keeps only 5 bits per output character; the user algorithm keeps only the first 8 hex characters of the digest, then reduces modulo `36^6`). There is no inverse function. The only way to resolve a `displayId` to a row is a DB lookup on the stored, indexed `displayId` column.

**Q: Why do inquiry display IDs never contain the digits 6, 7, 8, or 9?**
Because `hashToAlphanumeric` masks each 5-bit window with `& 31`, capping every selected index at 0–31. The 36-character charset's last four entries (`6789`, at indices 32–35) are never selected through this code path. This is a real, structural property of the current algorithm, not a display artifact.

**Q: Are `QID-` and `USER-` IDs generated the same way?**
No — see the side-by-side comparison in §2.4. They use different hash-to-string conversions and different charset reachability, and are not cross-compatible.

**Q: What happens if two records hash to the same `displayId`?**
Nothing automatic. Collisions are theoretically possible (both schemes are lossy truncations of a hash, not sequence-guaranteed-unique), and today neither the util classes nor the calling services (`inquiries.service.ts`, `users.service.ts`, `auth.service.ts`, `team.service.ts`) retry on collision. The DB-level unique constraint on `displayId` is the only safety net — a collision would surface as a save-time uniqueness violation, not a silent duplicate.

**Q: Is `nrcNumber` used to look someone up in normal UI flows?**
No — its purpose is fraud/duplicate-account prevention (one real person = one NRC = one account), checked during identity re-verification or duplicate-registration prevention. It is not a routing key and is not generally surfaced in casual UI copy the way `displayId` is.

**Q: I found a doc that mentions `DisplayIdGenerator`, a migration at `backend/src/database/migrations/AddDisplayIdToInquiries.ts`, or a class called `DisplayIdGenerator` in `utils/idGenerator.ts`. Do these exist?**
No. None of these exist in the codebase. See §6 for what's actually there.

---

## 6. Migration status (for the record)

There is a migration file at `server/db/migrations/1703000000000-AddDisplayIdToInquiries.ts` (class `AddDisplayIdToInquiries1703000000000`), but it is **orphaned/dead**: neither `backend/data-source.ts` (`migrations: ['src/database/migrations/*.ts']`) nor `backend/src/app.module.ts` (`migrations: [__dirname + '/database/migrations/**/*']`) point at `server/db/migrations/` — both reference `backend/src/database/migrations/`, a directory that does exist in the repo but is empty (contains no `.ts` migration files). This migration also uses a **third, different algorithm** from either util class — a raw-SQL MD5-substring backfill (`'QID-' || SUBSTR(MD5(id::text), 1, 6)`), not SHA-256 bit-packing — so even if it were wired up, IDs it backfilled would not match what `DisplayIdUtil.generateDisplayId()` computes for the same UUID today.

A sibling file, `server/db/migrations/1704000000000-CreateIdentitySystem.ts`, duplicates/supersedes it in intent (adds `nrcNumber`, `displayId`, `user_emails`, `identity_audits`) but lives in the same orphaned directory and is equally dead — it also independently backfills `displayId` via its own ad-hoc MD5-based SQL, not matching either util class.

**Net effect:** as of now, no migration file is live/wired for this backend. The runtime-authoritative source of truth for the current schema is the TypeORM entity decorators (e.g. `user.entity.ts`, the inquiry entity) plus whatever synchronize/seed process is actually in use — not either of the two migration files above. See `DATABASE_SCHEMA.md` for the entity-level column definitions that actually apply at runtime.

---

## Superseded documents

The following 8 documents are archived (moved under `archive/`) and replaced in full by this document. They contain drift documented and resolved above — do not treat them as current:

1. `DISPLAY_ID_EXAMPLES.md`
2. `DISPLAY_ID_IMPLEMENTATION.md`
3. `DISPLAY_ID_IMPLEMENTATION_COMPLETED.md`
4. `DISPLAY_ID_RECOMMENDATION.md`
5. `DISPLAY_ID_TECH_SPEC.md`
6. `DISPLAY_ID_VISUAL_GUIDE.md`
7. `ID_MANAGEMENT_BEST_PRACTICES.md`
8. `INDEX_ID_MANAGEMENT.md`