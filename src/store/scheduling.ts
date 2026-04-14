// ─────────────────────────────────────────────────────────────
// BMS Gantt – Auto-scheduling & critical path analysis
// PRO features: forward-pass scheduling, CPM, slack, cycle detection
// ─────────────────────────────────────────────────────────────

import type { GanttTask, GanttLink } from './types';
import type { GanttCalendar } from './calendar';

// ━━━ Topological sort (Kahn's algorithm) ━━━━━━━━━━━━━━━━━━━

/**
 * Return task IDs in dependency order using Kahn's algorithm.
 * Throws if a circular dependency is detected.
 */
export function topologicalSort(
  tasks: GanttTask[],
  links: GanttLink[],
): string[] {
  const taskIds = new Set(tasks.map((t) => t.id));

  // Build adjacency list and in-degree map
  const inDegree = new Map<string, number>();
  const successors = new Map<string, string[]>();

  for (const id of taskIds) {
    inDegree.set(id, 0);
    successors.set(id, []);
  }

  for (const link of links) {
    if (!taskIds.has(link.source) || !taskIds.has(link.target)) continue;
    successors.get(link.source)!.push(link.target);
    inDegree.set(link.target, (inDegree.get(link.target) ?? 0) + 1);
  }

  // Collect nodes with zero in-degree
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const next of successors.get(current) ?? []) {
      const newDeg = (inDegree.get(next) ?? 1) - 1;
      inDegree.set(next, newDeg);
      if (newDeg === 0) queue.push(next);
    }
  }

  if (sorted.length !== taskIds.size) {
    throw new Error(
      'Circular dependency detected: not all tasks could be ordered',
    );
  }

  return sorted;
}

// ━━━ Cycle detection (DFS) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Detect all cycles in the dependency graph using DFS.
 * Returns an array of cycles, where each cycle is an array of task IDs
 * forming the loop. Returns an empty array if no cycles exist.
 */
export function detectCycles(
  tasks: GanttTask[],
  links: GanttLink[],
): string[][] {
  const taskIds = new Set(tasks.map((t) => t.id));
  const successors = new Map<string, string[]>();

  for (const id of taskIds) {
    successors.set(id, []);
  }
  for (const link of links) {
    if (!taskIds.has(link.source) || !taskIds.has(link.target)) continue;
    successors.get(link.source)!.push(link.target);
  }

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const onStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): void {
    visited.add(node);
    onStack.add(node);
    path.push(node);

    for (const next of successors.get(node) ?? []) {
      if (!visited.has(next)) {
        dfs(next);
      } else if (onStack.has(next)) {
        // Found a cycle – extract it from the current path
        const cycleStart = path.indexOf(next);
        cycles.push(path.slice(cycleStart));
      }
    }

    path.pop();
    onStack.delete(node);
  }

  for (const id of taskIds) {
    if (!visited.has(id)) {
      dfs(id);
    }
  }

  return cycles;
}

// ━━━ Auto-schedule (forward pass) ━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Forward-pass scheduling: place each task as early as possible
 * given its dependency constraints.
 *
 * Returns a new array of tasks with updated `start` and `end` dates.
 * The original array is not mutated.
 */
export function autoSchedule(
  tasks: GanttTask[],
  links: GanttLink[],
  calendar: GanttCalendar,
  projectStart?: Date,
): GanttTask[] {
  // Build a lookup map
  const taskMap = new Map<string, GanttTask>(
    tasks.map((t) => [t.id, { ...t }]),
  );

  // Get dependency order; bail gracefully if cycles exist
  let order: string[];
  try {
    order = topologicalSort(tasks, links);
  } catch {
    // If there are cycles, return tasks unchanged
    return tasks.map((t) => ({ ...t }));
  }

  // Group incoming links by target
  const incomingLinks = new Map<string, GanttLink[]>();
  for (const link of links) {
    if (!taskMap.has(link.source) || !taskMap.has(link.target)) continue;
    const existing = incomingLinks.get(link.target) ?? [];
    existing.push(link);
    incomingLinks.set(link.target, existing);
  }

  // Forward pass
  for (const taskId of order) {
    const task = taskMap.get(taskId)!;

    // K5: skip summary tasks — their dates are derived from children
    if (task.type === 'summary') continue;

    // M4: skip tasks with invalid duration
    if (task.duration < 0) continue;

    const incoming = incomingLinks.get(taskId);

    if (!incoming || incoming.length === 0) {
      // No predecessors – use projectStart if given
      if (projectStart) {
        task.start = calendar.getNextWorkingDay(projectStart);
      } else {
        task.start = calendar.getNextWorkingDay(task.start);
      }
    } else {
      // Calculate earliest possible start based on link types
      let earliestStart = new Date(0);

      for (const link of incoming) {
        const source = taskMap.get(link.source)!;
        let candidateStart: Date;

        switch (link.type) {
          case 'e2s':
            // finish-to-start: successor starts after predecessor ends
            candidateStart = source.end;
            break;
          case 's2s':
            // start-to-start: successor starts when predecessor starts
            candidateStart = source.start;
            break;
          case 'e2e':
            // finish-to-finish: successor ends when predecessor ends
            // So successor start = predecessor end - task duration
            candidateStart = calendar.addWorkingDays(
              source.end,
              -task.duration,
            );
            break;
          case 's2e':
            // start-to-finish: successor ends when predecessor starts
            // So successor start = predecessor start - task duration
            candidateStart = calendar.addWorkingDays(
              source.start,
              -task.duration,
            );
            break;
          default:
            candidateStart = source.end;
        }

        if (candidateStart > earliestStart) {
          earliestStart = candidateStart;
        }
      }

      // Ensure we don't schedule before projectStart
      if (projectStart && earliestStart < projectStart) {
        earliestStart = projectStart;
      }

      task.start = calendar.getNextWorkingDay(earliestStart);
    }

    // Set end based on duration
    task.end = calendar.addWorkingDays(task.start, task.duration);
  }

  // Return tasks in original order with updated dates
  return tasks.map((t) => taskMap.get(t.id)!);
}

// ━━━ Forward / backward pass helpers ━━━━━━━━━━━━━━━━━━━━━━━

interface TaskTiming {
  /** Earliest start (working-day index from project start). */
  es: number;
  /** Earliest finish. */
  ef: number;
  /** Latest start. */
  ls: number;
  /** Latest finish. */
  lf: number;
  /** Duration in working days. */
  duration: number;
}

/**
 * Compute earliest/latest start/finish for all tasks.
 * Used by both `calcCriticalPath` and `calcSlack`.
 */
function computeTimings(
  tasks: GanttTask[],
  links: GanttLink[],
): Map<string, TaskTiming> {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const timings = new Map<string, TaskTiming>();

  // Init timings
  for (const t of tasks) {
    timings.set(t.id, { es: 0, ef: 0, ls: 0, lf: 0, duration: t.duration });
  }

  // Build adjacency
  const taskIds = new Set(tasks.map((t) => t.id));
  const successorsMap = new Map<string, string[]>();
  const predecessorsMap = new Map<string, GanttLink[]>();

  for (const id of taskIds) {
    successorsMap.set(id, []);
    predecessorsMap.set(id, []);
  }
  for (const link of links) {
    if (!taskIds.has(link.source) || !taskIds.has(link.target)) continue;
    successorsMap.get(link.source)!.push(link.target);
    predecessorsMap.get(link.target)!.push(link);
  }

  // Topological order – if cycles exist return empty timings
  let order: string[];
  try {
    order = topologicalSort(tasks, links);
  } catch {
    return timings;
  }

  // ── Forward pass ──────────────────────────────────────────
  for (const id of order) {
    const timing = timings.get(id)!;
    const incoming = predecessorsMap.get(id)!;

    let maxEs = 0;
    for (const link of incoming) {
      const srcTiming = timings.get(link.source)!;
      let constraint: number;

      switch (link.type) {
        case 'e2s':
          constraint = srcTiming.ef;
          break;
        case 's2s':
          constraint = srcTiming.es;
          break;
        case 'e2e':
          constraint = srcTiming.ef - timing.duration;
          break;
        case 's2e':
          constraint = srcTiming.es - timing.duration;
          break;
        default:
          constraint = srcTiming.ef;
      }
      if (constraint > maxEs) maxEs = constraint;
    }

    timing.es = Math.max(0, maxEs);
    timing.ef = timing.es + timing.duration;
  }

  // ── Backward pass ─────────────────────────────────────────
  // Project end = max of all earliest finishes
  let projectEnd = 0;
  for (const [, t] of timings) {
    if (t.ef > projectEnd) projectEnd = t.ef;
  }

  // Initialise latest finish to project end
  for (const [, t] of timings) {
    t.lf = projectEnd;
    t.ls = projectEnd - t.duration;
  }

  // Traverse in reverse topological order
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i];
    const timing = timings.get(id)!;
    const succs = successorsMap.get(id)!;

    let minLf = projectEnd;

    for (const succId of succs) {
      const succTiming = timings.get(succId)!;
      // Find the link(s) from id → succId to determine constraint type
      for (const link of links) {
        if (link.source !== id || link.target !== succId) continue;
        if (!taskIds.has(link.source) || !taskIds.has(link.target)) continue;

        let constraint: number;
        switch (link.type) {
          case 'e2s':
            constraint = succTiming.ls;
            break;
          case 's2s':
            constraint = succTiming.ls + timing.duration;
            break;
          case 'e2e':
            constraint = succTiming.lf;
            break;
          case 's2e':
            constraint = succTiming.lf + timing.duration;
            break;
          default:
            constraint = succTiming.ls;
        }
        if (constraint < minLf) minLf = constraint;
      }
    }

    timing.lf = minLf;
    timing.ls = timing.lf - timing.duration;
  }

  return timings;
}

// ━━━ Critical path ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Identify the critical path: tasks and links with zero slack.
 */
export function calcCriticalPath(
  tasks: GanttTask[],
  links: GanttLink[],
): { taskIds: Set<string>; linkIds: Set<string> } {
  const timings = computeTimings(tasks, links);
  const taskIds = new Set<string>();
  const linkIds = new Set<string>();

  // Critical tasks: slack = 0 (ls === es)
  for (const [id, t] of timings) {
    if (Math.abs(t.ls - t.es) < 0.0001) {
      taskIds.add(id);
    }
  }

  // Critical links: both source and target are critical
  for (const link of links) {
    if (taskIds.has(link.source) && taskIds.has(link.target)) {
      linkIds.add(link.id);
    }
  }

  return { taskIds, linkIds };
}

// ━━━ Slack calculation ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Calculate total float (slack) for every task, in working days.
 * Slack = latest start − earliest start.
 */
export function calcSlack(
  tasks: GanttTask[],
  links: GanttLink[],
): Map<string, number> {
  const timings = computeTimings(tasks, links);
  const result = new Map<string, number>();

  for (const [id, t] of timings) {
    result.set(id, t.ls - t.es);
  }

  return result;
}
