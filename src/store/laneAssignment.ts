import type { GanttTask } from './types';

/** Result of lane assignment for a single group. */
export interface LaneGroup {
  /** Group identifier (the value of the groupBy field, e.g. parentId). */
  id: string;
  /** Display label for the group header. */
  label: string;
  /** Number of sub-lanes needed (maximum overlap depth). */
  laneCount: number;
  /** Task IDs belonging to this group, in display order. */
  taskIds: string[];
}

/**
 * Detect time-overlapping task pairs within an array.
 * Two tasks overlap if their [start, end) intervals intersect,
 * i.e. task A ends after task B starts AND task B ends after task A starts.
 */
export function detectOverlaps(tasks: GanttTask[]): [string, string][] {
  if (tasks.length < 2) return [];

  // Sort by start date for efficient sweep
  const sorted = [...tasks].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );

  const pairs: [string, string][] = [];

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];

      // Since sorted by start, b.start >= a.start.
      // Overlap iff a.end > b.start (half-open intervals).
      if (a.end.getTime() > b.start.getTime()) {
        pairs.push([a.id, b.id]);
      } else {
        // b starts after a ends; all subsequent tasks start even later.
        break;
      }
    }
  }

  return pairs;
}

/**
 * Assign each task a $lane number (0-based) using a greedy approach.
 *
 * Algorithm:
 * 1. Sort tasks by start date (ties broken by end date, earliest first)
 * 2. For each task, find the lowest lane where it doesn't overlap with any
 *    already-assigned task
 * 3. "Doesn't overlap" means: no task in that lane has end > this task's start
 *
 * This is essentially the "minimum platforms" / "meeting rooms" problem.
 *
 * @returns The tasks with $lane set, and the total lane count.
 */
export function assignLanes(
  tasks: GanttTask[],
): { tasks: GanttTask[]; laneCount: number } {
  if (tasks.length === 0) return { tasks: [], laneCount: 0 };

  // Sort by start, then by end
  const sorted = [...tasks].sort((a, b) => {
    const diff = a.start.getTime() - b.start.getTime();
    if (diff !== 0) return diff;
    return a.end.getTime() - b.end.getTime();
  });

  // Track the end time of the latest task in each lane
  const laneEnds: number[] = []; // laneEnds[i] = end timestamp of last task in lane i

  const result: GanttTask[] = [];

  for (const task of sorted) {
    const taskStart = task.start.getTime();

    // Find the lowest lane where this task fits (no overlap)
    let assignedLane = -1;
    for (let lane = 0; lane < laneEnds.length; lane++) {
      if (laneEnds[lane] <= taskStart) {
        assignedLane = lane;
        break;
      }
    }

    // If no existing lane fits, create a new one
    if (assignedLane === -1) {
      assignedLane = laneEnds.length;
      laneEnds.push(0);
    }

    // Assign and update lane end
    laneEnds[assignedLane] = task.end.getTime();
    result.push({ ...task, $lane: assignedLane });
  }

  return { tasks: result, laneCount: laneEnds.length };
}

/**
 * Group tasks by a field value and assign lanes within each group.
 *
 * @param flatTasks - Already flattened task list
 * @param groupBy - Field name to group by ('parentId' is most common)
 * @returns Groups with lane assignments, and updated tasks with $lane and $groupId
 */
export function groupAndAssignLanes(
  flatTasks: GanttTask[],
  groupBy: string = 'parentId',
): { groups: LaneGroup[]; tasks: GanttTask[] } {
  if (flatTasks.length === 0) return { groups: [], tasks: [] };

  // 1. Group tasks by the groupBy field value
  const groupMap = new Map<string, GanttTask[]>();

  for (const task of flatTasks) {
    const raw = (task as unknown as Record<string, unknown>)[groupBy];
    const groupId = raw == null ? '__root__' : String(raw);

    let group = groupMap.get(groupId);
    if (!group) {
      group = [];
      groupMap.set(groupId, group);
    }
    group.push(task);
  }

  // 2. For each group, run assignLanes
  const groups: LaneGroup[] = [];
  const allTasks: GanttTask[] = [];

  for (const [groupId, groupTasks] of groupMap) {
    const { tasks: lanedTasks, laneCount } = assignLanes(groupTasks);

    const label = groupId === '__root__' ? 'Root' : groupId;

    groups.push({
      id: groupId,
      label,
      laneCount,
      taskIds: lanedTasks.map((t) => t.id),
    });

    // 3. Annotate tasks with $groupId
    for (const task of lanedTasks) {
      allTasks.push({ ...task, $groupId: groupId });
    }
  }

  return { groups, tasks: allTasks };
}
