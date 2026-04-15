import { describe, it, expect } from 'vitest';
import { applyComputedFields, applySummaryAggregators } from '../store/computation';
import { createTask } from './helpers';

describe('computation', () => {
  describe('applyComputedFields', () => {
    it('writes compute() results to $computed[key]', () => {
      const a = createTask({ id: 'a', progress: 40 });
      const b = createTask({ id: 'b', progress: 100 });
      applyComputedFields([a, b], [
        { key: 'done', compute: (t) => t.progress >= 100 },
        { key: 'risk', compute: (t) => (t.progress < 50 ? 'high' : 'low') },
      ]);
      expect(a.$computed?.done).toBe(false);
      expect(a.$computed?.risk).toBe('high');
      expect(b.$computed?.done).toBe(true);
      expect(b.$computed?.risk).toBe('low');
    });

    it('records undefined when compute throws, does not crash', () => {
      const a = createTask({ id: 'a' });
      applyComputedFields([a], [
        { key: 'oops', compute: () => { throw new Error('bad'); } },
      ]);
      expect(a.$computed?.oops).toBeUndefined();
    });

    it('noop when fields empty', () => {
      const a = createTask({ id: 'a' });
      applyComputedFields([a], []);
      expect(a.$computed).toBeUndefined();
    });
  });

  describe('applySummaryAggregators', () => {
    it('aggregates direct children of summary tasks', () => {
      const parent = createTask({ id: 'p', type: 'summary' });
      const c1 = createTask({ id: 'c1', parentId: 'p', duration: 3 });
      const c2 = createTask({ id: 'c2', parentId: 'p', duration: 7 });
      applySummaryAggregators([parent, c1, c2], {
        totalDuration: (children) => children.reduce((s, t) => s + t.duration, 0),
        count: (children) => children.length,
      });
      expect(parent.$computed?.totalDuration).toBe(10);
      expect(parent.$computed?.count).toBe(2);
      expect(c1.$computed).toBeUndefined();
    });

    it('aggregator failures are isolated', () => {
      const parent = createTask({ id: 'p', type: 'summary' });
      applySummaryAggregators([parent], {
        bad: () => { throw new Error('x'); },
      });
      expect(parent.$computed?.bad).toBeUndefined();
    });
  });
});
