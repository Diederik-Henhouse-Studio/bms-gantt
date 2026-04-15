import { createContext, useContext, type ReactNode } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { GanttTask, ScaleCell } from './store';

/**
 * Customisation slots. Each field is optional; when omitted the built-in
 * default is used. Keep the API narrow — consumer-specific visual changes
 * belong here; business logic belongs on the task itself.
 */
export interface GanttSlots {
  /**
   * Override the rendering of a regular task bar's inner content.
   * Receives the task; returns ReactNode rendered *inside* the bar element
   * (the outer wrapper keeps positioning/drag handlers).
   */
  renderTaskBar?: (task: GanttTask) => ReactNode;
  /**
   * Custom tooltip shown on task-bar hover. Return `null` or `undefined`
   * to suppress the tooltip for a given task. When omitted, a compact
   * default tooltip with start/end/progress is rendered.
   */
  renderTaskTooltip?: (task: GanttTask) => ReactNode;
  /**
   * Override the content of a timeline header cell. Receives the cell and
   * its row index (0 = top row). Return a ReactNode rendered in place of
   * the default cell label.
   */
  renderHeaderCell?: (cell: ScaleCell, rowIndex: number) => ReactNode;
  /**
   * Custom column definitions for the left-pane grid. When omitted, the
   * built-in column set (Task / Start / End / Duration / Progress) is used.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns?: ColumnDef<GanttTask, any>[];
}

const SlotsContext = createContext<GanttSlots>({});

export function SlotsProvider({
  slots,
  children,
}: {
  slots?: GanttSlots;
  children: ReactNode;
}) {
  return <SlotsContext.Provider value={slots ?? {}}>{children}</SlotsContext.Provider>;
}

export function useSlots(): GanttSlots {
  return useContext(SlotsContext);
}
