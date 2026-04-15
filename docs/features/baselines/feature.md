---
id: baselines
title: Baseline (plan-vs-actual) bars
status: stable
since: 0.1.0
category: presentation
owners:
  - src/store/positioning.ts
  - src/components/TaskBar.tsx
---

## Nut
Compare the originally-planned schedule with the live one at a glance. Variance is visible per task without a separate report.

## Noodzaak
Project managers need to see drift. A separate "baseline report" screen is friction — putting it behind the bar keeps context tight.

## Functional
- Per-task `baseStart` and `baseEnd` on `GanttTask`
- `config.showBaselines: true` renders a striped shadow behind each bar with a baseline set
- Missing baseline fields render nothing (silent opt-in per task)
- The baseline bar spans the full row height and sits behind the live bar

## Non-functional
- Single additional DOM element per task with a baseline — negligible cost
- Uses CSS `repeating-linear-gradient`; no extra assets

## Trade-offs
- No numeric variance indicator by default; consumers compute `variance` via a `computedField` and render it in a column or slot
- `showBaselines` is global. A per-task toggle is not offered; if a baseline shouldn't show, omit its `baseStart`/`baseEnd`

## Out of scope
- Multiple baselines (e.g. "Baseline v1" vs "v2")
- Baseline series on links / markers

## Related features
- [theming](../theming) — `--gantt-baseline-bg`, `--gantt-baseline-stripe`, `--gantt-baseline-border`
- [computation](../computation) — compute `variance = actual - planned` via `computedFields`
