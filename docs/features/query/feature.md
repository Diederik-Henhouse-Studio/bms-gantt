---
id: query
title: Pure query helpers (filter / sort / group)
status: stable
since: 0.8.0
category: data
owners:
  - src/query.ts
---

## Nut
Compose simple data pipelines over `GanttTask[]` without pulling in React or the store. Intended for feeding `tasks` into `<Gantt>` after applying UI-level filters/sort.

## Noodzaak
Every application eventually wants "only active tasks", "sorted by start date", or "grouped by owner". Writing these by hand is fine, but the same three come up constantly — shipping battle-tested versions removes the off-by-one risks.

## Functional
- `filterTasks(tasks, filter)` — returns a new array matching the criteria
- `sortTasks(tasks, ...keys)` — multi-key stable sort
- `groupTasksBy(tasks, keyFn)` — `Map<K, GanttTask[]>` preserving insertion order
- Filter supports: text (case-insensitive substring), status, category, overlap range, progress range, critical, parentIdIn, and a free-form `where` predicate

## Non-functional
- Pure functions — no side effects, no async
- Safe for SSR and web-worker use
- Sub-export keeps the bundle lean: a consumer who only wants query helpers does not pay for React

## Trade-offs
- Not a general-purpose query DSL. If you need SQL-like composition, use `where` as an escape hatch or adopt a dedicated library
- Sort by computed-field keys requires a function key: `sortTasks(tasks, (t) => Number(t.$computed?.cost ?? 0))`

## Out of scope
- Joins across task/link arrays
- Persistence, caching, or memoisation (consumer concern)
- Streaming / async iteration

## Related features
- [computation](../computation) — computed fields often feed into sort/filter predicates
- [analysis](../analysis) — query helpers shape inputs to the analysis helpers
