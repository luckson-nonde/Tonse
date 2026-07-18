/**
 * Stamps dist/version.json after every build so "what is deployed?" is a
 * one-request question: curl https://<site>/version.json
 *
 * Born from a burned test cycle: the Render static site silently stopped
 * deploying and production QA ran against a stale bundle with no way to tell.
 * Render injects RENDER_GIT_COMMIT during builds; local builds stamp "local".
 */
import { writeFileSync, existsSync } from 'node:fs';

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
