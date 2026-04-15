---
id: calendar
title: Working-day calendar
status: stable
since: 0.1.0
category: scheduling
owners:
  - src/store/calendar.ts
  - src/store/scales.ts
---

## Nut
Turn wall-clock intervals into working durations. "5 working days" from a Monday is the following Monday, accounting for weekends and configured holidays.

## Noodzaak
Without a calendar every duration-based computation (auto-schedule, slack, CPM) silently uses calendar days, producing wrong durations for real-world projects.

## Functional
- `config.workingDays`: ISO weekday numbers that count as working (default `[1..5]`)
- `config.holidays`: array of `Date` values treated as non-working
- `createCalendar(config)` returns a `GanttCalendar` helper used internally
- Scale cells carry `isWeekend` + `isHoliday` booleans so the chart background can tint them
- Scheduling utilities accept the calendar to offset dates correctly

## Non-functional
- Holidays are indexed by local-date key; lookup is O(1) per day
- Pure functions, safe for SSR
- Same calendar instance is reused within a single `recalculate()` call

## Trade-offs
- One global calendar per Gantt — no per-task calendars or resource calendars
- Holidays are compared by local date (ignores time-of-day). This matches most domain usage but means DST edges can be surprising; see #11 (DST-safe math, deferred)

## Out of scope
- Partial working days (e.g. Friday 4 hours)
- Calendar composition / inheritance
- Locale-specific default holiday sets

## Related features
- [scheduling](../scheduling) — consumes the calendar for CPM, slack, auto-schedule
- [theming](../theming) — weekend/holiday shading respects the calendar
