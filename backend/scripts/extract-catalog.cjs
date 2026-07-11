/**
 * One-shot extractor: pulls the BASE_CATEGORIES_DB array out of
 * `src/services/categories/catalog.ts` — plus the labour trades and
 * machinery-hire equipment out of `src/services/labourCategories.ts` —
 * and writes a stripped JSON catalog (id, name, parentId, baseName, type)
 * the backend seeder consumes.
 *
 * Labour/machinery ids MUST be in this catalog: the profile↔category and
 * inquiry↔category junction tables FK into `categories`, so a provider
 * registering with trade/equipment ids (or a buyer inquiry tagged with
 * them) would otherwise FK-fail and roll back. They're emitted under two
 * synthetic roots — `labour` and `machinery-hire` — which the seeder maps
 * to the LABOUR and RENTAL archetypes respectively.
 *
 * Run from the repo root:
 *   node backend/scripts/extract-catalog.cjs
 *
 * Re-run any time CATEGORIES_DB or LABOUR_CATEGORIES changes in the
 * frontend. The output lands at backend/src/modules/categories/catalog.json.
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const src = fs.readFileSync(
  path.join(repoRoot, 'src', 'services', 'categories', 'catalog.ts'),
  'utf8'
);

const start = src.indexOf('const BASE_CATEGORIES_DB:');
if (start === -1) throw new Error('BASE_CATEGORIES_DB not found');
const end = src.indexOf('\n];', start);
if (end === -1) throw new Error('end of catalog block not found');
const block = src.slice(start, end + 2);

// Walk the block one object at a time. Each entry is `{ id: '…', name: '…',
// …optional fields…, parentId: null | '…' }`. We brace-balance to handle
// nested formSchema arrays without trying to parse them.
const entries = [];
let i = 0;
while (i < block.length) {
  // Find the next top-level `{`.
  const open = block.indexOf('{', i);
  if (open === -1) break;
  let depth = 1;
  let j = open + 1;
  while (j < block.length && depth > 0) {
    const ch = block[j];
    if (ch === '"' || ch === "'") {
      // Skip string literal (handles escapes).
      const quote = ch;
      j++;
      while (j < block.length && block[j] !== quote) {
        if (block[j] === '\\') j++;
        j++;
      }
      j++;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    j++;
  }
  if (depth !== 0) break;
  const obj = block.slice(open, j);
  i = j;

  const idMatch = obj.match(/\bid:\s*'([^']+)'/);
  const nameMatch = obj.match(/\bname:\s*('([^'\\]|\\.)*'|"([^"\\]|\\.)*")/);
  const baseNameMatch = obj.match(/\bbaseName:\s*('([^'\\]|\\.)*'|"([^"\\]|\\.)*")/);
  const typeMatch = obj.match(/\btype:\s*'([^']+)'/);
  const parentIdMatch = obj.match(/\bparentId:\s*(null|'([^']+)')/);

  if (!idMatch || !nameMatch || !parentIdMatch) continue;

  const unquote = (raw) =>
    raw.slice(1, -1).replace(/\\(['"\\])/g, '$1');

  entries.push({
    id: idMatch[1],
    name: unquote(nameMatch[1]),
    parentId: parentIdMatch[1] === 'null' ? null : parentIdMatch[2],
    baseName: baseNameMatch ? unquote(baseNameMatch[1]) : null,
    type: typeMatch ? typeMatch[1] : null,
  });
}

// ── Labour trades + machinery-hire equipment ───────────────────────────
// LABOUR_CATEGORIES entries are one-per-line objects:
//   { id: 'general_labourer', label: 'General Labourer', category: 'CONSTRUCTION', … }
// Items with category MACHINERY_HIRE belong to the equipment-hire provider
// type; everything else is a labour trade. Roots are emitted FIRST so the
// seeder's parentId FK resolves at insert time.
const labourSrc = fs.readFileSync(
  path.join(repoRoot, 'src', 'services', 'labourCategories.ts'),
  'utf8'
);
const labourBlockStart = labourSrc.indexOf('export const LABOUR_CATEGORIES');
const labourBlockEnd = labourSrc.indexOf('\n];', labourBlockStart);
if (labourBlockStart === -1 || labourBlockEnd === -1)
  throw new Error('LABOUR_CATEGORIES block not found');
const labourBlock = labourSrc.slice(labourBlockStart, labourBlockEnd);

entries.push(
  { id: 'labour', name: 'Labour & Skills', parentId: null, baseName: null, type: null },
  { id: 'machinery-hire', name: 'Heavy Machinery for Hire', parentId: null, baseName: null, type: null },
);

const labourEntryRe =
  /\{\s*id:\s*'([^']+)',\s*label:\s*'([^']+)',\s*category:\s*'([^']+)'/g;
let m;
let labourCount = 0;
let machineryCount = 0;
while ((m = labourEntryRe.exec(labourBlock)) !== null) {
  const [, id, label, group] = m;
  const isMachinery = group === 'MACHINERY_HIRE';
  entries.push({
    id,
    name: label,
    parentId: isMachinery ? 'machinery-hire' : 'labour',
    baseName: null,
    type: null,
  });
  if (isMachinery) machineryCount++;
  else labourCount++;
}
if (labourCount === 0 || machineryCount === 0)
  throw new Error(
    `labourCategories extraction looks wrong: ${labourCount} trades, ${machineryCount} machinery items`
  );

const outDir = path.join(repoRoot, 'backend', 'src', 'modules', 'categories');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'catalog.json');
fs.writeFileSync(outFile, JSON.stringify(entries, null, 2) + '\n');
console.log(
  `Extracted ${entries.length} entries (${labourCount} labour trades, ${machineryCount} machinery items) → ${path.relative(repoRoot, outFile)}`
);
