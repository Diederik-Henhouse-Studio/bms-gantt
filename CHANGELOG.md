# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
