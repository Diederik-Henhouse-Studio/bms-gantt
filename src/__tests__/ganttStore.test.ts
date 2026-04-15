// ─────────────────────────────────────────────────────────────
// BMS Gantt – Integration tests for ganttStore (Zustand)
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { startOfDay } from 'date-fns';
import { useGanttStore } from '../store/ganttStore';
import { createTask, createLink } from './helpers';
import { ZOOM_PRESETS } from '../store/scales';
import type { ZoomLevel, GanttConfig, DragState } from '../store/types';

// ── Default config (mirrors ganttStore defaults) ────────────────

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

// ── Reset store between tests ──────────────────────────────────

beforeEach(() => {
  // Reset data state without destroying action functions (no `true` flag)
  useGanttStore.setState({
    tasks: [],
    links: [],
    markers: [],
    flatTasks: [],
    visibleLinks: [],
    scaleCells: [],
    totalWidth: 0,
    totalHeight: 0,
    selectedTaskIds: [],
    selectedLinkId: null,
    scrollTop: 0,
    scrollLeft: 0,
    dragState: null,
    zoomLevel: 'weeks' as ZoomLevel,
    config: { ...defaultConfig },
  });
  // Reset undo/redo history
  useGanttStore.temporal.getState().clear();
});

// ── Helpers ─────────────────────────────────────────────────────

/** Build a small task set: parent with 2 children, plus an independent task. */
function seedTasks() {
  const parent = createTask({
    id: 'parent',
    text: 'Hoofdtaak',
    type: 'summary',
    open: true,
    start: new Date('2026-03-01'),
    end: new Date('2026-03-20'),
    duration: 14,
  });

  const childA = createTask({
    id: 'child-a',
    text: 'Deeltaak A',
    parentId: 'parent',
    start: new Date('2026-03-01'),
    end: new Date('2026-03-10'),
    duration: 7,
  });

  const childB = createTask({
    id: 'child-b',
    text: 'Deeltaak B',
    parentId: 'parent',
    start: new Date('2026-03-11'),
    end: new Date('2026-03-20'),
    duration: 7,
  });

  const independent = createTask({
    id: 'independent',
    text: 'Losse taak',
    start: new Date('2026-03-21'),
    end: new Date('2026-04-05'),
    duration: 12,
  });

  return { parent, childA, childB, independent };
}

function addAllTasks() {
  const tasks = seedTasks();
  const store = useGanttStore.getState();
  store.addTask(tasks.parent);
  store.addTask(tasks.childA);
  store.addTask(tasks.childB);
  store.addTask(tasks.independent);
  return tasks;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Task CRUD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Task CRUD', () => {
  it('addTask: task appears in state and recalculate runs (flatTasks populated)', () => {
    const task = createTask({ id: 'task-1', text: 'Grondwerk' });
    useGanttStore.getState().addTask(task);

    const state = useGanttStore.getState();
    expect(state.tasks).toHaveLength(1);
    expect(state.tasks[0].id).toBe('task-1');
    // recalculate ran: flatTasks is populated
    expect(state.flatTasks.length).toBeGreaterThanOrEqual(1);
    expect(state.flatTasks[0].id).toBe('task-1');
    // Pixel positions are set
    expect(state.totalWidth).toBeGreaterThan(0);
    expect(state.totalHeight).toBeGreaterThan(0);
  });

  it('updateTask: field is updated and recalculate runs', () => {
    const task = createTask({ id: 'task-1', text: 'Oud', progress: 10 });
    useGanttStore.getState().addTask(task);

    useGanttStore.getState().updateTask('task-1', { text: 'Nieuw', progress: 50 });

    const state = useGanttStore.getState();
    const updated = state.tasks.find((t) => t.id === 'task-1')!;
    expect(updated.text).toBe('Nieuw');
    expect(updated.progress).toBe(50);
    // flatTasks also reflects the change
    const flat = state.flatTasks.find((t) => t.id === 'task-1')!;
    expect(flat.text).toBe('Nieuw');
  });

  it('updateTask with progress > 100: clamped to 100 (H3)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const task = createTask({ id: 'task-1', progress: 50 });
    useGanttStore.getState().addTask(task);

    useGanttStore.getState().updateTask('task-1', { progress: 150 });

    const updated = useGanttStore.getState().tasks.find((t) => t.id === 'task-1')!;
    expect(updated.progress).toBe(100);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('updateTask with start > end: swapped (H3)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const task = createTask({
      id: 'task-1',
      start: new Date('2026-03-01'),
      end: new Date('2026-03-10'),
    });
    useGanttStore.getState().addTask(task);

    // Set start after end
    useGanttStore.getState().updateTask('task-1', {
      start: new Date('2026-04-01'),
      end: new Date('2026-03-01'),
    });

    const updated = useGanttStore.getState().tasks.find((t) => t.id === 'task-1')!;
    // They should be swapped so start <= end
    expect(updated.start.getTime()).toBeLessThanOrEqual(updated.end.getTime());
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('removeTask: task removed, descendants removed, links to removed tasks removed', () => {
    const tasks = addAllTasks();

    // Add links involving children
    const link1 = createLink({ id: 'link-1', source: 'child-a', target: 'child-b' });
    const link2 = createLink({ id: 'link-2', source: 'child-b', target: 'independent' });
    useGanttStore.getState().addLink(link1);
    useGanttStore.getState().addLink(link2);

    // Remove parent -- should cascade to child-a, child-b
    useGanttStore.getState().removeTask('parent');

    const state = useGanttStore.getState();
    const taskIds = state.tasks.map((t) => t.id);
    expect(taskIds).not.toContain('parent');
    expect(taskIds).not.toContain('child-a');
    expect(taskIds).not.toContain('child-b');
    expect(taskIds).toContain('independent');

    // Links referencing removed tasks should be gone
    // link-1: child-a -> child-b (both removed)
    // link-2: child-b -> independent (source removed)
    expect(state.links).toHaveLength(0);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Tree operations
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Tree operations', () => {
  it('toggleTaskOpen: flatTasks changes (children hidden/shown)', () => {
    addAllTasks();

    // Initially open: children visible
    const openState = useGanttStore.getState();
    const openFlatIds = openState.flatTasks.map((t) => t.id);
    expect(openFlatIds).toContain('child-a');
    expect(openFlatIds).toContain('child-b');

    // Collapse parent
    useGanttStore.getState().toggleTaskOpen('parent');

    const closedState = useGanttStore.getState();
    const closedFlatIds = closedState.flatTasks.map((t) => t.id);
    expect(closedFlatIds).toContain('parent');
    expect(closedFlatIds).not.toContain('child-a');
    expect(closedFlatIds).not.toContain('child-b');
    expect(closedFlatIds).toContain('independent');

    // Re-open
    useGanttStore.getState().toggleTaskOpen('parent');

    const reopenedState = useGanttStore.getState();
    const reopenedFlatIds = reopenedState.flatTasks.map((t) => t.id);
    expect(reopenedFlatIds).toContain('child-a');
    expect(reopenedFlatIds).toContain('child-b');
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Link operations
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Link operations', () => {
  it('addLink: link appears in visibleLinks after recalculate', () => {
    addAllTasks();

    const link = createLink({ id: 'link-1', source: 'child-a', target: 'child-b' });
    useGanttStore.getState().addLink(link);

    const state = useGanttStore.getState();
    expect(state.links).toHaveLength(1);
    expect(state.links[0].id).toBe('link-1');
    // visibleLinks should contain the positioned link
    expect(state.visibleLinks).toHaveLength(1);
    expect(state.visibleLinks[0].id).toBe('link-1');
    // $points should be calculated
    expect(state.visibleLinks[0].$points).toBeDefined();
    expect(state.visibleLinks[0].$points!.length).toBeGreaterThan(0);
  });

  it('addLink circular: link is rejected (K3), state unchanged', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    addAllTasks();

    // A -> B
    const link1 = createLink({ id: 'link-1', source: 'child-a', target: 'child-b' });
    useGanttStore.getState().addLink(link1);
    expect(useGanttStore.getState().links).toHaveLength(1);

    // B -> A would create a cycle
    const link2 = createLink({ id: 'link-2', source: 'child-b', target: 'child-a' });
    useGanttStore.getState().addLink(link2);

    // Should still have only 1 link
    expect(useGanttStore.getState().links).toHaveLength(1);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('removeLink: link removed from state', () => {
    addAllTasks();

    const link = createLink({ id: 'link-1', source: 'child-a', target: 'child-b' });
    useGanttStore.getState().addLink(link);
    expect(useGanttStore.getState().links).toHaveLength(1);

    useGanttStore.getState().removeLink('link-1');

    const state = useGanttStore.getState();
    expect(state.links).toHaveLength(0);
    expect(state.visibleLinks).toHaveLength(0);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Selection
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Selection', () => {
  it('selectTask: sets selectedTaskIds, clears selectedLinkId', () => {
    // Pre-set a link selection
    useGanttStore.setState({ selectedLinkId: 'some-link' });

    useGanttStore.getState().selectTask('task-1');

    const state = useGanttStore.getState();
    expect(state.selectedTaskIds).toEqual(['task-1']);
    expect(state.selectedLinkId).toBeNull();
  });

  it('selectLink: sets selectedLinkId, clears selectedTaskIds', () => {
    // Pre-set a task selection
    useGanttStore.setState({ selectedTaskIds: ['some-task'] });

    useGanttStore.getState().selectLink('link-1');

    const state = useGanttStore.getState();
    expect(state.selectedLinkId).toBe('link-1');
    expect(state.selectedTaskIds).toEqual([]);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Zoom
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Zoom', () => {
  it("setZoom('days'): scales and cellWidth change", () => {
    addAllTasks();

    useGanttStore.getState().setZoom('days');

    const state = useGanttStore.getState();
    expect(state.zoomLevel).toBe('days');
    expect(state.config.cellWidth).toBe(ZOOM_PRESETS.days.cellWidth);
    // Scales should match the days preset
    expect(state.config.scales).toHaveLength(ZOOM_PRESETS.days.scales.length);
    expect(state.config.scales[0].unit).toBe(ZOOM_PRESETS.days.scales[0].unit);
    // recalculate ran: scaleCells updated
    expect(state.scaleCells.length).toBeGreaterThan(0);
  });

  it('setZoom with invalid level: warns, state unchanged (H4)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    addAllTasks();

    const stateBefore = useGanttStore.getState();
    const zoomBefore = stateBefore.zoomLevel;
    const cellWidthBefore = stateBefore.config.cellWidth;

    useGanttStore.getState().setZoom('invalid-zoom' as ZoomLevel);

    const stateAfter = useGanttStore.getState();
    expect(stateAfter.zoomLevel).toBe(zoomBefore);
    expect(stateAfter.config.cellWidth).toBe(cellWidthBefore);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Recalculate pipeline
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Recalculate pipeline', () => {
  it('with showCriticalPath: tasks get critical flag', () => {
    // Enable critical path
    useGanttStore.setState((s) => ({
      config: { ...s.config, showCriticalPath: true },
    }));

    addAllTasks();

    // Add a chain: child-a -> child-b -> independent
    const link1 = createLink({ id: 'link-1', source: 'child-a', target: 'child-b' });
    const link2 = createLink({ id: 'link-2', source: 'child-b', target: 'independent' });
    useGanttStore.getState().addLink(link1);
    useGanttStore.getState().addLink(link2);

    const state = useGanttStore.getState();
    // At least some tasks should have critical defined
    const criticalTasks = state.flatTasks.filter((t) => t.critical === true);
    expect(criticalTasks.length).toBeGreaterThan(0);
  });

  it('with showSlack: tasks get slack values', () => {
    // Enable slack
    useGanttStore.setState((s) => ({
      config: { ...s.config, showSlack: true },
    }));

    addAllTasks();

    const link1 = createLink({ id: 'link-1', source: 'child-a', target: 'child-b' });
    useGanttStore.getState().addLink(link1);

    const state = useGanttStore.getState();
    // All positioned tasks should have a slack value
    const tasksWithSlack = state.flatTasks.filter((t) => t.slack !== undefined);
    expect(tasksWithSlack.length).toBeGreaterThan(0);
  });

  it('collapsed parent: visibleLinks excludes links to hidden children, but source links array preserved (K2)', () => {
    addAllTasks();

    // Link between children
    const link = createLink({ id: 'link-1', source: 'child-a', target: 'child-b' });
    useGanttStore.getState().addLink(link);

    // Verify link is visible when parent is open
    expect(useGanttStore.getState().visibleLinks).toHaveLength(1);
    expect(useGanttStore.getState().links).toHaveLength(1);

    // Collapse parent -- hides children
    useGanttStore.getState().toggleTaskOpen('parent');

    const state = useGanttStore.getState();
    // K2: source links array is preserved
    expect(state.links).toHaveLength(1);
    expect(state.links[0].id).toBe('link-1');
    // visibleLinks excludes the link because children are hidden
    expect(state.visibleLinks).toHaveLength(0);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Auto-schedule
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Auto-schedule', () => {
  it('autoScheduleTasks: task dates are updated based on dependencies', () => {
    // Add two independent tasks with an e2s link
    const taskA = createTask({
      id: 'task-a',
      text: 'Taak A',
      start: new Date('2026-03-02'), // Monday
      end: new Date('2026-03-06'),   // Friday
      duration: 5,
    });
    const taskB = createTask({
      id: 'task-b',
      text: 'Taak B',
      start: new Date('2026-03-02'), // Same start (should be moved after A)
      end: new Date('2026-03-06'),
      duration: 5,
    });

    const store = useGanttStore.getState();
    store.addTask(taskA);
    store.addTask(taskB);

    // A -> B (finish-to-start)
    const link = createLink({ id: 'link-ab', source: 'task-a', target: 'task-b', type: 'e2s' });
    useGanttStore.getState().addLink(link);

    // Capture B's start before auto-schedule
    const beforeB = useGanttStore.getState().tasks.find((t) => t.id === 'task-b')!;
    const bStartBefore = beforeB.start.getTime();

    // Run auto-schedule
    useGanttStore.getState().autoScheduleTasks();

    const afterState = useGanttStore.getState();
    const aAfter = afterState.tasks.find((t) => t.id === 'task-a')!;
    const bAfter = afterState.tasks.find((t) => t.id === 'task-b')!;

    // B should start at or after A ends (finish-to-start)
    expect(bAfter.start.getTime()).toBeGreaterThanOrEqual(aAfter.end.getTime());
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Snap-to-time
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Snap-to-time', () => {
  /**
   * Helper: compute a deltaX in pixels that maps to a given number
   * of milliseconds under the current store's dateRange / totalWidth.
   */
  function msToPixelDelta(ms: number): number {
    const { dateRange, totalWidth } = useGanttStore.getState();
    const totalMs = dateRange.end.getTime() - dateRange.start.getTime();
    if (totalMs === 0) return 0;
    return (ms / totalMs) * totalWidth;
  }

  it('endDrag with snapUnit="day": dates snap to day boundaries', () => {
    const task = createTask({
      id: 'snap-task',
      text: 'Snap test',
      start: new Date('2026-03-02T00:00:00'), // Monday midnight
      end: new Date('2026-03-06T00:00:00'),   // Friday midnight
      duration: 4,
    });
    useGanttStore.getState().addTask(task);

    // Ensure snapUnit is 'day' (default)
    expect(useGanttStore.getState().config.snapUnit).toBe('day');

    // Compute deltaX for 1.5 days (should snap to either 1 or 2 day boundary)
    const halfDayMs = 12 * 60 * 60 * 1000; // 12 hours
    const oneDayMs = 24 * 60 * 60 * 1000;
    const deltaMs = oneDayMs + halfDayMs; // 1.5 days
    const deltaX = msToPixelDelta(deltaMs);

    const stored = useGanttStore.getState().tasks.find((t) => t.id === 'snap-task')!;

    const drag: DragState = {
      type: 'move',
      taskId: 'snap-task',
      startX: 0,
      startY: 0,
      currentX: deltaX,
      currentY: 0,
      originalTask: stored,
    };

    useGanttStore.getState().startDrag(drag);
    useGanttStore.getState().endDrag();

    const after = useGanttStore.getState().tasks.find((t) => t.id === 'snap-task')!;

    // 1.5 days forward from midnight: lands at 12:00 noon, equidistant
    // from day-start and day-end. snapToUnit picks the start (<=), so +1 day.
    const expectedStart = new Date('2026-03-03T00:00:00');
    const expectedEnd = new Date('2026-03-07T00:00:00');

    expect(after.start.getTime()).toBe(expectedStart.getTime());
    expect(after.end.getTime()).toBe(expectedEnd.getTime());

    // Both should be exact day starts (midnight)
    expect(after.start.getTime()).toBe(startOfDay(after.start).getTime());
    expect(after.end.getTime()).toBe(startOfDay(after.end).getTime());
  });

  it('endDrag with snapUnit=null: dates are not snapped', () => {
    // Disable snapping
    useGanttStore.getState().updateConfig({ snapUnit: null });

    const task = createTask({
      id: 'nosnap-task',
      text: 'No snap test',
      start: new Date('2026-03-02T00:00:00'), // Monday midnight
      end: new Date('2026-03-06T00:00:00'),   // Friday midnight
      duration: 4,
    });
    useGanttStore.getState().addTask(task);

    expect(useGanttStore.getState().config.snapUnit).toBeNull();

    // Move by exactly 6 hours (sub-day offset)
    const sixHoursMs = 6 * 60 * 60 * 1000;
    const deltaX = msToPixelDelta(sixHoursMs);

    const stored = useGanttStore.getState().tasks.find((t) => t.id === 'nosnap-task')!;

    const drag: DragState = {
      type: 'move',
      taskId: 'nosnap-task',
      startX: 0,
      startY: 0,
      currentX: deltaX,
      currentY: 0,
      originalTask: stored,
    };

    useGanttStore.getState().startDrag(drag);
    useGanttStore.getState().endDrag();

    const after = useGanttStore.getState().tasks.find((t) => t.id === 'nosnap-task')!;

    // Without snapping, times should NOT be on day boundaries
    // Start should be ~06:00 on March 2
    expect(after.start.getHours()).not.toBe(0);
    // The fractional offset should be preserved (approximately 6 hours)
    const offsetMs = after.start.getTime() - new Date('2026-03-02T00:00:00').getTime();
    expect(offsetMs).toBeGreaterThan(5 * 60 * 60 * 1000); // > 5h
    expect(offsetMs).toBeLessThan(7 * 60 * 60 * 1000);    // < 7h
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Undo / Redo
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Undo/Redo', () => {
  it('undo after addTask: task is removed', () => {
    const task = createTask({ id: 'undo-task', text: 'Undo me' });
    useGanttStore.getState().addTask(task);
    expect(useGanttStore.getState().tasks).toHaveLength(1);

    useGanttStore.getState().undo();

    expect(useGanttStore.getState().tasks).toHaveLength(0);
  });

  it('redo after undo: task reappears', () => {
    const task = createTask({ id: 'redo-task', text: 'Redo me' });
    useGanttStore.getState().addTask(task);
    expect(useGanttStore.getState().tasks).toHaveLength(1);

    useGanttStore.getState().undo();
    expect(useGanttStore.getState().tasks).toHaveLength(0);

    useGanttStore.getState().redo();
    expect(useGanttStore.getState().tasks).toHaveLength(1);
    expect(useGanttStore.getState().tasks[0].id).toBe('redo-task');
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Multi-select
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Multi-select', () => {
  it('selectTask without modifiers: single select', () => {
    useGanttStore.getState().selectTask('task-1');

    const state = useGanttStore.getState();
    expect(state.selectedTaskIds).toEqual(['task-1']);
  });

  it('selectTask with ctrl: toggles selection', () => {
    useGanttStore.getState().selectTask('task-1');
    useGanttStore.getState().selectTask('task-2', { ctrl: true });

    expect(useGanttStore.getState().selectedTaskIds).toEqual(['task-1', 'task-2']);

    // Toggle task-1 off
    useGanttStore.getState().selectTask('task-1', { ctrl: true });

    expect(useGanttStore.getState().selectedTaskIds).toEqual(['task-2']);
  });

  it('selectTask with shift: selects range', () => {
    addAllTasks();

    // Select first task in flat order
    useGanttStore.getState().selectTask('parent');

    // Shift-click on 'independent' (last in flat order)
    useGanttStore.getState().selectTask('independent', { shift: true });

    const state = useGanttStore.getState();
    // Should select the range: parent, child-a, child-b, independent
    expect(state.selectedTaskIds).toContain('parent');
    expect(state.selectedTaskIds).toContain('child-a');
    expect(state.selectedTaskIds).toContain('child-b');
    expect(state.selectedTaskIds).toContain('independent');
    expect(state.selectedTaskIds).toHaveLength(4);
  });

  it('selectTask(null): clears selection', () => {
    useGanttStore.getState().selectTask('task-1');
    expect(useGanttStore.getState().selectedTaskIds).toEqual(['task-1']);

    useGanttStore.getState().selectTask(null);

    expect(useGanttStore.getState().selectedTaskIds).toEqual([]);
  });
});
