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
  /** Initiates a drag on pointerdown. Attach to task bar elements. */
  handlePointerDown: (
    e: React.PointerEvent,
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
    onPointerMove: (e: PointerEvent) => void;
    onPointerUp: (e: PointerEvent) => void;
    onPointerCancel: (e: PointerEvent) => void;
    onWindowCancel: () => void;
  } | null>(null);
  const capturedPointerRef = useRef<{
    element: Element;
    pointerId: number;
  } | null>(null);

  // ── Cleanup helper ───────────────────────────────────────────

  const removeListeners = useCallback(() => {
    if (listenersRef.current) {
      document.removeEventListener('pointermove', listenersRef.current.onPointerMove);
      document.removeEventListener('pointerup', listenersRef.current.onPointerUp);
      document.removeEventListener('pointercancel', listenersRef.current.onPointerCancel);
      document.removeEventListener('visibilitychange', listenersRef.current.onWindowCancel);
      window.removeEventListener('blur', listenersRef.current.onWindowCancel);
      listenersRef.current = null;
    }
  }, []);

  const releasePointerCapture = useCallback(() => {
    const captured = capturedPointerRef.current;
    if (captured && captured.element.hasPointerCapture?.(captured.pointerId)) {
      captured.element.releasePointerCapture(captured.pointerId);
    }
    capturedPointerRef.current = null;
  }, []);

  // ── Pointer down ─────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, taskId: string, type: DragState['type']) => {
      if (readonly) return;

      // Only respond to primary pointer / primary button.
      if (!e.isPrimary) return;
      if (e.button !== 0) return;

      e.preventDefault();
      e.stopPropagation();

      e.currentTarget.setPointerCapture(e.pointerId);
      capturedPointerRef.current = {
        element: e.currentTarget,
        pointerId: e.pointerId,
      };

      const store = useGanttStore.getState();
      const task = store.tasks.find((t) => t.id === taskId);
      if (!task) {
        releasePointerCapture();
        return;
      }

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

      // ── Global pointermove ────────────────────────────────────

      const onPointerMove = (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return;
        useGanttStore.getState().updateDrag(ev.clientX, ev.clientY);
      };

      // ── Global pointerup / pointercancel ──────────────────────

      const finishDrag = (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return;
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
        releasePointerCapture();
        removeListeners();
      };

      // Treat window blur / tab switch as a cancellation: without this the
      // drag state can hang when the user alt-tabs or the mobile app switcher
      // eats the pointerup event.
      const onWindowCancel = () => {
        const currentStore = useGanttStore.getState();
        currentStore.endDrag(true); // cancelled
        setIsDragging(false);
        setDragType(null);
        originalTaskRef.current = null;
        releasePointerCapture();
        removeListeners();
      };

      // Attach global listeners.
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', finishDrag);
      document.addEventListener('pointercancel', finishDrag);
      document.addEventListener('visibilitychange', onWindowCancel);
      window.addEventListener('blur', onWindowCancel);
      listenersRef.current = {
        onPointerMove,
        onPointerUp: finishDrag,
        onPointerCancel: finishDrag,
        onWindowCancel,
      };
    },
    [readonly, releasePointerCapture, removeListeners],
  );

  // ── Cleanup on unmount ────────────────────────────────────────

  useEffect(() => {
    return () => {
      releasePointerCapture();
      removeListeners();
    };
  }, [releasePointerCapture, removeListeners]);

  return { isDragging, dragType, handlePointerDown };
}
