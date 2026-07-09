---
name: asset-image-wiring
description: >-
  Use when wiring a batch of per-entity image assets (per-subcategory /
  per-product / per-item preview images) into a glob-based filename→id resolver,
  when dropped images "aren't showing" or show the wrong picture, or when
  verifying that each image actually depicts its catalog entity. Diagnoses
  filename↔id mismatches, hardens the normalization, and adversarially verifies
  every pairing before declaring done. In this repo it applies to the onboarding
  Choose-Specialty images in src/assets/images/specialty/.
---

# Wiring & verifying per-entity image assets

Assets in this project resolve to catalog entities by a **normalized filename →
entity id** lookup (glob-loaded, no per-file imports). The recurring bug: files
are named for the **display name** but the lookup key is the **catalog id**, so
punctuation/casing/semantic-name differences silently fail. Follow this before
claiming images are wired.

## Repo specifics (start here)

- Resolver + normalization: `src/components/buyer/categoryMeta.ts`
  (`normalizeSpecialtyKey`, `getSpecialtyImage`, `getSpecialtyPreview`).
- Query-side `stem` (the id): `src/components/CategorySelection.tsx` — derived from
  the subcategory **id**, not its name.
- Catalog (authoritative ids + display names): `src/services/categories/catalog.ts`.
- Asset folder + naming convention: `src/assets/images/specialty/README.md`.
- Electronics buy/repair items use `<stem>-<sell|repair|both>.webp`. Automotive
  and service items — no Buy/Repair split — use a single bare `<stem>.webp`
  (`vehicles.webp`, `car-parts-new.webp`, `Event Catering.webp` → `event-catering`).
  `getSpecialtyImage` falls back `<stem>` → `<stem>-sell`, which is how the
  buy-only `gaming-sell.webp` serves its single-variant card.
  Missing image ⇒ graceful icon-chip fallback (not a bug).

## Procedure

1. **Map the mechanism** — read the normalization AND the call site that builds the
   query key. Confirm whether the key comes from the id or the display name.
2. **Ground truth** — read `catalog.ts` for every `{id, name}` in scope; `ls` the
   asset dir; `sha1sum` to separate byte-identical copies from distinct alternates.
3. **Classify each pairing**: ✅ resolves · ⚙️ normalization gap (case/`&`/`()`/`_`/
   space/`" (n)"`) · ✏️ semantic gap (Hire↔Rental, plural, extra noun) · 🕳️ missing ·
   👥 duplicate/collision.
4. **Fix at the right layer**:
   - ⚙️ → **harden `normalizeSpecialtyKey`** (must stay a strict superset of the
     existing keys — verify electronics/automotive stems are unchanged).
   - ✏️ → **rename the file to the id stem** (keeps the "drop-and-it-lights-up"
     contract; don't hide aliases in code).
   - 👥 → make the **canonical (non-`" (n)"`) file win deterministically**, not by
     glob-sort luck.
   - 🕳️ → **surface** to the user; keep the fallback.
   - **Never delete files you didn't create.** A mislabelled image often correctly
     depicts a *different* missing entity — **reassign, don't discard**.
5. **Verify in three layers** (all three — a file that *resolves* may still be the
   *wrong picture*):
   - **Static**: mirror the normalization AND the collision tiebreak in a node
     script, build keys from the real files, assert every id resolves; report
     missing/collisions/orphans. (Mirroring only the normalization is not
     enough — a different collision winner is a false verdict.)
   - **Live**: drive the UI headless, count `img[src*="specialty"]` per group vs
     expected, check console errors.
   - **Adversarial**: fan out agents that **Read (view) each image file** and judge
     match/weak/mismatch, plus a regression agent — see the Workflow template in the
     playbook.

## Full playbook

Rationale, the runnable Workflow template, and the worked example (how the
specialty images were fixed: 22/23 resolved, a server-room image reassigned from
`software-web-development` to fill `networking-security`) live in
[`AI_ASSET_IMAGE_WIRING_PLAYBOOK.md`](../../../AI_ASSET_IMAGE_WIRING_PLAYBOOK.md)
at the repo root.
