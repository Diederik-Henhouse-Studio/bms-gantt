// ─────────────────────────────────────────────────────────────
// BMS Gantt – Pure hit-test helpers
// These functions operate on layout data (not the DOM) so they're
// safe for SSR, tests, and agent introspection.
// ─────────────────────────────────────────────────────────────

import type { GanttTask, ScaleCell, DateRange } from './types';
import { xToDate } from './scales';

/** Find the task whose row contains the given Y coordinate, or null. */
export function rowAtY(
  y: number,
  flatTasks: GanttTask[],
): GanttTask | null {
  for (const t of flatTasks) {
    if (y >= t.$y && y < t.$y + t.$h) return t;
  }
  return null;
}

/**
 * Find the scale cell whose horizontal extent contains X, or null.
 * Uses the finest scale row (the last entry of scaleCells[][]).
 */
export function cellAtX(
  x: number,
  finestScaleRow: ScaleCell[],
): ScaleCell | null {
  let cursor = 0;
  for (const cell of finestScaleRow) {
    if (x >= cursor && x < cursor + cell.width) return cell;
    cursor += cell.width;
  }
  return null;
}

/**
 * Find the task bar at (x, y) in chart coordinate space.
 * Returns the first hit; callers can iterate for multi-bar overlap detection.
 */
export function barAtPoint(
  x: number,
  y: number,
  flatTasks: GanttTask[],
): GanttTask | null {
  for (const t of flatTasks) {
    if (
      x >= t.$x &&
      x < t.$x + t.$w &&
      y >= t.$y &&
      y < t.$y + t.$h
    ) {
      return t;
    }
  }
  return null;
}

/** Convenience wrapper around scales.xToDate for symmetry with the other helpers. */
export function dateAtX(
  x: number,
  dateRange: DateRange,
  totalWidth: number,
): Date {
  return xToDate(x, dateRange, totalWidth);
}
