---
id: bulk-ops
title: Bulk operations (removeTasks, shiftTasks, Delete key)
status: stable
since: 0.4.0
category: interaction
owners:
  - src/store/ganttStore.ts
  - src/components/GanttLayout.tsx
---

## Nut
Operating on the current multi-selection as a single atomic action. One undo entry covers the whole batch, matching user expectation ("I pressed Delete once, I undo once").

## Noodzaak
Looping `removeTask(id)` in userland works but (a) creates N undo entries, (b) triggers N `recalculate()` calls, (c) does not coordinate link cleanup across the batch.

## Functional
- `removeTasks(ids)` deletes tasks + descendants + orphaned links in one pass; updates the selection
- `shiftTasks(ids, deltaDays)` moves multiple tasks by the same delta; respects `lockStart`/`lockEnd`
- Pressing `Delete` or `Backspace` with a selection calls `removeTasks`; ignored when focus is in an `<input>`, `<textarea>`, or `contentEditable` element
- Context menu adapts: with >1 selected task it shows `Delete (N)` using the `onDeleteSelection` callback

## Non-functional
- Single store `set()` per call → one undo entry
- O(n) in the selection size
- Keyboard handler is registered once per `<Gantt>` instance; unmount cleans up

## Trade-offs
- `shiftTasks` moves all selected tasks by the same delta — a "snap to latest-start-in-group" variant is out of scope
- We intercept `Backspace` as a delete shortcut to match common tools; this can be surprising for web apps where Backspace means "back". Accepted because keyboard focus is never on the chart by default — consumers who want different binding can wrap their own handler and prevent-default

## Out of scope
- Multi-select cut/copy/paste
- Bulk re-parenting

## Related features
- [undo-redo](../undo-redo) — bulk actions collapse to one undo step via the zundo middleware
- [drag-constraints](../drag-constraints) — `shiftTasks` honours `lockStart`/`lockEnd`
