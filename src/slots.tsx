import { createContext, useContext, type ReactNode } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { GanttTask } from './store';

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
