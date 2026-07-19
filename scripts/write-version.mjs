/**
 * Stamps dist/version.json after every build so "what is deployed?" is a
 * one-request question: curl https://<site>/version.json
 *
 * Born from a burned test cycle: the Render static site silently stopped
 * deploying and production QA ran against a stale bundle with no way to tell.
 * Render injects RENDER_GIT_COMMIT during builds; local builds stamp "local".
 */
import { writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';

if (!existsSync('dist')) {
  console.error('write-version: dist/ not found — run after vite build');
  process.exit(1);
}

const version = {
  commit: process.env.RENDER_GIT_COMMIT || 'local',
  builtAt: new Date().toISOString(),
};

writeFileSync('dist/version.json', JSON.stringify(version, null, 2) + '\n');
console.log(`write-version: dist/version.json → ${version.commit} @ ${version.builtAt}`);

// Asset manifest: everything under dist/assets the service worker should warm
// after activating, split into two lists it caches separately:
//   shell  — the hashed JS/CSS bundles (SHELL_CACHE). Warming these is what
//            lets the app itself boot offline even if the user never loaded
//            them in this build (fresh deploy, closed tab mid-first-visit).
//   images — every bundled image (IMG_CACHE), small-first so the most images
//            land before the SW is ever killed mid-warm-up.
// Runtime caching alone only covers what the browser has already seen online.
const IMG_RE = /\.(png|webp|jpe?g|gif|svg|avif)$/i;
const SHELL_RE = /\.(js|css)$/i;
const files = readdirSync('dist/assets');

const shell = files
  .filter((f) => SHELL_RE.test(f) && !f.endsWith('.map'))
  // CSS before JS (styling loss is the most visible failure), then by name.
  .sort(
    (a, b) =>
      (a.endsWith('.css') ? 0 : 1) - (b.endsWith('.css') ? 0 : 1) ||
      a.localeCompare(b)
  )
  .map((f) => `/assets/${f}`);

const images = files
  .filter((f) => IMG_RE.test(f))
  .map((f) => ({ url: `/assets/${f}`, size: statSync(`dist/assets/${f}`).size }))
  .sort((a, b) => a.size - b.size)
  .map((a) => a.url);

writeFileSync('dist/asset-manifest.json', JSON.stringify({ shell, images }) + '\n');

const kb = (list) =>
  Math.round(
    list.reduce((s, url) => s + statSync(`dist${url}`).size, 0) / 1024
  );
console.log(
  `write-version: dist/asset-manifest.json → ${shell.length} shell files (${kb(shell)} KB), ${images.length} images (${kb(images)} KB)`
);
