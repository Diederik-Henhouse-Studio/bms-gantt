# @bluemillstudio/gantt

[![npm](https://img.shields.io/npm/v/@bluemillstudio/gantt)](https://www.npmjs.com/package/@bluemillstudio/gantt)
[![downloads](https://img.shields.io/npm/dm/@bluemillstudio/gantt)](https://www.npmjs.com/package/@bluemillstudio/gantt)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)
![react](https://img.shields.io/badge/react-%E2%89%A518-61dafb)
![typescript](https://img.shields.io/badge/typescript-5.x-3178c6)
[![provenance](https://img.shields.io/badge/provenance-verified-brightgreen)](https://www.npmjs.com/package/@bluemillstudio/gantt)

Interactive Gantt chart component for React with drag & drop, dependencies, critical path analysis, auto-scheduling, and more. Zero Gantt dependencies — built on top of Zustand (state), date-fns (dates) and SVG (dependency arrows).

## Features

- **Drag & drop** — move, resize, and adjust task progress
- **Dependencies** — SVG arrows between tasks (finish-to-start, finish-to-finish, start-to-start, start-to-finish)
- **Critical path** — forward/backward pass (CPM) with red highlighting
- **Auto-scheduling** — automatically shift tasks along dependency chains
- **Baselines** — original plan shown as a shadow bar behind the live bar
- **Slack / float** — per-task slack computation and visualisation
- **Export** — PNG and PDF export of the entire chart
- **Zoom** — 6 levels: hours, days, weeks, months, quarters, years
- **Hierarchy** — summary tasks with collapsible sub-trees
- **Milestones** — zero-duration tasks rendered as diamonds
- **Markers** — vertical lines on specific dates (deadlines, cut-offs)
- **Calendar** — configurable working days and holidays
- **Virtual scrolling** — stays performant on large datasets
- **Keyboard & context menu** — right-click actions

## Installation

```bash
npm install @bluemillstudio/gantt
```

### Peer dependencies

```json
{
  "react": ">=18.0.0",
  "react-dom": ">=18.0.0",
  "@tanstack/react-table": "^8.0.0"
}
```

The component also expects **Tailwind CSS** and the shadcn/ui CSS variables to be available — see [Styling & Theming](#styling--theming).

## Quick Start

```tsx
import { Gantt } from '@bluemillstudio/gantt';
import type { GanttTask } from '@bluemillstudio/gantt/store';

const tasks: GanttTask[] = [
  {
    id: '1',
    text: 'Design',
    start: new Date('2026-05-01'),
    end: new Date('2026-05-15'),
    duration: 11,
    progress: 40,
    parentId: null,
    type: 'task',
    open: false,
    $x: 0, $y: 0, $w: 0, $h: 0, $level: 0,
  },
  {
    id: '2',
    text: 'Implementation',
    start: new Date('2026-05-16'),
    end: new Date('2026-06-01'),
    duration: 13,
    progress: 0,
    parentId: null,
    type: 'task',
    open: false,
    $x: 0, $y: 0, $w: 0, $h: 0, $level: 0,
  },
];

export default function Planning() {
  return (
    <div className="h-[600px]">
      <Gantt
        tasks={tasks}
        links={[{ id: 'l1', source: '1', target: '2', type: 'e2s' }]}
        onTaskClick={(task) => console.log('Click:', task.text)}
        onTaskUpdate={(task) => console.log('Update:', task.id)}
      />
    </div>
  );
}
```

> **Tip:** Computed layout fields (`$x`, `$y`, `$w`, `$h`, `$level`) are populated automatically by the store. Initialise them to `0` when creating tasks.

## API Reference

### GanttProps

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `tasks` | `GanttTask[]` | Yes | List of tasks to render |
| `links` | `GanttLink[]` | No | Dependency links between tasks |
| `markers` | `GanttMarker[]` | No | Vertical marker lines |
| `config` | `Partial<GanttConfig>` | No | Configuration overrides |
| `className` | `string` | No | Extra CSS class on the container |
| `labels` | `Partial<GanttLabels>` | No | Override UI strings (defaults are English) |
| `slots` | `GanttSlots` | No | Customisation slots: `renderTaskBar`, `columns` |
| `onTaskClick` | `(task: GanttTask) => void` | No | Fires on task bar click |
| `onTaskDoubleClick` | `(task: GanttTask) => void` | No | Fires on task bar double-click |
| `onTaskUpdate` | `(task: GanttTask) => void` | No | Fires after drag/resize/progress change |
| `onLinkCreate` | `(link: GanttLink) => void` | No | Fires when a dependency is created |
| `onLinkDelete` | `(linkId: string) => void` | No | Fires when a dependency is deleted |

### GanttTask

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier |
| `text` | `string` | Yes | Task label |
| `start` | `Date` | Yes | Start date |
| `end` | `Date` | Yes | End date |
| `duration` | `number` | Yes | Duration in working days |
| `progress` | `number` | Yes | Progress 0–100% |
| `parentId` | `string \| null` | Yes | Parent id for tree structure, `null` for root |
| `type` | `'task' \| 'summary' \| 'milestone'` | Yes | Structural role |
| `open` | `boolean` | Yes | Whether children are expanded (only for `summary`) |
| `$x, $y, $w, $h` | `number` | Yes | Computed pixel positions (init to `0`) |
| `$level` | `number` | Yes | Computed indentation depth |
| `baseStart` | `Date` | No | Baseline start (original plan) |
| `baseEnd` | `Date` | No | Baseline end |
| `critical` | `boolean` | No | Computed: on the critical path |
| `slack` | `number` | No | Computed: slack in working days |
| `segments` | `TaskSegment[]` | No | Segments for split tasks |
| `taskCategory` | `TaskCategory` | No | Optional, consumer-defined category used for bar colour |
| `minDuration` | `number` | No | Minimum duration in calendar days — resize is clamped to this value |
| `maxDuration` | `number` | No | Maximum duration in calendar days — resize is clamped to this value |
| `lockStart` | `boolean` | No | When true, the start date cannot be changed by drag/resize |
| `lockEnd` | `boolean` | No | When true, the end date cannot be changed by drag/resize |
| `noOverlap` | `boolean` | No | When true, drag reverts if it would overlap a sibling (same parentId) |
| `projectId` | `string` | No | Optional: FK to a parent project/dossier |
| `status` | `TaskStatus` | No | Lifecycle: `planned`, `active`, `paused`, `completed`, `cancelled` |
| `color` | `string` | No | Override bar colour (CSS value) |

### GanttLink

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier |
| `source` | `string` | Yes | Predecessor task id |
| `target` | `string` | Yes | Successor task id |
| `type` | `LinkType` | Yes | `'e2s'` (finish-to-start), `'e2e'`, `'s2s'`, `'s2e'` |
| `critical` | `boolean` | No | Computed: on the critical path |
| `$points` | `string` | No | Computed: SVG polyline coordinates |

### GanttMarker

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier |
| `date` | `Date` | Yes | Position of the marker line |
| `label` | `string` | No | Label shown above the line |
| `color` | `string` | No | CSS colour |
| `dashed` | `boolean` | No | Dashed instead of solid |

### GanttConfig

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `scales` | `GanttScale[]` | From zoom preset | Header rows (e.g. months + days) |
| `cellWidth` | `number` | From zoom preset | Pixel width per cell |
| `cellHeight` | `number` | `36` | Pixel height per task row |
| `barHeight` | `number` | `24` | Pixel height of the task bar |
| `barPadding` | `number` | `6` | Vertical padding above/below the bar |
| `readonly` | `boolean` | `false` | Read-only mode (no drag/edit) |
| `showBaselines` | `boolean` | `false` | Render baseline (shadow) bars |
| `showCriticalPath` | `boolean` | `false` | Highlight the critical path in red |
| `showSlack` | `boolean` | `false` | Show slack/float indicators |
| `showToolbar` | `boolean` | `true` | Render the built-in toolbar (zoom, today, export, etc.) |
| `workingDays` | `number[]` | `[1,2,3,4,5]` | ISO weekday numbers (1=Mon, 7=Sun) |
| `holidays` | `Date[]` | `[]` | Non-working dates |

## Zoom Levels

The chart supports 6 zoom levels via `ZOOM_PRESETS`:

| Level | Top header | Bottom header | Cell width | Suitable for |
|-------|-----------|---------------|-----------|--------------|
| `minutes` | Hour (`HH:00`) | Minute (`mm`) | 20px | Intra-day scheduling (default 15-min steps) |
| `hours` | Day (`d MMM`) | Hour (`HH`) | 40px | Detailed day-level planning |
| `days` | Month (`MMM yyyy`) | Day (`d`) | 32px | Weekly planning |
| `weeks` | Month (`MMM yyyy`) | Week (`W1`) | 80px | Monthly overview |
| `months` | Year (`yyyy`) | Month (`MMM`) | 80px | Quarterly overview |
| `quarters` | Year (`yyyy`) | Quarter (`Q1`) | 100px | Yearly overview |
| `years` | Year (`yyyy`) | — | 120px | Multi-year overview |

Change the zoom via the toolbar or programmatically:

```tsx
import { useGanttStore } from '@bluemillstudio/gantt/store';

const setZoom = useGanttStore((s) => s.setZoom);
setZoom('weeks');
```

## Events

```tsx
<Gantt
  tasks={tasks}
  links={links}
  onTaskClick={(task) => router.push(`/projects/${task.projectId}`)}
  onTaskDoubleClick={(task) => openEditor(task.id)}
  onTaskUpdate={async (task) => {
    await api.updateTask(task.id, {
      start: task.start,
      end: task.end,
      progress: task.progress,
    });
  }}
  onLinkCreate={async (link) => api.createLink(link)}
  onLinkDelete={async (linkId) => api.deleteLink(linkId)}
/>
```

## Advanced Features

### Critical Path

Computes the longest path through the dependency network. Tasks on the critical path have no slack — any delay delays the whole project.

```tsx
<Gantt tasks={tasks} links={links} config={{ showCriticalPath: true }} />
```

When enabled:
- Critical tasks get `critical: true` and are rendered in red
- Critical links are also rendered in red
- Computed via forward/backward pass (CPM algorithm)

### Auto-Scheduling

Automatically shifts tasks forward based on their dependencies, respecting working days and holidays.

```tsx
import { useGanttStore } from '@bluemillstudio/gantt/store';

const autoSchedule = useGanttStore((s) => s.autoScheduleTasks);
autoSchedule();
```

Supported link types:

| Type | Name | Meaning |
|------|------|---------|
| `e2s` | Finish-to-Start | Successor starts after predecessor ends |
| `e2e` | Finish-to-Finish | Successor ends together with predecessor |
| `s2s` | Start-to-Start | Successor starts together with predecessor |
| `s2e` | Start-to-Finish | Successor ends when predecessor starts |

### Baselines

Show the original plan as a shadow bar behind the live bar:

```tsx
const tasks: GanttTask[] = [
  {
    id: '1',
    text: 'Transport',
    start: new Date('2026-06-01'),
    end: new Date('2026-06-20'),
    baseStart: new Date('2026-05-15'),
    baseEnd: new Date('2026-06-01'),
    // ...other fields
  },
];

<Gantt tasks={tasks} config={{ showBaselines: true }} />
```

### Slack / Float

Shows how many working days a task can slip without delaying the project:

```tsx
<Gantt tasks={tasks} links={links} config={{ showSlack: true }} />
```

After calculation each task has a `slack` field (working days). Tasks with `slack === 0` are on the critical path.

### Export (PNG / PDF)

The toolbar includes a built-in `ExportButton`. It exports the full chart (including content outside the viewport) as:

- **PNG** — retina quality (2× pixel ratio)
- **PDF** — automatic orientation (landscape/portrait) and page size (A3/A4)

## Example Integration

The [`src/presets/examples/grondwijzer.ts`](src/presets/examples/grondwijzer.ts) module is kept in the package as a worked example of a **domain-specific integration**. It shows one way to:

- Define a category-to-colour mapping (`TASK_CATEGORY_COLORS`)
- Define a status-to-colour mapping (`TASK_STATUS_COLORS`)
- Convert a domain object into `{ tasks, links, markers }` via `createProjectGanttData()`
- Provide a default `GanttConfig` and a holidays array

You are not expected to use the Grondwijzer preset directly — copy it into your own app and adapt it to your domain.

## Customisation slots

Customise parts of the chart via the `slots` prop — all fields are optional.

```tsx
import { Gantt, type GanttSlots } from '@bluemillstudio/gantt';
import { createColumnHelper } from '@tanstack/react-table';

const helper = createColumnHelper<GanttTask>();

const slots: GanttSlots = {
  // Replace the default left-pane columns
  columns: [
    helper.accessor('text', { header: 'Name', size: 240 }),
    helper.accessor('projectId', { header: 'Project', size: 140 }),
    helper.accessor('progress', { header: '%', size: 60 }),
  ],
  // Replace the inner content of regular task bars
  renderTaskBar: (task) => (
    <div className="flex h-full items-center px-1 text-[11px] text-white">
      {task.text} — {task.progress}%
    </div>
  ),
  // Override the timeline header cell content
  renderHeaderCell: (cell, rowIndex) => (
    <span className={rowIndex === 0 ? 'font-mono' : ''}>{cell.label}</span>
  ),
  // Custom hover tooltip
  renderTaskTooltip: (task) => (
    <div>
      <strong>{task.text}</strong>
      <div>{task.progress}% complete</div>
    </div>
  ),
};

<Gantt tasks={tasks} slots={slots} />
```

## Internationalisation

All UI strings are English by default and can be overridden via the `labels` prop:

```tsx
import { Gantt, type GanttLabels } from '@bluemillstudio/gantt';

const dutch: Partial<GanttLabels> = {
  today: 'Vandaag',
  zoomIn: 'Inzoomen',
  zoomOut: 'Uitzoomen',
  save: 'Opslaan',
  cancel: 'Annuleren',
};

<Gantt tasks={tasks} labels={dutch} />
```

See `DEFAULT_LABELS` exported from the package for the full list of keys.

## Theming via CSS custom properties

Key colours can be overridden via CSS variables. No stylesheet import is required — all values fall back to sensible defaults if the variable is not set. Scope overrides to the `.gantt-container` class to isolate them from the rest of your app.

```css
.gantt-container {
  --gantt-weekend-bg: rgb(148 163 184 / 0.12);
  --gantt-holiday-bg: rgb(239 68 68 / 0.1);
  --gantt-today-color: hsl(220 90% 55%);
  --gantt-today-fg: white;
  --gantt-critical-color: rgb(239 68 68);
  --gantt-baseline-bg: rgb(148 163 184 / 0.15);
  --gantt-baseline-stripe: rgb(148 163 184 / 0.35);
  --gantt-baseline-border: rgb(148 163 184 / 0.6);
}

/* Dark-mode tweak */
.dark .gantt-container {
  --gantt-weekend-bg: rgb(148 163 184 / 0.08);
  --gantt-critical-color: rgb(252 165 165);
}
```

Bar category colours, status opacity, and text contrast are still driven by Tailwind + shadcn variables — consumer controls those via their existing design tokens.

## Styling & Theming

The component uses **Tailwind CSS** utility classes and expects the following shadcn/ui CSS variables:

```css
:root {
  --background: ...;
  --foreground: ...;
  --muted: ...;
  --muted-foreground: ...;
  --accent: ...;
  --border: ...;
  --popover: ...;
}
```

The container has the classes `bg-background border rounded-lg`. Pass additional styling via the `className` prop:

```tsx
<Gantt tasks={tasks} className="shadow-lg h-[800px]" />
```

Task bar colours are resolved in this order:
1. `task.color` — direct override
2. `task.taskCategory` via `TASK_CATEGORY_COLORS` — domain colours
3. Default theme colour

## Introspection for agents & tests

Every rendered element carries `data-gantt-*` attributes that describe its role and coordinates in a stable, serializable form. Combined with the imperative `ref` handle, this makes the chart programmatically legible to AI agents, Playwright suites, and custom tooling — no screenshot parsing required.

### DOM attributes

| Role | Attribute selector | Key data attributes |
|------|-------------------|---------------------|
| container | `[data-gantt-role="container"]` | — |
| task bar | `[data-gantt-role="task-bar"]` | `data-gantt-task-id`, `data-gantt-x/y/w/h`, `data-gantt-start/end`, `data-gantt-critical`, `data-gantt-category`, `data-gantt-status`, `data-gantt-lane` |
| milestone | `[data-gantt-role="milestone"]` | `data-gantt-task-id`, coords, `data-gantt-start` |
| summary | `[data-gantt-role="summary"]` | `data-gantt-task-id`, coords, `data-gantt-start/end` |
| scale cell | `[data-gantt-role="scale-cell"]` | `data-gantt-scale-row`, `data-gantt-unit`, `data-gantt-date`, `data-gantt-w`, `data-gantt-weekend/holiday/today` |
| link | `[data-gantt-role="link"]` | `data-gantt-link-id`, `data-gantt-link-source/target/type`, `data-gantt-points` |
| marker | `[data-gantt-role="marker"]` | `data-gantt-marker-id`, `data-gantt-date`, `data-gantt-x` |
| now-line | `[data-gantt-role="now-line"]` | `data-gantt-date`, `data-gantt-x` |

### Ref handle — `GanttHandle`

```tsx
import { useRef } from 'react';
import { Gantt, type GanttHandle } from '@bluemillstudio/gantt';

const handle = useRef<GanttHandle>(null);

<Gantt ref={handle} tasks={tasks} />;

// Serializable layout — great for agent ingestion / visual regression
const snap = handle.current!.snapshot();
// { bars: [...], scaleRows: [...], links: [...], totalWidth, ... }

// Hit-testing (content-coordinate space)
handle.current!.elementAt(420, 58);   // { kind: 'bar', ref: LayoutBar }
handle.current!.rowAtY(58);            // LayoutBar | null
handle.current!.dateAtX(420);          // ISO string
handle.current!.cellAtX(420);          // LayoutScaleCell | null

// DOM helpers
handle.current!.taskBarRect('t-123');  // DOMRect in viewport coordinates

// Alignment sanity check
const report = handle.current!.validate();
if (!report.ok) console.warn(report.issues);
```

### Pure hit-test helpers (no DOM)

```ts
import { rowAtY, cellAtX, barAtPoint, dateAtX } from '@bluemillstudio/gantt/store';
```

These operate on plain layout data, so they're usable in SSR, workers, Node-based tests, and anywhere a store snapshot is available.

## Computation layer (v0.8)

Drive derived values and data transforms without touching the source tasks — the library runs your pipeline during `recalculate()` and stores the results on `task.$computed`.

### computedFields

```tsx
<Gantt
  tasks={tasks}
  computedFields={[
    { key: 'riskScore', compute: (t) => (t.slack ?? Infinity) < 2 ? 'high' : 'low' },
    { key: 'cost',      compute: (t) => (t.hourlyRate ?? 0) * t.duration * 8 },
    { key: 'variance',  compute: (t) =>
        t.baseEnd ? (t.end.getTime() - t.baseEnd.getTime()) / 86_400_000 : null },
  ]}
/>
```

`task.$computed` is a `Record<string, unknown>` readable from `slots.renderTaskBar`, `slots.columns`, tooltips, and `snapshot()`.

### summaryAggregators

Custom roll-ups for summary tasks. They run after `computedFields` so aggregators can compose over derived values.

```tsx
<Gantt
  summaryAggregators={{
    totalCost: (children) =>
      children.reduce((s, c) => s + Number(c.$computed?.cost ?? 0), 0),
    worstRisk: (children) =>
      children.some((c) => c.$computed?.riskScore === 'high') ? 'high' : 'ok',
  }}
/>
```

### Pure query helpers

```ts
import { filterTasks, sortTasks, groupTasksBy } from '@bluemillstudio/gantt/query';

const active = filterTasks(tasks, { status: ['active', 'paused'], progressLte: 80 });
const byStart = sortTasks(active, 'start', { by: 'progress', dir: 'desc' });
const byOwner = groupTasksBy(active, (t) => t.projectId ?? '—');
```

### Analysis utilities

```ts
import { forecastEnd, resourceLoad, burndown } from '@bluemillstudio/gantt/analysis';

forecastEnd(task);               // Date — linear ETA from current progress
resourceLoad(tasks, {            // per-day histogram
  weight: (t) => t.duration,
  groupBy: (t) => t.projectId,
});
burndown(tasks);                 // [{ date, ideal, actual }]
```

All three are pure functions — safe in SSR, workers, and tests.

### Out-of-scope (by design)

The library does **not** fetch, cache, or persist data. Use TanStack Query / SWR / Apollo / your own layer for those; pipe the resulting task list in via the `tasks` prop.

## Headless Mode

Use the store directly without the UI component — useful for server-side calculations or custom renderers:

```tsx
import {
  createGanttStore,
  flattenTaskTree,
  calcCriticalPath,
  calcSlack,
  autoSchedule,
  topologicalSort,
  detectCycles,
} from '@bluemillstudio/gantt/store';

const store = createGanttStore();
store.setState({ tasks, links, config });
store.getState().recalculate();

const { flatTasks, visibleLinks, dateRange } = store.getState();
```

Functions exposed by `@bluemillstudio/gantt/store`:

| Function | Description |
|----------|-------------|
| `createGanttStore()` | Create a new Zustand store instance |
| `useGanttStore` | Singleton store hook for React components |
| `flattenTaskTree()` | Flatten the task hierarchy honouring open/closed state |
| `recalcSummaries()` | Recompute start/end/progress for summary tasks |
| `topologicalSort()` | Sort tasks in dependency order (Kahn's algorithm) |
| `detectCycles()` | Detect circular dependencies |
| `autoSchedule()` | Forward-pass auto-scheduling |
| `calcCriticalPath()` | Compute the critical path (CPM) |
| `calcSlack()` | Compute slack/float per task |
| `dateToX()` / `xToDate()` | Convert between dates and pixel positions |
| `snapToUnit()` | Snap a date to the nearest unit boundary |

## Architecture

```
src/
├── components/        React UI components
├── store/             Zustand state management
├── hooks/             Custom React hooks
├── presets/           Domain-specific configuration
│   ├── index.ts           Re-exports
│   └── examples/
│       └── grondwijzer.ts  Example: soil-flow/logistics domain
└── utils/             Helpers
```

**Dataflow:** Props → Zustand store → `recalculate()` → computed `flatTasks`, `scaleCells`, `visibleLinks` → React render.

For a deeper architectural tour, see [docs/architectuur.md](docs/architectuur.md).

## Feature catalog

Every public feature lives in [`docs/features/<slug>/`](docs/features) with:

- `feature.md` — human context (why, trade-offs, scope)
- `contract.yaml` — machine-readable API surface + invariants
- `scenarios.yaml` — Given/When/Then, agent-executable
- `examples/*.tsx` — compile-checked snippets

See [`docs/features/README.md`](docs/features/README.md) for the catalog and conventions. The generic scenario runner lives at [`tests/`](tests/README.md).

## Example app

A live demo lives in [`example/`](example/). It consumes the library via `file:..`, so you can iterate end-to-end:

```bash
npm run build         # build the library
cd example
npm install
npm run dev           # http://localhost:5173
```

The app demonstrates slots, theming (dark-mode toggle), introspection (the "📸 Snapshot" button dumps `handle.snapshot()`), and computed fields.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

### Tech stack

| Layer | Technology |
|-------|------------|
| UI framework | React 18+ |
| State management | Zustand 4.x |
| Date math | date-fns 3.x |
| Grid (left pane) | TanStack Table 8.x |
| Export | html-to-image + jsPDF |
| Styling | Tailwind CSS + shadcn/ui variables |
| Language | TypeScript 5.x (strict) |
| Tests | Vitest |
| Build | tsup |

## Contributing

Pull requests are welcome. For larger changes, please open an issue first to discuss the direction.

## License

MIT © Blue Mill Studio — see [LICENSE](LICENSE).
