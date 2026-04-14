// ─────────────────────────────────────────────────────────────
// BMS Gantt – useDrag hook
// Manages the full drag lifecycle for task bars.
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef } from 'react';

import type { GanttTask, DragState } from '../store';
import { useGanttStore } from '../store';

// ━━━ Types ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface UseDragOptions {
  /** When true, all drag interactions are disabled. */
  readonly: boolean;
  /** Called after a successful drag that changed the task. */
  onTaskUpdate?: (task: GanttTask) => void;
}

export interface UseDragReturn {
  /** Whether a drag operation is currently in progress. */
  isDragging: boolean;
  /** The type of the active drag, or null when idle. */
  dragType: DragState['type'] | null;
  /** Initiates a drag on mousedown. Attach to task bar elements. */
  handleMouseDown: (
    e: React.MouseEvent,
    taskId: string,
    type: DragState['type'],
  ) => void;
}

// ━━━ Hook ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useDrag({ readonly, onTaskUpdate }: UseDragOptions): UseDragReturn {
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<DragState['type'] | null>(null);

  // Keep a ref to the latest onTaskUpdate so we don't stale-close over it.
  const onTaskUpdateRef = useRef(onTaskUpdate);
  onTaskUpdateRef.current = onTaskUpdate;

  // Ref to the original task snapshot so we can diff after drop.
  const originalTaskRef = useRef<GanttTask | null>(null);

  // Refs for the global listeners so we can remove them on cleanup.
  const listenersRef = useRef<{
    onMouseMove: (e: MouseEvent) => void;
    onMouseUp: (e: MouseEvent) => void;
  } | null>(null);

  // ── Cleanup helper ───────────────────────────────────────────

  const removeListeners = useCallback(() => {
    if (listenersRef.current) {
      document.removeEventListener('mousemove', listenersRef.current.onMouseMove);
      document.removeEventListener('mouseup', listenersRef.current.onMouseUp);
      listenersRef.current = null;
    }
  }, []);

  // ── Mouse down ───────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, taskId: string, type: DragState['type']) => {
      if (readonly) return;

      // Only respond to primary button.
      if (e.button !== 0) return;

      e.preventDefault();
      e.stopPropagation();

      const store = useGanttStore.getState();
      const task = store.tasks.find((t) => t.id === taskId);
      if (!task) return;

      // Snapshot the task before mutation.
      originalTaskRef.current = { ...task };

      const dragState: DragState = {
        type,
        taskId,
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
        originalTask: { ...task },
      } as DragState;

      store.startDrag(dragState);
      setIsDragging(true);
      setDragType(type);

      // ── Global mousemove ──────────────────────────────────────

      const onMouseMove = (ev: MouseEvent) => {
        useGanttStore.getState().updateDrag(ev.clientX, ev.clientY);
      };

      // ── Global mouseup ────────────────────────────────────────

      const onMouseUp = (_ev: MouseEvent) => {
        const currentStore = useGanttStore.getState();
        currentStore.endDrag();

        setIsDragging(false);
        setDragType(null);

        // Check whether the task actually changed.
        const updatedTask = currentStore.tasks.find((t) => t.id === taskId);
        const original = originalTaskRef.current;

        if (
          updatedTask &&
          original &&
          onTaskUpdateRef.current &&
          (updatedTask.start.getTime() !== original.start.getTime() ||
            updatedTask.end.getTime() !== original.end.getTime() ||
            updatedTask.progress !== original.progress)
        ) {
          onTaskUpdateRef.current(updatedTask);
        }

        originalTaskRef.current = null;
        removeListeners();
      };

      // Attach global listeners.
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      listenersRef.current = { onMouseMove, onMouseUp };
    },
    [readonly, removeListeners],
  );

  // ── Cleanup on unmount ────────────────────────────────────────

  useEffect(() => {
    return () => {
      removeListeners();
    };
  }, [removeListeners]);

  return { isDragging, dragType, handleMouseDown };
}
