// ─────────────────────────────────────────────────────────────
// BMS Gantt – Internal layout component
// Composes GanttGrid (left) + GanttChart (right) with a
// draggable vertical divider and shared vertical scroll.
// ─────────────────────────────────────────────────────────────

import React, { useState, useCallback, useRef, useEffect } from 'react';

import { useGanttStore } from '../store';
import type { GanttTask, GanttLink } from '../store';
import GanttGrid from './GanttGrid';
import GanttChart from './GanttChart';
import GanttToolbar from './GanttToolbar';

// ── Constants ────────────────────────────────────────────────

const GRID_DEFAULT_WIDTH = 300;
const GRID_MIN_WIDTH = 200;
const GRID_MAX_WIDTH = 500;
const DIVIDER_WIDTH = 4;

// ── Props ────────────────────────────────────────────────────

export interface GanttLayoutProps {
  onTaskClick?: (task: GanttTask) => void;
  onTaskDoubleClick?: (task: GanttTask) => void;
  onTaskUpdate?: (task: GanttTask) => void;
  onLinkCreate?: (link: GanttLink) => void;
  onLinkDelete?: (linkId: string) => void;
}

// ── Component ────────────────────────────────────────────────

export function GanttLayout({
  onTaskClick,
  onTaskDoubleClick,
  onTaskUpdate,
  onLinkCreate,
  onLinkDelete,
}: GanttLayoutProps) {
  // ── Grid width (local state) ───────────────────────────────

  const [gridWidth, setGridWidth] = useState(GRID_DEFAULT_WIDTH);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  // ── Store selectors ────────────────────────────────────────

  const setScroll = useGanttStore((s) => s.setScroll);

  // ── Scroll sync ref ────────────────────────────────────────

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setScroll(el.scrollTop, el.scrollLeft);
  }, [setScroll]);

  // ── Divider drag handlers ──────────────────────────────────

  // Shared start-drag logic for mouse and touch
  const startDividerDrag = useCallback(
    (clientX: number) => {
      isDragging.current = true;
      dragStartX.current = clientX;
      dragStartWidth.current = gridWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [gridWidth],
  );

  const handleDividerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startDividerDrag(e.clientX);
    },
    [startDividerDrag],
  );

  // H8: touch support voor tablet/mobiel
  const handleDividerTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      startDividerDrag(e.touches[0].clientX);
    },
    [startDividerDrag],
  );

  useEffect(() => {
    function updateWidth(clientX: number) {
      const delta = clientX - dragStartX.current;
      const newWidth = Math.min(
        GRID_MAX_WIDTH,
        Math.max(GRID_MIN_WIDTH, dragStartWidth.current + delta),
      );
      setGridWidth(newWidth);
    }

    function handleMouseMove(e: MouseEvent) {
      if (!isDragging.current) return;
      updateWidth(e.clientX);
    }

    function handleTouchMove(e: TouchEvent) {
      if (!isDragging.current || e.touches.length !== 1) return;
      e.preventDefault();
      updateWidth(e.touches[0].clientX);
    }

    function handleEnd() {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('touchcancel', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('touchcancel', handleEnd);
    };
  }, []);

  // ── Keyboard shortcuts (undo/redo) ─────────────────────────

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useGanttStore.getState().undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        useGanttStore.getState().redo();
      }
      // Delete selected tasks (ignore when focus is in an editable input).
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
        ) {
          return;
        }
        const state = useGanttStore.getState();
        if (state.selectedTaskIds.length > 0) {
          e.preventDefault();
          state.removeTasks(state.selectedTaskIds);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ── Toolbar ─────────────────────────────────────────── */}
      <GanttToolbar chartRef={chartContainerRef} />

      {/* ── Content area: grid + divider + chart ────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* ── Left: GanttGrid (fixed width, synced vertical scroll) */}
        <div
          className="flex-shrink-0 overflow-hidden border-r"
          style={{ width: gridWidth }}
        >
          <div
            ref={scrollContainerRef}
            className="h-full overflow-y-auto overflow-x-hidden"
            onScroll={handleScroll}
          >
            <GanttGrid width={gridWidth} />
          </div>
        </div>

        {/* ── Divider ───────────────────────────────────────── */}
        <div
          className="flex-shrink-0 bg-border hover:bg-primary/20 transition-colors"
          style={{ width: DIVIDER_WIDTH, cursor: 'col-resize' }}
          onMouseDown={handleDividerMouseDown}
          onTouchStart={handleDividerTouchStart}
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label="Resize grid panel"
        />

        {/* ── Right: GanttChart (fills remaining space, scrolls both ways) */}
        <div ref={chartContainerRef} className="flex-1 min-w-0 overflow-auto">
          <GanttChart
            onTaskClick={onTaskClick}
            onTaskDoubleClick={onTaskDoubleClick}
            onTaskUpdate={onTaskUpdate}
            onLinkCreate={onLinkCreate}
            onLinkDelete={onLinkDelete}
          />
        </div>
      </div>
    </div>
  );
}

export default GanttLayout;
