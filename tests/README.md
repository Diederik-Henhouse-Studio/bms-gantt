# Scenario runner

Reads every `docs/features/*/scenarios.yaml` and drives the tests in [`features/features.test.ts`](features/features.test.ts).

## Status

| `when.kind` | Implemented |
|-------------|-------------|
| `unit-call` | ✅ |
| `handle-method` | ⏳ (next) |
| `render` | ⏳ (next) |
| `hover`, `keydown`, `drag-simulate`, `sequence` | ⏳ (later) |

Scenarios whose `when.kind` is not yet supported register as `test.skip` so the gap stays visible.

## Probe support

| Probe prefix | Implemented |
|--------------|-------------|
| `return.*` / `return[n]` | ✅ |
| `console.warnings` | ✅ |
| `handle.snapshot.*` | ✅ (once render support lands) |
| `handle.validate` | ✅ (once render support lands) |
| `dom.count`, `dom.attribute`, `dom.text` | ✅ (once render support lands) |

## Running

```bash
npm test                                # full suite — includes feature scenarios
npx vitest run tests/features           # only scenarios
DEBUG_SCENARIOS=1 npx vitest run ...    # verbose per-scenario logging
```

## Reference / interpolation inside scenarios.yaml

- `{ ref: task_a }` → pulls the fixture from `setup.fixtures.task_a`
- ISO strings like `"2026-05-01T00:00:00.000Z"` are converted to `Date`
- `"__REL_DAYS__:-5"` → a `Date` that many days from now
- Arrow-function strings like `"t => t.progress >= 100"` are `eval`'d

## Probes and comparators

Each `then` entry is `{ probe: <name>, <comparator> }`. Comparators:

| Key | Semantics |
|-----|-----------|
| `eq` | `toStrictEqual` (Date coerced to ISO first) |
| `gte`/`gt`/`lte`/`lt` | numeric comparison |
| `match` | regex `toMatch` on `String(actual)` |
| `type` | `typeof actual === value` |
| `approx` | `toBeCloseTo(value, 1)` |
| `contains_object` | array contains an object-matching |
| `all` | every element matches object-matching |
