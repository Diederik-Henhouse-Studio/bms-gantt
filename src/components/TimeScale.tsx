// ─────────────────────────────────────────────────────────────
// BMS Gantt – TimeScale (timeline header)
// Renders stacked date-cell rows for the timeline header.
// ─────────────────────────────────────────────────────────────

import React, { memo } from 'react';
import type { ScaleCell } from '../store/types';

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
export const TimeScale: React.FC<TimeScaleProps> = memo(
  ({ scaleCells, totalWidth }) => {
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

                return (
                  <div
                    key={cell.key}
                    className={cellClasses.join(' ')}
                    style={{ width: cell.width, minWidth: cell.width }}
                  >
                    {cell.label}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  },
);

TimeScale.displayName = 'TimeScale';
