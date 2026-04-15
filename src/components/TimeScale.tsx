// ─────────────────────────────────────────────────────────────
// BMS Gantt – TimeScale (timeline header)
// Renders stacked date-cell rows for the timeline header.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import type { ScaleCell } from '../store/types';
import { useSlots } from '../slots';

export interface TimeScaleProps {
  /** 2D array of header cells — one inner array per scale level (top to bottom). */
  scaleCells: ScaleCell[][];
  /** Total pixel width of the timeline area. */
  totalWidth: number;
}

/**
 * Timeline header rendered above the chart area.
 * Sticky-positioned so it stays visible during vertical scroll.
 */
export const TimeScale: React.FC<TimeScaleProps> = ({ scaleCells, totalWidth }) => {
    const { renderHeaderCell } = useSlots();
    const rowCount = scaleCells.length;

    return (
      <div
        className="sticky top-0 z-20 bg-background"
        style={{ width: totalWidth }}
      >
        {scaleCells.map((row, rowIndex) => {
          const isTopRow = rowIndex < rowCount - 1;

          return (
            <div key={rowIndex} className="flex" style={{ width: totalWidth }}>
              {row.map((cell) => {
                // Build class list per cell
                const cellClasses = [
                  'text-xs text-center py-1 border-r border-b border-border truncate',
                ];

                // Row-level styling
                if (isTopRow) {
                  cellClasses.push('bg-muted/50 font-medium');
                } else {
                  cellClasses.push('bg-background font-normal');
                }

                // Weekend tint (applied after row bg so it overlays)
                if (cell.isWeekend) {
                  cellClasses.push('bg-muted/30');
                }

                // Today highlight
                if (cell.isToday) {
                  cellClasses.push('border-b-2 border-primary');
                }

                const content = renderHeaderCell?.(cell, rowIndex) ?? cell.label;
                return (
                  <div
                    key={cell.key}
                    data-gantt-role="scale-cell"
                    data-gantt-scale-row={rowIndex}
                    data-gantt-unit={cell.unit}
                    data-gantt-date={cell.date.toISOString()}
                    data-gantt-w={cell.width}
                    data-gantt-weekend={cell.isWeekend ? 'true' : undefined}
                    data-gantt-holiday={cell.isHoliday ? 'true' : undefined}
                    data-gantt-today={cell.isToday ? 'true' : undefined}
                    className={cellClasses.join(' ')}
                    style={{ width: cell.width, minWidth: cell.width }}
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
};

TimeScale.displayName = 'TimeScale';
