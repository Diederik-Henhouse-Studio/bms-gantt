# Contributing to @bluemillstudio/gantt

Thanks for your interest! Here's how to get started.

## Development setup

```bash
git clone https://github.com/Diederik-Henhouse-Studio/bms-gantt.git
cd bms-gantt
npm install
npm run build
npm test              # 256 unit + scenario tests
npm run typecheck     # strict TypeScript
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run build` | Build dist/ via tsup |
| `npm test` | Vitest (unit + scenario runner) |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:coverage` | Coverage report |
| `npm run typecheck` | Type-check src/ |
| `npm run typecheck:examples` | Type-check docs/features/*/examples/ |
| `npm run check:contract-coverage` | Verify all exports are documented |
| `npm run check:scenarios` | Lint scenarios.yaml files |
| `npm run check:catalog` | Verify catalog index matches folders |
| `npm run docs:catalog` | Regenerate catalog table from frontmatter |
| `npm run check:pkg` | publint + arethetypeswrong |

## Adding a feature

1. Create a branch: `git checkout -b feat/my-feature`
2. Write the code + tests
3. Add a feature folder: `cp -r docs/features/_template docs/features/my-feature`
4. Fill in `feature.md`, `contract.yaml`, `scenarios.yaml`, and at least one `examples/*.tsx`
5. Run `npm run docs:catalog` to update the index
6. Verify CI passes locally:
   ```bash
   npm run typecheck && npm run typecheck:examples && \
   npm run check:contract-coverage && npm run check:scenarios && \
   npm run check:catalog && npm test && npm run build
   ```
7. Open a PR

## Visual testing

```bash
npm run build
cd testing
docker compose up --build app    # http://localhost:5199
# Then in another terminal:
npx playwright test --config playwright.config.ts
```

See [testing/README.md](testing/README.md) for details.

## Commit style

- Descriptive subject line in imperative mood
- Body lists what changed
- Reference issue numbers: `Closes #123`
- CI is the gate — no manual review required for green PRs

## Code conventions

- TypeScript strict mode, no `any` in public API types
- Tailwind CSS for styling; shadcn/ui CSS variables for theming
- Pure functions preferred; side effects isolated in store actions
- New public exports require a `contract.yaml` entry (CI enforces this)
- Scenarios should probe via `data-gantt-*` attributes, never CSS class names

## License

By contributing you agree that your contributions are licensed under the [MIT License](LICENSE).
