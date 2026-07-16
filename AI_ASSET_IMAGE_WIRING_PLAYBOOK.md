# AI Playbook — Wiring & Verifying Per-Entity Images (glob-resolved assets)

> A reusable skill for an AI agent asked to "make these images show up for each
> item." Covers diagnosing a filename→entity resolver, fixing mismatches without
> destroying user files, and **adversarially verifying** every image actually
> depicts the right thing. Generalized, with a worked example from this repo
> (the onboarding *Choose Specialty* preview images).

## When to use this

Trigger phrases: *"I added images for each subcategory/product/item, wire them
up"*, *"the images aren't showing"*, *"each X has an image named after it."*
More generally: any time a set of asset files must resolve to a set of catalog
entities by name, and some don't line up.

## TL;DR checklist

1. **Find the resolver** — how does a filename become an entity key, and what is
   the lookup key on the query side? They must match.
2. **Get ground truth** — the authoritative entity list (ids + display names) and
   the actual files on disk.
3. **Classify every pairing** — resolves / broken-by-normalization /
   broken-by-semantic-name / missing / duplicate.
4. **Fix at the right layer** — harden normalization for *systematic* issues
   (punctuation, case, copy-suffixes); rename files only for *true semantic*
   mismatches; make collisions deterministic; **don't delete files you didn't
   create** — surface them.
5. **Verify in three layers** — static resolver simulation, live render count,
   and an adversarial multi-agent audit that *views each image* + a regression
   check.
6. **Report the gaps** — missing assets, weak/ambiguous images, leftover dupes.

---

## Step 1 — Map the resolver mechanism

Never guess. Read the code that turns a filename into a lookup key **and** the
call site that builds the query key. The bug is almost always that these two use
different string transforms, or that the query key comes from an **id** while the
file is named for a **display name**.

Questions to answer:
- Where are files loaded? (e.g. a bundler glob like Vite `import.meta.glob`.)
- How is each filename normalized into a key?
- On the query side, what is the `stem`/key derived from — the entity **id** or
  its **display name**? (These differ: `mc-hosts` id vs "MCs & Hosts" name.)
- Is there a state/variant suffix convention (e.g. `-sell/-repair/-both`)?

## Step 2 — Enumerate ground truth

- The **entities**: read the catalog/registry source, list `{ id, displayName }`
  for every entity in scope. Do not trust a partial grep — read the section.
- The **files**: `ls` the asset dir. Note copy-suffixes (`" (1)"`, `" (2)"`),
  odd variants (`Name1.webp`), and extensions.
- **Hash the files** (`sha1sum`) to tell byte-identical copies from *distinct*
  alternates that merely share a name — they need different handling.

## Step 3 — Classify every pairing

For each entity, compute its expected key and check the file set. Bucket each:

| Bucket | Meaning | Fix |
|--------|---------|-----|
| ✅ resolves | file key == entity key | none |
| ⚙️ normalization gap | differ only by case/`&`/`()`/`_`/space/copy-suffix | **harden normalization** |
| ✏️ semantic gap | name means the same but differs in words (Hire↔Rental, plural, extra noun) | **rename file → id stem** |
| 🕳️ missing | no file at all | **surface**; keep graceful fallback |
| 👥 duplicate/alt | 2+ files → same key | **make canonical win deterministically** |

## Step 4 — Fix at the right layer (decision tree)

- **Systematic string differences** (`&`, `()`, `/`, `_`, casing, `" (n)"` copy
  suffixes) → **harden the normalization**, don't rename N files. One change
  fixes the whole class and every future drop. Make it a *superset*: it must map
  existing keys to the same value (verify no regression).
- **True semantic mismatch** (id and name differ in *words*) → **rename the file**
  to the id stem. This keeps the "drop a correctly-named file and it lights up"
  contract intact and discoverable, versus hiding an alias in code.
- **Collisions** (several files → one key) → make the **canonical (non-copy)**
  file win *deterministically*, independent of glob/iteration order, so a stray
  duplicate can never shadow the real asset. (Prefer the non-`" (n)"` filename.)
- **Files you didn't create** → **do not delete.** Duplicates/orphans that are
  now inert should be *surfaced* to the user with a recommendation, not removed.
- **A "wrong" image may fill another gap.** If an image is mislabeled, check
  whether it correctly depicts a *different* entity that is currently missing —
  reassign instead of discarding. (Here a server-room shot mis-titled "Software &
  Web Development" was reassigned to fill the empty `networking-security`.)

## Step 5 — Verify in three layers

**Layer 1 — static resolver simulation (deterministic ground truth).** Mirror the
exact normalization **and the collision tiebreak** in a tiny script, build the
key map from the real files, and assert every entity id resolves. Report missing
+ collisions + orphans. This proves resolution without a running app. Mirroring
only the normalization is not enough: if the real build loop has a tiebreak and
your simulation is plain last-wins, the two can disagree about which file wins a
contested key and your verdict is worthless for exactly the duplicate cases you
care about.

```js
// resolve-check.mjs — mirror normalizeSpecialtyKey AND the build-loop tiebreak EXACTLY
import { readdirSync } from 'fs';
const norm = (f) => f.replace(/\.(png|jpe?g|webp)$/i,'').toLowerCase()
  .replace(/\s*\(\d+\)\s*$/,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
// canonical (non-copy-suffixed) wins ties — mirrors isCopySuffixed() in the real loop
const isCopy = (f) => /\s\(\d+\)\.\w+$/i.test(f);
const files = readdirSync(DIR).filter(f=>/\.(png|jpe?g|webp)$/i.test(f)).sort();
const byKey = {};
for (const f of files) {
  const k = norm(f), prior = byKey[k];
  if (prior && isCopy(f) && !isCopy(prior)) continue;
  byKey[k] = f;
}
for (const id of ALL_ENTITY_IDS) console.log(byKey[id] ? `OK ${id}` : `MISS ${id}`);
```

**Layer 2 — live render count.** Drive the real UI (headless browser) to the
screen and count rendered asset nodes per group; compare to expected. Confirms
the wiring works end-to-end and flags console errors.

```js
// count preview <img> whose dev URL points at the asset dir
const n = await page.locator('img[src*="specialty"]').count();
```

**Layer 3 — adversarial semantic audit (multi-agent).** Static + render counts
prove a file *resolves*, not that it depicts the *right thing*. Fan out agents
that **open each image file** (the Read tool renders images) and judge the
pairing, plus one agent that checks for **regressions** to pre-existing assets
and enumerates consumers. This is the step that catches a plausible-but-wrong
image. See the template below.

---

## Reusable Workflow template — adversarial image↔entity audit

Deterministic orchestration (one agent per group + a regression agent, run
concurrently, then synthesize). Agents return **structured** verdicts.

```js
export const meta = {
  name: 'audit-entity-images',
  description: 'Verify each image depicts its entity + check for regressions',
  phases: [{ title: 'Audit' }, { title: 'Synthesize' }],
}
const VERDICT = { type:'object', properties:{
  findings:{ type:'array', items:{ type:'object', properties:{
    id:{type:'string'}, file:{type:'string'},
    verdict:{type:'string', enum:['match','weak','mismatch','unreadable']},
    note:{type:'string'} }, required:['id','file','verdict','note'] } } },
  required:['findings'] }
// NB: deliberately has NO `findings` key, so the shape-based flatMap below can
// never mix regression output into the audit findings.
const REG_SCHEMA = { type:'object', properties:{
  brokenStems:{ type:'array', items:{type:'string'} },
  regressionRisk:{ type:'string', enum:['none','low','high'] },
  consumers:{ type:'array', items:{type:'string'} } },
  required:['brokenStems','regressionRisk'] }

phase('Audit')
const results = await parallel([
  ...GROUPS.map((g) => () => agent(
    `Adversarially audit whether each preview image depicts its entity for "${g.name}". ` +
    `Use the Read tool to VIEW each absolute file path, then judge match/weak/mismatch/unreadable. ` +
    `Be skeptical — only "match" if a user would recognize it.\n` +
    g.pairs.map(([id,name,file]) => `- ${id} ("${name}") -> ${DIR}/${file}`).join('\n'),
    { label:`audit:${g.name}`, phase:'Audit', schema:VERDICT, model:'sonnet' })),
  () => agent(`Regression check: confirm the normalization change maps all
    PRE-EXISTING asset filenames to the SAME keys as before, and list consumers
    of the resolver. Report brokenStems + regressionRisk.`,
    { label:'regression', phase:'Audit', schema:REG_SCHEMA, model:'sonnet' }),
])

phase('Synthesize')
// parallel() preserves input order → the regression result is last. Split it
// off positionally rather than relying on result shape.
const regression = results.at(-1)
const audits = results.slice(0, -1).filter(Boolean)
if (!regression) log('regression agent returned null — BLOCKER, re-run it before trusting this audit')
const all = audits.flatMap(a => a.findings || [])
return { mismatches: all.filter(f=>f.verdict==='mismatch'),
         weak: all.filter(f=>f.verdict==='weak'), regression }
```

Act on the result: fix every `mismatch` (reassign or replace), note every `weak`
for optional improvement, and treat a non-`none` `regressionRisk` — or a null
regression result — as a blocker.

---

## Principles & gotchas

- **id vs display name** is the #1 cause. The query key usually comes from a
  stable **id**; files usually get named for the **display name**. Bridge with
  lenient normalization + rename only the true-semantic exceptions.
- **Normalization changes must be supersets.** Prove old keys are unchanged
  before shipping (Layer-1 check over the existing set) or you regress other
  categories.
- **Determinism over luck.** "The canonical file happens to sort first" is not a
  guarantee. Encode the tiebreak.
- **Don't delete what you didn't create.** Inert dupes/orphans → surface, don't
  remove. Renames are reversible; deletes aren't.
- **Resolves ≠ correct.** Only a *visual* check (agents reading the files, or you
  reading screenshots) verifies the picture matches the label.
- **Reassign, don't discard.** A wrong image is often the right image for a
  different, missing entity.
- **Graceful fallback is a feature.** An entity with no asset should degrade to an
  icon/placeholder, never a broken image — so a missing file is a backlog item,
  not a bug.

---

## Worked example (this repo)

Task: the user dropped ~25 per-subcategory images into
`src/assets/images/specialty/` for the onboarding *Choose Specialty* step; most
didn't show.

- **Mechanism** ([`categoryMeta.ts`](src/components/buyer/categoryMeta.ts)):
  images are glob-loaded and keyed by a normalized filename; the specialty card
  ([`CategorySelection.tsx`](src/components/CategorySelection.tsx)) builds the
  lookup `stem` from the subcategory **id** (from
  [`catalog.ts`](src/services/categories/catalog.ts)), not the display name.
- **Classification** across 23 service subcategories: 15 already resolved; 3 broke
  on `&` (`software-web-development`, `it-support-maintenance`,
  `satellite-vsat-installation`); 3 semantic (`mc-hosts`←"MCs & Hosts",
  `spoken-word`←"Spoken Word Artists", `event-equipment-rental`←"Event Equipment
  Hire"); 2 missing (`event-venues`, `networking-security`); plus copy/alt
  duplicates (after the fixes, 6 remain inert on disk: 5 browser `" (n)"` copies
  + 1 `…Development1.webp` alternate — surfaced, not deleted).
- **Fixes:** hardened `normalizeSpecialtyKey` (strip `&`/punctuation/`" (n)"`;
  collapse to single `-`; canonical wins collisions) → fixed all `&` cases with no
  rename; renamed the 3 semantic files to their id stems; left dupes in place
  (now inert) and surfaced them.
- **Adversarial audit** (6 agents reading every image) caught 1 real mismatch:
  the winning "Software & Web Development.webp" was actually a **server room** —
  reassigned to fill the missing `networking-security`, and a genuine dev-team
  image took `software-web-development`. No regressions to electronics/automotive.
- **Result:** 22/23 resolve with verified-correct pairings; only `event-venues`
  still needs art (graceful icon-chip fallback). See the folder
  [`README`](src/assets/images/specialty/README.md) for the naming convention.
