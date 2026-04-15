import React from 'react';
import { useGanttStore } from '../store';

/**
 * Renders a label row for each task group in multi-row mode.
 * Positioned inside the chart area so it scrolls vertically with the tasks.
 * In single-row mode this component renders nothing.
 */
export function GroupHeaders() {
  const taskGroups = useGanttStore((s) => s.taskGroups);
  const config = useGanttStore((s) => s.config);
  const totalWidth = useGanttStore((s) => s.totalWidth);

  if (config.rowMode !== 'multi' || taskGroups.length === 0) return null;

  const cellHeight = config.cellHeight;

  let cumulativeY = 0;
  const rows = taskGroups.map((group) => {
    const headerY = cumulativeY;
    cumulativeY += cellHeight + group.laneCount * cellHeight;
    return (
      <div
        key={group.id}
        className="absolute pointer-events-none text-xs font-semibold text-muted-foreground px-3 flex items-center"
        style={{
          left: 0,
          top: headerY,
          width: totalWidth,
          height: cellHeight,
          zIndex: 2,
        }}
      >
        <span className="bg-background/80 rounded px-2 py-0.5 backdrop-blur-sm">
          {group.label} · {group.taskIds.length}
        </span>
      </div>
    );
  });

  return <>{rows}</>;
}
