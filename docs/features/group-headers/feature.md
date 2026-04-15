---
id: group-headers
title: Multi-row group headers
status: stable
since: 0.5.2
category: presentation
owners:
  - src/components/GroupHeaders.tsx
  - src/components/CellGrid.tsx
  - src/store/laneAssignment.ts
---

## Nut
In multi-row mode (`rowMode: 'multi'`) tasks that overlap in time stack into lanes within the same group. A label above each group makes the stacks legible.

## Noodzaak
Without a header the reader sees a block of overlapping bars with no anchor for which group owns them. Alternating row backgrounds alone aren't enough when a single group spans multiple lanes.

## Functional
- In `rowMode: 'multi'`, the chart renders one header row per task group
- Each header shows `group.label · count` where `count` is `group.taskIds.length`
- Headers float above the lanes and scroll vertically with content
- Single-row mode renders nothing — the component short-circuits

## Non-functional
- One extra DOM element per group; zero cost in single-row mode
- Group labels come from the `laneAssignment` layer; no duplicate calculation

## Trade-offs
- Label text is fixed to `label · count`. Custom per-group rendering is not offered as a slot yet (v0.9 candidate)
- Headers overlay instead of pushing content down — keeps alignment with the grid column, but can clip if bars are very dense

## Out of scope
- Collapsible groups
- Per-group action buttons

## Related features
- [slots](../slots) — a future `renderGroupHeader` slot would plug in here
