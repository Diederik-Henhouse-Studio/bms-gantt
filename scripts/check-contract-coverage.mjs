#!/usr/bin/env node
// Fail CI when a public export has no matching entry in any
// docs/features/<slug>/contract.yaml.
//
// Minimal: no YAML parser needed — we extract names with a single regex.
// Public exports are read from the authoritative entry files via the
// TypeScript compiler API (type-safe against renames).

import ts from 'typescript';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const ENTRY_FILES = [
  'src/index.ts',
  'src/store/index.ts',
  'src/query.ts',
  'src/analysis.ts',
];

// ── 1. Collect public export names via TS compiler API ─────────

function collectExports(files) {
  const program = ts.createProgram(
    files.map((f) => resolve(ROOT, f)),
    {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      strict: true,
      noEmit: true,
      skipLibCheck: true,
    },
  );
  const checker = program.getTypeChecker();
  const names = new Set();

  for (const file of files) {
    const sf = program.getSourceFile(resolve(ROOT, file));
    if (!sf) continue;
    const symbol = checker.getSymbolAtLocation(sf);
    if (!symbol) continue;
    const exports = checker.getExportsOfModule(symbol);
    for (const exp of exports) {
      names.add(exp.name);
    }
  }
  return names;
}

// ── 2. Collect documented names from all contract.yaml files ──

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (entry === 'contract.yaml') out.push(full);
  }
  return out;
}

// Match `name: Foo` appearing at line start (block style) OR
// after `{` / `,` (inline flow style).
const NAME_LINE = /(?:^|[,{]|\s-\s)\s*name:\s*([A-Za-z_][\w-]*)/gm;

function collectDocumented(yamlFiles) {
  const names = new Set();
  for (const f of yamlFiles) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(NAME_LINE)) {
      names.add(m[1]);
    }
  }
  return names;
}

// ── 3. Compare & report ───────────────────────────────────────

// Exports we intentionally do not require in the catalog.
// Every waiver carries a justification; review this list whenever the
// public surface changes.
const WAIVERS = new Set([
  'default',

  // ── Example preset (Moonbase) — lives in src/presets/examples/, kept
  //    as reference, not part of the library's core API surface.
  'MOONBASE_GANTT_CONFIG',
  'MoonbaseProject',
  'NL_HOLIDAYS_2026',
  'ProjectGanttData',
  'TASK_CATEGORY_COLORS',
  'TASK_STATUS_COLORS',
  'createProjectGanttData',

  // ── Headless-mode plumbing: surfaced for advanced consumers, documented
  //    at the feature level (undo-redo, scheduling, introspection) but not
  //    individually catalogued to avoid noise.
  'useGanttStore',
  'useTemporalStore',
  'selectSingleTaskId',

  // ── Low-level pure helpers used internally and re-exported so that tests
  //    and SSR callers can reach them. Each is the implementation detail of
  //    a documented feature; no separate contract entry needed.
  'calcDateRange',
  'calcLinkPoints',
  'calcMultiRowTotalHeight',
  'calcTotalWidth',
  'canMoveTask',
  'dateToX',
  'flattenTaskTree',
  'generateAllScaleCells',
  'generateScaleCells',
  'getAllDescendants',
  'getAncestors',
  'getChildren',
  'moveTask',
  'positionBaselines',
  'positionLinks',
  'positionTasks',
  'positionTasksMultiRow',
  'recalcSummaries',
  'snapToUnit',
  'xToDate',
  'detectOverlaps',
  'assignLanes',
  'groupAndAssignLanes',
]);

function main() {
  const exported = collectExports(ENTRY_FILES);
  const featuresDir = resolve(ROOT, 'docs/features');
  if (!existsSync(featuresDir)) {
    console.error(`No ${featuresDir} directory — nothing to check against.`);
    process.exit(1);
  }
  const yamlFiles = walk(featuresDir).filter((f) => !f.includes('/_template/'));
  const documented = collectDocumented(yamlFiles);

  const missing = [];
  for (const name of exported) {
    if (documented.has(name)) continue;
    if (WAIVERS.has(name)) continue;
    missing.push(name);
  }

  if (missing.length === 0) {
    console.log(`✓ all ${exported.size} public exports are documented (${yamlFiles.length} contract files scanned).`);
    return;
  }

  console.error('✗ undocumented public exports:');
  for (const name of missing.sort()) console.error(`  - ${name}`);
  console.error(
    `\n${missing.length} exported symbol(s) are missing from docs/features/*/contract.yaml. ` +
    'Add them to an existing feature or create a new feature folder. If an export is truly internal, add it to the WAIVERS set in scripts/check-contract-coverage.mjs with a justification.',
  );
  process.exit(1);
}

main();
