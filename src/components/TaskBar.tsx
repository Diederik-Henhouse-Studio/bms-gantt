// ─────────────────────────────────────────────────────────────
// BMS Gantt – TaskBar component
// Renders a single task bar (regular, milestone, or summary).
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { cn } from '../utils/cn';
import type { GanttTask, TaskCategory } from '../store';
import { useSlots } from '../slots';

function DefaultTooltip({ task }: { task: GanttTask }) {
  const fmt = (d: Date) => d.toLocaleDateString();
  return (
    <div className="space-y-0.5">
      <div className="font-medium">{task.text}</div>
      <div className="text-[10px] opacity-80">
        {fmt(task.start)} → {fmt(task.end)} · {task.duration}d · {Math.round(task.progress)}%
        {task.slack != null ? ` · slack ${task.slack}d` : ''}
      </div>
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────

export interface TaskBarProps {
  task: GanttTask;
  isSelected: boolean;
  readonly: boolean;
  onSelect: (taskId: string, e?: React.MouseEvent) => void;
  onDoubleClick: (taskId: string) => void;
  onDragStart: (
    e: React.MouseEvent,
    taskId: string,
    type: 'move' | 'resize-start' | 'resize-end' | 'progress',
  ) => void;
}

// ── Category colour map ────────────────────────────────────────

const CATEGORY_COLORS: Record<TaskCategory, { bg: string; fill: string }> = {
  f1:        { bg: 'bg-blue-500',    fill: 'bg-blue-600' },
  f2:        { bg: 'bg-emerald-500', fill: 'bg-emerald-600' },
  f3:        { bg: 'bg-amber-500',   fill: 'bg-amber-600' },
  transport: { bg: 'bg-purple-500',  fill: 'bg-purple-600' },
  inspectie: { bg: 'bg-cyan-500',    fill: 'bg-cyan-600' },
  order:     { bg: 'bg-yellow-500',  fill: 'bg-yellow-600' },
  generic:   { bg: 'bg-primary',     fill: 'bg-primary/80' },
};

function getCategoryColors(task: GanttTask) {
  if (task.color) {
    return { bg: '', fill: '', custom: task.color };
  }
  const cat = task.taskCategory ?? 'generic';
  return { ...CATEGORY_COLORS[cat], custom: undefined };
}

// ── Milestone ──────────────────────────────────────────────────

function MilestoneBar({ task, isSelected, readonly, onSelect, onDoubleClick, onDragStart }: TaskBarProps) {
  const colors = getCategoryColors(task);
  // Enforce a readable minimum regardless of zoom level.
  const size = Math.max(14, Math.min(24, task.$h - 4));

  return (
    <div
      data-gantt-role="milestone"
      data-gantt-task-id={task.id}
      data-gantt-x={task.$x - size / 2}
      data-gantt-y={task.$y + (task.$h - size) / 2}
      data-gantt-w={size}
      data-gantt-h={size}
      data-gantt-start={task.start.toISOString()}
      data-gantt-critical={task.critical ? 'true' : undefined}
      className="absolute"
      style={{
        left: task.$x - size / 2,
        top: task.$y + (task.$h - size) / 2,
        width: size,
        height: size,
      }}
      onClick={(e) => onSelect(task.id, e)}
      onDoubleClick={() => onDoubleClick(task.id)}
      onMouseDown={!readonly ? (e) => onDragStart(e, task.id, 'move') : undefined}
    >
      <div
        className={cn(
          'w-full h-full rounded-[2px]',
          !colors.custom && colors.bg,
          isSelected && 'ring-2 ring-primary ring-offset-1',
          task.critical && 'ring-2 ring-red-500',
        )}
        style={{
          transform: 'rotate(45deg)',
          ...(colors.custom ? { backgroundColor: colors.custom } : {}),
          cursor: readonly ? 'default' : 'grab',
        }}
      />
    </div>
  );
}

// ── Summary ────────────────────────────────────────────────────

function SummaryBar({ task, isSelected, readonly, onSelect, onDoubleClick, onDragStart }: TaskBarProps) {
  const colors = getCategoryColors(task);
  const barHeight = 8;
  const triangleSize = 5;

  return (
    <div
      data-gantt-role="summary"
      data-gantt-task-id={task.id}
      data-gantt-x={task.$x}
      data-gantt-y={task.$y + (task.$h - barHeight) / 2}
      data-gantt-w={task.$w}
      data-gantt-h={barHeight + triangleSize}
      data-gantt-start={task.start.toISOString()}
      data-gantt-end={task.end.toISOString()}
      className="absolute"
      style={{
        left: task.$x,
        top: task.$y + (task.$h - barHeight) / 2,
        width: task.$w,
        height: barHeight + triangleSize,
      }}
      onClick={(e) => onSelect(task.id, e)}
      onDoubleClick={() => onDoubleClick(task.id)}
      onMouseDown={!readonly ? (e) => onDragStart(e, task.id, 'move') : undefined}
    >
      {/* Main bar */}
      <div
        className={cn(
          'w-full rounded-sm',
          !colors.custom && 'bg-gray-700 dark:bg-gray-400',
          isSelected && 'ring-2 ring-primary ring-offset-1',
          task.critical && 'ring-2 ring-red-500',
        )}
        style={{
          height: barHeight,
          ...(colors.custom ? { backgroundColor: colors.custom, filter: 'brightness(0.7)' } : {}),
          cursor: readonly ? 'default' : 'grab',
        }}
      />

      {/* Left triangle */}
      <div
        className="absolute"
        style={{
          left: 0,
          top: barHeight,
          width: 0,
          height: 0,
          borderLeft: `${triangleSize}px solid transparent`,
          borderRight: `${triangleSize}px solid transparent`,
          borderTop: `${triangleSize}px solid`,
          borderTopColor: colors.custom
            ? colors.custom
            : 'rgb(55 65 81)', // gray-700
        }}
      />

      {/* Right triangle */}
      <div
        className="absolute"
        style={{
          right: 0,
          top: barHeight,
          width: 0,
          height: 0,
          borderLeft: `${triangleSize}px solid transparent`,
          borderRight: `${triangleSize}px solid transparent`,
          borderTop: `${triangleSize}px solid`,
          borderTopColor: colors.custom
            ? colors.custom
            : 'rgb(55 65 81)',
        }}
      />
    </div>
  );
}

// ── Regular task bar ───────────────────────────────────────────

function RegularBar({ task, isSelected, readonly, onSelect, onDoubleClick, onDragStart }: TaskBarProps) {
  const colors = getCategoryColors(task);
  const progressPct = Math.max(0, Math.min(100, task.progress));
  const { renderTaskBar, renderTaskTooltip } = useSlots();
  const customContent = renderTaskBar?.(task);
  const isCritical = !!task.critical;
  const [hovered, setHovered] = useState(false);

  const tooltipContent = renderTaskTooltip
    ? renderTaskTooltip(task)
    : <DefaultTooltip task={task} />;

  // Task status affects opacity / decoration.
  const statusStyle: React.CSSProperties = {};
  if (task.status === 'paused') {
    statusStyle.opacity = 0.55;
    statusStyle.backgroundImage =
      'repeating-linear-gradient(45deg, transparent 0 6px, rgba(0,0,0,0.15) 6px 12px)';
  } else if (task.status === 'cancelled') {
    statusStyle.opacity = 0.35;
    statusStyle.textDecoration = 'line-through';
  } else if (task.status === 'completed') {
    statusStyle.opacity = 0.85;
  }

  return (
    <div
      data-gantt-role="task-bar"
      data-gantt-task-id={task.id}
      data-gantt-x={task.$x}
      data-gantt-y={task.$y}
      data-gantt-w={task.$w}
      data-gantt-h={task.$h}
      data-gantt-start={task.start.toISOString()}
      data-gantt-end={task.end.toISOString()}
      data-gantt-level={task.$level}
      data-gantt-type={task.type}
      data-gantt-category={task.taskCategory ?? undefined}
      data-gantt-status={task.status ?? undefined}
      data-gantt-critical={isCritical ? 'true' : undefined}
      data-gantt-selected={isSelected ? 'true' : undefined}
      data-gantt-lane={task.$lane ?? undefined}
      data-gantt-group={task.$groupId ?? undefined}
      className={cn(
        'absolute rounded-sm overflow-hidden select-none',
        !colors.custom && colors.bg,
        isSelected && 'ring-2 ring-primary ring-offset-1',
      )}
      style={{
        left: task.$x,
        top: task.$y,
        width: task.$w,
        height: task.$h,
        ...(colors.custom ? { backgroundColor: colors.custom } : {}),
        cursor: readonly ? 'default' : 'grab',
        ...(isCritical && !isSelected
          ? {
              boxShadow:
                '0 0 0 2px var(--gantt-critical-color, rgb(239 68 68)), 0 0 6px color-mix(in srgb, var(--gantt-critical-color, rgb(239 68 68)) 40%, transparent)',
            }
          : {}),
        ...statusStyle,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => onSelect(task.id, e)}
      onDoubleClick={() => onDoubleClick(task.id)}
      onMouseDown={!readonly ? (e) => {
        // Only trigger move if not on a resize handle
        const target = e.target as HTMLElement;
        if (!target.dataset.handle) {
          onDragStart(e, task.id, 'move');
        }
      } : undefined}
    >
      {customContent !== undefined ? (
        <div className="relative z-10 w-full h-full">{customContent}</div>
      ) : task.segments && task.segments.length > 0 ? (
        /* ── Split task: render each segment as a separate bar ── */
        <>
          {task.segments.map((seg, i) => {
            const relX = seg.$x - task.$x;
            return (
              <div
                key={i}
                data-gantt-role="segment"
                data-gantt-segment={i}
                className={cn(
                  'absolute inset-y-0 rounded-sm',
                  !colors.custom && colors.bg,
                )}
                style={{
                  left: relX,
                  width: seg.$w,
                  ...(colors.custom ? { backgroundColor: colors.custom } : {}),
                }}
              >
                {i === 0 && (
                  <div className="relative z-10 flex items-center h-full px-1">
                    <span className="text-xs text-white truncate">{task.text}</span>
                  </div>
                )}
              </div>
            );
          })}
          {/* Dashed connector between segments */}
          {task.segments.length > 1 && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: task.segments[0].$x - task.$x + task.segments[0].$w,
                right: task.$w - (task.segments[task.segments.length - 1].$x - task.$x),
                top: '50%',
                height: 0,
                borderTop: '2px dashed',
                borderColor: colors.custom ?? 'currentColor',
                opacity: 0.5,
              }}
            />
          )}
        </>
      ) : (
        <>
          {/* Progress fill */}
          <div
            className={cn(
              'absolute inset-y-0 left-0 rounded-sm',
              !colors.custom && colors.fill,
            )}
            style={{
              width: `${progressPct}%`,
              ...(colors.custom
                ? { backgroundColor: colors.custom, filter: 'brightness(0.8)' }
                : {}),
            }}
          />

          {/* Text label */}
          <div className="relative z-10 flex items-center h-full px-1.5">
            <span className="text-xs text-white truncate">{task.text}</span>
          </div>
        </>
      )}

      {/* Resize handles (left / right) */}
      {!readonly && (
        <>
          <div
            data-handle="resize-start"
            className="absolute inset-y-0 left-0 w-1 cursor-ew-resize z-20"
            onMouseDown={(e) => {
              e.stopPropagation();
              onDragStart(e, task.id, 'resize-start');
            }}
          />
          <div
            data-handle="resize-end"
            className="absolute inset-y-0 right-0 w-1 cursor-ew-resize z-20"
            onMouseDown={(e) => {
              e.stopPropagation();
              onDragStart(e, task.id, 'resize-end');
            }}
          />

          {/* Progress handle */}
          <div
            data-handle="progress"
            className="absolute z-20 w-3.5 h-3.5 rounded-full bg-white border-2 border-gray-500 hover:border-primary hover:scale-125 transition-transform cursor-ew-resize shadow"
            style={{
              left: `${progressPct}%`,
              bottom: -4,
              transform: 'translateX(-50%)',
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              onDragStart(e, task.id, 'progress');
            }}
          />
        </>
      )}

      {/* Hover tooltip */}
      {hovered && tooltipContent != null && (
        <div
          className="absolute z-50 px-2 py-1 rounded bg-popover text-popover-foreground text-xs border shadow-lg pointer-events-none whitespace-nowrap"
          style={{ left: 0, top: -4, transform: 'translateY(-100%)' }}
        >
          {tooltipContent}
        </div>
      )}
    </div>
  );
}

// ── Baseline bar ───────────────────────────────────────────────

function BaselineBar({ task }: { task: GanttTask }) {
  if (!task.baseStart || !task.baseEnd) return null;

  const bx = task.$bx;
  const bw = task.$bw;

  if (bx == null || bw == null) return null;

  // Render as a full-height striped shadow bar *behind* the live bar.
  // Visually conveys the original plan while keeping the live bar legible on top.
  return (
    <div
      className="absolute rounded-sm pointer-events-none"
      style={{
        left: bx,
        top: task.$y,
        width: bw,
        height: task.$h,
        zIndex: 0,
        background:
          'repeating-linear-gradient(45deg, var(--gantt-baseline-stripe, rgb(148 163 184 / 0.35)) 0 6px, var(--gantt-baseline-bg, rgb(148 163 184 / 0.15)) 6px 12px)',
        border: '1px dashed var(--gantt-baseline-border, rgb(148 163 184 / 0.6))',
      }}
      aria-hidden="true"
    />
  );
}

// ── Main export ────────────────────────────────────────────────

export function TaskBar(props: TaskBarProps) {
  const { task } = props;

  return (
    <>
      {/* Baseline rendered first so it sits behind the live bar */}
      <BaselineBar task={task} />

      {task.type === 'milestone' && <MilestoneBar {...props} />}
      {task.type === 'summary' && <SummaryBar {...props} />}
      {task.type === 'task' && <RegularBar {...props} />}
    </>
  );
}

export default TaskBar;
