---
id: theming
title: Theming via CSS custom properties
status: stable
since: 0.6.0
category: presentation
owners:
  - src/components/CellGrid.tsx
  - src/components/TaskBar.tsx
  - src/components/Markers.tsx
---

## Nut
Lets consumers re-skin the chart (brand colours, dark mode, high-contrast) without forking the library or importing any CSS file from the package. Every key colour falls back to a sensible default, so not setting a variable keeps existing behaviour.

## Noodzaak
Hardcoded Tailwind utilities forced consumers to either
(a) accept our opinions,
(b) override by writing `!important` selectors against our internals (brittle), or
(c) fork the package.

Colour is the most-requested customisation; it should be a one-liner.

## Functional
- Eight documented variables:
  - `--gantt-weekend-bg`, `--gantt-holiday-bg`
  - `--gantt-today-color`, `--gantt-today-fg`
  - `--gantt-critical-color`
  - `--gantt-baseline-bg`, `--gantt-baseline-stripe`, `--gantt-baseline-border`
- Consumers set them on any ancestor of the chart (typical: `.gantt-container`)
- Dark-mode is a scoping concern — use `.dark .gantt-container { … }` or `@media (prefers-color-scheme: dark)`

## Non-functional
- Zero JS cost — pure CSS cascade
- Zero bundle impact — no stylesheet is shipped; values live as inline fallbacks in components

## Trade-offs
- Category bar colours, status opacity, and text contrast are still driven by Tailwind + shadcn tokens rather than bespoke variables. This keeps the design vocabulary consistent with other shadcn apps but means consumers who don't use shadcn must provide compatible tokens.
- We chose `color-mix()` for blended shadows (e.g. critical-path halo). Browsers older than 2023 may show a flat colour fallback; acceptable given modern React's target support.

## Out of scope
- Full design-token system (use Radix tokens, shadcn, or your own layer)
- Programmatic theme switching APIs (do this via React context + a `className`)
- Per-task colour theming — use `task.color` or `taskCategory` instead

## Related features
- [introspection](../introspection) — `data-gantt-weekend`, `data-gantt-holiday`, `data-gantt-critical` mirror the colour semantics and let tests assert state without reading computed CSS
