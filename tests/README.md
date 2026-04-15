# Scenario runner (stub)

Each feature folder under `docs/features/*/` carries a `scenarios.yaml` whose entries are agent-executable. This directory will host the generic runner that enumerates them.

## Status: work-in-progress

Today the specs are the contract — humans and LLMs can already execute them manually or drive them through an MCP browser tool. A single-entry-point runner that covers every `when.kind` is not yet checked in.

## Planned

```
tests/
├── README.md                   (this file)
├── runner/
│   ├── parse.ts                — load + validate all scenarios.yaml
│   ├── probes.ts               — dom, handle, return, console
│   └── driver.playwright.ts    — Playwright-based executor
└── features.spec.ts            — enumerates scenarios via Playwright's test.each
```

## Probe implementation sketch

| probe | implementation |
|-------|---------------|
| `dom.attribute { selector, attribute }` | `page.locator(selector).getAttribute(attribute)` |
| `dom.count { selector }` | `page.locator(selector).count()` |
| `handle.snapshot.<dot.path>` | `page.evaluate(() => window.__gantt.snapshot())` then dot-resolve (v0.7.1 debug hook required) |
| `handle.validate` | `page.evaluate(() => window.__gantt.validate())` |
| `return.<dot.path>` | invoke the `unit-call`'s module/fn, assert on the return value (runs in Node, not in the browser) |
| `console.warnings` | attach listener before render, count after |

## `when` kinds

| kind | description |
|------|-------------|
| `render` | mount `<Gantt>` with setup data and stop |
| `drag-simulate` | dispatch pointerdown/move/up on a selector to simulate a drag |
| `unit-call` | import a module, invoke a pure function, capture return |
| `handle-method` | after render, call a method on the `GanttHandle` ref |

## Open questions

- Should the runner also emit a JSON summary consumable by CI dashboards?
- Do we want property-based fuzzing over the `setup.tasks` arrays?
- Visual regression: integrate Percy/Chromatic, or synthesize diffs from `snapshot()`?

These decisions gate when we can close the "scenario runner" milestone.
