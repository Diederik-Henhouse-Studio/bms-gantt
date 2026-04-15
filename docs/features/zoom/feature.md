---
id: zoom
title: Zoom presets (minutes → years)
status: stable
since: 0.2.0
category: presentation
owners:
  - src/store/scales.ts
  - src/components/GanttToolbar.tsx
---

## Nut
Seven levels of temporal granularity cover everything from intraday operations to multi-year roadmaps: `minutes`, `hours`, `days`, `weeks`, `months`, `quarters`, `years`.

## Noodzaak
A single fixed scale forces awkward horizontal scrolling or cramped cells. Users need to zoom out to get a summary view and zoom back in to drag precisely.

## Functional
- `setZoom(level)` action on the store picks a preset
- Each preset defines two scale rows (except `years`) and a base `cellWidth`
- `minutes` preset uses 15-min cells; finer sub-minute granularity is not supported
- Toolbar buttons call `setZoom` on click; keyboard (ctrl/cmd + mousewheel) nudges one step

## Non-functional
- Presets are cheap to compute: no re-fetch of tasks, just recomputed `scaleCells`
- All presets use date-fns units consistent with the calendar (no bespoke millisecond math)

## Trade-offs
- We hardcode the seven presets rather than allow arbitrary custom scales; keeps the toolbar UI predictable. For custom scales, use `updateConfig({ scales, cellWidth })` directly.

## Out of scope
- Smooth animated zoom transitions
- Zoom-to-fit-selection UX (consumer can compute and `setScroll` themselves)

## Related features
- [introspection](../introspection) — scale cells emit `data-gantt-unit` so agents can assert the active zoom level
