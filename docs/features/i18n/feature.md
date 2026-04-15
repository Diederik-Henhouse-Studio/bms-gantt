---
id: i18n
title: UI-string overrides (labels)
status: stable
since: 0.2.0
category: presentation
owners:
  - src/i18n.tsx
  - src/components/GanttToolbar.tsx
  - src/components/TaskEditor.tsx
  - src/components/GanttContextMenu.tsx
  - src/components/Markers.tsx
  - src/components/GanttGrid.tsx
---

## Nut
Every user-visible string — toolbar labels, tooltips, column headers, dialog copy, "Today" badge — flows through a single `labels` prop with English defaults. Non-English teams can translate without forking.

## Noodzaak
Historically the component shipped with Dutch strings baked in. Public consumers on npm need an obvious, minimal override surface; i18n libraries (react-intl, i18next) are overkill for a library's own chrome.

## Functional
- `<Gantt labels={...} />` accepts `Partial<GanttLabels>`
- Defaults in `DEFAULT_LABELS` exported from the package root
- `zoomLevels` and `taskTypes` are nested partial records — override only the keys you need
- Label resolution is via React context; only mounted components re-read when `labels` changes

## Non-functional
- No external dependency on i18n frameworks
- Zero runtime cost when `labels` is omitted
- All strings documented in one TypeScript type, so IDE autocomplete is enough for translators

## Trade-offs
- No plural-form or ICU-message support — intentionally: a library's own chrome rarely needs them
- No number/date formatting hooks (yet) — currently uses `toLocaleDateString()` with the browser's locale

## Out of scope
- Locale detection
- Bundled language packs
- Direction (RTL) handling

## Related features
- [slots](../slots) — for richer per-task overrides, use render slots instead of label strings
