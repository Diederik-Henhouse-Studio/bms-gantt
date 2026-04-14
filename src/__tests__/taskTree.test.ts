import { describe, it, expect } from 'vitest';
import {
  flattenTaskTree,
  recalcSummaries,
  getChildren,
  getAllDescendants,
  getAncestors,
  moveTask,
  canMoveTask,
} from '../store/taskTree';
import { createTask } from './helpers';

// ── flattenTaskTree ────────────────────────────────────────────

describe('flattenTaskTree', () => {
  it('returns empty array for empty input', () => {
    expect(flattenTaskTree([])).toEqual([]);
  });

  it('flattens root-only tasks preserving order', () => {
    const tasks = [
      createTask({ id: 'a', text: 'A' }),
      createTask({ id: 'b', text: 'B' }),
      createTask({ id: 'c', text: 'C' }),
    ];
    const flat = flattenTaskTree(tasks);
    expect(flat.map(t => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('sets $level correctly for 3-level nesting', () => {
    const tasks = [
      createTask({ id: 'root', type: 'summary', open: true }),
      createTask({ id: 'child', parentId: 'root', type: 'summary', open: true }),
      createTask({ id: 'grandchild', parentId: 'child' }),
    ];
    const flat = flattenTaskTree(tasks);
    expect(flat.map(t => ({ id: t.id, level: t.$level }))).toEqual([
      { id: 'root', level: 0 },
      { id: 'child', level: 1 },
      { id: 'grandchild', level: 2 },
    ]);
  });

  it('excludes children when parent.open is false', () => {
    const tasks = [
      createTask({ id: 'root', type: 'summary', open: false }),
      createTask({ id: 'child', parentId: 'root' }),
    ];
    const flat = flattenTaskTree(tasks);
    expect(flat).toHaveLength(1);
    expect(flat[0].id).toBe('root');
  });

  it('handles parentId cycle without crashing (cycle detection K1)', () => {
    const tasks = [
      createTask({ id: 'a', parentId: 'b' }),
      createTask({ id: 'b', parentId: 'a' }),
    ];
    // Cycled tasks form no root (both have parentId), so nothing
    // is reachable from the null root. Should not hang.
    const flat = flattenTaskTree(tasks);
    expect(flat).toHaveLength(0);
  });

  it('orphaned tasks (parentId references non-existent task) do not appear', () => {
    const tasks = [
      createTask({ id: 'orphan', parentId: 'does-not-exist' }),
      createTask({ id: 'root' }),
    ];
    const flat = flattenTaskTree(tasks);
    expect(flat.map(t => t.id)).toEqual(['root']);
  });
});

// ── recalcSummaries ────────────────────────────────────────────

describe('recalcSummaries', () => {
  it('returns empty for empty input', () => {
    expect(recalcSummaries([])).toEqual([]);
  });

  it('summary start = min(children.start), end = max(children.end)', () => {
    const tasks = [
      createTask({
        id: 'sum',
        type: 'summary',
        start: new Date('2026-01-01'),
        end: new Date('2026-01-01'),
      }),
      createTask({
        id: 'c1',
        parentId: 'sum',
        start: new Date('2026-03-05'),
        end: new Date('2026-03-10'),
      }),
      createTask({
        id: 'c2',
        parentId: 'sum',
        start: new Date('2026-03-02'),
        end: new Date('2026-03-20'),
      }),
    ];
    const result = recalcSummaries(tasks);
    const summary = result.find(t => t.id === 'sum')!;
    expect(summary.start).toEqual(new Date('2026-03-02'));
    expect(summary.end).toEqual(new Date('2026-03-20'));
  });

  it('summary progress = average of children progress', () => {
    const tasks = [
      createTask({ id: 'sum', type: 'summary', progress: 0 }),
      createTask({ id: 'c1', parentId: 'sum', progress: 40 }),
      createTask({ id: 'c2', parentId: 'sum', progress: 80 }),
    ];
    const result = recalcSummaries(tasks);
    const summary = result.find(t => t.id === 'sum')!;
    expect(summary.progress).toBe(60);
  });

  it('skips summaries with no children', () => {
    const tasks = [
      createTask({
        id: 'empty-sum',
        type: 'summary',
        start: new Date('2026-03-01'),
        end: new Date('2026-03-10'),
        progress: 50,
      }),
    ];
    const result = recalcSummaries(tasks);
    const summary = result.find(t => t.id === 'empty-sum')!;
    // Original values should be unchanged
    expect(summary.start).toEqual(new Date('2026-03-01'));
    expect(summary.end).toEqual(new Date('2026-03-10'));
    expect(summary.progress).toBe(50);
  });

  it('handles nested summaries bottom-up (inner summary first)', () => {
    const tasks = [
      createTask({ id: 'outer', type: 'summary', start: new Date('2026-01-01'), end: new Date('2026-01-01'), progress: 0 }),
      createTask({ id: 'inner', type: 'summary', parentId: 'outer', start: new Date('2026-01-01'), end: new Date('2026-01-01'), progress: 0 }),
      createTask({ id: 'leaf', parentId: 'inner', start: new Date('2026-03-10'), end: new Date('2026-03-20'), progress: 75 }),
    ];
    const result = recalcSummaries(tasks);
    const inner = result.find(t => t.id === 'inner')!;
    const outer = result.find(t => t.id === 'outer')!;

    // Inner summary should get leaf's dates and progress
    expect(inner.start).toEqual(new Date('2026-03-10'));
    expect(inner.end).toEqual(new Date('2026-03-20'));
    expect(inner.progress).toBe(75);

    // Outer summary should get inner's (now recalculated) dates and progress
    expect(outer.start).toEqual(new Date('2026-03-10'));
    expect(outer.end).toEqual(new Date('2026-03-20'));
    expect(outer.progress).toBe(75);
  });

  it('handles parentId cycle in depthOf without hanging', () => {
    const tasks = [
      createTask({ id: 'x', type: 'summary', parentId: 'y' }),
      createTask({ id: 'y', type: 'summary', parentId: 'x' }),
      createTask({ id: 'leaf', parentId: 'x', start: new Date('2026-03-05'), end: new Date('2026-03-10') }),
    ];
    // Should not hang; the cycle detection in depthOf should break
    const result = recalcSummaries(tasks);
    expect(result).toHaveLength(3);
  });
});

// ── getChildren ────────────────────────────────────────────────

describe('getChildren', () => {
  it('returns direct children only', () => {
    const tasks = [
      createTask({ id: 'parent', type: 'summary' }),
      createTask({ id: 'child1', parentId: 'parent' }),
      createTask({ id: 'child2', parentId: 'parent' }),
      createTask({ id: 'grandchild', parentId: 'child1' }),
    ];
    const kids = getChildren(tasks, 'parent');
    expect(kids.map(t => t.id)).toEqual(['child1', 'child2']);
  });

  it('returns empty for leaf task', () => {
    const tasks = [
      createTask({ id: 'leaf' }),
      createTask({ id: 'other' }),
    ];
    expect(getChildren(tasks, 'leaf')).toEqual([]);
  });
});

// ── getAllDescendants ───────────────────────────────────────────

describe('getAllDescendants', () => {
  it('returns all nested descendants', () => {
    const tasks = [
      createTask({ id: 'root', type: 'summary' }),
      createTask({ id: 'c1', parentId: 'root', type: 'summary' }),
      createTask({ id: 'c2', parentId: 'root' }),
      createTask({ id: 'gc1', parentId: 'c1' }),
    ];
    const desc = getAllDescendants(tasks, 'root');
    expect(desc.map(t => t.id).sort()).toEqual(['c1', 'c2', 'gc1']);
  });

  it('handles parentId cycle without infinite recursion', () => {
    const tasks = [
      createTask({ id: 'a', parentId: 'b' }),
      createTask({ id: 'b', parentId: 'a' }),
    ];
    // Should not hang
    const desc = getAllDescendants(tasks, 'a');
    expect(desc.map(t => t.id)).toContain('b');
  });
});

// ── getAncestors ───────────────────────────────────────────────

describe('getAncestors', () => {
  it('walks up to root', () => {
    const tasks = [
      createTask({ id: 'root', type: 'summary' }),
      createTask({ id: 'child', parentId: 'root', type: 'summary' }),
      createTask({ id: 'grandchild', parentId: 'child' }),
    ];
    const anc = getAncestors(tasks, 'grandchild');
    expect(anc.map(t => t.id)).toEqual(['child', 'root']);
  });

  it('handles parentId cycle without infinite loop', () => {
    const tasks = [
      createTask({ id: 'a', parentId: 'b' }),
      createTask({ id: 'b', parentId: 'a' }),
    ];
    // Should terminate thanks to cycle detection
    const anc = getAncestors(tasks, 'a');
    expect(anc.length).toBeLessThanOrEqual(2);
  });
});

// ── moveTask & canMoveTask ─────────────────────────────────────

describe('moveTask', () => {
  it('moves task to new parent', () => {
    const tasks = [
      createTask({ id: 'p1', type: 'summary' }),
      createTask({ id: 'p2', type: 'summary' }),
      createTask({ id: 'child', parentId: 'p1' }),
    ];
    const result = moveTask(tasks, 'child', 'p2', 0);
    const moved = result.find(t => t.id === 'child')!;
    expect(moved.parentId).toBe('p2');
  });

  it('clamps insertIndex to valid range', () => {
    const tasks = [
      createTask({ id: 'parent', type: 'summary' }),
      createTask({ id: 'existing', parentId: 'parent' }),
      createTask({ id: 'movee' }),
    ];
    // insertIndex = 999 should be clamped to end
    const result = moveTask(tasks, 'movee', 'parent', 999);
    const moved = result.find(t => t.id === 'movee')!;
    expect(moved.parentId).toBe('parent');
  });
});

describe('canMoveTask', () => {
  it('blocks move to own descendant', () => {
    const tasks = [
      createTask({ id: 'parent', type: 'summary' }),
      createTask({ id: 'child', parentId: 'parent' }),
      createTask({ id: 'grandchild', parentId: 'child' }),
    ];
    expect(canMoveTask(tasks, 'parent', 'grandchild')).toBe(false);
  });

  it('allows move to root (null)', () => {
    const tasks = [
      createTask({ id: 'parent', type: 'summary' }),
      createTask({ id: 'child', parentId: 'parent' }),
    ];
    expect(canMoveTask(tasks, 'child', null)).toBe(true);
  });

  it('blocks move to self', () => {
    const tasks = [createTask({ id: 'a' })];
    expect(canMoveTask(tasks, 'a', 'a')).toBe(false);
  });
});
