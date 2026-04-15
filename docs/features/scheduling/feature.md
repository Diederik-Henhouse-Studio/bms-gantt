---
id: scheduling
title: Scheduling — critical path, slack, auto-schedule
status: stable
since: 0.1.0
category: scheduling
owners:
  - src/store/scheduling.ts
  - src/store/ganttStore.ts
---

## Nut
Turn a raw task graph into a planned schedule: which tasks are on the critical path, how much slack each non-critical task has, and how to propagate a start-date change through the dependency chain.

## Noodzaak
Every serious Gantt needs these three primitives, yet most component libraries ship only the rendering and leave the math to the consumer. Doing CPM, slack, and auto-schedule correctly — with cycles, overlaps, and working days — is non-trivial enough that re-implementing is a trap.

## Functional
- `showCriticalPath: true` adds `critical: true` to tasks on the longest finish path, marks their links `critical: true`
- `showSlack: true` annotates every non-critical task with a `slack` (working days)
- `autoScheduleTasks()` walks dependencies in topological order and re-seats successors so every `e2s` link is satisfied
- All three respect `config.workingDays` and `config.holidays` via the calendar layer
- Cycle detection is pre-emptive: `detectCycles(tasks, links)` returns offending link ids

## Non-functional
- CPM runs in O(V + E); acceptable for tens of thousands of tasks
- Never mutates input arrays
- Deterministic output given identical input (same iteration order)

## Trade-offs
- Currently supports `e2s` propagation only in `autoScheduleTasks`. `e2e`, `s2s`, `s2e` are recognised as link types but their propagation is not applied automatically — document and defer
- Scheduling happens on recalculate; very frequent prop updates pay the CPM cost every time. Consumers can throttle at the data-layer level

## Out of scope
- Resource-constrained scheduling (needs explicit resource assignment)
- PERT / probabilistic durations
- Calendar exceptions per task (single calendar applies to all)

## Related features
- [calendar](../calendar) — working-day awareness comes from here
- [drag-constraints](../drag-constraints) — `lockStart`/`lockEnd` interact with auto-schedule (locked tasks are respected as anchors)
