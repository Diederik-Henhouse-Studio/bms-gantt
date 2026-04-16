import { describe, it, expect } from 'vitest';
import { positionTasks } from '../store/positioning';
import { createTask, createConfig } from './helpers';
import type { DateRange, TaskSegment } from '../store/types';

const dateRange: DateRange = {
  start: new Date('2026-05-01'),
  end: new Date('2026-05-31'),
};
const totalWidth = 900;
const config = createConfig();

describe('split tasks (segments)', () => {
  it('populates $x/$w on each segment', () => {
    const task = createTask({
      id: 'split',
      start: new Date('2026-05-01'),
      end: new Date('2026-05-20'),
      segments: [
        { start: new Date('2026-05-01'), end: new Date('2026-05-08'), $x: 0, $w: 0 },
        { start: new Date('2026-05-12'), end: new Date('2026-05-20'), $x: 0, $w: 0 },
      ],
    });
    const [positioned] = positionTasks([task], dateRange, totalWidth, config);
    expect(positioned.segments).toHaveLength(2);
    const [s1, s2] = positioned.segments!;
    expect(s1.$x).toBeGreaterThanOrEqual(0);
    expect(s1.$w).toBeGreaterThan(0);
    expect(s2.$x).toBeGreaterThan(s1.$x + s1.$w);
    expect(s2.$w).toBeGreaterThan(0);
  });

  it('non-segmented tasks are unchanged', () => {
    const task = createTask({ id: 'regular', start: new Date('2026-05-01'), end: new Date('2026-05-10') });
    const [positioned] = positionTasks([task], dateRange, totalWidth, config);
    expect(positioned.segments).toBeUndefined();
  });
});
