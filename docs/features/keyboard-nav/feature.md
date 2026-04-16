---
id: keyboard-nav
title: Keyboard navigation
status: stable
since: 0.9.2
category: a11y
owners:
  - src/components/GanttLayout.tsx
---

## Nut
Navigate and operate on tasks without a mouse. Essential for accessibility (WCAG) and power users.

## Functional
- **Arrow Up / Down** — move selection to adjacent task in flatTasks order. Wraps around at edges. Shift+Arrow extends selection (range).
- **Enter** — fires `onTaskDoubleClick` on the first selected task (opens editor).
- **Space** — toggle the current task in/out of the selection (like Ctrl+click).
- **Delete / Backspace** — remove selected tasks (existing from v0.4).
- **Escape** — clear selection.
- **Ctrl/Cmd+Z** — undo (existing from v0.2).
- **Ctrl/Cmd+Shift+Z** — redo.
- All keys are ignored when focus is in an input/textarea/contentEditable.

## Non-functional
- Single `window.addEventListener('keydown')` per Gantt mount; cleanup on unmount.
- No focus-trap — consumer controls focus policy.

## Trade-offs
- No Home/End (jump to first/last) yet — simple to add when needed.
- No Left/Right (horizontal scroll) — keyboard zoom is already on the toolbar.
- Space is intercepted when a task is selected, which can conflict with page scroll. Accepted because the Gantt is typically the primary interactive element.

## Out of scope
- ARIA live regions for screen readers (requires more research)
- Focus-trap / roving tabindex within the chart
