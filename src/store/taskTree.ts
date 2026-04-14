import type { GanttTask } from './types';

// ── constants ───────────────────────────────────────────────────────

/** Safety limit to prevent infinite loops from corrupted data. */
const MAX_ITERATIONS = 50_000;

// ── helpers ──────────────────────────────────────────────────────────

function childrenOf(tasks: GanttTask[], parentId: string | null): GanttTask[] {
  return tasks.filter(t =>
    parentId === null ? !t.parentId : t.parentId === parentId,
  );
}

// ── 1. flattenTaskTree ───────────────────────────────────────────────

/**
 * Produces a depth-first, parent-then-children ordering of tasks.
 * Sets `$level` on every returned task.
 * Children of a closed parent are excluded.
 * Includes cycle detection to prevent infinite recursion.
 */
export function flattenTaskTree(tasks: GanttTask[]): GanttTask[] {
  if (!tasks.length) return [];

  const result: GanttTask[] = [];
  const visited = new Set<string>();

  function walk(parentId: string | null, level: number): void {
    const siblings = childrenOf(tasks, parentId);
    for (const task of siblings) {
      if (visited.has(task.id)) continue; // K1: cycle detection
      visited.add(task.id);
      const patched = { ...task, $level: level };
      result.push(patched);
      if (patched.open !== false) {
        walk(task.id, level + 1);
      }
    }
  }

  walk(null, 0);
  return result;
}

// ── 2. recalcSummaries ──────────────────────────────────────────────

/**
 * Bottom-up recalculation of summary tasks.
 * Sets `start` to min(children.start), `end` to max(children.end),
 * and `progress` to the average of children's progress.
 */
export function recalcSummaries(tasks: GanttTask[]): GanttTask[] {
  if (!tasks.length) return [];

  const cloned = tasks.map(t => ({ ...t }));
  const byId = new Map(cloned.map(t => [t.id, t]));

  // Build depth map so we can process bottom-up
  // K1: cycle detection via visited set
  const depthOf = (task: GanttTask): number => {
    let depth = 0;
    let current = task;
    const seen = new Set<string>();
    while (current.parentId) {
      if (seen.has(current.id)) break; // cycle detected
      seen.add(current.id);
      const parent = byId.get(current.parentId);
      if (!parent) break;
      depth++;
      current = parent;
    }
    return depth;
  };

  const summaries = cloned.filter(t => t.type === 'summary');
  // Sort deepest first
  summaries.sort((a, b) => depthOf(b) - depthOf(a));

  for (const summary of summaries) {
    const kids = cloned.filter(t => t.parentId === summary.id);
    if (!kids.length) continue;

    const starts = kids.map(t => t.start).filter((d): d is Date => d != null);
    const ends = kids.map(t => t.end ?? t.start).filter((d): d is Date => d != null);

    if (starts.length) {
      summary.start = new Date(Math.min(...starts.map(d => d.getTime())));
    }
    if (ends.length) {
      summary.end = new Date(Math.max(...ends.map(d => d.getTime())));
    }

    const progresses = kids
      .map(t => t.progress)
      .filter((p): p is number => p != null);
    if (progresses.length) {
      summary.progress = progresses.reduce((a, b) => a + b, 0) / progresses.length;
    }
  }

  return cloned;
}

// ── 3. getChildren ──────────────────────────────────────────────────

/** Direct children of a task. */
export function getChildren(tasks: GanttTask[], parentId: string): GanttTask[] {
  return tasks.filter(t => t.parentId === parentId);
}

// ── 4. getAllDescendants ─────────────────────────────────────────────

/** All descendants of a task (recursive). K1: includes cycle detection. */
export function getAllDescendants(tasks: GanttTask[], parentId: string): GanttTask[] {
  const result: GanttTask[] = [];
  const visited = new Set<string>();

  function collect(pid: string): void {
    for (const t of tasks) {
      if (t.parentId === pid && !visited.has(t.id)) {
        visited.add(t.id);
        result.push(t);
        collect(t.id);
      }
    }
  }

  collect(parentId);
  return result;
}

// ── 5. getAncestors ─────────────────────────────────────────────────

/** All ancestors from the given task up to the root. K1: includes cycle detection. */
export function getAncestors(tasks: GanttTask[], taskId: string): GanttTask[] {
  const byId = new Map(tasks.map(t => [t.id, t]));
  const result: GanttTask[] = [];
  const visited = new Set<string>();
  let current = byId.get(taskId);

  while (current?.parentId) {
    if (visited.has(current.id)) break; // cycle detected
    visited.add(current.id);
    const parent = byId.get(current.parentId);
    if (!parent) break;
    result.push(parent);
    current = parent;
  }

  return result;
}

// ── 6. moveTask ─────────────────────────────────────────────────────

/**
 * Move a task to a new parent at a specific sibling index.
 * Returns a new tasks array with updated parentId.
 */
export function moveTask(
  tasks: GanttTask[],
  taskId: string,
  newParentId: string | null,
  insertIndex: number,
): GanttTask[] {
  if (!canMoveTask(tasks, taskId, newParentId)) return tasks;

  // Clone all tasks, updating the moved task's parentId
  let result = tasks.map(t =>
    t.id === taskId
      ? { ...t, parentId: newParentId }
      : { ...t },
  );

  // Reorder among the new siblings so the task lands at insertIndex
  const siblings = result.filter(t =>
    newParentId === null ? !t.parentId : t.parentId === newParentId,
  );

  // Remove the moved task from siblings list if present
  const movedIdx = siblings.findIndex(t => t.id === taskId);
  if (movedIdx !== -1) siblings.splice(movedIdx, 1);

  // Insert at the requested position
  const movedTask = result.find(t => t.id === taskId)!;
  const clampedIndex = Math.max(0, Math.min(insertIndex, siblings.length));
  siblings.splice(clampedIndex, 0, movedTask);

  // Rebuild result preserving original order for non-siblings,
  // but replacing the sibling sequence with the new order.
  const siblingIds = new Set(siblings.map(t => t.id));
  const nonSiblings = result.filter(t => !siblingIds.has(t.id));

  // Find where first sibling originally sat (or the moved task position)
  // and insert the reordered siblings there.
  const firstSiblingOrigIdx = result.findIndex(t => siblingIds.has(t.id));
  result = [
    ...result.slice(0, firstSiblingOrigIdx).filter(t => !siblingIds.has(t.id)),
    ...siblings,
    ...result.slice(firstSiblingOrigIdx).filter(t => !siblingIds.has(t.id)),
  ];

  return result;
}

// ── 7. canMoveTask ──────────────────────────────────────────────────

/**
 * Returns false when moving taskId under targetParentId would
 * create a circular reference (target is a descendant of task).
 */
export function canMoveTask(
  tasks: GanttTask[],
  taskId: string,
  targetParentId: string | null,
): boolean {
  if (targetParentId === null) return true;
  if (targetParentId === taskId) return false;

  const descendants = getAllDescendants(tasks, taskId);
  return !descendants.some(d => d.id === targetParentId);
}
