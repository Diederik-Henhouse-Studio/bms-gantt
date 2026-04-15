// ─────────────────────────────────────────────────────────────
// BMS Gantt – Computation layer (v0.8)
// Consumer-defined derived fields and summary aggregators.
//
// Design notes:
// - Pure functions over GanttTask[]. No DOM, no async.
// - Run during the store's recalculate(); results land on task.$computed.
// - Aggregators run AFTER computedFields so summary values can roll up
//   computed child values.
// ─────────────────────────────────────────────────────────────

import type { GanttTask } from './types';

/** One derived field applied to every task during recalculate. */
export interface ComputedField {
  /** Destination key on task.$computed. Must be unique. */
  key: string;
  /**
   * Compute function. Receives the task and the full flat array (so
   * peer-relative calculations like rank or neighbour-based logic are
   * possible). Returns the derived value — can be any JSON-like shape.
   */
  compute: (task: GanttTask, all: GanttTask[]) => unknown;
}

/**
 * Aggregator for summary tasks. Receives direct (first-level) children
 * already decorated with `$computed` from earlier fields, so aggregators
 * can compose over derived values as well as raw fields.
 */
export type SummaryAggregator = (children: GanttTask[]) => unknown;

/**
 * Apply computedFields to every task. Mutates the input array elements
 * in-place (same reference, updated $computed) — the store calls this
 * between positioning and summary rollup.
 */
export function applyComputedFields(
  tasks: GanttTask[],
  fields: ComputedField[] | undefined,
): GanttTask[] {
  if (!fields || fields.length === 0) return tasks;
  for (const t of tasks) {
    if (!t.$computed) t.$computed = {};
    for (const f of fields) {
      try {
        t.$computed[f.key] = f.compute(t, tasks);
      } catch (err) {
        // Never let a single bad computer crash the recalculation.
        console.warn(`computedField "${f.key}" threw for task ${t.id}:`, err);
        t.$computed[f.key] = undefined;
      }
    }
  }
  return tasks;
}

/**
 * Run user-supplied aggregators over summary tasks. Parent summary values
 * are filled with the aggregate of their direct children, keyed under
 * `$computed[aggKey]`.
 *
 * Children are expected to already have been processed by applyComputedFields
 * so aggregators can read `child.$computed` too.
 */
export function applySummaryAggregators(
  tasks: GanttTask[],
  aggregators: Record<string, SummaryAggregator> | undefined,
): GanttTask[] {
  if (!aggregators) return tasks;
  const keys = Object.keys(aggregators);
  if (keys.length === 0) return tasks;

  const byParent = new Map<string, GanttTask[]>();
  for (const t of tasks) {
    if (t.parentId == null) continue;
    const arr = byParent.get(t.parentId);
    if (arr) arr.push(t);
    else byParent.set(t.parentId, [t]);
  }

  for (const t of tasks) {
    if (t.type !== 'summary') continue;
    const children = byParent.get(t.id) ?? [];
    if (!t.$computed) t.$computed = {};
    for (const k of keys) {
      try {
        t.$computed[k] = aggregators[k](children);
      } catch (err) {
        console.warn(`summaryAggregator "${k}" threw for task ${t.id}:`, err);
        t.$computed[k] = undefined;
      }
    }
  }
  return tasks;
}
