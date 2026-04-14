// ─────────────────────────────────────────────────────────────
// BMS Gantt – TaskBar component
// Renders a single task bar (regular, milestone, or summary).
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { cn } from '../utils/cn';
import type { GanttTask, TaskCategory } from '../store';

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
  const size = 14;

  return (
    <div
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

  return (
    <div
      className={cn(
        'absolute rounded-sm overflow-hidden select-none',
        !colors.custom && colors.bg,
        isSelected && 'ring-2 ring-primary ring-offset-1',
        task.critical && !isSelected && 'ring-2 ring-red-500',
      )}
      style={{
        left: task.$x,
        top: task.$y,
        width: task.$w,
        height: task.$h,
        ...(colors.custom ? { backgroundColor: colors.custom } : {}),
        cursor: readonly ? 'default' : 'grab',
      }}
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
            className="absolute z-20 w-2.5 h-2.5 rounded-full bg-white border-2 border-gray-500 cursor-ew-resize"
            style={{
              left: `${progressPct}%`,
              bottom: -2,
              transform: 'translateX(-50%)',
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              onDragStart(e, task.id, 'progress');
            }}
          />
        </>
      )}
    </div>
  );
}

// ── Baseline bar ───────────────────────────────────────────────

function BaselineBar({ task }: { task: GanttTask }) {
  if (!task.baseStart || !task.baseEnd) return null;

  // Use pre-computed baseline positions if available, otherwise skip
  // (the store's positionBaselines should set these)
  const bx = (task as any).$bx as number | undefined;
  const bw = (task as any).$bw as number | undefined;

  if (bx == null || bw == null) return null;

  return (
    <div
      className="absolute bg-muted-foreground/40 rounded-sm pointer-events-none"
      style={{
        left: bx,
        top: task.$y + task.$h + 2,
        width: bw,
        height: 4,
      }}
    />
  );
}

// ── Main export ────────────────────────────────────────────────

export function TaskBar(props: TaskBarProps) {
  const { task } = props;

  return (
    <>
      {task.type === 'milestone' && <MilestoneBar {...props} />}
      {task.type === 'summary' && <SummaryBar {...props} />}
      {task.type === 'task' && <RegularBar {...props} />}

      {/* Baseline (shown below the main bar for any type) */}
      <BaselineBar task={task} />
    </>
  );
}

export default TaskBar;
