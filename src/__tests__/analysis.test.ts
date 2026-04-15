import { describe, it, expect } from 'vitest';
import { forecastEnd, resourceLoad, burndown } from '../analysis';
import { createTask } from './helpers';

describe('forecastEnd', () => {
  it('returns task.end at 0% (no info)', () => {
    const t = createTask({
      start: new Date('2026-05-01'),
      end: new Date('2026-05-10'),
      progress: 0,
    });
    expect(forecastEnd(t, new Date('2026-05-05'))).toEqual(new Date('2026-05-10'));
  });

  it('returns task.end at 100% (done)', () => {
    const t = createTask({
      start: new Date('2026-05-01'),
      end: new Date('2026-05-10'),
      progress: 100,
    });
    expect(forecastEnd(t, new Date('2026-05-20'))).toEqual(new Date('2026-05-10'));
  });

  it('projects slower than planned when progress lags', () => {
    const t = createTask({
      start: new Date('2026-05-01'),
      end: new Date('2026-05-11'),
      progress: 25, // 25% in 5 days → should project to ~20 days total
    });
    const f = forecastEnd(t, new Date('2026-05-06'));
    expect(f.getDate()).toBe(21);
  });
});

describe('resourceLoad', () => {
  it('produces per-day bucket for every day in range', () => {
    const a = createTask({ id: 'a', start: new Date('2026-05-01'), end: new Date('2026-05-03') });
    const b = createTask({ id: 'b', start: new Date('2026-05-02'), end: new Date('2026-05-02') });
    const buckets = resourceLoad([a, b]);
    expect(buckets).toHaveLength(3);
    expect(buckets[0]).toEqual({ date: '2026-05-01', count: 1, load: 1, breakdown: undefined });
    expect(buckets[1].count).toBe(2);
    expect(buckets[2].count).toBe(1);
  });

  it('uses weight function when provided', () => {
    const a = createTask({ id: 'a', start: new Date('2026-05-01'), end: new Date('2026-05-01') });
    const buckets = resourceLoad([a], { weight: () => 3 });
    expect(buckets[0].load).toBe(3);
  });

  it('supports groupBy breakdown', () => {
    const a = createTask({ id: 'a', start: new Date('2026-05-01'), end: new Date('2026-05-01'), status: 'active' });
    const b = createTask({ id: 'b', start: new Date('2026-05-01'), end: new Date('2026-05-01'), status: 'paused' });
    const buckets = resourceLoad([a, b], { groupBy: (t) => t.status });
    expect(buckets[0].breakdown).toEqual({ active: 1, paused: 1 });
  });
});

describe('burndown', () => {
  it('returns ideal line from total to 0', () => {
    const a = createTask({ id: 'a', start: new Date('2026-05-01'), end: new Date('2026-05-05'), duration: 5, progress: 0 });
    const points = burndown([a]);
    expect(points[0].ideal).toBeCloseTo(5, 1);
    expect(points[points.length - 1].ideal).toBeCloseTo(0, 1);
  });

  it('actual reflects remaining proportional to progress', () => {
    const a = createTask({ id: 'a', start: new Date('2026-05-01'), end: new Date('2026-05-05'), duration: 10, progress: 50 });
    const points = burndown([a]);
    // Within task window every point should report 5 remaining.
    const within = points.filter((p) => p.date >= '2026-05-01' && p.date <= '2026-05-05');
    for (const p of within) expect(p.actual).toBe(5);
  });
});
