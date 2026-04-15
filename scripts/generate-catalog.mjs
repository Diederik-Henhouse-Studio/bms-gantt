#!/usr/bin/env node
// Regenerate the "Catalog" table in docs/features/README.md from each
// feature folder's feature.md frontmatter. Keeps the index honest: no
// drift between "folder exists" and "folder listed".
//
// Usage:
//   node scripts/generate-catalog.mjs           # write
//   node scripts/generate-catalog.mjs --check   # verify, exit 1 if stale

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const FEATURES = resolve(ROOT, 'docs/features');
const README = join(FEATURES, 'README.md');

const STATUS_SYMBOL = { stable: '🟢', experimental: '🟡', deprecated: '🔴' };

function parseFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim();
  }
  return out;
}

const folders = readdirSync(FEATURES)
  .filter((name) => {
    if (name === 'README.md' || name.startsWith('_')) return false;
    return statSync(join(FEATURES, name)).isDirectory();
  })
  .sort();

const rows = [];
for (const slug of folders) {
  const featMd = join(FEATURES, slug, 'feature.md');
  try {
    const fm = parseFrontmatter(readFileSync(featMd, 'utf8'));
    rows.push({
      slug,
      status: fm.status ?? 'experimental',
      since: fm.since ?? '—',
      category: fm.category ?? '—',
    });
  } catch {
    rows.push({ slug, status: 'experimental', since: '—', category: '—' });
  }
}

const header = '| Feature | Status | Since | Category |\n|---------|--------|-------|----------|';
const body = rows
  .map(
    (r) =>
      `| [${r.slug}](./${r.slug}) | ${STATUS_SYMBOL[r.status] ?? '🟡'} | ${r.since} | ${r.category} |`,
  )
  .join('\n');
const table = `${header}\n${body}`;

const START = '<!-- catalog:start -->';
const END = '<!-- catalog:end -->';

const readme = readFileSync(README, 'utf8');

let next;
if (readme.includes(START) && readme.includes(END)) {
  next = readme.replace(
    new RegExp(`${START}[\\s\\S]*?${END}`),
    `${START}\n${table}\n${END}`,
  );
} else {
  // Bootstrap: replace the existing "## Catalog" section up to the next H2.
  next = readme.replace(
    /(## Catalog\n\n)([\s\S]*?)(\n## )/,
    `$1${START}\n${table}\n${END}$3`,
  );
}

const check = process.argv.includes('--check');
if (check) {
  if (next !== readme) {
    console.error('✗ docs/features/README.md catalog is stale. Run `npm run docs:catalog`.');
    process.exit(1);
  }
  console.log('✓ catalog is up to date.');
} else {
  if (next !== readme) {
    writeFileSync(README, next);
    console.log(`✓ wrote catalog (${rows.length} features).`);
  } else {
    console.log('✓ catalog already up to date.');
  }
}
