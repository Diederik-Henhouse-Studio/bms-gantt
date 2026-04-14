import { describe, it, expect } from 'vitest';
import {
  applyMoveConstraints,
  applyResizeStartConstraints,
  applyResizeEndConstraints,
} from '../store/dragConstraints';
import { createTask } from './helpers';

const D = (s: string) => new Date(s);

describe('dragConstraints', () => {
  describe('move', () => {
    it('lockStart blocks move', () => {
      const task = createTask({ id: 't1', start: D('2026-05-01'), end: D('2026-05-10'), lockStart: true });
      const result = applyMoveConstraints(task, D('2026-06-01'), D('2026-06-10'), [task]);
      expect(result.blocked).toBe(true);
      expect(result.start.getTime()).toBe(task.start.getTime());
    });

    it('lockEnd blocks move', () => {
      const task = createTask({ id: 't1', start: D('2026-05-01'), end: D('2026-05-10'), lockEnd: true });
      const result = applyMoveConstraints(task, D('2026-06-01'), D('2026-06-10'), [task]);
      expect(result.blocked).toBe(true);
    });

    it('unconstrained move passes through', () => {
      const task = createTask({ id: 't1', start: D('2026-05-01'), end: D('2026-05-10') });
      const result = applyMoveConstraints(task, D('2026-06-01'), D('2026-06-10'), [task]);
      expect(result.blocked).toBe(false);
      expect(result.start).toEqual(D('2026-06-01'));
    });

    it('noOverlap reverts to original when move would overlap sibling', () => {
      const a = createTask({ id: 'a', parentId: 'p', start: D('2026-05-01'), end: D('2026-05-05'), noOverlap: true });
      const b = createTask({ id: 'b', parentId: 'p', start: D('2026-05-10'), end: D('2026-05-20') });
      const result = applyMoveConstraints(a, D('2026-05-12'), D('2026-05-16'), [a, b]);
      expect(result.blocked).toBe(true);
      expect(result.start.getTime()).toBe(a.start.getTime());
    });
  });

  describe('resize-start', () => {
    it('lockStart blocks resize-start', () => {
      const task = createTask({ id: 't1', start: D('2026-05-01'), end: D('2026-05-10'), lockStart: true });
      const result = applyResizeStartConstraints(task, D('2026-05-05'), task.end, [task]);
      expect(result.blocked).toBe(true);
    });

    it('minDuration clamps the new start', () => {
      const task = createTask({ id: 't1', start: D('2026-05-01'), end: D('2026-05-10'), minDuration: 5 });
      const result = applyResizeStartConstraints(task, D('2026-05-08'), task.end, [task]);
      // end = 2026-05-10; min duration = 5 days → start must be <= 2026-05-05
      expect(result.start).toEqual(D('2026-05-05'));
    });

    it('maxDuration clamps the new start', () => {
      const task = createTask({ id: 't1', start: D('2026-05-01'), end: D('2026-05-10'), maxDuration: 5 });
      const result = applyResizeStartConstraints(task, D('2026-04-20'), task.end, [task]);
      // end = 2026-05-10; max duration = 5 → start >= 2026-05-05
      expect(result.start).toEqual(D('2026-05-05'));
    });
  });

  describe('resize-end', () => {
    it('lockEnd blocks resize-end', () => {
      const task = createTask({ id: 't1', start: D('2026-05-01'), end: D('2026-05-10'), lockEnd: true });
      const result = applyResizeEndConstraints(task, task.start, D('2026-05-20'), [task]);
      expect(result.blocked).toBe(true);
    });

    it('minDuration clamps the new end', () => {
      const task = createTask({ id: 't1', start: D('2026-05-01'), end: D('2026-05-10'), minDuration: 5 });
      const result = applyResizeEndConstraints(task, task.start, D('2026-05-03'), [task]);
      // start = 2026-05-01, min 5 → end >= 2026-05-06
      expect(result.end).toEqual(D('2026-05-06'));
    });

    it('maxDuration clamps the new end', () => {
      const task = createTask({ id: 't1', start: D('2026-05-01'), end: D('2026-05-10'), maxDuration: 7 });
      const result = applyResizeEndConstraints(task, task.start, D('2026-05-20'), [task]);
      // start = 2026-05-01, max 7 → end <= 2026-05-08
      expect(result.end).toEqual(D('2026-05-08'));
    });
  });
});
