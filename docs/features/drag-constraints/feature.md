---
id: drag-constraints
title: Per-task drag constraints
status: stable
since: 0.3.0
category: interaction
owners:
  - src/store/dragConstraints.ts
  - src/store/ganttStore.ts
  - src/hooks/useDrag.ts
---

## Nut
Guarantees that a user cannot drag a task into an invalid state. Consumers declare the rules on each task; the store enforces them at drag-commit time.

## Noodzaak
Without constraints a drag can produce:
- Zero- or negative-duration tasks (via over-aggressive resize)
- Overlapping siblings that violate the domain model (e.g. two surgeries in the same operating room)
- Shifted immovable milestones (contract dates, compliance deadlines)

## Functional
- `minDuration` (calendar days) clamps resize on either edge
- `maxDuration` (calendar days) clamps resize on either edge
- `lockStart` freezes `task.start` — move, resize-start are no-ops
- `lockEnd` freezes `task.end` — move, resize-end are no-ops
- `noOverlap` reverts a drag if the proposed range would overlap a sibling sharing `parentId`

## Non-functional
- O(n) in the number of siblings per drag commit (only siblings, not all tasks)
- Pure functions — unit-testable without DOM
- Never throws: a failing constraint yields `{ blocked: true }`, never an exception
- Zero re-renders during drag preview; constraints run only on commit

## Trade-offs
- Constraints apply at **commit**, not **preview**. This keeps the drag smooth but means the user momentarily sees an invalid position before it snaps back.
- `noOverlap` rejects rather than auto-resolves. "Snap to the nearest non-overlapping slot" is explicitly out of scope — it's surprising and domain-dependent.

## Out of scope
- Resource leveling across unrelated tasks (no shared `parentId`)
- Calendar-aware constraints (use `config.workingDays` / `config.holidays` via the scheduling layer)
- Cross-task constraints like "A must end before B starts" (use dependency links + `showCriticalPath`)

## Related features
- [slots](../slots) — consumers can annotate visual state (e.g. striped lock icon) via `slots.renderTaskBar`
- [introspection](../introspection) — scenarios probe constraint outcomes via `handle.snapshot()`
