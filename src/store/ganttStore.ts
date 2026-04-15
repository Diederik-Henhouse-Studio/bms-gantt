// ─────────────────────────────────────────────────────────────
// BMS Gantt – Main Zustand Store
// Ties together taskTree, scales, and positioning modules.
// ─────────────────────────────────────────────────────────────

import { create, type StateCreator } from 'zustand';
import { temporal } from 'zundo';
import { addDays } from 'date-fns';

import type {
  GanttTask,
  GanttLink,
  GanttMarker,
  GanttConfig,
  GanttState,
  DragState,
  ZoomLevel,
  DateRange,
} from './types';
import type { LaneGroup } from './laneAssignment';
import { groupAndAssignLanes } from './laneAssignment';

import {
  flattenTaskTree,
  recalcSummaries,
  getAllDescendants,
} from './taskTree';

import { detectCycles } from './scheduling';

import {
  calcDateRange,
  generateAllScaleCells,
  calcTotalWidth,
  ZOOM_PRESETS,
  xToDate,
  snapToUnit,
} from './scales';

import {
  positionTasks,
  positionTasksMultiRow,
  calcMultiRowTotalHeight,
  positionBaselines,
  positionLinks,
} from './positioning';

import { calcCriticalPath, calcSlack, autoSchedule } from './scheduling';
import { createCalendar } from './calendar';
import {
  applyMoveConstraints,
  applyResizeStartConstraints,
  applyResizeEndConstraints,
} from './dragConstraints';
import { applyComputedFields, applySummaryAggregators } from './computation';

// ── Default config ────────────────────────────────────────────

const defaultScales = ZOOM_PRESETS.weeks.scales.map((s) => ({
  ...s,
  step: 1,
}));

const defaultConfig: GanttConfig = {
  scales: defaultScales,
  cellWidth: 80,
  cellHeight: 36,
  barHeight: 24,
  barPadding: 6,
  readonly: false,
  snapUnit: 'day',
  rowMode: 'single',
  groupBy: 'parentId',
  showBaselines: false,
  showCriticalPath: false,
  showSlack: false,
  showToolbar: true,
  workingDays: [1, 2, 3, 4, 5],
  holidays: [],
};

// ── Default date range ────────────────────────────────────────

function defaultDateRange(): DateRange {
  const now = new Date();
  return {
    start: addDays(now, -30),
    end: addDays(now, 60),
  };
}

// ── Store creator ─────────────────────────────────────────────

/**
 * Core state creator, usable both as a singleton and via `createGanttStore`.
 */
const ganttStateCreator: StateCreator<GanttState> = (set, get) => {
  // ── Recalculate helper (called after every data mutation) ──

  function recalculate(): void {
    // Pause temporal tracking so recalculate's set() calls
    // don't create separate undo history entries.
    const temporalStore = useGanttStore?.temporal?.getState?.();
    if (temporalStore) {
      temporalStore.pause();
    }

    const state = get();
    const { tasks, links, markers, config } = state;

    // 1. Roll up summary tasks
    const summarised = recalcSummaries(tasks);

    // 2. Flatten to display order
    const flatTasks = flattenTaskTree(summarised);

    // 3. Compute date range
    const dateRange = calcDateRange(summarised, markers);

    // 4. Generate scale cells
    const scaleCells = generateAllScaleCells(dateRange, config.scales, config.cellWidth, config.holidays);

    // 5. Total pixel width
    const totalWidth = calcTotalWidth(scaleCells);

    // 6. Position task bars — branch on rowMode
    let taskGroups: LaneGroup[] = [];
    let positioned: GanttTask[];
    let totalHeight: number;

    if (config.rowMode === 'multi') {
      const { groups, tasks: lanedTasks } = groupAndAssignLanes(flatTasks, config.groupBy);
      positioned = positionTasksMultiRow(lanedTasks, groups, dateRange, totalWidth, config);
      totalHeight = calcMultiRowTotalHeight(groups, config);
      taskGroups = groups;
    } else {
      positioned = positionTasks(flatTasks, dateRange, totalWidth, config);
      totalHeight = positioned.length * config.cellHeight;
    }

    // 7. Baseline positions (optional)
    if (config.showBaselines) {
      positioned = positionBaselines(positioned, dateRange, totalWidth, config);
    }

    // 8. Build task map for link routing
    const taskMap = new Map<string, GanttTask>();
    for (const t of positioned) {
      taskMap.set(t.id, t);
    }

    // 9. Position links — K2: use original links, produce visibleLinks for rendering
    // positionLinks only returns links whose source+target are visible (not collapsed)
    const visibleLinks = positionLinks(links, taskMap);

    // 10. Critical path (if enabled) — always compute from ALL links, not just visible
    if (config.showCriticalPath) {
      const cpResult = calcCriticalPath(summarised, links);
      positioned = positioned.map(t => ({
        ...t,
        critical: cpResult.taskIds.has(t.id),
      }));
      // Only mark visible links as critical for rendering
      for (let i = 0; i < visibleLinks.length; i++) {
        if (cpResult.linkIds.has(visibleLinks[i].id)) {
          visibleLinks[i] = { ...visibleLinks[i], critical: true };
        }
      }
    }

    // 11. Slack (if enabled) — always compute from ALL links
    if (config.showSlack) {
      const slackMap = calcSlack(summarised, links);
      positioned = positioned.map(t => ({
        ...t,
        slack: slackMap.get(t.id) ?? 0,
      }));
    }

    // 12. Consumer-defined derived fields + summary aggregators (v0.8).
    // Run AFTER core positioning/scheduling so computers can read critical/slack.
    if (state.computedFields && state.computedFields.length > 0) {
      positioned = positioned.map((t) => ({
        ...t,
        $computed: t.$computed ? { ...t.$computed } : {},
      }));
      applyComputedFields(positioned, state.computedFields);
    }
    if (state.summaryAggregators) {
      applySummaryAggregators(positioned, state.summaryAggregators);
    }

    // K2: links (brondata) wordt NIET overschreven — alleen flatTasks en visibleLinks
    set({
      tasks: summarised,
      flatTasks: positioned,
      visibleLinks,
      taskGroups,
      scaleCells,
      dateRange,
      totalWidth,
      totalHeight,
    });

    // Resume temporal tracking after recalculate completes.
    if (temporalStore) {
      temporalStore.resume();
    }
  }

  return {
    // ── Source data ──────────────────────────────────────────
    tasks: [],
    links: [],
    markers: [],
    config: { ...defaultConfig },

    // ── Computed / derived ───────────────────────────────────
    flatTasks: [],
    scaleCells: [],
    dateRange: defaultDateRange(),
    totalWidth: 0,
    totalHeight: 0,
    visibleLinks: [],
    taskGroups: [],

    // ── Consumer-defined compute pipelines (v0.8) ──────────
    computedFields: undefined,
    summaryAggregators: undefined,

    // ── UI state ────────────────────────────────────────────
    selectedTaskIds: [],
    selectedLinkId: null,
    scrollTop: 0,
    scrollLeft: 0,
    zoomLevel: 'weeks' as ZoomLevel,
    dragState: null,

    // ── Recalculate ─────────────────────────────────────────
    recalculate,

    // ── Task actions ────────────────────────────────────────

    addTask(task: GanttTask) {
      set((s) => ({ tasks: [...s.tasks, task] }));
      recalculate();
    },

    updateTask(id: string, patch: Partial<Omit<GanttTask, 'id'>>) {
      // H3: validatie
      if (patch.progress != null && (patch.progress < 0 || patch.progress > 100)) {
        console.warn('updateTask: progress moet tussen 0 en 100 liggen, ontvangen:', patch.progress);
        patch = { ...patch, progress: Math.max(0, Math.min(100, patch.progress)) };
      }
      set((s) => {
        return {
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t;
            const updated = { ...t, ...patch };
            // H3: zorg dat start <= end
            if (updated.start && updated.end && updated.start > updated.end) {
              console.warn('updateTask: start > end, worden omgewisseld');
              const tmp = updated.start;
              updated.start = updated.end;
              updated.end = tmp;
            }
            return updated;
          }),
        };
      });
      recalculate();
    },

    removeTask(id: string) {
      set((s) => {
        const descendants = getAllDescendants(s.tasks, id);
        const removeIds = new Set([id, ...descendants.map((d) => d.id)]);
        return {
          tasks: s.tasks.filter((t) => !removeIds.has(t.id)),
          links: s.links.filter(
            (l) => !removeIds.has(l.source) && !removeIds.has(l.target),
          ),
        };
      });
      recalculate();
    },

    /**
     * Bulk remove multiple tasks (and their descendants) in a single action.
     * Produces one undo entry regardless of how many tasks are removed.
     */
    removeTasks(ids: string[]) {
      if (ids.length === 0) return;
      set((s) => {
        const removeIds = new Set<string>();
        for (const id of ids) {
          removeIds.add(id);
          for (const d of getAllDescendants(s.tasks, id)) removeIds.add(d.id);
        }
        return {
          tasks: s.tasks.filter((t) => !removeIds.has(t.id)),
          links: s.links.filter(
            (l) => !removeIds.has(l.source) && !removeIds.has(l.target),
          ),
          selectedTaskIds: s.selectedTaskIds.filter((id) => !removeIds.has(id)),
        };
      });
      recalculate();
    },

    /**
     * Shift multiple tasks by `deltaDays` calendar days in a single action.
     * Skips tasks with `lockStart` or `lockEnd`.
     */
    shiftTasks(ids: string[], deltaDays: number) {
      if (ids.length === 0 || deltaDays === 0) return;
      const MS = 1000 * 60 * 60 * 24;
      set((s) => {
        const idSet = new Set(ids);
        return {
          tasks: s.tasks.map((t) => {
            if (!idSet.has(t.id)) return t;
            if (t.lockStart || t.lockEnd) return t;
            return {
              ...t,
              start: new Date(t.start.getTime() + deltaDays * MS),
              end: new Date(t.end.getTime() + deltaDays * MS),
            };
          }),
        };
      });
      recalculate();
    },

    toggleTaskOpen(id: string) {
      set((s) => ({
        tasks: s.tasks.map((t) =>
          t.id === id ? { ...t, open: !t.open } : t,
        ),
      }));
      recalculate();
    },

    moveTask(id: string, newStart: Date) {
      set((s) => {
        const task = s.tasks.find((t) => t.id === id);
        if (!task) return s;

        const durationMs = task.end.getTime() - task.start.getTime();
        const newEnd = new Date(newStart.getTime() + durationMs);

        return {
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, start: newStart, end: newEnd } : t,
          ),
        };
      });
      recalculate();
    },

    // ── Link actions ────────────────────────────────────────

    addLink(link: GanttLink) {
      // K3: cycle-check voordat link wordt toegevoegd
      const { tasks, links: currentLinks } = get();
      const candidateLinks = [...currentLinks, link];
      const cycles = detectCycles(tasks, candidateLinks);
      if (cycles.length > 0) {
        console.warn('addLink geweigerd: zou circulaire dependency creëren', cycles);
        return;
      }
      set((s) => ({ links: [...s.links, link] }));
      recalculate();
    },

    updateLink(id: string, patch: Partial<Omit<GanttLink, 'id'>>) {
      set((s) => ({
        links: s.links.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      }));
      recalculate();
    },

    removeLink(id: string) {
      set((s) => ({ links: s.links.filter((l) => l.id !== id) }));
      recalculate();
    },

    // ── Selection ───────────────────────────────────────────

    selectTask(id: string | null, opts?: { ctrl?: boolean; shift?: boolean }) {
      if (id === null) {
        set({ selectedTaskIds: [], selectedLinkId: null });
        return;
      }

      set((s) => {
        if (opts?.ctrl) {
          // Toggle: add if not present, remove if present
          const ids = s.selectedTaskIds.includes(id)
            ? s.selectedTaskIds.filter((x) => x !== id)
            : [...s.selectedTaskIds, id];
          return { selectedTaskIds: ids, selectedLinkId: null };
        }
        if (opts?.shift && s.selectedTaskIds.length > 0) {
          // Range select: from last selected to this one in flatTasks order
          const lastId = s.selectedTaskIds[s.selectedTaskIds.length - 1];
          const flatIds = s.flatTasks.map((t) => t.id);
          const startIdx = flatIds.indexOf(lastId);
          const endIdx = flatIds.indexOf(id);
          if (startIdx === -1 || endIdx === -1) {
            return { selectedTaskIds: [id], selectedLinkId: null };
          }
          const [lo, hi] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
          const rangeIds = flatIds.slice(lo, hi + 1);
          return { selectedTaskIds: rangeIds, selectedLinkId: null };
        }
        // Default: single select
        return { selectedTaskIds: [id], selectedLinkId: null };
      });
    },

    selectTasks(ids: string[]) {
      set({ selectedTaskIds: ids, selectedLinkId: null });
    },

    selectLink(id: string | null) {
      set({ selectedLinkId: id, selectedTaskIds: [] });
    },

    // ── Markers ─────────────────────────────────────────────

    addMarker(marker: GanttMarker) {
      set((s) => ({ markers: [...s.markers, marker] }));
      recalculate();
    },

    updateMarker(id: string, patch: Partial<Omit<GanttMarker, 'id'>>) {
      set((s) => ({
        markers: s.markers.map((m) =>
          m.id === id ? { ...m, ...patch } : m,
        ),
      }));
      recalculate();
    },

    removeMarker(id: string) {
      set((s) => ({ markers: s.markers.filter((m) => m.id !== id) }));
      recalculate();
    },

    // ── Navigation ──────────────────────────────────────────

    setScroll(scrollTop: number, scrollLeft: number) {
      set({ scrollTop, scrollLeft });
    },

    setZoom(level: ZoomLevel) {
      const preset = ZOOM_PRESETS[level as keyof typeof ZOOM_PRESETS];
      if (!preset) {
        console.warn(`setZoom: unknown zoom level "${level}", available: ${Object.keys(ZOOM_PRESETS).join(', ')}`);
        return;
      }

      set((s) => ({
        zoomLevel: level,
        config: {
          ...s.config,
          scales: preset.scales.map((sc) => ({ ...sc, step: 1 })),
          cellWidth: preset.cellWidth,
        },
      }));
      recalculate();
    },

    // ── Drag lifecycle ──────────────────────────────────────

    startDrag(drag: DragState) {
      set({ dragState: drag });
    },

    updateDrag(currentX: number, currentY: number) {
      set((s) => {
        if (!s.dragState) return s;
        return {
          dragState: { ...s.dragState, currentX, currentY },
        };
      });
    },

    endDrag(cancelled?: boolean) {
      const state = get();
      const { dragState } = state;

      if (!dragState) return;

      if (!cancelled) {
        const deltaX = dragState.currentX - dragState.startX;
        const { dateRange, totalWidth, config } = state;

        // K4: bereken datums uit huidige schaal, niet uit opgeslagen pixels.
        // We berekenen een datum-delta via de huidige pixels-per-ms ratio,
        // zodat zoom-wijzigingen tijdens drag correct worden afgehandeld.
        const totalMs = dateRange.end.getTime() - dateRange.start.getTime();
        const msPerPx = totalWidth > 0 ? totalMs / totalWidth : 0;
        const deltaMs = deltaX * msPerPx;

        switch (dragState.type) {
          case 'move': {
            const original = dragState.originalTask;
            const snap = config.snapUnit;
            const newStart = new Date(original.start.getTime() + deltaMs);
            const newEnd = new Date(original.end.getTime() + deltaMs);
            const finalStart = snap ? snapToUnit(newStart, snap) : newStart;
            const finalEnd = snap ? snapToUnit(newEnd, snap) : newEnd;
            const constrained = applyMoveConstraints(original, finalStart, finalEnd, state.tasks);
            set((s) => ({
              dragState: null,
              tasks: s.tasks.map((t) =>
                t.id === dragState.taskId
                  ? { ...t, start: constrained.start, end: constrained.end }
                  : t,
              ),
            }));
            recalculate();
            return;
          }

          case 'resize-start': {
            const original = dragState.originalTask;
            const snap = config.snapUnit;
            const newStart = new Date(original.start.getTime() + deltaMs);
            // Zorg dat start niet voorbij end gaat
            const clampedStart = newStart > original.end ? original.end : newStart;
            const finalStart = snap ? snapToUnit(clampedStart, snap) : clampedStart;
            const constrained = applyResizeStartConstraints(original, finalStart, original.end, state.tasks);
            set((s) => ({
              dragState: null,
              tasks: s.tasks.map((t) =>
                t.id === dragState.taskId
                  ? { ...t, start: constrained.start }
                  : t,
              ),
            }));
            recalculate();
            return;
          }

          case 'resize-end': {
            const original = dragState.originalTask;
            const snap = config.snapUnit;
            const newEnd = new Date(original.end.getTime() + deltaMs);
            // Zorg dat end niet vóór start gaat
            const clampedEnd = newEnd < original.start ? original.start : newEnd;
            const finalEnd = snap ? snapToUnit(clampedEnd, snap) : clampedEnd;
            const constrained = applyResizeEndConstraints(original, original.start, finalEnd, state.tasks);
            set((s) => ({
              dragState: null,
              tasks: s.tasks.map((t) =>
                t.id === dragState.taskId
                  ? { ...t, end: constrained.end }
                  : t,
              ),
            }));
            recalculate();
            return;
          }

          case 'progress': {
            const original = dragState.originalTask;
            const barWidth = original.$w;
            const clampedDelta = Math.max(
              -original.progress * barWidth / 100,
              Math.min(deltaX, barWidth * (100 - original.progress) / 100),
            );
            const newProgress = Math.round(
              Math.max(0, Math.min(100, original.progress + (clampedDelta / barWidth) * 100)),
            );
            set((s) => ({
              dragState: null,
              tasks: s.tasks.map((t) =>
                t.id === dragState.taskId
                  ? { ...t, progress: newProgress }
                  : t,
              ),
            }));
            recalculate();
            return;
          }

          case 'link-create': {
            // For link creation, find target task at drop position.
            // The rendering layer should handle target detection and call
            // addLink directly. Here we just clear the drag state.
            set({ dragState: null });
            return;
          }
        }
      }

      // Cancelled or unhandled — just clear
      set({ dragState: null });
    },

    // ── Config ──────────────────────────────────────────────

    updateConfig(patch: Partial<GanttConfig>) {
      set((s) => ({ config: { ...s.config, ...patch } }));
      recalculate();
    },

    // ── PRO: Auto-schedule ──────────────────────────────────

    autoScheduleTasks() {
      const { tasks, links, config } = get();
      const calendar = createCalendar(config.workingDays, config.holidays);
      const scheduled = autoSchedule(tasks, links, calendar);
      set({ tasks: scheduled });
      recalculate();
    },

    // ── Undo / Redo ────────────────────────────────────────
    // These call into zundo's temporal store. The `useGanttStore`
    // reference is resolved at call time (not at definition time),
    // so the module-level export is available by then.

    undo() {
      useGanttStore.temporal.getState().undo();
      recalculate();
    },

    redo() {
      useGanttStore.temporal.getState().redo();
      recalculate();
    },

  };
};

// ── Exports ───────────────────────────────────────────────────

/**
 * Singleton Gantt store hook for the common single-instance case.
 * Wrapped with zundo `temporal` middleware for undo/redo support.
 * Only data fields (tasks, links, markers) are tracked — UI state
 * (scroll, zoom, selection, drag) is excluded from history.
 */
export const useGanttStore = create<GanttState>()(
  temporal(ganttStateCreator, {
    partialize: (state) => ({
      tasks: state.tasks,
      links: state.links,
      markers: state.markers,
    }),
  }),
);

/**
 * Access the temporal (undo/redo) store for history state inspection.
 * Returns `{ pastStates, futureStates, undo, redo, clear, ... }`.
 */
export const useTemporalStore = () => useGanttStore.temporal.getState();

/**
 * Factory for creating isolated Gantt stores.
 * Use when multiple Gantt chart instances coexist on the same page.
 */
export function createGanttStore() {
  return create<GanttState>()(
    temporal(ganttStateCreator, {
      partialize: (state) => ({
        tasks: state.tasks,
        links: state.links,
        markers: state.markers,
      }),
    }),
  );
}
