---
id: core-types
title: Core type surface
status: stable
since: 0.1.0
category: meta
owners:
  - src/store/types.ts
  - src/components/Gantt.tsx
---

## Nut
Collects the fundamental public types consumers import when typing their own task data, props, and store interactions: `Gantt`, `GanttProps`, `GanttTask`, `GanttLink`, `GanttMarker`, `GanttScale`, `ScaleCell`, `GanttConfig`, `GanttState`, `GanttActions`, `DateRange`, `DragState`, `TaskType`, `TaskCategory`, `TaskStatus`, `LinkType`, `ZoomLevel`, `ZoomConfig`, `ScaleUnit`, `LaneGroup`, `GanttErrorBoundary`, `GanttErrorBoundaryProps`, `ValidationResult`, `validateGanttInput`.

## Noodzaak
These types are referenced from every other feature. Documenting them in one place keeps the individual feature docs focused on behaviour rather than re-listing shapes.

## Functional
All types are exported from the package root (`@bluemillstudio/gantt`). The canonical definitions live in [`src/store/types.ts`](../../../src/store/types.ts); this file is the authoritative source and the place to read when you want field-level detail.

## Non-functional
- Zero runtime cost — types are erased at build time
- `Gantt`, `GanttErrorBoundary` are runtime exports (React components); every other name in this catalog is type-only

## Trade-offs
- We re-export enums as string unions rather than TypeScript `enum` — interoperates better with JSON and plain objects
- We deliberately do NOT document every field here; the TypeScript type definitions are the contract, and this folder points at them

## Out of scope
- Per-type examples (see each behavioural feature instead)

## Related features
- Every other feature depends on this one
