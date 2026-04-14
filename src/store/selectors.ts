// BMS Gantt -- Derived selectors

import type { GanttState } from './types';

/**
 * Backward-compatible selector: returns the first selected task id, or null.
 * Use when you need the legacy single-selection behaviour.
 */
export const selectSingleTaskId = (state: GanttState): string | null =>
  state.selectedTaskIds[0] ?? null;
