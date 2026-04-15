// ─────────────────────────────────────────────────────────────
// BMS Gantt – CellGrid (background grid)
// SVG overlay that draws vertical/horizontal grid lines,
// weekend shading, and the today marker behind task bars.
// ─────────────────────────────────────────────────────────────

import React, { memo, useMemo } from 'react';
import { useGanttStore } from '../store';
import type { ScaleCell, LaneGroup } from '../store/types';

export interface CellGridProps {
  /** Finest scale row (last in the scaleCells array). */
  scaleCells: ScaleCell[];
  /** Total pixel width of the timeline area. */
  totalWidth: number;
  /** Total pixel height of the task area. */
  totalHeight: number;
}

/**
 * Background grid rendered as an absolutely-positioned SVG.
 * Pointer-events are disabled so interactions pass through to task bars.
 */
export const CellGrid: React.FC<CellGridProps> = memo(
  ({ scaleCells, totalWidth, totalHeight }) => {
    const config = useGanttStore((s) => s.config);
    const taskGroups = useGanttStore((s) => s.taskGroups);
    const cellHeight = config.cellHeight;

    // Pre-compute grid elements to avoid work during render
    const { verticalLines, weekendRects, holidayRects, todayLine, horizontalLines, groupHeaderRects, groupSeparatorLines } =
      useMemo(() => {
        const vLines: { x: number; key: string }[] = [];
        const wRects: { x: number; width: number; key: string }[] = [];
        const hRects: { x: number; width: number; key: string }[] = [];
        let tLine: { x: number } | null = null;

        // Vertical lines + weekend/holiday rects + today marker
        let x = 0;
        for (const cell of scaleCells) {
          if (cell.isHoliday) {
            hRects.push({ x, width: cell.width, key: `h-${cell.key}` });
          } else if (cell.isWeekend) {
            wRects.push({ x, width: cell.width, key: `w-${cell.key}` });
          }

          // Today marker at the left edge of the today cell
          if (cell.isToday) {
            tLine = { x };
          }

          // Advance to right edge, draw vertical line there
          x += cell.width;
          vLines.push({ x, key: `v-${cell.key}` });
        }

        // Horizontal lines and group decorations
        const hLines: { y: number; key: string; isGroupBoundary?: boolean }[] = [];
        const gHeaderRects: { y: number; height: number; key: string }[] = [];
        const gSepLines: { y: number; key: string }[] = [];

        if (config.rowMode === 'multi' && taskGroups.length > 0) {
          // Multi-row mode: draw group boundaries and lane lines
          let cumulativeY = 0;

          for (let gi = 0; gi < taskGroups.length; gi++) {
            const group = taskGroups[gi];
            const groupHeaderHeight = cellHeight;
            const groupContentHeight = group.laneCount * cellHeight;

            // Tinted background for group header row
            gHeaderRects.push({
              y: cumulativeY,
              height: groupHeaderHeight,
              key: `gh-${group.id}`,
            });

            // Thin line at bottom of group header
            hLines.push({
              y: cumulativeY + groupHeaderHeight,
              key: `ghb-${group.id}`,
            });

            // Thin lane lines within the group content area
            for (let lane = 1; lane < group.laneCount; lane++) {
              const laneY = cumulativeY + groupHeaderHeight + lane * cellHeight;
              hLines.push({
                y: laneY,
                key: `gl-${group.id}-${lane}`,
              });
            }

            // Advance past the full group
            cumulativeY += groupHeaderHeight + groupContentHeight;

            // Thick separator line at the group boundary
            gSepLines.push({
              y: cumulativeY,
              key: `gs-${group.id}`,
            });
          }
        } else {
          // Single-row mode: uniform row lines
          if (cellHeight > 0) {
            const rowCount = Math.ceil(totalHeight / cellHeight);
            for (let i = 1; i <= rowCount; i++) {
              const y = i * cellHeight;
              hLines.push({ y, key: `h-${i}` });
            }
          }
        }

        return {
          verticalLines: vLines,
          weekendRects: wRects,
          holidayRects: hRects,
          todayLine: tLine,
          horizontalLines: hLines,
          groupHeaderRects: gHeaderRects,
          groupSeparatorLines: gSepLines,
        };
      }, [scaleCells, totalHeight, cellHeight, config.rowMode, taskGroups]);

    return (
      <svg
        width={totalWidth}
        height={totalHeight}
        className="absolute inset-0 pointer-events-none"
      >
        {/* Weekend column shading */}
        {weekendRects.map((r) => (
          <rect
            key={r.key}
            x={r.x}
            y={0}
            width={r.width}
            height={totalHeight}
            fill="rgb(148 163 184)"
            fillOpacity={0.12}
          />
        ))}

        {/* Holiday column shading (warmer tint to distinguish from weekends) */}
        {holidayRects.map((r) => (
          <rect
            key={r.key}
            x={r.x}
            y={0}
            width={r.width}
            height={totalHeight}
            fill="rgb(239 68 68)"
            fillOpacity={0.1}
          />
        ))}

        {/* Vertical cell-boundary lines */}
        {verticalLines.map((l) => (
          <line
            key={l.key}
            x1={l.x}
            y1={0}
            x2={l.x}
            y2={totalHeight}
            stroke="currentColor"
            className="text-border"
            strokeWidth={1}
          />
        ))}

        {/* Group header background rects (multi-row mode) */}
        {groupHeaderRects.map((r) => (
          <rect
            key={r.key}
            x={0}
            y={r.y}
            width={totalWidth}
            height={r.height}
            className="text-muted"
            fill="currentColor"
            opacity={0.15}
          />
        ))}

        {/* Horizontal row lines */}
        {horizontalLines.map((l) => (
          <line
            key={l.key}
            x1={0}
            y1={l.y}
            x2={totalWidth}
            y2={l.y}
            stroke="currentColor"
            className="text-border"
            strokeWidth={1}
          />
        ))}

        {/* Group separator lines (multi-row mode, thicker) */}
        {groupSeparatorLines.map((l) => (
          <line
            key={l.key}
            x1={0}
            y1={l.y}
            x2={totalWidth}
            y2={l.y}
            stroke="currentColor"
            className="text-border"
            strokeWidth={2}
            opacity={0.6}
          />
        ))}

        {/* Today marker */}
        {todayLine && (
          <line
            x1={todayLine.x}
            y1={0}
            x2={todayLine.x}
            y2={totalHeight}
            stroke="currentColor"
            className="text-primary"
            strokeWidth={2}
            strokeDasharray="4 4"
          />
        )}
      </svg>
    );
  },
);

CellGrid.displayName = 'CellGrid';
