import { describe, it, expect } from 'vitest';
import {
  positionTasks,
  positionBaselines,
  calcLinkPoints,
  positionLinks,
} from '../store/positioning';
import { createTask, createConfig, createLink } from './helpers';
import type { DateRange, GanttTask, GanttLink } from '../store/types';

// ── Shared fixtures ─────────────────────────────────────────────

const dateRange: DateRange = {
  start: new Date('2026-06-01'),
  end: new Date('2026-06-30'),
};
const totalWidth = 1000;
const config = createConfig();

// ═══════════════════════════════════════════════════════════════
// positionTasks
// ═══════════════════════════════════════════════════════════════

describe('positionTasks', () => {
  it('empty array returns empty', () => {
    const result = positionTasks([], dateRange, totalWidth, config);
    expect(result).toEqual([]);
  });

  it('sets $x, $y, $w, $h on each task', () => {
    const tasks = [
      createTask({ id: 't1', start: new Date('2026-06-05'), end: new Date('2026-06-15') }),
      createTask({ id: 't2', start: new Date('2026-06-10'), end: new Date('2026-06-20') }),
    ];
    const result = positionTasks(tasks, dateRange, totalWidth, config);
    for (const t of result) {
      expect(typeof t.$x).toBe('number');
      expect(typeof t.$y).toBe('number');
      expect(typeof t.$w).toBe('number');
      expect(typeof t.$h).toBe('number');
      expect(t.$w).toBeGreaterThan(0);
      expect(t.$h).toBeGreaterThan(0);
    }
  });

  it('$y increments by cellHeight per row', () => {
    const tasks = [
      createTask({ id: 't1' }),
      createTask({ id: 't2' }),
      createTask({ id: 't3' }),
    ];
    const result = positionTasks(tasks, dateRange, totalWidth, config);
    for (let i = 1; i < result.length; i++) {
      const prevY = result[i - 1].$y;
      const currY = result[i].$y;
      expect(currY - prevY).toBe(config.cellHeight);
    }
  });

  it('milestone gets fixed width (diamond)', () => {
    const milestone = createTask({
      id: 'ms1',
      type: 'milestone',
      start: new Date('2026-06-10'),
      end: new Date('2026-06-10'),
    });
    const result = positionTasks([milestone], dateRange, totalWidth, config);
    expect(result[0].$w).toBe(16);
    expect(result[0].$h).toBe(config.barHeight);
  });

  it('summary has different height', () => {
    const summary = createTask({
      id: 'sum1',
      type: 'summary',
      start: new Date('2026-06-01'),
      end: new Date('2026-06-20'),
    });
    const regular = createTask({
      id: 'reg1',
      type: 'task',
      start: new Date('2026-06-01'),
      end: new Date('2026-06-20'),
    });
    const results = positionTasks([summary, regular], dateRange, totalWidth, config);
    // Summary height is barHeight - 4, regular is barHeight
    expect(results[0].$h).toBe(config.barHeight - 4);
    expect(results[1].$h).toBe(config.barHeight);
  });

  it('task with end < start gets minimum width (4px)', () => {
    const inverted = createTask({
      id: 'inv',
      start: new Date('2026-06-15'),
      end: new Date('2026-06-05'), // end before start
    });
    const result = positionTasks([inverted], dateRange, totalWidth, config);
    expect(result[0].$w).toBe(4);
  });
});

// ═══════════════════════════════════════════════════════════════
// positionBaselines
// ═══════════════════════════════════════════════════════════════

describe('positionBaselines', () => {
  it('tasks without baseStart/baseEnd unchanged', () => {
    const task = createTask({ id: 't1' });
    const result = positionBaselines([task], dateRange, totalWidth, config);
    expect(result[0].$bx).toBeUndefined();
    expect(result[0].$bw).toBeUndefined();
    expect(result[0].$bh).toBeUndefined();
    // The returned task should be the same reference (no spread)
    expect(result[0]).toBe(task);
  });

  it('tasks with baselines get $bx, $bw, $bh, $by', () => {
    const task = createTask({
      id: 't1',
      start: new Date('2026-06-05'),
      end: new Date('2026-06-15'),
      baseStart: new Date('2026-06-03'),
      baseEnd: new Date('2026-06-12'),
    });
    const result = positionBaselines([task], dateRange, totalWidth, config);
    const t = result[0];
    expect(typeof t.$bx).toBe('number');
    expect(typeof t.$bw).toBe('number');
    expect(typeof t.$bh).toBe('number');
    expect(typeof t.$by).toBe('number');
    expect(t.$bw).toBeGreaterThan(0);
    expect(t.$bh).toBe(6); // fixed 6px baseline height
    // Baseline bar is below main bar
    expect(t.$by!).toBeGreaterThan(config.barPadding);
  });
});

// ═══════════════════════════════════════════════════════════════
// calcLinkPoints
// ═══════════════════════════════════════════════════════════════

describe('calcLinkPoints', () => {
  function positioned(overrides: Partial<GanttTask>): GanttTask {
    return createTask({
      $x: 100,
      $y: 10,
      $w: 200,
      $h: 24,
      ...overrides,
    });
  }

  function parsePolyline(points: string): { x: number; y: number }[] {
    return points.split(' ').map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      return { x, y };
    });
  }

  it('e2s returns valid polyline string', () => {
    const source = positioned({ id: 's', $x: 100, $y: 10, $w: 200, $h: 24 });
    const target = positioned({ id: 't', $x: 400, $y: 50, $w: 200, $h: 24 });
    const link = createLink({ source: 's', target: 't', type: 'e2s' });
    const points = calcLinkPoints(link, source, target);
    const parsed = parsePolyline(points);
    // Must start at source end
    expect(parsed[0].x).toBe(300); // $x + $w
    // Must end at target start
    expect(parsed[parsed.length - 1].x).toBe(400); // target.$x
    expect(parsed.length).toBeGreaterThanOrEqual(3);
  });

  it('e2e returns valid polyline', () => {
    const source = positioned({ id: 's', $x: 100, $y: 10, $w: 200, $h: 24 });
    const target = positioned({ id: 't', $x: 400, $y: 50, $w: 150, $h: 24 });
    const link = createLink({ source: 's', target: 't', type: 'e2e' });
    const points = calcLinkPoints(link, source, target);
    const parsed = parsePolyline(points);
    // Starts at source end
    expect(parsed[0].x).toBe(300);
    // Ends at target end
    expect(parsed[parsed.length - 1].x).toBe(550); // 400 + 150
    expect(parsed.length).toBeGreaterThanOrEqual(3);
  });

  it('s2s returns valid polyline', () => {
    const source = positioned({ id: 's', $x: 100, $y: 10, $w: 200, $h: 24 });
    const target = positioned({ id: 't', $x: 400, $y: 50, $w: 200, $h: 24 });
    const link = createLink({ source: 's', target: 't', type: 's2s' });
    const points = calcLinkPoints(link, source, target);
    const parsed = parsePolyline(points);
    // Starts at source start
    expect(parsed[0].x).toBe(100);
    // Ends at target start
    expect(parsed[parsed.length - 1].x).toBe(400);
    expect(parsed.length).toBeGreaterThanOrEqual(3);
  });

  it('s2e returns valid polyline', () => {
    const source = positioned({ id: 's', $x: 100, $y: 10, $w: 200, $h: 24 });
    const target = positioned({ id: 't', $x: 400, $y: 50, $w: 200, $h: 24 });
    const link = createLink({ source: 's', target: 't', type: 's2e' });
    const points = calcLinkPoints(link, source, target);
    const parsed = parsePolyline(points);
    // Starts at source start
    expect(parsed[0].x).toBe(100);
    // Ends at target end
    expect(parsed[parsed.length - 1].x).toBe(600); // 400 + 200
    expect(parsed.length).toBeGreaterThanOrEqual(3);
  });

  it('tight layout (M11 fix): no crossing lines', () => {
    // Target is left of / very close to source -- the wrap-around route
    const source = positioned({ id: 's', $x: 400, $y: 10, $w: 200, $h: 24 });
    const target = positioned({ id: 't', $x: 100, $y: 50, $w: 200, $h: 24 });
    const link = createLink({ source: 's', target: 't', type: 'e2s' });
    const points = calcLinkPoints(link, source, target);
    const parsed = parsePolyline(points);
    // Should produce wrap-around route (6 points) since target is before source
    expect(parsed.length).toBe(6);
    // First point at source end
    expect(parsed[0].x).toBe(600); // 400 + 200
    // Last point at target start
    expect(parsed[parsed.length - 1].x).toBe(100);
    // The detour Y should be away from both bars (no crossing)
    const sMidY = source.$y + source.$h / 2; // 22
    const tMidY = target.$y + target.$h / 2; // 62
    const detourY = parsed[2].y;
    // Detour should be beyond both midpoints (below both, since sy < ty)
    expect(detourY).toBeGreaterThan(Math.max(sMidY, tMidY));
  });
});

// ═══════════════════════════════════════════════════════════════
// positionLinks
// ═══════════════════════════════════════════════════════════════

describe('positionLinks', () => {
  it('routes all links with valid source+target', () => {
    const t1 = createTask({ id: 't1', $x: 100, $y: 10, $w: 200, $h: 24 });
    const t2 = createTask({ id: 't2', $x: 400, $y: 50, $w: 200, $h: 24 });
    const taskMap = new Map<string, GanttTask>([
      ['t1', t1],
      ['t2', t2],
    ]);
    const links: GanttLink[] = [
      createLink({ id: 'l1', source: 't1', target: 't2', type: 'e2s' }),
    ];
    const result = positionLinks(links, taskMap);
    expect(result.length).toBe(1);
    expect(result[0].$points).toBeDefined();
    expect(typeof result[0].$points).toBe('string');
    expect(result[0].$points!.length).toBeGreaterThan(0);
  });

  it('skips links with missing source or target (collapsed tasks)', () => {
    const t1 = createTask({ id: 't1', $x: 100, $y: 10, $w: 200, $h: 24 });
    const taskMap = new Map<string, GanttTask>([['t1', t1]]);
    const links: GanttLink[] = [
      createLink({ id: 'l1', source: 't1', target: 'missing', type: 'e2s' }),
      createLink({ id: 'l2', source: 'missing', target: 't1', type: 'e2s' }),
    ];
    const result = positionLinks(links, taskMap);
    expect(result.length).toBe(0);
  });

  it('returns empty for empty links', () => {
    const taskMap = new Map<string, GanttTask>();
    const result = positionLinks([], taskMap);
    expect(result).toEqual([]);
  });
});
