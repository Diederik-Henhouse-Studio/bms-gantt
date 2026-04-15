// ─────────────────────────────────────────────────────────────
// BMS Gantt – TaskBars container
// Renders visible task bars with virtual scrolling and
// manages drag interaction lifecycle.
// ─────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useRef } from 'react';
import { useGanttStore } from '../store';
import type { GanttTask, DragState } from '../store';
import { TaskBar } from './TaskBar';
import { GroupHeaders } from './GroupHeaders';
import { useLabels } from '../i18n';

// ── Props ──────────────────────────────────────────────────────

export interface TaskBarsProps {
  readonly: boolean;
  onTaskClick?: (task: GanttTask) => void;
  onTaskDoubleClick?: (task: GanttTask) => void;
}

// ── Constants ──────────────────────────────────────────────────

/** Number of extra rows rendered above/below the visible area. */
const ROW_BUFFER = 5;

// ── Component ──────────────────────────────────────────────────

export function TaskBars({ readonly, onTaskClick, onTaskDoubleClick }: TaskBarsProps) {
  const flatTasks = useGanttStore((s) => s.flatTasks);
  const selectedTaskIds = useGanttStore((s) => s.selectedTaskIds);
  const totalWidth = useGanttStore((s) => s.totalWidth);
  const totalHeight = useGanttStore((s) => s.totalHeight);
  const scrollTop = useGanttStore((s) => s.scrollTop);
  const config = useGanttStore((s) => s.config);
  const dragState = useGanttStore((s) => s.dragState);
  const labels = useLabels();

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // ── Virtual scrolling: determine visible tasks ───────────────

  const viewportHeight =
    containerRef.current?.parentElement?.clientHeight ?? totalHeight;
  const bufferPx = ROW_BUFFER * config.cellHeight;

  const visibleTop = scrollTop - bufferPx;
  const visibleBottom = scrollTop + viewportHeight + bufferPx;

  const visibleTasks = flatTasks.filter(
    (t) => t.$y + t.$h >= visibleTop && t.$y <= visibleBottom,
  );

  // ── Task lookup helper ───────────────────────────────────────

  const taskMap = useRef(new Map<string, GanttTask>());
  taskMap.current.clear();
  for (const t of flatTasks) {
    taskMap.current.set(t.id, t);
  }

  // ── Handlers ─────────────────────────────────────────────────

  const handleSelect = useCallback(
    (taskId: string, e?: React.MouseEvent) => {
      const opts = e
        ? { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey }
        : undefined;
      useGanttStore.getState().selectTask(taskId, opts);
      const task = taskMap.current.get(taskId);
      if (task && onTaskClick) {
        onTaskClick(task);
      }
    },
    [onTaskClick],
  );

  const handleDoubleClick = useCallback(
    (taskId: string) => {
      const task = taskMap.current.get(taskId);
      if (task && onTaskDoubleClick) {
        onTaskDoubleClick(task);
      }
    },
    [onTaskDoubleClick],
  );

  const handleDragStart = useCallback(
    (
      e: React.MouseEvent,
      taskId: string,
      type: 'move' | 'resize-start' | 'resize-end' | 'progress',
    ) => {
      if (readonly) return;

      e.preventDefault();
      e.stopPropagation();

      const task = taskMap.current.get(taskId);
      if (!task) return;

      const drag: DragState = {
        type,
        taskId,
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
        originalTask: { ...task },
      } as DragState;

      useGanttStore.getState().startDrag(drag);
      isDragging.current = true;
    },
    [readonly],
  );

  // ── Global mouse listeners for drag ──────────────────────────

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      useGanttStore.getState().updateDrag(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      useGanttStore.getState().endDrag();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // ── Drag ghost preview ───────────────────────────────────────

  const renderDragGhost = () => {
    if (!dragState) return null;

    const dx = dragState.currentX - dragState.startX;
    const dy = dragState.currentY - dragState.startY;
    const original = dragState.originalTask;

    let ghostX = original.$x;
    let ghostW = original.$w;

    switch (dragState.type) {
      case 'move':
        ghostX = original.$x + dx;
        break;
      case 'resize-start':
        ghostX = original.$x + dx;
        ghostW = Math.max(8, original.$w - dx);
        break;
      case 'resize-end':
        ghostW = Math.max(8, original.$w + dx);
        break;
      case 'progress':
        // No ghost needed for progress drag
        return null;
    }

    return (
      <div
        className="absolute rounded-sm bg-primary/30 border border-primary/50 pointer-events-none z-50"
        style={{
          left: ghostX,
          top: original.$y,
          width: ghostW,
          height: original.$h,
        }}
      />
    );
  };

  // ── Render ───────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ width: totalWidth, height: Math.max(totalHeight, 120) }}
    >
      <GroupHeaders />

      {flatTasks.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground pointer-events-none select-none">
          {labels.emptyState}
        </div>
      )}

      {visibleTasks.map((task) => (
        <TaskBar
          key={task.id}
          task={task}
          isSelected={selectedTaskIds.includes(task.id)}
          readonly={readonly}
          onSelect={handleSelect}
          onDoubleClick={handleDoubleClick}
          onDragStart={handleDragStart}
        />
      ))}

      {renderDragGhost()}
    </div>
  );
}

export default TaskBars;
