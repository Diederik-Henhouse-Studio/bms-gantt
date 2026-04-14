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
import { useLabels } from '../i18n';

// ── Zoom level ordering (coarse → fine) ──────────────────────

const ZOOM_ORDER: ZoomLevel[] = [
  'years',
  'quarters',
  'months',
  'weeks',
  'days',
  'hours',
  'minutes',
];

// ── Button style ────────────────────────────────────────────

const btnClass =
  'px-2 py-1 text-xs rounded hover:bg-accent transition-colors disabled:opacity-50 select-none';

// ── Component ────────────────────────────────────────────────

interface GanttToolbarProps {
  chartRef?: React.RefObject<HTMLDivElement | null>;
}

export function GanttToolbar({ chartRef }: GanttToolbarProps = {}) {
  const labels = useLabels();
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

  const handleZoomOut = useCallback(() => {
    if (currentIdx > 0) setZoom(ZOOM_ORDER[currentIdx - 1]);
  }, [currentIdx, setZoom]);

  const handleZoomIn = useCallback(() => {
    if (currentIdx < ZOOM_ORDER.length - 1) setZoom(ZOOM_ORDER[currentIdx + 1]);
  }, [currentIdx, setZoom]);

  const handleToday = useCallback(() => {
    const todayX = dateToX(new Date(), dateRange, totalWidth);
    const viewportOffset = 400;
    const newScrollLeft = Math.max(0, todayX - viewportOffset);
    setScroll(scrollTop, newScrollLeft);
  }, [dateRange, totalWidth, scrollTop, setScroll]);

  const scrollStep = 600;

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

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b bg-muted/30">
      <button
        type="button"
        className={btnClass}
        onClick={handleScrollLeft}
        title={labels.scrollLeft}
        aria-label={labels.scrollLeft}
      >
        &#x25C0;
      </button>
      <button
        type="button"
        className={btnClass}
        onClick={handleScrollRight}
        title={labels.scrollRight}
        aria-label={labels.scrollRight}
      >
        &#x25B6;
      </button>

      <div className="w-px h-5 bg-border mx-1" />

      <button
        type="button"
        className={btnClass}
        onClick={handleZoomOut}
        disabled={currentIdx <= 0}
        title={labels.zoomOut}
        aria-label={labels.zoomOut}
      >
        &minus;
      </button>

      <span className="text-xs font-medium px-1.5 min-w-[4.5rem] text-center select-none">
        {labels.zoomLevels[zoomLevel] ?? zoomLevel}
      </span>

      <button
        type="button"
        className={btnClass}
        onClick={handleZoomIn}
        disabled={currentIdx >= ZOOM_ORDER.length - 1}
        title={labels.zoomIn}
        aria-label={labels.zoomIn}
      >
        +
      </button>

      <div className="w-px h-5 bg-border mx-1" />

      <button
        type="button"
        className={btnClass}
        onClick={handleToday}
        title={labels.goToToday}
        aria-label={labels.goToToday}
      >
        {labels.today}
      </button>

      <div className="w-px h-5 bg-border mx-1" />

      <button
        type="button"
        className={btnClass}
        onClick={() => useGanttStore.getState().undo()}
        title={labels.undo}
        aria-label={labels.undo}
      >
        &#x21A9;
      </button>
      <button
        type="button"
        className={btnClass}
        onClick={() => useGanttStore.getState().redo()}
        title={labels.redo}
        aria-label={labels.redo}
      >
        &#x21AA;
      </button>

      <div className="w-px h-5 bg-border mx-1" />

      <button
        type="button"
        className={
          config.showCriticalPath
            ? 'px-2 py-1 text-xs rounded border bg-red-100 text-red-700 border-red-300 select-none'
            : btnClass
        }
        onClick={() => updateConfig({ showCriticalPath: !config.showCriticalPath })}
        title={labels.criticalPathTitle}
        aria-label={labels.criticalPath}
        aria-pressed={config.showCriticalPath}
      >
        {labels.criticalPath}
      </button>

      <button
        type="button"
        className={
          config.showBaselines
            ? 'px-2 py-1 text-xs rounded border bg-blue-100 text-blue-700 border-blue-300 select-none'
            : btnClass
        }
        onClick={() => updateConfig({ showBaselines: !config.showBaselines })}
        title={labels.baselinesTitle}
        aria-label={labels.baselines}
        aria-pressed={config.showBaselines}
      >
        {labels.baselines}
      </button>

      <button
        type="button"
        className={btnClass}
        onClick={autoScheduleTasks}
        title={labels.autoPlanTitle}
        aria-label={labels.autoPlan}
      >
        {labels.autoPlan}
      </button>

      <button
        type="button"
        className={
          config.showSlack
            ? 'px-2 py-1 text-xs rounded border bg-amber-100 text-amber-700 border-amber-300 select-none'
            : btnClass
        }
        onClick={() => updateConfig({ showSlack: !config.showSlack })}
        title={labels.slackTitle}
        aria-label={labels.slack}
        aria-pressed={config.showSlack}
      >
        {labels.slack}
      </button>

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
        title={labels.rowsTitle}
        aria-label={labels.rows}
        aria-pressed={config.rowMode === 'multi'}
      >
        {labels.rows}
      </button>

      <div className="w-px h-5 bg-border mx-1" />

      {chartRef && <ExportButton chartRef={chartRef} filename="bms-gantt" />}
    </div>
  );
}

export default GanttToolbar;
