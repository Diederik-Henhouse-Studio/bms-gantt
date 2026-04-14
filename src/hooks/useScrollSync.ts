// ─────────────────────────────────────────────────────────────
// BMS Gantt – useScrollSync hook
// Synchronizes vertical scrolling between grid and chart panels.
// ─────────────────────────────────────────────────────────────

import { useRef, useCallback } from 'react';

import { useGanttStore } from '../store';

// ━━━ Types ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface UseScrollSyncReturn {
  /** Ref to attach to the grid (left panel) scroll container. */
  gridRef: React.RefObject<HTMLDivElement>;
  /** Ref to attach to the chart (right panel) scroll container. */
  chartRef: React.RefObject<HTMLDivElement>;
  /** Scroll handler for the grid container. */
  handleGridScroll: (e: React.UIEvent) => void;
  /** Scroll handler for the chart container. */
  handleChartScroll: (e: React.UIEvent) => void;
}

// ━━━ Hook ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useScrollSync(): UseScrollSyncReturn {
  const gridRef = useRef<HTMLDivElement>(null!);
  const chartRef = useRef<HTMLDivElement>(null!);

  // Guard flag to prevent infinite scroll ping-pong.
  const isScrollingRef = useRef(false);

  // RAF id for cancellation.
  const rafIdRef = useRef<number | null>(null);

  // ── Grid scrolled → sync chart ───────────────────────────────

  const handleGridScroll = useCallback((e: React.UIEvent) => {
    if (isScrollingRef.current) return;

    const target = e.currentTarget as HTMLDivElement;
    const { scrollTop } = target;

    isScrollingRef.current = true;

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      if (chartRef.current) {
        chartRef.current.scrollTop = scrollTop;
      }

      // Update the store with scroll position.
      const scrollLeft = chartRef.current?.scrollLeft ?? 0;
      useGanttStore.getState().setScroll(scrollTop, scrollLeft);

      isScrollingRef.current = false;
      rafIdRef.current = null;
    });
  }, []);

  // ── Chart scrolled → sync grid ───────────────────────────────

  const handleChartScroll = useCallback((e: React.UIEvent) => {
    if (isScrollingRef.current) return;

    const target = e.currentTarget as HTMLDivElement;
    const { scrollTop, scrollLeft } = target;

    isScrollingRef.current = true;

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      if (gridRef.current) {
        gridRef.current.scrollTop = scrollTop;
      }

      // Update the store with both scroll positions.
      useGanttStore.getState().setScroll(scrollTop, scrollLeft);

      isScrollingRef.current = false;
      rafIdRef.current = null;
    });
  }, []);

  return { gridRef, chartRef, handleGridScroll, handleChartScroll };
}
