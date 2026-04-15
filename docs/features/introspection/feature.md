---
id: introspection
title: Layout introspection for agents & tests
status: stable
since: 0.7.0
category: meta
owners:
  - src/handle.ts
  - src/components/Gantt.tsx
  - src/store/hitTest.ts
  - src/components/TaskBar.tsx
  - src/components/TimeScale.tsx
  - src/components/DependencyLinks.tsx
  - src/components/Markers.tsx
---

## Nut
Makes the rendered chart programmatically legible — agents, Playwright suites, and custom tooling can determine "what is where" without screenshot parsing, brittle selectors, or access to the React tree.

## Noodzaak
Before v0.7 an agent inspecting a Gantt DOM saw `<div class="absolute rounded-sm bg-blue-500" style="left:140px">` with no way to know:
- that this div is a task bar
- which task it represents
- whether it's on the critical path
- what the date under a mouse point is

Every automated test had to rely on CSS class names (fragile across Tailwind changes) or injected `id`s (fragile across React re-keying). The introspection layer replaces both.

## Functional
- Every semantic element carries `data-gantt-role` plus role-specific attributes (see contract.yaml)
- `<Gantt ref>` yields a `GanttHandle` with serializable methods: `snapshot()`, `elementAt(x,y)`, `rowAtY(y)`, `dateAtX(x)`, `cellAtX(x)`, `taskBarRect(id)`, `validate()`, `getElement()`
- Pure hit-test helpers (`rowAtY`, `cellAtX`, `barAtPoint`, `dateAtX`) are exported from `@bluemillstudio/gantt/store` for SSR and worker-side use
- `handle.validate()` returns alignment issues (out-of-bounds bars, negative widths, scale-row width mismatches)

## Non-functional
- Zero runtime cost when the handle isn't called — `useImperativeHandle` is lazy, attributes are a few extra DOM properties per element
- `snapshot()` builds a new plain-JSON object on every call — safe to pass across worker/frame boundaries
- No `window` globals are injected unless the consumer opts in (deferred to v0.7.1)

## Trade-offs
- Breaking change in 0.7.0: `<Gantt ref>` now yields `GanttHandle`, not `HTMLDivElement`. Migration: `handle.getElement()`.
- Data attributes add ~10-20 bytes per rendered element — a measurable but acceptable DOM-size cost for the testability win.

## Out of scope
- Recording drag gestures (record-and-replay is a separate concern)
- Generating visual regression diffs (`snapshot()` supports it, but the differ itself is consumer responsibility)
- Authz / read-restriction on the handle — everything the DOM exposes is already in the DOM

## Related features
- [drag-constraints](../drag-constraints) — scenarios probe constraint outcomes via the handle
- [theming](../theming) — `data-gantt-critical`, `data-gantt-weekend` etc. are useful for conditional styling as well as testing
