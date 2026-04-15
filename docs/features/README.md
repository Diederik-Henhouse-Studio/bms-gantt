# Feature catalog

Every public feature of `@bluemillstudio/gantt` is documented in its own folder. Each folder follows the same layout so agents, tests, and humans can consume the docs uniformly.

## Folder layout

```
<feature-slug>/
├── feature.md        — human context: why, when, trade-offs, scope
├── contract.yaml     — machine-readable API surface + invariants
├── scenarios.yaml    — Given/When/Then cases, agent-executable
└── examples/
    └── *.tsx         — runnable, type-checked snippets
```

Copy [`_template/`](./_template) to start a new feature.

## Status legend

| Symbol | Meaning |
|--------|---------|
| 🟢 | Stable — safe to use, backwards-compatibility protected |
| 🟡 | Experimental — API may change in a minor release |
| 🔴 | Deprecated — slated for removal in a future major |

## Catalog

| Feature | Status | Since | Category |
|---------|--------|-------|----------|
| [analysis](./analysis) | 🟢 | 0.8.0 | data |
| [baselines](./baselines) | 🟢 | 0.1.0 | presentation |
| [bulk-ops](./bulk-ops) | 🟢 | 0.4.0 | interaction |
| [calendar](./calendar) | 🟢 | 0.1.0 | scheduling |
| [computation](./computation) | 🟢 | 0.8.0 | data |
| [drag-constraints](./drag-constraints) | 🟢 | 0.3.0 | interaction |
| [group-headers](./group-headers) | 🟢 | 0.5.2 | presentation |
| [i18n](./i18n) | 🟢 | 0.2.0 | presentation |
| [introspection](./introspection) | 🟢 | 0.7.0 | meta |
| [query](./query) | 🟢 | 0.8.0 | data |
| [scheduling](./scheduling) | 🟢 | 0.1.0 | scheduling |
| [slots](./slots) | 🟢 | 0.3.0 | presentation |
| [theming](./theming) | 🟢 | 0.6.0 | presentation |
| [undo-redo](./undo-redo) | 🟢 | 0.1.0 | interaction |
| [zoom](./zoom) | 🟢 | 0.2.0 | presentation |

## How to run scenarios

Scenarios live in each `scenarios.yaml`. The generic runner at [`tests/features.spec.ts`](../../tests/features.spec.ts) reads every scenarios file, seeds the Gantt, executes the `when` step, and asserts each `then` probe.

Probe types (matches the runner):

| probe | description |
|-------|-------------|
| `dom.attribute` | Read a `data-gantt-*` attribute via a CSS selector |
| `dom.count` | Count elements matching a selector |
| `handle.snapshot.<path>` | Dot-path lookup on the `GanttHandle.snapshot()` JSON |
| `handle.validate` | Call `handle.validate()` and assert `ok`/`issues` |
| `return.<path>` | Dot-path on a `unit-call` return value |
| `console.warnings` | Count `console.warn` events during the scenario |

The runner and probe implementation are a work-in-progress — see the `tests/README.md` stub. The spec files themselves are the contract; the runner is just one execution vehicle. A consumer can run the same scenarios through Cypress, a Claude subagent with MCP browser tools, or a purpose-built harness.

## Style guide

- **One feature = one folder.** If a change spans two features, write two `feature.md` files and cross-link them.
- **Scenarios focus on outcomes, not DOM internals.** Probe via `data-gantt-*` attributes or `handle.snapshot()` — never by CSS class name.
- **Every `then.expect` must be a literal value or a regex**, never a computed expression; keep scenarios declarative so an agent can diff them.
- **Keep `examples/*.tsx` compilable** as plain TypeScript with the package installed; no app-specific imports. CI enforces this: `npm run typecheck:examples` must pass.

## Coverage gate

CI fails if any public export of the library is missing from every `contract.yaml`. The list of intentional omissions lives in [`scripts/check-contract-coverage.mjs`](../../scripts/check-contract-coverage.mjs) with per-group justifications. Adding a new export therefore forces either a documentation update or an explicit waiver decision.
