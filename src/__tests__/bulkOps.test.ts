import { describe, it, expect, beforeEach } from 'vitest';
import { useGanttStore } from '../store';
import { createTask, createLink } from './helpers';

function seed(tasks: ReturnType<typeof createTask>[], links: ReturnType<typeof createLink>[] = []) {
  useGanttStore.setState({ tasks, links, markers: [], selectedTaskIds: [] });
  useGanttStore.getState().recalculate();
}

describe('bulk ops', () => {
  beforeEach(() => {
    useGanttStore.getState().removeTasks([]);
    useGanttStore.setState({ tasks: [], links: [], markers: [], selectedTaskIds: [] });
  });

  describe('removeTasks', () => {
    it('no-ops on empty list', () => {
      const a = createTask({ id: 'a' });
      seed([a]);
      useGanttStore.getState().removeTasks([]);
      expect(useGanttStore.getState().tasks).toHaveLength(1);
    });

    it('removes multiple tasks + their orphaned links', () => {
      const a = createTask({ id: 'a' });
      const b = createTask({ id: 'b' });
      const c = createTask({ id: 'c' });
      const l1 = createLink({ id: 'l1', source: 'a', target: 'b' });
      const l2 = createLink({ id: 'l2', source: 'b', target: 'c' });
      seed([a, b, c], [l1, l2]);

      useGanttStore.getState().removeTasks(['a', 'c']);

      const state = useGanttStore.getState();
      expect(state.tasks.map((t) => t.id)).toEqual(['b']);
      // links referencing removed tasks are gone
      expect(state.links).toHaveLength(0);
    });

    it('removes descendants of summary tasks', () => {
      const p = createTask({ id: 'p', type: 'summary' });
      const c1 = createTask({ id: 'c1', parentId: 'p' });
      const c2 = createTask({ id: 'c2', parentId: 'p' });
      seed([p, c1, c2]);

      useGanttStore.getState().removeTasks(['p']);

      expect(useGanttStore.getState().tasks).toHaveLength(0);
    });

    it('clears removed ids from selection', () => {
      const a = createTask({ id: 'a' });
      const b = createTask({ id: 'b' });
      seed([a, b]);
      useGanttStore.setState({ selectedTaskIds: ['a', 'b'] });

      useGanttStore.getState().removeTasks(['a']);

      expect(useGanttStore.getState().selectedTaskIds).toEqual(['b']);
    });
  });

  describe('shiftTasks', () => {
    it('no-ops on empty list or zero delta', () => {
      const a = createTask({ id: 'a', start: new Date('2026-05-01'), end: new Date('2026-05-10') });
      seed([a]);
      const originalStart = a.start.getTime();
      useGanttStore.getState().shiftTasks([], 5);
      useGanttStore.getState().shiftTasks(['a'], 0);
      expect(useGanttStore.getState().tasks[0].start.getTime()).toBe(originalStart);
    });

    it('shifts multiple tasks by delta days', () => {
      const a = createTask({ id: 'a', start: new Date('2026-05-01'), end: new Date('2026-05-10') });
      const b = createTask({ id: 'b', start: new Date('2026-05-01'), end: new Date('2026-05-10') });
      seed([a, b]);

      useGanttStore.getState().shiftTasks(['a', 'b'], 3);

      const [ta, tb] = useGanttStore.getState().tasks;
      expect(ta.start).toEqual(new Date('2026-05-04'));
      expect(tb.start).toEqual(new Date('2026-05-04'));
    });

    it('skips locked tasks', () => {
      const a = createTask({ id: 'a', start: new Date('2026-05-01'), end: new Date('2026-05-10'), lockStart: true });
      seed([a]);

      useGanttStore.getState().shiftTasks(['a'], 3);

      expect(useGanttStore.getState().tasks[0].start).toEqual(new Date('2026-05-01'));
    });
  });
});
