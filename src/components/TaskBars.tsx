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
  const capturedPointerRef = useRef<{
    element: Element;
    pointerId: number;
  } | null>(null);

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
      e: React.PointerEvent,
      taskId: string,
      type: 'move' | 'resize-start' | 'resize-end' | 'progress',
    ) => {
      if (readonly) return;
      if (!e.isPrimary) return;
      if (e.button !== 0) return;

      e.preventDefault();
      e.stopPropagation();

      e.currentTarget.setPointerCapture(e.pointerId);
      capturedPointerRef.current = {
        element: e.currentTarget,
        pointerId: e.pointerId,
      };

      const task = taskMap.current.get(taskId);
      if (!task) {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
        capturedPointerRef.current = null;
        return;
      }

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

  // ── Global pointer listeners for drag ────────────────────────

  useEffect(() => {
    const releasePointerCapture = () => {
      const captured = capturedPointerRef.current;
      if (captured && captured.element.hasPointerCapture?.(captured.pointerId)) {
        captured.element.releasePointerCapture(captured.pointerId);
      }
      capturedPointerRef.current = null;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      if (e.pointerId !== capturedPointerRef.current?.pointerId) return;
      useGanttStore.getState().updateDrag(e.clientX, e.clientY);
    };

    const handlePointerEnd = (e: PointerEvent) => {
      if (!isDragging.current) return;
      if (e.pointerId !== capturedPointerRef.current?.pointerId) return;
      isDragging.current = false;
      useGanttStore.getState().endDrag();
      releasePointerCapture();
    };

    const handleWindowCancel = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      useGanttStore.getState().endDrag(true);
      releasePointerCapture();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);
    document.addEventListener('visibilitychange', handleWindowCancel);
    window.addEventListener('blur', handleWindowCancel);

    return () => {
      releasePointerCapture();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
      document.removeEventListener('visibilitychange', handleWindowCancel);
      window.removeEventListener('blur', handleWindowCancel);
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
        <div
          className="sticky left-0 flex items-center justify-center text-sm pointer-events-none select-none"
          style={{ width: '50vw', height: 120, color: '#9ca3af', position: 'relative', zIndex: 10 }}
        >
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
