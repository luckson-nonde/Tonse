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

// Image manifest: every bundled image under dist/assets, so the service worker
// can warm its image cache in the background after activating — making images
// on never-yet-visited screens available offline (runtime caching alone only
// covers what the browser has already seen online). Small-first ordering so
// the most images land before the SW is ever killed mid-warm-up.
const IMG_RE = /\.(png|webp|jpe?g|gif|svg|avif)$/i;
const assets = readdirSync('dist/assets')
  .filter((f) => IMG_RE.test(f))
  .map((f) => ({ url: `/assets/${f}`, size: statSync(`dist/assets/${f}`).size }))
  .sort((a, b) => a.size - b.size)
  .map((a) => a.url);

writeFileSync('dist/image-manifest.json', JSON.stringify(assets) + '\n');
const totalKb = Math.round(
  readdirSync('dist/assets').filter((f) => IMG_RE.test(f))
    .reduce((s, f) => s + statSync(`dist/assets/${f}`).size, 0) / 1024
);
console.log(`write-version: dist/image-manifest.json → ${assets.length} images (${totalKb} KB total)`);
