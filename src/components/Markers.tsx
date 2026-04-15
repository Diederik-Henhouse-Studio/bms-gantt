import React from 'react';
import { useGanttStore, dateToX } from '../store';
import type { GanttMarker } from '../store';
import { useLabels } from '../i18n';
import { useNow } from '../hooks/useNow';

// ── Color mapping ───────────────────────────────────────────────────

const STROKE_COLOR_MAP: Record<string, string> = {
  red: 'stroke-red-500',
  blue: 'stroke-blue-500',
  green: 'stroke-green-500',
  yellow: 'stroke-yellow-500',
  orange: 'stroke-orange-500',
  purple: 'stroke-purple-500',
  primary: 'stroke-primary',
};

const BG_COLOR_MAP: Record<string, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  orange: 'bg-orange-500',
  purple: 'bg-purple-500',
  primary: 'bg-primary',
};

function getStrokeClass(color?: string): string {
  if (!color) return 'stroke-muted-foreground';
  return STROKE_COLOR_MAP[color] ?? 'stroke-muted-foreground';
}

function getBgClass(color?: string): string {
  if (!color) return 'bg-muted-foreground';
  return BG_COLOR_MAP[color] ?? 'bg-muted-foreground';
}

// ── Component ───────────────────────────────────────────────────────

export function Markers() {
  const markers = useGanttStore((s) => s.markers);
  const dateRange = useGanttStore((s) => s.dateRange);
  const totalWidth = useGanttStore((s) => s.totalWidth);
  const totalHeight = useGanttStore((s) => s.totalHeight);

  const labels = useLabels();
  // Refreshes every minute so the now-line ticks without external rerenders.
  const today = useNow();
  const todayX = dateToX(today, dateRange, totalWidth);

  // Check if today falls within the visible date range
  const showToday =
    today >= dateRange.start && today <= dateRange.end;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
      width={totalWidth}
      height={totalHeight}
    >
      {/* User-defined markers */}
      {markers.map((marker) => {
        const x = dateToX(marker.date, dateRange, totalWidth);
        const strokeClass = getStrokeClass(marker.color);
        const bgClass = getBgClass(marker.color);

        return (
          <g key={marker.id}>
            <line
              x1={x}
              y1={0}
              x2={x}
              y2={totalHeight}
              className={strokeClass}
              strokeWidth={1.5}
              strokeDasharray={marker.dashed ? '6 4' : undefined}
            />
            {marker.label && (
              <foreignObject
                x={x - 40}
                y={4}
                width={80}
                height={22}
              >
                <div className="flex justify-center">
                  <span
                    className={`${bgClass} text-white text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap leading-none`}
                  >
                    {marker.label}
                  </span>
                </div>
              </foreignObject>
            )}
          </g>
        );
      })}

      {/* Today marker — always shown when in range */}
      {showToday && (
        <g>
          <line
            x1={todayX}
            y1={0}
            x2={todayX}
            y2={totalHeight}
            stroke="var(--gantt-today-color, currentColor)"
            className="stroke-primary"
            strokeWidth={2}
            strokeDasharray="4 4"
          />
          <foreignObject
            x={todayX - 32}
            y={4}
            width={64}
            height={22}
          >
            <div className="flex justify-center">
              <span
                className="text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap leading-none"
                style={{
                  background: 'var(--gantt-today-color, hsl(var(--primary)))',
                  color: 'var(--gantt-today-fg, hsl(var(--primary-foreground)))',
                }}
              >
                {labels.today}
              </span>
            </div>
          </foreignObject>
        </g>
      )}
    </svg>
  );
}
