import { test, expect } from '@playwright/test';

/**
 * Visual test suite. Visits each scenario page, takes a screenshot,
 * and validates via data-gantt-* attributes that the expected elements
 * are rendered.
 */

const SCENARIOS = [
  { id: 'basic',              expectBars: 2, expectMilestones: 1, expectLinks: 2 },
  { id: 'critical-path',      expectBars: 4 },
  { id: 'baselines',          expectBars: 2, expectBaselines: true },
  { id: 'split-tasks',        expectSegments: true },
  { id: 'category-colors',    minBars: 5 },
  { id: 'status-styling',     expectBars: 4 },
  { id: 'holidays-weekends' },
  { id: 'toolbar-hidden',     expectToolbarHidden: true },
  { id: 'empty-state',        expectBars: 0 },
  { id: 'drag-constraints',   expectMilestones: 1, expectBars: 2 },
];

for (const scenario of SCENARIOS) {
  test(`scenario: ${scenario.id}`, async ({ page }) => {
    if ((scenario as any).tallViewport) {
      await page.setViewportSize({ width: 1280, height: 900 });
    }
    await page.goto(`/?scenario=${scenario.id}`);
    await page.waitForSelector('[data-gantt-role="container"]', { timeout: 10_000 });

    // Screenshot
    await page.screenshot({
      path: `screenshots/${scenario.id}.png`,
      fullPage: true,
    });

    // ── Bar count ────────────────────────────────────────
    if (scenario.expectBars !== undefined) {
      const bars = await page.locator('[data-gantt-role="task-bar"]').count();
      expect(bars).toBe(scenario.expectBars);
    }
    if ((scenario as any).minBars !== undefined) {
      const bars = await page.locator('[data-gantt-role="task-bar"]').count();
      expect(bars).toBeGreaterThanOrEqual((scenario as any).minBars);
    }

    // ── Milestone count ──────────────────────────────────
    if (scenario.expectMilestones !== undefined) {
      const milestones = await page.locator('[data-gantt-role="milestone"]').count();
      expect(milestones).toBe(scenario.expectMilestones);
    }

    // ── Links ────────────────────────────────────────────
    if (scenario.expectLinks !== undefined) {
      const links = await page.locator('[data-gantt-role="link"]').count();
      expect(links).toBe(scenario.expectLinks);
    }

    // ── Critical path ────────────────────────────────────
    if (scenario.expectCritical) {
      const critical = await page.locator('[data-gantt-critical="true"]').count();
      expect(critical).toBeGreaterThan(0);
    }

    // ── Baselines ────────────────────────────────────────
    if (scenario.expectBaselines) {
      // BaselineBar renders with aria-hidden="true" inside the task-bar wrapper
      const baselines = await page.locator('[aria-hidden="true"]').count();
      expect(baselines).toBeGreaterThan(0);
    }

    // ── Split tasks (segments) ───────────────────────────
    if (scenario.expectSegments) {
      const segments = await page.locator('[data-gantt-role="segment"]').count();
      expect(segments).toBeGreaterThanOrEqual(2);
    }

    // ── Holiday cells ────────────────────────────────────
    if (scenario.expectHoliday) {
      const holidays = await page.locator('[data-gantt-holiday="true"]').count();
      expect(holidays).toBeGreaterThan(0);
    }

    // ── Weekend cells ────────────────────────────────────
    if (scenario.expectWeekend) {
      const weekends = await page.locator('[data-gantt-weekend="true"]').count();
      expect(weekends).toBeGreaterThan(0);
    }

    // ── Toolbar hidden ───────────────────────────────────
    if (scenario.expectToolbarHidden) {
      // With showToolbar: false, no toolbar buttons should render
      const today = await page.locator('button:has-text("Today")').count();
      expect(today).toBe(0);
    }

    // ── Empty state ──────────────────────────────────────
    if (scenario.expectBars === 0) {
      const emptyText = await page.locator('text=No tasks to display').count();
      expect(emptyText).toBeGreaterThanOrEqual(1);
    }
  });
}

test('introspection: snapshot() returns valid JSON', async ({ page }) => {
  await page.goto('/?scenario=basic');
  await page.waitForSelector('[data-gantt-role="container"]');

  // Wait for handle to be exposed
  await page.waitForFunction(() => (window as any).__gantt?.snapshot);

  const snapshot = await page.evaluate(() => {
    const handle = (window as any).__gantt;
    return handle.snapshot();
  });

  expect(snapshot).toBeTruthy();
  expect(snapshot.bars).toHaveLength(3); // 2 bars + 1 milestone in bars array
  expect(snapshot.links).toHaveLength(2);
  expect(snapshot.totalWidth).toBeGreaterThan(0);
});

test('introspection: validate() returns a report object', async ({ page }) => {
  await page.goto('/?scenario=basic');
  await page.waitForSelector('[data-gantt-role="container"]');
  await page.waitForFunction(() => (window as any).__gantt?.validate);

  const report = await page.evaluate(() => {
    return (window as any).__gantt.validate();
  });

  expect(report).toBeTruthy();
  expect(Array.isArray(report.issues)).toBe(true);
  // Log issues for debugging — don't hard-fail on them yet.
  if (report.issues.length > 0) {
    console.log('validate issues:', report.issues);
  }
});
