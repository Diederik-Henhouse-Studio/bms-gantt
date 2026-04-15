---
id: analysis
title: Analysis utilities (forecast / resource-load / burndown)
status: stable
since: 0.8.0
category: data
owners:
  - src/analysis.ts
---

## Nut
Common reporting primitives used alongside a Gantt: "when will this realistically finish?", "who's overloaded when?", "are we on track?". Shipped as pure functions so consumers can pipe them into their own chart/card/widget stack.

## Noodzaak
Every serious planning tool re-invents these three. Keeping them out of the library means everyone writes subtly wrong implementations.

## Functional
- `forecastEnd(task, now?)` — linear ETA from current progress; returns `task.end` at 0% or 100%
- `resourceLoad(tasks, { start?, end?, weight?, groupBy? })` — per-day histogram of active tasks + optional breakdown by group
- `burndown(tasks, { start?, end? })` — `[{ date, ideal, actual }]` curve

## Non-functional
- Pure functions; SSR + worker safe
- `resourceLoad` is O(T × D) where T is tasks and D is days in range — fine for typical project sizes
- No allocations per-point except the return array

## Trade-offs
- Linear forecasting is naive. Non-linear (e.g. earned-value) is out of scope; a consumer can replace `forecastEnd` with their own model
- `burndown` treats duration as the work-unit. For story-points or hours, weight via a `computedField` first and pass the adjusted tasks in

## Out of scope
- Monte-Carlo simulation
- Resource levelling (rebalancing overloads)
- Integration with billing / time-tracking systems

## Related features
- [computation](../computation) — feed computed fields into these helpers
- [query](../query) — narrow the task list before running analysis
