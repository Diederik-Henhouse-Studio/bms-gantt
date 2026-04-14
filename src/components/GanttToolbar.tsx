// ─────────────────────────────────────────────────────────────
// BMS Gantt – GanttToolbar
// Toolbar with zoom controls, navigation, and action buttons.
// Uses plain HTML + Tailwind (no Shadcn dependency).
// ─────────────────────────────────────────────────────────────

import React, { useCallback } from 'react';

import { useGanttStore } from '../store';
import type { ZoomLevel, GanttConfig } from '../store';
import { dateToX } from '../store/scales';
import { ExportButton } from './ExportButton';

// ── Zoom level ordering (coarse → fine) ──────────────────────

const ZOOM_ORDER: ZoomLevel[] = [
  'years',
  'quarters',
  'months',
  'weeks',
  'days',
  'hours',
];

/** Dutch labels for each zoom level. */
const ZOOM_LABELS: Record<ZoomLevel, string> = {
  hours: 'Uren',
  days: 'Dagen',
  weeks: 'Weken',
  months: 'Maanden',
  quarters: 'Kwartalen',
  years: 'Jaren',
};

// ── Button style ────────────────────────────────────────────

const btnClass =
  'px-2 py-1 text-xs rounded hover:bg-accent transition-colors disabled:opacity-50 select-none';

// ── Component ────────────────────────────────────────────────

interface GanttToolbarProps {
  chartRef?: React.RefObject<HTMLDivElement | null>;
}

export function GanttToolbar({ chartRef }: GanttToolbarProps = {}) {
  // ── Store selectors ─────────────────────────────────────────

  const zoomLevel = useGanttStore((s) => s.zoomLevel);
  const setZoom = useGanttStore((s) => s.setZoom);
  const setScroll = useGanttStore((s) => s.setScroll);
  const dateRange = useGanttStore((s) => s.dateRange);
  const totalWidth = useGanttStore((s) => s.totalWidth);
  const scrollLeft = useGanttStore((s) => s.scrollLeft);
  const scrollTop = useGanttStore((s) => s.scrollTop);
  const config = useGanttStore((s) => s.config);
  const updateConfig = useGanttStore((s) => s.updateConfig);
  const autoScheduleTasks = useGanttStore((s) => s.autoScheduleTasks);

  const currentIdx = ZOOM_ORDER.indexOf(zoomLevel);

  // ── Zoom handlers ─────────────────────────────────────────

  const handleZoomOut = useCallback(() => {
    if (currentIdx > 0) {
      setZoom(ZOOM_ORDER[currentIdx - 1]);
    }
  }, [currentIdx, setZoom]);

  const handleZoomIn = useCallback(() => {
    if (currentIdx < ZOOM_ORDER.length - 1) {
      setZoom(ZOOM_ORDER[currentIdx + 1]);
    }
  }, [currentIdx, setZoom]);

  // ── Navigate to today ─────────────────────────────────────

  const handleToday = useCallback(() => {
    const todayX = dateToX(new Date(), dateRange, totalWidth);
    // Centre today in the viewport (rough estimate: offset by half a screen width ~400px)
    const viewportOffset = 400;
    const newScrollLeft = Math.max(0, todayX - viewportOffset);
    setScroll(scrollTop, newScrollLeft);
  }, [dateRange, totalWidth, scrollTop, setScroll]);

  // ── Navigation arrows (scroll by ~screen width) ───────────

  const scrollStep = 600; // px per click

  const handleScrollLeft = useCallback(() => {
    const newScrollLeft = Math.max(0, scrollLeft - scrollStep);
    setScroll(scrollTop, newScrollLeft);
  }, [scrollLeft, scrollTop, setScroll]);

  const handleScrollRight = useCallback(() => {
    const newScrollLeft = Math.min(
      Math.max(0, totalWidth - scrollStep),
      scrollLeft + scrollStep,
    );
    setScroll(scrollTop, newScrollLeft);
  }, [scrollLeft, scrollTop, totalWidth, setScroll]);

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b bg-muted/30">
      {/* ── Navigation arrows ──────────────────────────────── */}
      <button
        type="button"
        className={btnClass}
        onClick={handleScrollLeft}
        title="Scroll naar links"
        aria-label="Scroll naar links"
      >
        &#x25C0;
      </button>
      <button
        type="button"
        className={btnClass}
        onClick={handleScrollRight}
        title="Scroll naar rechts"
        aria-label="Scroll naar rechts"
      >
        &#x25B6;
      </button>

      {/* ── Divider ────────────────────────────────────────── */}
      <div className="w-px h-5 bg-border mx-1" />

      {/* ── Zoom controls ──────────────────────────────────── */}
      <button
        type="button"
        className={btnClass}
        onClick={handleZoomOut}
        disabled={currentIdx <= 0}
        title="Zoom uit"
        aria-label="Zoom uit"
      >
        &minus;
      </button>

      <span className="text-xs font-medium px-1.5 min-w-[4.5rem] text-center select-none">
        {ZOOM_LABELS[zoomLevel] ?? zoomLevel}
      </span>

      <button
        type="button"
        className={btnClass}
        onClick={handleZoomIn}
        disabled={currentIdx >= ZOOM_ORDER.length - 1}
        title="Zoom in"
        aria-label="Zoom in"
      >
        +
      </button>

      {/* ── Divider ────────────────────────────────────────── */}
      <div className="w-px h-5 bg-border mx-1" />

      {/* ── Today button ───────────────────────────────────── */}
      <button
        type="button"
        className={btnClass}
        onClick={handleToday}
        title="Ga naar vandaag"
        aria-label="Ga naar vandaag"
      >
        Vandaag
      </button>

      {/* ── Divider ────────────────────────────────────────── */}
      <div className="w-px h-5 bg-border mx-1" />

      {/* ── Undo / Redo ─────────────────────────────────────── */}
      <button
        type="button"
        className={btnClass}
        onClick={() => useGanttStore.getState().undo()}
        title="Ongedaan maken (Ctrl+Z)"
        aria-label="Ongedaan maken"
      >
        &#x21A9;
      </button>
      <button
        type="button"
        className={btnClass}
        onClick={() => useGanttStore.getState().redo()}
        title="Opnieuw (Ctrl+Shift+Z)"
        aria-label="Opnieuw"
      >
        &#x21AA;
      </button>

      {/* ── Divider ────────────────────────────────────────── */}
      <div className="w-px h-5 bg-border mx-1" />

      {/* ── PRO: Critical Path toggle ─────────────────────── */}
      <button
        type="button"
        className={
          config.showCriticalPath
            ? 'px-2 py-1 text-xs rounded border bg-red-100 text-red-700 border-red-300 select-none'
            : btnClass
        }
        onClick={() => updateConfig({ showCriticalPath: !config.showCriticalPath })}
        title="Kritiek pad tonen/verbergen"
        aria-label="Kritiek pad"
        aria-pressed={config.showCriticalPath}
      >
        Kritiek pad
      </button>

      {/* ── PRO: Baselines toggle ─────────────────────────── */}
      <button
        type="button"
        className={
          config.showBaselines
            ? 'px-2 py-1 text-xs rounded border bg-blue-100 text-blue-700 border-blue-300 select-none'
            : btnClass
        }
        onClick={() => updateConfig({ showBaselines: !config.showBaselines })}
        title="Baselines tonen/verbergen"
        aria-label="Baselines"
        aria-pressed={config.showBaselines}
      >
        Baselines
      </button>

      {/* ── PRO: Auto-plan button ─────────────────────────── */}
      <button
        type="button"
        className={btnClass}
        onClick={autoScheduleTasks}
        title="Automatisch plannen op basis van afhankelijkheden"
        aria-label="Automatisch plannen"
      >
        Auto-plan
      </button>

      {/* ── PRO: Slack toggle ─────────────────────────────── */}
      <button
        type="button"
        className={
          config.showSlack
            ? 'px-2 py-1 text-xs rounded border bg-amber-100 text-amber-700 border-amber-300 select-none'
            : btnClass
        }
        onClick={() => updateConfig({ showSlack: !config.showSlack })}
        title="Slack/speling tonen/verbergen"
        aria-label="Slack"
        aria-pressed={config.showSlack}
      >
        Slack
      </button>

      {/* ── PRO: Row mode toggle ─────────────────────────── */}
      <button
        type="button"
        className={
          config.rowMode === 'multi'
            ? 'px-2 py-1 text-xs rounded border bg-indigo-100 text-indigo-700 border-indigo-300 select-none'
            : btnClass
        }
        onClick={() =>
          updateConfig({
            rowMode: config.rowMode === 'multi' ? 'single' : 'multi',
          })
        }
        title="Rij-modus: enkel of meerdere items per rij"
        aria-label="Rij-modus"
        aria-pressed={config.rowMode === 'multi'}
      >
        Rijen
      </button>

      {/* ── Divider ────────────────────────────────────────── */}
      <div className="w-px h-5 bg-border mx-1" />

      {/* ── Export ────────────────────────────────────────── */}
      {chartRef && <ExportButton chartRef={chartRef} filename="bms-gantt" />}
    </div>
  );
}

export default GanttToolbar;
