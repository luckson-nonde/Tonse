---
name: android-gpu-ghosting
description: >-
  Use when a screen shows "wavy lines", smeared bands, black/blank boxes where
  white cards should be, doubled or echoed text on a REAL Android phone —
  especially when taps feel dead / buttons stay disabled — but the same screen
  renders perfectly on desktop, in emulators, and often in other browsers
  (Phoenix etc.) on the same phone. Confirmed culprit in this repo (Jul 2026):
  TRANSLUCENT BORDER STROKES on rounded cards (Tailwind `border-…/NN` →
  color-mix) mis-rasterized by Chrome 149 + Mali GPUs — fix with opaque border
  colors. Also covers forced dark mode and compositor ghosting, plus the
  on-device bisect method that isolates any future variant.
---

# Android real-device rendering corruption — diagnosis & fix doctrine

## The confirmed case (read this first)

**Symptom (Jul 2026, Choose-Specialty screens):** wavy smeared bands,
overlapping/echoed text, card surfaces missing or black; taps "dead" so gated
buttons never enable. TECNO SPARK 20 (Helio G85 / Mali-G52, HiOS 13),
Chrome 149. Clean in every emulation, clean in Phoenix browser on the same
phone, clean on desktop.

**Root cause (proven by on-device CSS bisect):** semi-transparent border
strokes on rounded elements — Tailwind utilities like `border-[#C9973A]/30`,
which compile to `color-mix()`/alpha border colors — mis-rasterize under
Chrome 149 on this Mali driver. Every historically clean surface used solid
border colors at rest; every corrupting card/chip wore a translucent gold
border. Radius, shadows, gradients, animations, images, fonts, stickies,
compositor nudges: all exonerated by bisect.

**Fix:** replace translucent border colors with their opaque blended
equivalents (visually identical). In `CategorySelection.tsx` the mapping is
documented inline: `/20→#F4EAD8 /30→#EFE0C4 /40→#E9D5B0 /45→#E7D0A6
/50→#E4CB9D /60→#DFC189` (gold over the white card surface). **Do not
reintroduce `border-…/NN` opacities on card/chip surfaces.** Translucent
BACKGROUNDS (`bg-…/10`) and translucent TEXT colors are fine — only border
strokes triggered it.

## The isolation method (works for any future variant)

1. **Fingerprint delivery first** — `curl <url>/src/components/<File>.tsx |
   grep <new-code-marker>` (Vite serves sources in dev). "Nothing changed" is
   often stale delivery, not a failed fix.
2. **Freeze the screen** into a static JS-free snapshot: capture
   `document.styleSheets` cssText + the target element's `outerHTML` from the
   live app with Playwright, strip `<script>` tags, write to
   `public/<name>.html` (served at the root, tunnel-reachable). Still corrupt
   ⇒ pure CSS/rasterization; clean ⇒ runtime-driven.
3. **Bisect on the device in ONE round-trip:** repeat the same captured markup
   in labeled sections (A, B, C…), each with a scoped override neutralizing
   one property class (`.v-noshadow * { box-shadow: none !important }`,
   radius, gradients, `border-color: <solid> !important`, translateZ, …). Add
   a huge versioned banner so stale pages can't be confused with the current
   test. The clean/broken letters name the culprit.
   **Old bisect pages are frozen** — regenerate after every fix or users will
   keep reporting the old snapshot.
4. Reproduce force-dark locally when relevant: Chromium
   `--enable-features=WebContentsForceDark`.
5. Playwright is available from the npx cache
   (`~/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright`)
   with `executablePath` pointed at
   `~/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe`.

## Secondary hazards (defenses already shipped, keep them)

- **Forced dark mode** (Chrome Auto-Dark / HiOS "darken websites"): the app
  declares `<meta name="color-scheme" content="only light">` +
  `:root { color-scheme: only light }`. If a real dark theme ever ships,
  replace with proper `light dark` support — never leave it to the
  auto-darkener. Tecno/Infinix/itel dominate this market; treat OEM quirks as
  first-class.
- **GPU compositor ghosting** (stale raster tiles under animated transforms):
  no transform/translate animation on touch (`useLiteMotion`, `lg:`-gated
  Tailwind lifts — v4 emits the standalone `translate` property, check THAT in
  computed styles); sticky strips stay fully opaque (no backdrop-blur);
  `nudgeRepaint` (`src/utils/forceRepaint.ts`) re-fires when async content
  LANDS (loading flag in effect deps + settle timeout), not just on
  view-state change. Note React 18 batching: state set after an `await`
  batches into ONE paint — don't assume a spinner frame exists.
- Each wizard step resets scroll before paint
  (`useLayoutEffect(() => window.scrollTo(0, 0), [viewState])` in
  `CategorySelection.tsx`) — avoids mid-scroll content swaps and is better UX.
