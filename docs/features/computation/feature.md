---
id: computation
title: Computed fields + summary aggregators
status: stable
since: 0.8.0
category: data
owners:
  - src/store/computation.ts
  - src/store/ganttStore.ts
  - src/components/Gantt.tsx
---

## Nut
Derive values from tasks (risk, cost, variance, ETA) and roll them up onto summary rows without mutating source data or forking the store. Works with any consumer data layer.

## Noodzaak
Every non-trivial Gantt display mixes raw scheduling data with computed overlays (e.g. "Tasks at risk of slipping"). Consumers had two bad options: mutate their tasks before passing them in, or maintain a parallel map keyed by task id.

## Functional
- `computedFields`: an ordered array of `{ key, compute(task, all) }`. Results land on `task.$computed[key]`
- `summaryAggregators`: `Record<string, (children) => unknown>` — roll up values onto each summary row; runs AFTER computed fields so aggregators can compose over computed children
- Failures in a single compute are swallowed (a `console.warn` is emitted) so one bad field cannot crash recalculate
- `$computed` is available to any render slot (`renderTaskBar`, columns, tooltip) and to the introspection snapshot

## Non-functional
- Runs inside `recalculate()` after positioning/scheduling; no extra traversals
- Pure function contract — no async, no mutation of the full task list
- Aggregator results are recomputed whenever dependent fields change

## Trade-offs
- `$computed` is typed as `Record<string, unknown>` — consumers cast at read time. We considered generics but they bleed into every Gantt prop and wreck inference
- No memoisation across renders. If a compute is expensive, memoise it yourself (React `useMemo` on the fields array)

## Out of scope
- Async computations (fetch within compute). Do the fetch outside, then pass the result in via `tasks`
- Field-level caching (consumer's problem)
- Dependency inference between fields (order is the author's responsibility)

## Related features
- [analysis](../analysis) — common computations (forecast/burndown/load) are already implemented as pure helpers
- [slots](../slots) — `renderTaskBar` / custom columns read `$computed` directly
- [introspection](../introspection) — `snapshot().bars[i]` would expose `$computed` if you add it to LayoutBar (currently omitted for brevity)
