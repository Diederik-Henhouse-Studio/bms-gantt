import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';

import type { GanttTask } from '../store';
import { useGanttStore } from '../store';

export interface MarqueeRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

export interface UseMarqueeSelectOptions {
  /** Scrollable chart body that owns scrollLeft/scrollTop. */
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  /** Total chart content width in pixels. */
  totalWidth: number;
  /** Total chart content height in pixels. */
  totalHeight: number;
}

export interface UseMarqueeSelectReturn {
  /** Rectangle in chart content coordinates, or null when idle/cancelled. */
  marqueeRect: MarqueeRect | null;
  /** True after the drag moves far enough to become a marquee gesture. */
  isMarqueeSelecting: boolean;
  /** Attach to the chart content element. */
  handleMarqueeMouseDown: (e: React.MouseEvent) => void;
}

const DRAG_THRESHOLD = 3;

function rectFromPoints(start: Point, end: Point): MarqueeRect {
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  return {
    left,
    top,
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

function intersects(a: MarqueeRect, b: MarqueeRect) {
  return (
    a.left <= b.left + b.width &&
    a.left + a.width >= b.left &&
    a.top <= b.top + b.height &&
    a.top + a.height >= b.top
  );
}

export function getTasksInMarquee(tasks: GanttTask[], rect: MarqueeRect): string[] {
  return tasks
    .filter((task) =>
      intersects(rect, {
        left: task.$x,
        top: task.$y,
        width: task.$w,
        height: task.$h,
      }),
    )
    .map((task) => task.id);
}

function isEmptyChartTarget(target: EventTarget | null, content: HTMLElement) {
  if (!(target instanceof Element)) return false;

  const blockingTarget = target.closest(
    [
      '[data-gantt-task-id]',
      '[data-gantt-link-id]',
      '[data-handle]',
      'button',
      'input',
      'select',
      'textarea',
      'a',
    ].join(','),
  );

  return !blockingTarget || !content.contains(blockingTarget);
}

function getChartPoint(
  e: Pick<MouseEvent, 'clientX' | 'clientY'>,
  scrollContainer: HTMLDivElement,
  totalWidth: number,
  totalHeight: number,
): Point {
  const bounds = scrollContainer.getBoundingClientRect();
  const x = e.clientX - bounds.left + scrollContainer.scrollLeft;
  const y = e.clientY - bounds.top + scrollContainer.scrollTop;

  return {
    x: Math.max(0, Math.min(totalWidth, x)),
    y: Math.max(0, Math.min(totalHeight, y)),
  };
}

function mergeIds(existing: string[], incoming: string[]) {
  const merged = [...existing];
  for (const id of incoming) {
    if (!merged.includes(id)) merged.push(id);
  }
  return merged;
}

export function useMarqueeSelect({
  scrollContainerRef,
  totalWidth,
  totalHeight,
}: UseMarqueeSelectOptions): UseMarqueeSelectReturn {
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);

  const startRef = useRef<Point | null>(null);
  const didDragRef = useRef(false);
  const additiveRef = useRef(false);
  const initialSelectionRef = useRef<string[]>([]);
  const listenersRef = useRef<{
    onMouseMove: (e: MouseEvent) => void;
    onMouseUp: (e: MouseEvent) => void;
    onKeyDown: (e: KeyboardEvent) => void;
  } | null>(null);

  const finish = useCallback((applySelection: boolean, endPoint?: Point) => {
    const start = startRef.current;
    const wasSelecting = didDragRef.current;

    startRef.current = null;
    didDragRef.current = false;
    setIsMarqueeSelecting(false);
    setMarqueeRect(null);

    if (!applySelection || !start || !endPoint || !wasSelecting) return;

    const rect = rectFromPoints(start, endPoint);
    const store = useGanttStore.getState();
    const ids = getTasksInMarquee(store.flatTasks, rect);

    store.selectTasks(
      additiveRef.current ? mergeIds(initialSelectionRef.current, ids) : ids,
    );
  }, []);

  const removeListeners = useCallback(() => {
    const listeners = listenersRef.current;
    if (!listeners) return;

    document.removeEventListener('mousemove', listeners.onMouseMove);
    document.removeEventListener('mouseup', listeners.onMouseUp);
    document.removeEventListener('keydown', listeners.onKeyDown);
    listenersRef.current = null;
  }, []);

  const handleMarqueeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;

      const scrollContainer = scrollContainerRef.current;
      const content = e.currentTarget as HTMLElement;
      if (!scrollContainer || !isEmptyChartTarget(e.target, content)) return;

      e.preventDefault();
      e.stopPropagation();

      const start = getChartPoint(e.nativeEvent, scrollContainer, totalWidth, totalHeight);
      startRef.current = start;
      additiveRef.current = e.shiftKey;
      didDragRef.current = false;
      initialSelectionRef.current = useGanttStore.getState().selectedTaskIds;
      setMarqueeRect(null);
      setIsMarqueeSelecting(false);

      const onMouseMove = (ev: MouseEvent) => {
        const current = getChartPoint(ev, scrollContainer, totalWidth, totalHeight);
        const dx = Math.abs(current.x - start.x);
        const dy = Math.abs(current.y - start.y);

        if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return;

        didDragRef.current = true;
        setIsMarqueeSelecting(true);
        setMarqueeRect(rectFromPoints(start, current));
      };

      const onMouseUp = (ev: MouseEvent) => {
        removeListeners();
        const end = getChartPoint(ev, scrollContainer, totalWidth, totalHeight);
        finish(true, end);
      };

      const onKeyDown = (ev: KeyboardEvent) => {
        if (ev.key !== 'Escape') return;

        removeListeners();
        finish(false);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.addEventListener('keydown', onKeyDown);
      listenersRef.current = { onMouseMove, onMouseUp, onKeyDown };
    },
    [finish, removeListeners, scrollContainerRef, totalHeight, totalWidth],
  );

  useEffect(() => removeListeners, [removeListeners]);

  return { marqueeRect, isMarqueeSelecting, handleMarqueeMouseDown };
}
