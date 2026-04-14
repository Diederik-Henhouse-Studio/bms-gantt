// ─────────────────────────────────────────────────────────────
// BMS Gantt – GanttChart (main chart area)
// Right panel that composes TimeScale, CellGrid, TaskBars,
// DependencyLinks, and Markers. Handles scroll sync and zoom.
// ─────────────────────────────────────────────────────────────

import React, { useRef, useCallback, useEffect, useState } from 'react';

import { useGanttStore } from '../store';
import type { GanttTask, GanttLink, ZoomLevel } from '../store';
import { TimeScale } from './TimeScale';
import { CellGrid } from './CellGrid';
import { Markers } from './Markers';
import { DependencyLinks } from './DependencyLinks';
import { TaskBars } from './TaskBars';

// ── Zoom level ordering (coarse → fine) ──────────────────────

const ZOOM_ORDER: ZoomLevel[] = [
  'years',
  'quarters',
  'months',
  'weeks',
  'days',
  'hours',
];

// ── Props ────────────────────────────────────────────────────

export interface GanttChartProps {
  onTaskClick?: (task: GanttTask) => void;
  onTaskDoubleClick?: (task: GanttTask) => void;
  onTaskUpdate?: (task: GanttTask) => void;
  onLinkCreate?: (link: GanttLink) => void;
  onLinkDelete?: (linkId: string) => void;
}

// ── Component ────────────────────────────────────────────────

export function GanttChart({
  onTaskClick,
  onTaskDoubleClick,
  onTaskUpdate,
  onLinkCreate,
  onLinkDelete,
}: GanttChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ── Store selectors ─────────────────────────────────────────

  const scaleCells = useGanttStore((s) => s.scaleCells);
  const totalWidth = useGanttStore((s) => s.totalWidth);
  const totalHeight = useGanttStore((s) => s.totalHeight);
  const config = useGanttStore((s) => s.config);
  const scrollLeft = useGanttStore((s) => s.scrollLeft);
  const zoomLevel = useGanttStore((s) => s.zoomLevel);
  const setScroll = useGanttStore((s) => s.setScroll);
  const setZoom = useGanttStore((s) => s.setZoom);

  // ── Scroll sync ─────────────────────────────────────────────

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setScroll(el.scrollTop, el.scrollLeft);
  }, [setScroll]);

  // ── Wheel zoom (Ctrl+wheel or pinch) ───────────────────────

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      // Only zoom on Ctrl+wheel (or Cmd+wheel on macOS) or pinch (ctrlKey is set)
      if (!e.ctrlKey && !e.metaKey) return;

      e.preventDefault();

      // Trackpad pinch gestures typically produce smaller deltaY values
      // Mouse wheel produces larger discrete jumps (e.g. ±100 or ±120)
      const isTrackpad = Math.abs(e.deltaY) < 10;
      const threshold = isTrackpad ? 2 : 1;

      // Determine if we're already past the threshold for a zoom step
      if (Math.abs(e.deltaY) < threshold) return;

      const currentIdx = ZOOM_ORDER.indexOf(zoomLevel);
      if (currentIdx === -1) return;

      let newIdx: number;
      if (e.deltaY < 0) {
        // Zoom in → finer granularity (move right in ZOOM_ORDER)
        newIdx = Math.min(currentIdx + 1, ZOOM_ORDER.length - 1);
      } else {
        // Zoom out → coarser granularity (move left in ZOOM_ORDER)
        newIdx = Math.max(currentIdx - 1, 0);
      }

      if (newIdx !== currentIdx) {
        setZoom(ZOOM_ORDER[newIdx]);
      }
    },
    [zoomLevel, setZoom],
  );

  // ── Grab-scroll (middle-click or Shift+drag) ───────────────

  const isGrabScrolling = useRef(false);
  const grabStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const [shiftHeld, setShiftHeld] = useState(false);

  const handleGrabStart = useCallback(
    (e: React.MouseEvent) => {
      // Middle-click or Shift+left-click
      const isMiddle = e.button === 1;
      const isShiftLeft = e.button === 0 && e.shiftKey;
      if (!isMiddle && !isShiftLeft) return;

      const el = scrollContainerRef.current;
      if (!el) return;

      e.preventDefault();

      isGrabScrolling.current = true;
      grabStart.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: el.scrollLeft,
        scrollTop: el.scrollTop,
      };
      el.style.cursor = 'grabbing';
    },
    [],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isGrabScrolling.current) return;
      const el = scrollContainerRef.current;
      if (!el) return;

      const dx = e.clientX - grabStart.current.x;
      const dy = e.clientY - grabStart.current.y;
      el.scrollLeft = grabStart.current.scrollLeft - dx;
      el.scrollTop = grabStart.current.scrollTop - dy;
    };

    const handleMouseUp = () => {
      if (!isGrabScrolling.current) return;
      isGrabScrolling.current = false;
      const el = scrollContainerRef.current;
      if (el) {
        el.style.cursor = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Track Shift key for grab cursor hint
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // ── Finest scale row for grid ──────────────────────────────

  const finestScaleRow = scaleCells[scaleCells.length - 1] || [];

  // ── Render ─────────────────────────────────────────────────

  return (
    <div
      className="flex-1 overflow-hidden flex flex-col"
      ref={chartRef}
      onWheel={handleWheel}
    >
      {/* ── Timescale header — sticky, scrolls horizontally with chart */}
      <div
        className="overflow-hidden flex-shrink-0"
        style={{ marginLeft: -scrollLeft }}
      >
        <div style={{ width: totalWidth }}>
          <TimeScale scaleCells={scaleCells} totalWidth={totalWidth} />
        </div>
      </div>

      {/* ── Chart body — scrolls both ways */}
      <div
        className="flex-1 overflow-auto relative"
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onMouseDown={handleGrabStart}
        style={shiftHeld ? { cursor: 'grab' } : undefined}
      >
        <div
          style={{
            width: totalWidth,
            height: totalHeight,
            position: 'relative',
          }}
        >
          <CellGrid
            scaleCells={finestScaleRow}
            totalWidth={totalWidth}
            totalHeight={totalHeight}
          />

          <Markers />
          <DependencyLinks />
          <TaskBars readonly={config.readonly} />
        </div>
      </div>
    </div>
  );
}

export default GanttChart;
