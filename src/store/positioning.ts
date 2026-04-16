import type { GanttTask, GanttLink, GanttConfig, DateRange } from './types';
import type { LaneGroup } from './laneAssignment';
import { dateToX } from './scales';

// ── 1. positionTasks ─────────────────────────────────────────────────

/**
 * Calculate visual position ($x, $y, $w, $h) for each flat task.
 * Mutates nothing — returns a new array of tasks with position fields set.
 */
export function positionTasks(
  flatTasks: GanttTask[],
  dateRange: DateRange,
  totalWidth: number,
  config: GanttConfig,
): GanttTask[] {
  if (!flatTasks.length) return [];

  return flatTasks.map((task, rowIndex) => {
    const $y = rowIndex * config.cellHeight + config.barPadding;
    let $x: number;
    let $w: number;
    let $h: number;

    if (task.type === 'milestone') {
      // Diamond shape: fixed width, centered on date
      const center = dateToX(task.start!, dateRange, totalWidth);
      $x = center - 8;
      $w = 16;
      $h = config.barHeight;
    } else if (task.type === 'summary') {
      $x = dateToX(task.start!, dateRange, totalWidth);
      const xEnd = dateToX(task.end!, dateRange, totalWidth);
      $w = Math.max(xEnd - $x, 4);
      $h = config.barHeight - 4;
      // Offset summary bar slightly downward to center within the reduced height
      return { ...task, $x, $y: $y + 2, $w, $h };
    } else {
      $x = dateToX(task.start!, dateRange, totalWidth);
      const xEnd = dateToX(task.end!, dateRange, totalWidth);
      $w = Math.max(xEnd - $x, 4);
      $h = config.barHeight;
    }

    // Compute per-segment pixel positions when the task is split.
    let segments = task.segments;
    if (segments && segments.length > 0) {
      segments = segments.map((seg) => {
        const sx = dateToX(seg.start, dateRange, totalWidth);
        const sxEnd = dateToX(seg.end, dateRange, totalWidth);
        return { ...seg, $x: sx, $w: Math.max(sxEnd - sx, 4) };
      });
    }

    return { ...task, $x, $y, $w, $h, segments };
  });
}

// ── 1b. positionTasksMultiRow ────────────────────────────────────────

/**
 * Position tasks in multi-row mode where each group gets a header row
 * followed by lane rows. Tasks are placed into their assigned lane
 * within their group.
 *
 * Layout per group:
 *   groupHeaderHeight = config.cellHeight (one row for the group header)
 *   groupContentHeight = group.laneCount * config.cellHeight
 *
 * Tasks get positioned:
 *   $y = cumulative group offset + groupHeaderHeight + ($lane * cellHeight) + barPadding
 *   $x, $w = same as positionTasks (via dateToX)
 *   $h = config.barHeight
 */
export function positionTasksMultiRow(
  flatTasks: GanttTask[],
  groups: LaneGroup[],
  dateRange: DateRange,
  totalWidth: number,
  config: GanttConfig,
): GanttTask[] {
  if (!flatTasks.length) return [];

  // Build a lookup: taskId -> task
  const taskMap = new Map<string, GanttTask>();
  for (const task of flatTasks) {
    taskMap.set(task.id, task);
  }

  // Track cumulative Y offset as we iterate through groups
  let cumulativeY = 0;
  // Build a lookup: taskId -> computed $y base (group offset + header + lane offset)
  const taskYMap = new Map<string, number>();

  for (const group of groups) {
    const groupHeaderHeight = config.cellHeight;

    for (const taskId of group.taskIds) {
      const task = taskMap.get(taskId);
      if (!task) continue;

      const lane = task.$lane ?? 0;
      const $y = cumulativeY + groupHeaderHeight + lane * config.cellHeight + config.barPadding;
      taskYMap.set(taskId, $y);
    }

    // Advance past this group: header + content lanes
    cumulativeY += groupHeaderHeight + group.laneCount * config.cellHeight;
  }

  // Now produce positioned tasks (preserve flatTasks order for stable rendering)
  return flatTasks.map((task) => {
    const $y = taskYMap.get(task.id) ?? 0;
    let $x: number;
    let $w: number;
    let $h: number;

    if (task.type === 'milestone') {
      const center = dateToX(task.start!, dateRange, totalWidth);
      $x = center - 8;
      $w = 16;
      $h = config.barHeight;
    } else if (task.type === 'summary') {
      $x = dateToX(task.start!, dateRange, totalWidth);
      const xEnd = dateToX(task.end!, dateRange, totalWidth);
      $w = Math.max(xEnd - $x, 4);
      $h = config.barHeight - 4;
      return { ...task, $x, $y: $y + 2, $w, $h };
    } else {
      $x = dateToX(task.start!, dateRange, totalWidth);
      const xEnd = dateToX(task.end!, dateRange, totalWidth);
      $w = Math.max(xEnd - $x, 4);
      $h = config.barHeight;
    }

    let segments = task.segments;
    if (segments && segments.length > 0) {
      segments = segments.map((seg) => {
        const sx = dateToX(seg.start, dateRange, totalWidth);
        const sxEnd = dateToX(seg.end, dateRange, totalWidth);
        return { ...seg, $x: sx, $w: Math.max(sxEnd - sx, 4) };
      });
    }

    return { ...task, $x, $y, $w, $h, segments };
  });
}

// ── 1c. calcMultiRowTotalHeight ─────────────────────────────────────

/**
 * Calculate total pixel height in multi-row mode.
 * Each group contributes: 1 header row + laneCount content rows.
 */
export function calcMultiRowTotalHeight(
  groups: LaneGroup[],
  config: GanttConfig,
): number {
  return groups.reduce(
    (h, g) => h + (1 + g.laneCount) * config.cellHeight,
    0,
  );
}

// ── 2. positionBaselines ─────────────────────────────────────────────

/**
 * For tasks that have baseStart / baseEnd, compute baseline bar positions
 * ($bx, $by, $bw, $bh). The baseline is a thin bar (6px) below the main bar.
 */
export function positionBaselines(
  flatTasks: GanttTask[],
  dateRange: DateRange,
  totalWidth: number,
  config: GanttConfig,
): GanttTask[] {
  if (!flatTasks.length) return [];

  return flatTasks.map((task, rowIndex) => {
    if (!task.baseStart || !task.baseEnd) return task;

    const $bx = dateToX(task.baseStart, dateRange, totalWidth);
    const bxEnd = dateToX(task.baseEnd, dateRange, totalWidth);
    const $bw = Math.max(bxEnd - $bx, 4);
    const $by =
      rowIndex * config.cellHeight +
      config.barPadding +
      config.barHeight +
      2; // 2px gap below main bar
    const $bh = 6;

    return { ...task, $bx, $by, $bw, $bh };
  });
}

// ── 3. calcLinkPoints ────────────────────────────────────────────────

const MARGIN = 12;

/**
 * Calculate SVG polyline points for a dependency link with right-angle routing.
 * Returns a "x1,y1 x2,y2 ..." string.
 */
export function calcLinkPoints(
  link: GanttLink,
  sourceTask: GanttTask,
  targetTask: GanttTask,
): string {
  const sMidY = sourceTask.$y! + sourceTask.$h! / 2;
  const tMidY = targetTask.$y! + targetTask.$h! / 2;

  let sx: number; // source connection x
  let tx: number; // target connection x

  switch (link.type) {
    case 'e2s':
      sx = sourceTask.$x! + sourceTask.$w!;
      tx = targetTask.$x!;
      return routeEndToStart(sx, sMidY, tx, tMidY);

    case 'e2e':
      sx = sourceTask.$x! + sourceTask.$w!;
      tx = targetTask.$x! + targetTask.$w!;
      return routeEndToEnd(sx, sMidY, tx, tMidY);

    case 's2s':
      sx = sourceTask.$x!;
      tx = targetTask.$x!;
      return routeStartToStart(sx, sMidY, tx, tMidY);

    case 's2e':
      sx = sourceTask.$x!;
      tx = targetTask.$x! + targetTask.$w!;
      return routeStartToEnd(sx, sMidY, tx, tMidY);

    default:
      // Default to e2s
      sx = sourceTask.$x! + sourceTask.$w!;
      tx = targetTask.$x!;
      return routeEndToStart(sx, sMidY, tx, tMidY);
  }
}

function routeEndToStart(
  sx: number, sy: number,
  tx: number, ty: number,
): string {
  if (tx - sx >= MARGIN * 2) {
    // Enough room: straight elbow
    const mx = (sx + tx) / 2;
    return `${sx},${sy} ${mx},${sy} ${mx},${ty} ${tx},${ty}`;
  }
  // M11: Wrap around — target is links van of dichtbij source.
  // Route: rechts uit source → onder/boven → links naar target.
  const elbowX = sx + MARGIN;
  const entryX = tx - MARGIN;
  // Gebruik een vaste offset boven/onder de taken i.p.v. midpoint
  // om kruisende lijnen te voorkomen bij gelijke y-posities.
  const detourY = sy < ty
    ? Math.max(sy, ty) + MARGIN * 2
    : Math.min(sy, ty) - MARGIN * 2;
  return `${sx},${sy} ${elbowX},${sy} ${elbowX},${detourY} ${entryX},${detourY} ${entryX},${ty} ${tx},${ty}`;
}

function routeEndToEnd(
  sx: number, sy: number,
  tx: number, ty: number,
): string {
  const rightX = Math.max(sx, tx) + MARGIN;
  return `${sx},${sy} ${rightX},${sy} ${rightX},${ty} ${tx},${ty}`;
}

function routeStartToStart(
  sx: number, sy: number,
  tx: number, ty: number,
): string {
  const leftX = Math.min(sx, tx) - MARGIN;
  return `${sx},${sy} ${leftX},${sy} ${leftX},${ty} ${tx},${ty}`;
}

function routeStartToEnd(
  sx: number, sy: number,
  tx: number, ty: number,
): string {
  if (sx - tx >= MARGIN * 2) {
    const mx = (sx + tx) / 2;
    return `${sx},${sy} ${mx},${sy} ${mx},${ty} ${tx},${ty}`;
  }
  const elbowX = sx - MARGIN;
  const midY = (sy + ty) / 2;
  const entryX = tx + MARGIN;
  return `${sx},${sy} ${elbowX},${sy} ${elbowX},${midY} ${entryX},${midY} ${entryX},${ty} ${tx},${ty}`;
}

// ── 4. positionLinks ─────────────────────────────────────────────────

/**
 * Calculate $points for each link. Skips links where source or target
 * is not present in the visible task map.
 */
export function positionLinks(
  links: GanttLink[],
  taskMap: Map<string, GanttTask>,
): GanttLink[] {
  if (!links.length) return [];

  const result: GanttLink[] = [];

  for (const link of links) {
    const source = taskMap.get(link.source);
    const target = taskMap.get(link.target);
    if (!source || !target) continue;

    const $points = calcLinkPoints(link, source, target);
    result.push({ ...link, $points });
  }

  return result;
}
