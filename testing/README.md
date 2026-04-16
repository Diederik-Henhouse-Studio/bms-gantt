# Visual Testing Suite

Docker-based test environment that renders every Gantt scenario in a real browser and validates via:

1. **Playwright** — automated browser tests with screenshots + `data-gantt-*` probes
2. **Crawl4AI** — AI-powered page crawling that extracts rendered state and validates against expectations

## Prerequisites

- Docker + Docker Compose installed
- Library must be built first (`npm run build` in repo root)

## Quick start

```bash
# From repo root
npm run build

# Run everything
cd testing
docker compose up --build

# Or run services individually:
docker compose up --build app          # start the test app at http://localhost:5199
docker compose up --build playwright   # run Playwright tests
docker compose up --build crawl4ai     # run Crawl4AI validation
```

## Test app (http://localhost:5199)

A Vite + React app that renders a `<Gantt>` per scenario, driven by `?scenario=<id>`. 

The index page lists all scenarios as clickable links. Each scenario page:
- Renders the chart with the scenario's tasks/links/config
- Exposes `window.__gantt` (the GanttHandle) for programmatic introspection
- Has `data-gantt-*` attributes on every element for Playwright probes

### Scenarios

| id | Tests |
|----|-------|
| `basic` | 3 tasks + links + milestone |
| `critical-path` | CPM + slack highlighting |
| `baselines` | Plan vs actual shadow bars |
| `split-tasks` | Segmented bar rendering |
| `category-colors` | 7 categories, each with distinct colour |
| `status-styling` | active / paused / cancelled / completed |
| `holidays-weekends` | Weekend + holiday column shading |
| `toolbar-hidden` | showToolbar: false |
| `empty-state` | No tasks placeholder |
| `drag-constraints` | Locked + min/max constrained tasks |

## Playwright tests

`testing/tests/visual.spec.ts` — for each scenario:
1. Navigate to scenario URL
2. Wait for `[data-gantt-role="container"]`
3. Screenshot → `testing/screenshots/<id>.png`
4. Count + assert data-gantt-* elements (bars, links, segments, critical, weekends, holidays)
5. Test `window.__gantt.snapshot()` and `.validate()` on the basic scenario

## Crawl4AI validation

`testing/crawl4ai/validate.py` — crawls each scenario page with a headless browser, extracts the HTML, counts `data-gantt-*` attributes, and validates against per-scenario expectations. Produces `crawl4ai/report.json`.

This is the "agent vision" layer: it proves that what we render is programmatically legible without React access.

## Screenshots

After a run, screenshots land in `testing/screenshots/`. These serve as:
- Visual regression baseline (diff manually or integrate Percy/Chromatic later)
- Evidence for audit reviews
- Documentation assets

## Adding a scenario

1. Add an entry to `testing/app/src/scenarios.ts`
2. Add a row to the `SCENARIOS` array in `testing/tests/visual.spec.ts`
3. Add expectations to `testing/crawl4ai/validate.py`
4. Run `docker compose up --build`

## Local development (without Docker)

```bash
# Terminal 1: start test app
cd testing/app
npm install
npm run dev

# Terminal 2: run Playwright
cd testing
npm install
npx playwright install chromium
npx playwright test

# Terminal 3: run Crawl4AI
cd testing
pip install crawl4ai playwright
python crawl4ai/validate.py
```
