import React, { useMemo } from 'react';
import { useGanttStore } from '../store';

// ── Types ──────────────────────────────────────────────────────────

interface LinkCreatorProps {
  active: boolean;
  sourceTaskId: string | null;
  mousePosition: { x: number; y: number };
}

// ── Component ──────────────────────────────────────────────────────

export function LinkCreator({
  active,
  sourceTaskId,
  mousePosition,
}: LinkCreatorProps) {
  const flatTasks = useGanttStore((s) => s.flatTasks);
  const totalWidth = useGanttStore((s) => s.totalWidth);
  const totalHeight = useGanttStore((s) => s.totalHeight);

  const sourceTask = useMemo(
    () => (sourceTaskId ? flatTasks.find((t) => t.id === sourceTaskId) : null),
    [flatTasks, sourceTaskId],
  );

  if (!active || !sourceTask) return null;

  // Start point: right edge of the source task bar, vertically centred
  const startX = sourceTask.$x + sourceTask.$w;
  const startY = sourceTask.$y + sourceTask.$h / 2;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={totalWidth}
      height={totalHeight}
    >
      <line
        x1={startX}
        y1={startY}
        x2={mousePosition.x}
        y2={mousePosition.y}
        className="stroke-primary"
        strokeWidth={2}
        strokeDasharray="6 4"
      />

      {/* Tooltip near cursor */}
      <foreignObject
        x={mousePosition.x + 12}
        y={mousePosition.y - 14}
        width={220}
        height={28}
        pointerEvents="none"
      >
        <div className="inline-block px-2 py-1 text-xs bg-popover border rounded shadow-sm whitespace-nowrap text-popover-foreground">
          Klik op een taak om te verbinden
        </div>
      </foreignObject>
    </svg>
  );
}
