import { describe, it, expect } from 'vitest';
import {
  detectOverlaps,
  assignLanes,
  groupAndAssignLanes,
} from '../store/laneAssignment';
import { createTask } from './helpers';

// ═══════════════════════════════════════════════════════════════
// detectOverlaps
// ═══════════════════════════════════════════════════════════════

describe('detectOverlaps', () => {
  it('no overlap returns empty', () => {
    const tasks = [
      createTask({
        id: 'a',
        start: new Date('2026-03-01'),
        end: new Date('2026-03-05'),
      }),
      createTask({
        id: 'b',
        start: new Date('2026-03-06'),
        end: new Date('2026-03-10'),
      }),
    ];
    const pairs = detectOverlaps(tasks);
    expect(pairs).toEqual([]);
  });

  it('touching tasks (end === start) do not overlap (half-open intervals)', () => {
    const tasks = [
      createTask({
        id: 'a',
        start: new Date('2026-03-01'),
        end: new Date('2026-03-05'),
      }),
      createTask({
        id: 'b',
        start: new Date('2026-03-05'),
        end: new Date('2026-03-10'),
      }),
    ];
    const pairs = detectOverlaps(tasks);
    expect(pairs).toEqual([]);
  });

  it('two overlapping tasks return one pair', () => {
    const tasks = [
      createTask({
        id: 'a',
        start: new Date('2026-03-01'),
        end: new Date('2026-03-10'),
      }),
      createTask({
        id: 'b',
        start: new Date('2026-03-05'),
        end: new Date('2026-03-15'),
      }),
    ];
    const pairs = detectOverlaps(tasks);
    expect(pairs).toEqual([['a', 'b']]);
  });

  it('three tasks, two overlap, returns correct pairs', () => {
    const tasks = [
      createTask({
        id: 'a',
        start: new Date('2026-03-01'),
        end: new Date('2026-03-10'),
      }),
      createTask({
        id: 'b',
        start: new Date('2026-03-05'),
        end: new Date('2026-03-12'),
      }),
      createTask({
        id: 'c',
        start: new Date('2026-03-15'),
        end: new Date('2026-03-20'),
      }),
    ];
    const pairs = detectOverlaps(tasks);
    // Only a-b overlap; c starts after both end
    expect(pairs).toEqual([['a', 'b']]);
  });

  it('three fully overlapping tasks return three pairs', () => {
    const tasks = [
      createTask({
        id: 'a',
        start: new Date('2026-03-01'),
        end: new Date('2026-03-20'),
      }),
      createTask({
        id: 'b',
        start: new Date('2026-03-05'),
        end: new Date('2026-03-25'),
      }),
      createTask({
        id: 'c',
        start: new Date('2026-03-10'),
        end: new Date('2026-03-30'),
      }),
    ];
    const pairs = detectOverlaps(tasks);
    expect(pairs).toHaveLength(3);
    expect(pairs).toContainEqual(['a', 'b']);
    expect(pairs).toContainEqual(['a', 'c']);
    expect(pairs).toContainEqual(['b', 'c']);
  });

  it('single task returns empty', () => {
    const tasks = [
      createTask({
        id: 'a',
        start: new Date('2026-03-01'),
        end: new Date('2026-03-10'),
      }),
    ];
    expect(detectOverlaps(tasks)).toEqual([]);
  });

  it('empty array returns empty', () => {
    expect(detectOverlaps([])).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════
// assignLanes
// ═══════════════════════════════════════════════════════════════

describe('assignLanes', () => {
  it('empty array returns 0 lanes', () => {
    const { tasks, laneCount } = assignLanes([]);
    expect(tasks).toEqual([]);
    expect(laneCount).toBe(0);
  });

  it('non-overlapping tasks all get lane 0', () => {
    const input = [
      createTask({
        id: 'a',
        start: new Date('2026-03-01'),
        end: new Date('2026-03-05'),
      }),
      createTask({
        id: 'b',
        start: new Date('2026-03-06'),
        end: new Date('2026-03-10'),
      }),
      createTask({
        id: 'c',
        start: new Date('2026-03-11'),
        end: new Date('2026-03-15'),
      }),
    ];
    const { tasks, laneCount } = assignLanes(input);
    expect(laneCount).toBe(1);
    for (const t of tasks) {
      expect(t.$lane).toBe(0);
    }
  });

  it('two overlapping tasks get lanes 0 and 1', () => {
    const input = [
      createTask({
        id: 'a',
        start: new Date('2026-03-01'),
        end: new Date('2026-03-10'),
      }),
      createTask({
        id: 'b',
        start: new Date('2026-03-05'),
        end: new Date('2026-03-15'),
      }),
    ];
    const { tasks, laneCount } = assignLanes(input);
    expect(laneCount).toBe(2);
    const taskA = tasks.find((t) => t.id === 'a')!;
    const taskB = tasks.find((t) => t.id === 'b')!;
    expect(taskA.$lane).toBe(0);
    expect(taskB.$lane).toBe(1);
  });

  it('three tasks with partial overlap get correct assignment', () => {
    // a: Mar 1-10
    // b: Mar 5-12 (overlaps a)
    // c: Mar 11-20 (overlaps b but not a, so reuses lane 0)
    const input = [
      createTask({
        id: 'a',
        start: new Date('2026-03-01'),
        end: new Date('2026-03-10'),
      }),
      createTask({
        id: 'b',
        start: new Date('2026-03-05'),
        end: new Date('2026-03-12'),
      }),
      createTask({
        id: 'c',
        start: new Date('2026-03-11'),
        end: new Date('2026-03-20'),
      }),
    ];
    const { tasks, laneCount } = assignLanes(input);
    expect(laneCount).toBe(2);
    const taskA = tasks.find((t) => t.id === 'a')!;
    const taskB = tasks.find((t) => t.id === 'b')!;
    const taskC = tasks.find((t) => t.id === 'c')!;
    expect(taskA.$lane).toBe(0);
    expect(taskB.$lane).toBe(1);
    // c starts after a ends, so it reuses lane 0
    expect(taskC.$lane).toBe(0);
  });

  it('three fully overlapping tasks need 3 lanes', () => {
    const input = [
      createTask({
        id: 'a',
        start: new Date('2026-03-01'),
        end: new Date('2026-03-20'),
      }),
      createTask({
        id: 'b',
        start: new Date('2026-03-05'),
        end: new Date('2026-03-25'),
      }),
      createTask({
        id: 'c',
        start: new Date('2026-03-10'),
        end: new Date('2026-03-30'),
      }),
    ];
    const { tasks, laneCount } = assignLanes(input);
    expect(laneCount).toBe(3);
    expect(tasks.find((t) => t.id === 'a')!.$lane).toBe(0);
    expect(tasks.find((t) => t.id === 'b')!.$lane).toBe(1);
    expect(tasks.find((t) => t.id === 'c')!.$lane).toBe(2);
  });

  it('single task gets lane 0', () => {
    const input = [
      createTask({
        id: 'a',
        start: new Date('2026-03-01'),
        end: new Date('2026-03-10'),
      }),
    ];
    const { tasks, laneCount } = assignLanes(input);
    expect(laneCount).toBe(1);
    expect(tasks[0].$lane).toBe(0);
  });

  it('is pure — does not mutate input tasks', () => {
    const original = createTask({
      id: 'a',
      start: new Date('2026-03-01'),
      end: new Date('2026-03-10'),
    });
    const input = [original];
    assignLanes(input);
    expect(original.$lane).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// groupAndAssignLanes
// ═══════════════════════════════════════════════════════════════

describe('groupAndAssignLanes', () => {
  it('groups tasks by parentId', () => {
    const tasks = [
      createTask({
        id: 'a1',
        parentId: 'groupA',
        start: new Date('2026-03-01'),
        end: new Date('2026-03-10'),
      }),
      createTask({
        id: 'a2',
        parentId: 'groupA',
        start: new Date('2026-03-05'),
        end: new Date('2026-03-15'),
      }),
      createTask({
        id: 'b1',
        parentId: 'groupB',
        start: new Date('2026-03-01'),
        end: new Date('2026-03-10'),
      }),
    ];
    const { groups, tasks: result } = groupAndAssignLanes(tasks);

    expect(groups).toHaveLength(2);
    const groupA = groups.find((g) => g.id === 'groupA')!;
    const groupB = groups.find((g) => g.id === 'groupB')!;
    expect(groupA.taskIds).toEqual(expect.arrayContaining(['a1', 'a2']));
    expect(groupA.taskIds).toHaveLength(2);
    expect(groupB.taskIds).toEqual(['b1']);
  });

  it('independent lane counts per group', () => {
    const tasks = [
      // Group A: two overlapping tasks -> 2 lanes
      createTask({
        id: 'a1',
        parentId: 'groupA',
        start: new Date('2026-03-01'),
        end: new Date('2026-03-10'),
      }),
      createTask({
        id: 'a2',
        parentId: 'groupA',
        start: new Date('2026-03-05'),
        end: new Date('2026-03-15'),
      }),
      // Group B: two sequential tasks -> 1 lane
      createTask({
        id: 'b1',
        parentId: 'groupB',
        start: new Date('2026-03-01'),
        end: new Date('2026-03-05'),
      }),
      createTask({
        id: 'b2',
        parentId: 'groupB',
        start: new Date('2026-03-06'),
        end: new Date('2026-03-10'),
      }),
    ];
    const { groups } = groupAndAssignLanes(tasks);
    const groupA = groups.find((g) => g.id === 'groupA')!;
    const groupB = groups.find((g) => g.id === 'groupB')!;
    expect(groupA.laneCount).toBe(2);
    expect(groupB.laneCount).toBe(1);
  });

  it('null parentId goes to root group', () => {
    const tasks = [
      createTask({
        id: 'r1',
        parentId: null,
        start: new Date('2026-03-01'),
        end: new Date('2026-03-10'),
      }),
      createTask({
        id: 'r2',
        parentId: null,
        start: new Date('2026-03-05'),
        end: new Date('2026-03-15'),
      }),
    ];
    const { groups, tasks: result } = groupAndAssignLanes(tasks);
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe('__root__');
    expect(groups[0].label).toBe('Root');
    expect(groups[0].taskIds).toHaveLength(2);
    // Verify tasks get $groupId
    for (const t of result) {
      expect(t.$groupId).toBe('__root__');
    }
  });

  it('sets $groupId on all returned tasks', () => {
    const tasks = [
      createTask({
        id: 'a1',
        parentId: 'groupA',
        start: new Date('2026-03-01'),
        end: new Date('2026-03-10'),
      }),
      createTask({
        id: 'b1',
        parentId: 'groupB',
        start: new Date('2026-03-01'),
        end: new Date('2026-03-10'),
      }),
    ];
    const { tasks: result } = groupAndAssignLanes(tasks);
    const taskA = result.find((t) => t.id === 'a1')!;
    const taskB = result.find((t) => t.id === 'b1')!;
    expect(taskA.$groupId).toBe('groupA');
    expect(taskB.$groupId).toBe('groupB');
  });

  it('empty array returns empty groups and tasks', () => {
    const { groups, tasks } = groupAndAssignLanes([]);
    expect(groups).toEqual([]);
    expect(tasks).toEqual([]);
  });

  it('supports custom groupBy field', () => {
    const tasks = [
      createTask({
        id: 'a',
        projectId: 'proj1',
        start: new Date('2026-03-01'),
        end: new Date('2026-03-10'),
      }),
      createTask({
        id: 'b',
        projectId: 'proj2',
        start: new Date('2026-03-01'),
        end: new Date('2026-03-10'),
      }),
    ];
    const { groups } = groupAndAssignLanes(tasks, 'projectId');
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.id).sort()).toEqual(['proj1', 'proj2']);
  });

  it('is pure — does not mutate input tasks', () => {
    const original = createTask({
      id: 'a',
      parentId: 'g1',
      start: new Date('2026-03-01'),
      end: new Date('2026-03-10'),
    });
    const input = [original];
    groupAndAssignLanes(input);
    expect(original.$lane).toBeUndefined();
    expect(original.$groupId).toBeUndefined();
  });
});
