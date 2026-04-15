#!/usr/bin/env node
// Lint every docs/features/<slug>/scenarios.yaml:
//  - each scenario has id + purpose + when.kind
//  - `when.kind` is one of the known values
//  - each probe entry starts with a known prefix
//
// No YAML parser: we extract the relevant values with line-scoped regexes.
// Good enough for the block style we use; new keys force a visible change
// to this script.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const FEATURES = resolve(ROOT, 'docs/features');

const KNOWN_WHEN_KINDS = new Set([
  'render',
  'drag-simulate',
  'unit-call',
  'handle-method',
  'hover',
  'keydown',
  'sequence',
]);

const KNOWN_PROBE_PREFIXES = [
  'dom.attribute',
  'dom.count',
  'dom.text',
  'handle.snapshot',
  'handle.validate',
  'console.warnings',
  'return',
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (entry === 'scenarios.yaml') out.push(full);
  }
  return out;
}

function lint(path) {
  const errors = [];
  const src = readFileSync(path, 'utf8');
  const rel = relative(ROOT, path);

  // Each scenario starts with "- id: ...". Collect their line numbers.
  const lines = src.split('\n');
  const scenarioStarts = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^-\s+id:\s*\S+/.test(lines[i])) scenarioStarts.push(i);
  }
  scenarioStarts.push(lines.length);

  for (let s = 0; s < scenarioStarts.length - 1; s++) {
    const from = scenarioStarts[s];
    const to = scenarioStarts[s + 1];
    const body = lines.slice(from, to).join('\n');
    const idMatch = body.match(/^-\s+id:\s*(\S+)/);
    const id = idMatch?.[1] ?? `#${s}`;

    if (!/^\s*purpose:\s*/m.test(body)) {
      errors.push(`${rel}: scenario "${id}" is missing purpose.`);
    }

    const kindMatch = body.match(/^\s*kind:\s*([\w-]+)/m);
    if (!kindMatch) {
      errors.push(`${rel}: scenario "${id}" is missing when.kind.`);
    } else if (!KNOWN_WHEN_KINDS.has(kindMatch[1])) {
      errors.push(
        `${rel}: scenario "${id}" uses unknown when.kind "${kindMatch[1]}". ` +
        `Known: ${[...KNOWN_WHEN_KINDS].join(', ')}.`,
      );
    }

    // Validate each probe: line like `- probe: <identifier>`
    for (const m of body.matchAll(/-\s+probe:\s*([\w.-]+)/g)) {
      const probe = m[1];
      if (!KNOWN_PROBE_PREFIXES.some((p) => probe === p || probe.startsWith(p + '.') || probe.startsWith(p + '['))) {
        errors.push(
          `${rel}: scenario "${id}" uses unknown probe "${probe}". ` +
          `Known prefixes: ${KNOWN_PROBE_PREFIXES.join(', ')}.`,
        );
      }
    }
  }

  return errors;
}

const files = walk(FEATURES).filter((f) => !f.includes('/_template/'));
const errors = files.flatMap(lint);

if (errors.length === 0) {
  console.log(`✓ all scenarios pass lint (${files.length} files).`);
  process.exit(0);
}
console.error('✗ scenario lint errors:');
for (const e of errors) console.error('  ' + e);
process.exit(1);
