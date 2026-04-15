// ─────────────────────────────────────────────────────────────
// BMS Gantt – Query helpers (v0.8)
// Pure filter/sort utilities over GanttTask[]. No store, no DOM.
// Exposed at @bluemillstudio/gantt/query so consumers can
// compose data pipelines without pulling in React/Zustand.
// ─────────────────────────────────────────────────────────────

import type { GanttTask, TaskStatus, TaskCategory } from './store';

export interface TaskFilter {
  /** Substring match on task.text (case-insensitive). */
  text?: string;
  /** Only tasks with these statuses. */
  status?: TaskStatus | TaskStatus[];
  /** Only tasks with these categories. */
  category?: TaskCategory | TaskCategory[];
  /** Only tasks whose [start, end] overlaps this range. */
  overlaps?: { start: Date; end: Date };
  /** Minimum progress (0–100). */
  progressGte?: number;
  /** Maximum progress (0–100). */
  progressLte?: number;
  /** Only critical tasks (true) or only non-critical (false). */
  critical?: boolean;
  /** Only tasks whose parent is one of these ids. */
  parentIdIn?: (string | null)[];
  /** Arbitrary predicate for custom logic. Runs last. */
  where?: (t: GanttTask) => boolean;
}

function asArray<T>(x: T | T[] | undefined): T[] | undefined {
  if (x == null) return undefined;
  return Array.isArray(x) ? x : [x];
}

function overlaps(t: GanttTask, r: { start: Date; end: Date }): boolean {
  return t.end.getTime() > r.start.getTime() && t.start.getTime() < r.end.getTime();
}

/** Filter tasks by any combination of criteria. Returns a new array. */
export function filterTasks(tasks: GanttTask[], f: TaskFilter): GanttTask[] {
  const statuses = asArray(f.status);
  const categories = asArray(f.category);
  const parents = asArray(f.parentIdIn);
  const textLc = f.text?.toLowerCase();
  return tasks.filter((t) => {
    if (textLc && !t.text.toLowerCase().includes(textLc)) return false;
    if (statuses && (!t.status || !statuses.includes(t.status))) return false;
    if (categories && (!t.taskCategory || !categories.includes(t.taskCategory))) return false;
    if (f.overlaps && !overlaps(t, f.overlaps)) return false;
    if (f.progressGte != null && t.progress < f.progressGte) return false;
    if (f.progressLte != null && t.progress > f.progressLte) return false;
    if (f.critical != null && !!t.critical !== f.critical) return false;
    if (parents && !parents.includes(t.parentId)) return false;
    if (f.where && !f.where(t)) return false;
    return true;
  });
}

export type SortKey =
  | 'text'
  | 'start'
  | 'end'
  | 'duration'
  | 'progress'
  | 'slack'
  | 'status'
  | ((t: GanttTask) => number | string);

export interface SortSpec {
  by: SortKey;
  dir?: 'asc' | 'desc';
}

function value(t: GanttTask, by: SortKey): number | string {
  if (typeof by === 'function') return by(t);
  switch (by) {
    case 'text': return t.text;
    case 'start': return t.start.getTime();
    case 'end': return t.end.getTime();
    case 'duration': return t.duration;
    case 'progress': return t.progress;
    case 'slack': return t.slack ?? Infinity;
    case 'status': return t.status ?? '';
  }
}

/** Multi-key stable sort. Returns a new array. */
export function sortTasks(
  tasks: GanttTask[],
  ...specs: (SortKey | SortSpec)[]
): GanttTask[] {
  const resolved: SortSpec[] = specs.map((s) =>
    typeof s === 'object' && s && 'by' in s ? s : { by: s as SortKey, dir: 'asc' },
  );
  const copy = [...tasks];
  copy.sort((a, b) => {
    for (const spec of resolved) {
      const va = value(a, spec.by);
      const vb = value(b, spec.by);
      if (va < vb) return spec.dir === 'desc' ? 1 : -1;
      if (va > vb) return spec.dir === 'desc' ? -1 : 1;
    }
    return 0;
  });
  return copy;
}

/** Group tasks by a key. Returns Map to preserve insertion order. */
export function groupTasksBy<K>(
  tasks: GanttTask[],
  keyOf: (t: GanttTask) => K,
): Map<K, GanttTask[]> {
  const m = new Map<K, GanttTask[]>();
  for (const t of tasks) {
    const k = keyOf(t);
    const arr = m.get(k);
    if (arr) arr.push(t);
    else m.set(k, [t]);
  }
  return m;
}
