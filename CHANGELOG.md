# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.9.2] - 2026-04-16

### Added
- **Keyboard navigation** (#30): Arrow Up/Down to navigate tasks, Enter to open editor, Space to toggle, Escape to clear. All keys ignored in inputs. New `keyboard-nav` feature in the catalog.
- 100/100 public exports documented. 17 features catalogued. 47 scenarios.

## [0.9.1] - 2026-04-16

### Fixed
- **Split tasks now render as segmented bars** (#18, audit A1). Tasks with `segments[]` show separate coloured blocks per segment with a dashed connector between gaps. Positioning computes per-segment `$x/$w` in both single-row and multi-row mode. Each segment gets a `data-gantt-role="segment"` DOM attribute.

### Tests: 252 → 254 (+2 splitTasks).

## [0.9.0] - 2026-04-16

### Added
- **New store exports**: `applyMoveConstraints`, `applyResizeStartConstraints`, `applyResizeEndConstraints` (drag constraints), `applyComputedFields`, `applySummaryAggregators` (computation layer) — all pure functions, useful for SSR/testing.
- **Agent-testable feature catalog** in `docs/features/`: 16 features × (feature.md + contract.yaml + scenarios.yaml + examples). CI-enforced: `typecheck:examples`, `check:contract-coverage` (95/95), `check:scenarios` (45 specs), `check:catalog`.
- **Scenario runner** (`tests/features/`): reads scenarios.yaml and executes them as Vitest tests. Covers `unit-call`, `render`, `handle-method`, `keydown`, `hover`, `sequence`. 36/45 executable, 9 skipped (jsdom SVG/Tailwind limitations).
- **Contract-coverage gate**: CI fails when a new public export has no `contract.yaml` entry and no explicit waiver.
- **Catalog auto-generator**: `npm run docs:catalog` regenerates the index from frontmatter.

### Changed
- Total tests: 207 → 252 (243 pass + 9 skip).
- Calendar `createCalendar` documented with its actual positional-arg signature.
- `yaml` added as devDependency for the scenario runner.

## [0.8.0] - 2026-04-15

### Added — Computation layer
The library now lets consumers drive derived values and data transforms without owning the data layer (fetch/cache stay your responsibility).

- **`computedFields` prop on `<Gantt>`** — pipeline of `{ key, compute(task, all) }` runs during recalculate; results land on `task.$computed[key]`. Consumable from `slots.renderTaskBar`, custom columns, tooltip content, etc.
- **`summaryAggregators` prop** — `Record<string, (children) => unknown>`; aggregate values roll up onto each summary task under `$computed[key]`. Runs AFTER `computedFields` so aggregators can read computed child values.
- **`@bluemillstudio/gantt/query`** sub-export — pure `filterTasks`, `sortTasks`, `groupTasksBy` for data pipelines. No React, no store.
- **`@bluemillstudio/gantt/analysis`** sub-export — `forecastEnd` (linear ETA), `resourceLoad` (per-day histogram with optional weight + breakdown), `burndown` (ideal-vs-actual curve).

### Scope boundary
The library intentionally does **not** handle fetch, cache invalidation, persistence, or server state. Bring your own TanStack Query / SWR / Apollo — this layer plugs downstream of whatever you use.

### Example
```tsx
<Gantt
  tasks={tasks}
  computedFields={[
    { key: 'riskScore', compute: (t) => (t.slack ?? Infinity) < 2 ? 'high' : 'low' },
    { key: 'cost',      compute: (t) => (t.hourlyRate ?? 0) * t.duration * 8 },
  ]}
  summaryAggregators={{
    totalCost: (children) => children.reduce((s, c) => s + Number(c.$computed?.cost ?? 0), 0),
  }}
  slots={{
    columns: [
      helper.accessor('text', { header: 'Task' }),
      helper.accessor((t) => t.$computed?.riskScore, { header: 'Risk' }),
      helper.accessor((t) => t.$computed?.cost, { header: 'Cost' }),
    ],
  }}
/>
```

### Tests: 183 → 207 (+24 across computation, query, analysis).

## [0.7.0] - 2026-04-15

### Added — Introspection layer
Purpose: give AI agents, Playwright tests, and advanced consumers a first-class way to "see" the chart without reading bespoke DOM.

- **`data-gantt-*` attributes** on every semantic element: container, task-bar, milestone, summary, scale-cell, link, marker, now-line. Every instrumented node exposes its role, stable identifier, coordinates, and domain data (start/end ISO, category, status, critical, etc.). Works with any DOM querying tool out of the box.
- **Pure hit-test helpers** exported from `@bluemillstudio/gantt/store`: `rowAtY`, `cellAtX`, `barAtPoint`, `dateAtX`. No DOM dependency — safe for SSR and tests.
- **`GanttHandle` via `ref`** with methods: `snapshot()`, `elementAt(x,y)`, `rowAtY(y)`, `dateAtX(x)`, `cellAtX(x)`, `taskBarRect(id)`, `validate()`, `getElement()`. All return serializable JSON so agents and MCP tools can consume the output directly.
- **Alignment validator** (`handle.validate()`) — reports out-of-bounds bars, negative widths, and scale-row width mismatches.

### Changed (breaking for ref consumers only)
- `<Gantt ref>` now yields a `GanttHandle` instead of the bare `HTMLDivElement`. Use `handle.getElement()` to get the div back. Given that forwardRef landed only in 0.5.0 with likely no external consumers, I'm treating this as a minor bump rather than major.

### Example — agent inspection
```ts
import { Gantt, type GanttHandle } from '@bluemillstudio/gantt';

const ref = useRef<GanttHandle>(null);
<Gantt ref={ref} tasks={tasks} />

// Somewhere else
const layout = ref.current?.snapshot();
console.log(layout.bars); // [{ taskId, x, y, w, h, start, end, ... }]

// Or from Playwright:
await page.$$eval('[data-gantt-role="task-bar"]', (els) =>
  els.map((e) => (e as HTMLElement).dataset));
```

## [0.6.1] - 2026-04-15

### Added
- **Empty-state placeholder** — when no tasks are supplied, the chart shows a centered "No tasks to display" message. Overridable via `labels.emptyState`.

### Changed
- **Milestone diamond size now adapts** to row height with a 14–24 px clamp; no longer invisible on coarse zooms.
- **Progress handle is larger (3.5 × 3.5 px → 14 × 14 px)** with a hover-scale effect and a primary-colour border on hover.
- **Dependency arrows** get an invisible 10 px hit area so thin lines stay clickable, and the visible stroke is thicker (1.5 → 2 px).

## [0.6.0] - 2026-04-15

### Added
- **CSS custom properties for theming** — consumers can override key colours via CSS without importing any stylesheet from the package. All values have sensible inline fallbacks so existing integrations keep working.

Supported variables:

| Variable | Purpose | Default |
|----------|---------|---------|
| `--gantt-weekend-bg` | Weekend column shading | `rgb(148 163 184 / 0.12)` |
| `--gantt-holiday-bg` | Holiday column shading | `rgb(239 68 68 / 0.1)` |
| `--gantt-today-color` | Today line + badge background | `hsl(var(--primary))` |
| `--gantt-today-fg` | Today badge text colour | `hsl(var(--primary-foreground))` |
| `--gantt-critical-color` | Critical-path ring colour | `rgb(239 68 68)` |
| `--gantt-baseline-bg` | Baseline shadow bar background | `rgb(148 163 184 / 0.15)` |
| `--gantt-baseline-stripe` | Baseline stripe colour | `rgb(148 163 184 / 0.35)` |
| `--gantt-baseline-border` | Baseline dashed border | `rgb(148 163 184 / 0.6)` |

### Dark-mode example
\`\`\`css
.dark .gantt-container {
  --gantt-weekend-bg: rgb(148 163 184 / 0.08);
  --gantt-holiday-bg: rgb(239 68 68 / 0.18);
  --gantt-critical-color: rgb(252 165 165);
}
\`\`\`

## [0.5.2] - 2026-04-15

### Added
- **Multi-row group header labels** — in `rowMode: 'multi'` each group now shows its label and task count above the group's lane block. New `GroupHeaders` component exposed publicly.

## [0.5.1] - 2026-04-15

### Added
- **`config.showToolbar: boolean`** (default `true`) — opt out of the built-in toolbar to use your own. `GanttToolbar` is now exported from the package root so you can reuse it.
- **`slots.renderTaskTooltip`** — custom tooltip content on hover. A default tooltip (name, dates, duration, progress, slack) renders when the slot is omitted.

### Changed
- **Default grid width 300 → 420 px, min 200 → 220 px** — the Duration column is no longer clipped behind the timeline (audit #25).
- Tooltip is now a React component instead of the native `title` attribute — richer formatting, works across browsers.

### Closed issues
- #24 (showToolbar), #25 (column clip), #26 (status styling, delivered in 0.5.0), #27 (tooltip slot).

### Deferred
- #28 multi-row group headers — moved to a standalone PR due to layout complexity.

## [0.5.0] - 2026-04-15

### Fixed (audit sprint 1)
- **forwardRef on `<Gantt>`** — no more React warning, consumers can attach a ref.
- **Baseline bars now render as a full-height striped shadow behind the live bar** (previously a barely-visible 4px strip below).
- **Critical path styling upgraded** — uses an inline box-shadow so the red outline is visible regardless of Tailwind configuration. Title attribute now includes slack days when available.
- **Weekend & holiday shading upgraded** — uses explicit fill opacity instead of Tailwind `/20` modifier which was inconsistent; holidays get a warmer (red-tinted) colour to distinguish them from weekends.

### Added
- **Task status visual differentiation** — `paused` tasks render with a diagonal-stripe overlay at 55% opacity; `cancelled` tasks at 35% opacity with strikethrough; `completed` tasks at 85% opacity.
- **`ScaleCell.isHoliday`** flag. `generateScaleCells` now accepts an optional `holidays: Date[]` parameter (defaults to `[]`).
- Bar `title` attribute with start, end, and slack — acts as a minimal native tooltip.

### Deferred to next audit sprint
- Audit A1 split tasks (requires positioning refactor; tracked in #18)
- Audit A5 category colour verification in a live consumer (tracked in #22)
- Audit A7+ sprint-2 items (#24–#28) and theming (#29–#31)

## [0.4.1] - 2026-04-14

### Changed
- CI: upgrade `actions/checkout` and `actions/setup-node` to v5 (Node 20 deprecation warning resolved).
- CI: Node runtime bumped from 20 → 22.
- CI now runs `test:coverage` and uploads a coverage artifact on every push.
- New `test:coverage` npm script for local coverage runs.

## [0.4.0] - 2026-04-14

### Added
- **Bulk operations** on the store: `removeTasks(ids)` and `shiftTasks(ids, deltaDays)` — single undo step per call.
- **Delete/Backspace keyboard shortcut** — removes currently selected tasks (ignored when focus is in an input/textarea).
- **`slots.renderHeaderCell`** — override the content of timeline header cells.
- **Context menu multi-select** — shows "Delete (N)" when more than one task is selected (requires `onDeleteSelection` prop wired by the consumer).

### Changed
- Tests: 170 → 177 (+7 bulkOps suite).

## [0.3.0] - 2026-04-14

### Added
- **Drag constraints** on `GanttTask`: `minDuration`, `maxDuration`, `lockStart`, `lockEnd`, `noOverlap`. Enforced during move, resize-start, and resize-end.
- **Custom left-pane columns** via `slots.columns` prop. Falls back to default column set when omitted.
- **Custom task bar renderer** via `slots.renderTaskBar` — returns ReactNode rendered inside the bar wrapper.
- Public `GanttSlots` type export.

### Changed
- Bumped tests from 160 → 170.

## [0.2.0] - 2026-04-14

### Added
- `labels` prop on `<Gantt>` for i18n — override any UI string (defaults are English).
- New `minutes` zoom preset (15-minute cells) for operational/logistics planning.
- `useNow` hook — now-line in Markers refreshes every minute without external rerender.
- Public `GanttLabels` type + `DEFAULT_LABELS` export.

### Changed
- Default date-fns locale switched from Dutch (`nl`) to English (`en-US`).
- All hardcoded Dutch UI strings replaced with i18n lookups (toolbar, task editor, context menu, grid columns, export button, dependency link delete).
- Added more npm keywords for discovery (`resource-scheduling`, `swimlanes`, `react-timeline`).

## [0.1.0] - 2026-04-14

### Added
- Initial release
- Drag & drop task bars with snap-to-time
- Dependency links (e2s, e2e, s2s, s2e) with SVG rendering
- Critical path analysis (forward/backward CPM)
- Auto-scheduling with working days calendar
- Baselines (planned vs actual)
- Slack/float calculation
- Multi-select (Ctrl/Shift) with batch operations
- Undo/redo via zundo temporal middleware
- Multi-items per row with automatic lane stacking
- Inline cell editing
- Resizable & filterable grid columns
- Grab-scroll (Shift+drag / middle-click)
- PNG and PDF export
- 6 zoom levels (hours to years)
- TypeScript support with full type definitions
- 156 unit tests, 89% coverage
