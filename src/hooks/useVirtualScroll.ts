// ─────────────────────────────────────────────────────────────
// BMS Gantt – useVirtualScroll hook
// Calculates which task rows are visible in the viewport.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';

// ━━━ Types ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface UseVirtualScrollOptions {
  /** Total number of items in the list. */
  totalItems: number;
  /** Fixed pixel height of each item row. */
  itemHeight: number;
  /** Ref to the scroll container element. */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Extra rows rendered above and below the viewport. @default 5 */
  overscan?: number;
}

export interface UseVirtualScrollReturn {
  /** Index range of items to render (inclusive start, exclusive end). */
  visibleRange: { start: number; end: number };
  /** Total virtual height of the scrollable content (px). */
  totalHeight: number;
  /** Pixel offset for the first rendered row (use as translateY). */
  offsetY: number;
}

// ━━━ Hook ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useVirtualScroll({
  totalItems,
  itemHeight,
  containerRef,
  overscan = 5,
}: UseVirtualScrollOptions): UseVirtualScrollReturn {
  const [visibleRange, setVisibleRange] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });

  const rafIdRef = useRef<number | null>(null);

  const totalHeight = totalItems * itemHeight;

  // ── Recalculate visible range ─────────────────────────────────

  const recalculate = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, clientHeight } = container;

    const firstVisible = Math.floor(scrollTop / itemHeight);
    const lastVisible = Math.ceil((scrollTop + clientHeight) / itemHeight);

    const start = Math.max(0, firstVisible - overscan);
    const end = Math.min(totalItems, lastVisible + overscan);

    setVisibleRange((prev) => {
      if (prev.start === start && prev.end === end) return prev;
      return { start, end };
    });
  }, [containerRef, itemHeight, overscan, totalItems]);

  // ── Scroll listener ───────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onScroll = () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = requestAnimationFrame(() => {
        recalculate();
        rafIdRef.current = null;
      });
    };

    // Initial calculation.
    recalculate();

    container.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', onScroll);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [containerRef, recalculate]);

  // Recalculate when totalItems changes (tasks added/removed).
  useEffect(() => {
    recalculate();
  }, [totalItems, recalculate]);

  const offsetY = visibleRange.start * itemHeight;

  return { visibleRange, totalHeight, offsetY };
}
