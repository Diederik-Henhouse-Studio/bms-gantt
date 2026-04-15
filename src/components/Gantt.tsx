// ─────────────────────────────────────────────────────────────
// BMS Gantt – Main public-facing component
// Initialises the Zustand store and renders GanttLayout.
// K6: single useEffect for all prop sync to prevent race conditions.
// H1: cleanup dragState on unmount.
// E1: Error boundary wraps GanttLayout; validation runs before store sync.
// ─────────────────────────────────────────────────────────────

import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { cn } from '../utils/cn';
import { validateGanttInput } from '../utils/validateTasks';

import { useGanttStore, rowAtY as rowAtYFn, cellAtX as cellAtXFn, barAtPoint, dateAtX as dateAtXFn } from '../store';
import type { GanttTask, GanttLink, GanttMarker, GanttConfig } from '../store';
import { GanttLayout } from './GanttLayout';
import { GanttErrorBoundary } from './GanttErrorBoundary';
import { LabelsProvider, type GanttLabels } from '../i18n';
import { SlotsProvider, type GanttSlots } from '../slots';
import type {
  GanttHandle,
  LayoutSnapshot,
  LayoutBar,
  LayoutScaleCell,
  AlignmentReport,
  AlignmentIssue,
} from '../handle';

// ── Props ────────────────────────────────────────────────────

export interface GanttProps {
  tasks: GanttTask[];
  links?: GanttLink[];
  markers?: GanttMarker[];
  config?: Partial<GanttConfig>;
  className?: string;
  /** Override UI strings. Defaults are English; merge-patched onto defaults. */
  labels?: Partial<GanttLabels>;
  /** Customisation slots: custom task bar renderer, custom left-pane columns. */
  slots?: GanttSlots;

  // Event callbacks
  onTaskClick?: (task: GanttTask) => void;
  onTaskDoubleClick?: (task: GanttTask) => void;
  onTaskUpdate?: (task: GanttTask) => void;
  onLinkCreate?: (link: GanttLink) => void;
  onLinkDelete?: (linkId: string) => void;
  onError?: (error: Error, context: string) => void;
}

// ── Component ────────────────────────────────────────────────

export const Gantt = forwardRef<GanttHandle, GanttProps>(function Gantt({
  tasks,
  links = [],
  markers = [],
  config,
  className,
  labels,
  slots,
  onTaskClick,
  onTaskDoubleClick,
  onTaskUpdate,
  onLinkCreate,
  onLinkDelete,
  onError,
}, ref) {
  const store = useGanttStore;
  const initialised = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Imperative handle: layout introspection for agents/tests ─────
  useImperativeHandle(
    ref,
    () => {
      function toLayoutBar(t: GanttTask): LayoutBar {
        return {
          taskId: t.id,
          text: t.text,
          type: t.type,
          x: t.$x,
          y: t.$y,
          w: t.$w,
          h: t.$h,
          level: t.$level,
          lane: t.$lane,
          groupId: t.$groupId,
          start: t.start.toISOString(),
          end: t.end.toISOString(),
          progress: t.progress,
          critical: !!t.critical,
          status: t.status,
          category: t.taskCategory,
        };
      }

      function toLayoutScaleCells(): LayoutScaleCell[][] {
        const { scaleCells } = store.getState();
        return scaleCells.map((row) => {
          let x = 0;
          return row.map((c) => {
            const cell: LayoutScaleCell = {
              unit: c.unit,
              date: c.date.toISOString(),
              x,
              width: c.width,
              isWeekend: c.isWeekend,
              isHoliday: c.isHoliday,
              isToday: c.isToday,
              label: c.label,
            };
            x += c.width;
            return cell;
          });
        });
      }

      function buildSnapshot(): LayoutSnapshot {
        const s = store.getState();
        return {
          totalWidth: s.totalWidth,
          totalHeight: s.totalHeight,
          cellHeight: s.config.cellHeight,
          dateRange: {
            start: s.dateRange.start.toISOString(),
            end: s.dateRange.end.toISOString(),
          },
          bars: s.flatTasks.map(toLayoutBar),
          scaleRows: toLayoutScaleCells(),
          links: s.visibleLinks.map((l) => ({
            id: l.id,
            source: l.source,
            target: l.target,
            type: l.type,
            critical: !!l.critical,
            points: l.$points,
          })),
          markers: s.markers.map((m) => ({
            id: m.id,
            date: m.date.toISOString(),
            x: 0, // filled by consumer via dateAtX if needed
            label: m.label,
          })),
          rowMode: s.config.rowMode,
          zoomLevel: s.zoomLevel,
        };
      }

      return {
        getElement: () => containerRef.current,
        snapshot: buildSnapshot,
        elementAt: (x, y) => {
          const s = store.getState();
          const bar = barAtPoint(x, y, s.flatTasks);
          if (bar) return { kind: 'bar', ref: toLayoutBar(bar) };
          const finest = s.scaleCells[s.scaleCells.length - 1];
          if (finest) {
            const cell = cellAtXFn(x, finest);
            if (cell) {
              let cx = 0;
              for (const c of finest) {
                if (c.key === cell.key) break;
                cx += c.width;
              }
              return {
                kind: 'scale-cell',
                ref: {
                  unit: cell.unit,
                  date: cell.date.toISOString(),
                  x: cx,
                  width: cell.width,
                  isWeekend: cell.isWeekend,
                  isHoliday: cell.isHoliday,
                  isToday: cell.isToday,
                  label: cell.label,
                } as LayoutScaleCell,
              };
            }
          }
          return { kind: null, ref: null };
        },
        rowAtY: (y) => {
          const s = store.getState();
          const t = rowAtYFn(y, s.flatTasks);
          return t ? toLayoutBar(t) : null;
        },
        dateAtX: (x) => {
          const s = store.getState();
          return dateAtXFn(x, s.dateRange, s.totalWidth).toISOString();
        },
        cellAtX: (x) => {
          const s = store.getState();
          const finest = s.scaleCells[s.scaleCells.length - 1];
          if (!finest) return null;
          const cell = cellAtXFn(x, finest);
          if (!cell) return null;
          let cx = 0;
          for (const c of finest) {
            if (c.key === cell.key) break;
            cx += c.width;
          }
          return {
            unit: cell.unit,
            date: cell.date.toISOString(),
            x: cx,
            width: cell.width,
            isWeekend: cell.isWeekend,
            isHoliday: cell.isHoliday,
            isToday: cell.isToday,
            label: cell.label,
          };
        },
        taskBarRect: (taskId) => {
          const root = containerRef.current;
          if (!root) return null;
          const el = root.querySelector<HTMLElement>(
            `[data-gantt-role="task-bar"][data-gantt-task-id="${CSS.escape(taskId)}"]`,
          );
          return el?.getBoundingClientRect() ?? null;
        },
        validate: (): AlignmentReport => {
          const issues: AlignmentIssue[] = [];
          const s = store.getState();
          // Sanity: bar starts inside bounds
          for (const t of s.flatTasks) {
            if (t.$x < 0) {
              issues.push({
                severity: 'warn',
                code: 'bar_out_of_bounds_left',
                message: `Task ${t.id} has negative $x (${t.$x})`,
                elementId: t.id,
              });
            }
            if (t.$x + t.$w > s.totalWidth + 1) {
              issues.push({
                severity: 'warn',
                code: 'bar_out_of_bounds_right',
                message: `Task ${t.id} extends past totalWidth`,
                elementId: t.id,
              });
            }
            if (t.$w < 0) {
              issues.push({
                severity: 'error',
                code: 'bar_negative_width',
                message: `Task ${t.id} has negative width`,
                elementId: t.id,
              });
            }
          }
          // Scale cells should sum to roughly totalWidth (within 1 px per cell rounding)
          for (let r = 0; r < s.scaleCells.length; r++) {
            const sum = s.scaleCells[r].reduce((n, c) => n + c.width, 0);
            const diff = Math.abs(sum - s.totalWidth);
            if (diff > s.scaleCells[r].length + 2) {
              issues.push({
                severity: 'warn',
                code: 'scale_row_width_mismatch',
                message: `Scale row ${r} sums to ${sum.toFixed(1)}, expected ~${s.totalWidth}`,
              });
            }
          }
          return { ok: issues.length === 0, issues };
        },
      };
    },
    [],
  );

  // K6: Single effect syncs ALL data props together, preventing
  // race conditions where tasks update before links.
  // E1: Validates input and catches recalculate errors.
  useEffect(() => {
    // Validate input before syncing to store
    const validation = validateGanttInput(tasks, links);

    if (validation.warnings.length > 0) {
      onError?.(
        new Error(
          `Gantt validation warnings: ${validation.warnings.join('; ')}`,
        ),
        'validateGanttInput',
      );
    }

    if (!validation.valid) {
      onError?.(
        new Error(
          `Gantt validation errors: ${validation.errors.join('; ')}`,
        ),
        'validateGanttInput',
      );
      return; // Do not sync invalid data to the store
    }

    const state = store.getState();

    const update: Partial<Record<string, unknown>> = {
      tasks,
      links,
      markers,
    };

    if (config) {
      update.config = { ...state.config, ...config };
    }

    store.setState(update);

    try {
      state.recalculate();
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error(String(err));
      onError?.(error, 'recalculate');
    }

    initialised.current = true;
  }, [tasks, links, markers, config]); // eslint-disable-line react-hooks/exhaustive-deps

  // H1: cleanup dragState on unmount to prevent stale state
  useEffect(() => {
    return () => {
      store.setState({ dragState: null });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ─────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      data-gantt-role="container"
      className={cn(
        'gantt-container w-full h-full flex flex-col overflow-hidden border rounded-lg bg-background',
        className,
      )}
    >
      <GanttErrorBoundary onError={onError}>
        <LabelsProvider labels={labels}>
          <SlotsProvider slots={slots}>
          <GanttLayout
            onTaskClick={onTaskClick}
            onTaskDoubleClick={onTaskDoubleClick}
            onTaskUpdate={onTaskUpdate}
            onLinkCreate={onLinkCreate}
            onLinkDelete={onLinkDelete}
          />
          </SlotsProvider>
        </LabelsProvider>
      </GanttErrorBoundary>
    </div>
  );
});

Gantt.displayName = 'Gantt';

export default Gantt;
