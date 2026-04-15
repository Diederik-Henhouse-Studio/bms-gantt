// ─────────────────────────────────────────────────────────────
// BMS Gantt – Analysis utilities (v0.8)
// Pure data-transform helpers reusable outside the component:
// forecasts, resource load, burndown.
// ─────────────────────────────────────────────────────────────

import type { GanttTask } from './store';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetweenInclusive(a: Date, b: Date): number {
  return Math.max(1, Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / MS_PER_DAY) + 1);
}

// ───────────────────────────────────────────────────────────────
// forecastEnd
// ───────────────────────────────────────────────────────────────

/**
 * Project a finish date given current progress, assuming a linear burn
 * rate from `task.start` to now. Useful for "we're 40% done 10 days in,
 * what does that imply for delivery?".
 *
 * Returns `task.end` when progress is 0 (no information) or 100 (done).
 */
export function forecastEnd(task: GanttTask, now: Date = new Date()): Date {
  const p = task.progress;
  if (p <= 0 || p >= 100) return task.end;
  const elapsedMs = Math.max(1, now.getTime() - task.start.getTime());
  // If x% complete took elapsedMs, 100% will take elapsedMs * 100 / x.
  const projectedMs = (elapsedMs * 100) / p;
  return new Date(task.start.getTime() + projectedMs);
}

// ───────────────────────────────────────────────────────────────
// resourceLoad
// ───────────────────────────────────────────────────────────────

export interface LoadBucket {
  /** ISO yyyy-mm-dd. */
  date: string;
  /** Number of tasks active this day. */
  count: number;
  /** Sum of `task.weight ?? 1` for tasks active this day. */
  load: number;
  /** Optional breakdown by owner/category/custom key. */
  breakdown?: Record<string, number>;
}

export interface ResourceLoadOptions {
  start?: Date;
  end?: Date;
  /** Sum a different attribute than the default count. Defaults to () => 1. */
  weight?: (t: GanttTask) => number;
  /** Optional grouping key (e.g. owner id, category) for per-day breakdown. */
  groupBy?: (t: GanttTask) => string | null | undefined;
}

/**
 * Build a per-day histogram of task activity over the supplied window.
 * If `start`/`end` are omitted, uses the min start and max end across tasks.
 */
export function resourceLoad(
  tasks: GanttTask[],
  opts: ResourceLoadOptions = {},
): LoadBucket[] {
  if (tasks.length === 0) return [];
  const weightFn = opts.weight ?? (() => 1);
  const rangeStart = opts.start
    ? startOfDay(opts.start)
    : startOfDay(new Date(Math.min(...tasks.map((t) => t.start.getTime()))));
  const rangeEnd = opts.end
    ? startOfDay(opts.end)
    : startOfDay(new Date(Math.max(...tasks.map((t) => t.end.getTime()))));

  const buckets = new Map<string, LoadBucket>();
  const days = daysBetweenInclusive(rangeStart, rangeEnd);
  for (let i = 0; i < days; i++) {
    const d = new Date(rangeStart.getTime() + i * MS_PER_DAY);
    const key = dayKey(d);
    buckets.set(key, { date: key, count: 0, load: 0, breakdown: opts.groupBy ? {} : undefined });
  }

  for (const t of tasks) {
    const tStart = startOfDay(t.start);
    const tEnd = startOfDay(t.end);
    const w = weightFn(t);
    const group = opts.groupBy ? (opts.groupBy(t) ?? '?') : null;
    for (let d = tStart.getTime(); d <= tEnd.getTime(); d += MS_PER_DAY) {
      const key = dayKey(new Date(d));
      const b = buckets.get(key);
      if (!b) continue;
      b.count += 1;
      b.load += w;
      if (group != null && b.breakdown) {
        b.breakdown[group] = (b.breakdown[group] ?? 0) + w;
      }
    }
  }
  return [...buckets.values()];
}

// ───────────────────────────────────────────────────────────────
// burndown
// ───────────────────────────────────────────────────────────────

export interface BurndownPoint {
  date: string;
  /** Ideal remaining work (linear from total to 0). */
  ideal: number;
  /** Actual remaining work at this date. */
  actual: number;
}

/**
 * Classic burndown: given a set of tasks with durations, returns daily
 * points with the ideal linear line and actual remaining based on
 * completed / in-progress tasks on that day.
 *
 * "Remaining" is computed as `sum(duration * (1 - progress/100))` for
 * tasks still active on or before the point's date.
 */
export function burndown(
  tasks: GanttTask[],
  opts: { start?: Date; end?: Date } = {},
): BurndownPoint[] {
  if (tasks.length === 0) return [];
  const rangeStart = opts.start
    ? startOfDay(opts.start)
    : startOfDay(new Date(Math.min(...tasks.map((t) => t.start.getTime()))));
  const rangeEnd = opts.end
    ? startOfDay(opts.end)
    : startOfDay(new Date(Math.max(...tasks.map((t) => t.end.getTime()))));

  const totalWork = tasks.reduce((s, t) => s + t.duration, 0);
  const days = daysBetweenInclusive(rangeStart, rangeEnd);
  const points: BurndownPoint[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(rangeStart.getTime() + i * MS_PER_DAY);
    const ideal = totalWork * (1 - i / Math.max(1, days - 1));
    const remaining = tasks.reduce((s, t) => {
      const tStart = startOfDay(t.start).getTime();
      const tEnd = startOfDay(t.end).getTime();
      if (tEnd < d.getTime()) return s; // already done
      if (tStart > d.getTime()) return s + t.duration; // not started yet
      return s + t.duration * (1 - Math.min(100, Math.max(0, t.progress)) / 100);
    }, 0);
    points.push({ date: dayKey(d), ideal, actual: remaining });
  }
  return points;
}
