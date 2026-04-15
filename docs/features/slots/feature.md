---
id: slots
title: Customisation slots (render props + columns)
status: stable
since: 0.3.0
category: presentation
owners:
  - src/slots.tsx
  - src/components/TaskBar.tsx
  - src/components/TimeScale.tsx
  - src/components/GanttGrid.tsx
---

## Nut
Four escape hatches let consumers replace the heaviest pieces of chrome without forking:
- `renderTaskBar` — body of a regular task bar
- `renderTaskTooltip` — hover tooltip body
- `renderHeaderCell` — timeline cell content
- `columns` — entire left-pane column set (TanStack `ColumnDef[]`)

## Noodzaak
A Gantt serves radically different domains (construction, healthcare, logistics). Forcing every consumer into the default visual grammar leads to forks. Slots keep the core layout engine invariant while opening the paint surface.

## Functional
- Omit a slot → built-in default renders
- `renderTaskBar`/`renderTaskTooltip`/`renderHeaderCell` are `(task, …) => ReactNode`; returning `null` or `undefined` falls back to the default *only* for the tooltip (bar/header default to rendering nothing when `undefined`)
- `columns` is the full replacement set; granular column-level overrides are intentionally absent (keeps TanStack API as-is)

## Non-functional
- Pure React — no DSL, no string-templated class names
- Render functions run inside the component tree; they may use hooks, context, and portals
- Column definitions are passed directly to TanStack — resizing, sorting, filtering all work out of the box

## Trade-offs
- No serialization: because slots are functions, a `snapshot()` cannot reproduce them — agents see the rendered DOM instead
- `renderTaskBar` replaces the inner content of the bar but keeps our outer wrapper (so drag handlers, data attributes, resize handles are preserved)

## Out of scope
- Slot for summary/milestone bars (by design — those are opinionated shapes; theming covers colour)
- Slot for the toolbar body (use `config.showToolbar: false` and render your own)

## Related features
- [theming](../theming) — use CSS variables before reaching for a slot
- [computation](../computation) — slots commonly read `task.$computed[...]` to render derived values
