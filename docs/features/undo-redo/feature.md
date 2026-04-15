---
id: undo-redo
title: Undo / redo (temporal middleware)
status: stable
since: 0.1.0 (exposed via toolbar + keyboard in 0.2.0)
category: interaction
owners:
  - src/store/ganttStore.ts
---

## Nut
Reverse mis-clicks without wiring your own history stack. Wraps data mutations (tasks, links, markers) via the zundo temporal middleware.

## Noodzaak
Drag-to-move is easy to misfire. An undo key is the expected safety net for any editor-style UI.

## Functional
- Ctrl/Cmd + Z → undo
- Ctrl/Cmd + Shift + Z → redo
- Toolbar exposes the same actions
- Only *data* state (tasks, links, markers) is tracked; UI state (scroll, selection, drag) is excluded so undo doesn't scramble the view
- `recalculate()` pauses tracking so its internal set() calls don't create false history entries

## Non-functional
- Default history depth is zundo's default (100 entries); consumers can re-initialise via `createGanttStore`
- Single undo entry per bulk operation (see [bulk-ops](../bulk-ops))

## Trade-offs
- UI state is deliberately untracked. If you undo right after scrolling, the scroll position stays — arguably surprising, but the alternative (track everything) makes undo confusing during drag previews
- Temporal middleware lives on the shared store instance. Multi-instance Gantts in one app share one history; use `createGanttStore()` to isolate

## Out of scope
- Persisting history across reloads
- Collaborative undo (per-user stacks for multiplayer)
- Fine-grained per-field undo

## Related features
- [bulk-ops](../bulk-ops) — bulk mutations collapse into single undo entries
