/**
 * Visual test scenarios. Each entry is a named configuration that the
 * ScenarioRouter renders based on the `?scenario=<id>` query param.
 * Playwright navigates to each and screenshots + probes.
 */

import type { GanttTask, GanttLink, GanttMarker, GanttConfig } from '@bluemillstudio/gantt';

export interface VisualScenario {
  id: string;
  title: string;
  tasks: GanttTask[];
  links?: GanttLink[];
  markers?: GanttMarker[];
  config?: Partial<GanttConfig>;
}

const d = (offset: number) => {
  const dt = new Date('2026-05-01');
  dt.setDate(dt.getDate() + offset);
  return dt;
};

function t(
  id: string,
  text: string,
  startOff: number,
  endOff: number,
  extra: Partial<GanttTask> = {},
): GanttTask {
  return {
    id, text,
    start: d(startOff), end: d(endOff),
    duration: Math.max(1, endOff - startOff),
    progress: 0, parentId: null, type: 'task', open: true,
    $x: 0, $y: 0, $w: 0, $h: 0, $level: 0,
    ...extra,
  };
}

export const SCENARIOS: VisualScenario[] = [
  {
    id: 'basic',
    title: 'Basic chart with 3 tasks + 1 link',
    tasks: [
      t('a', 'Design', 0, 8, { progress: 60, taskCategory: 'f1' }),
      t('b', 'Build', 8, 20, { progress: 25, taskCategory: 'f2' }),
      t('c', 'Launch', 20, 20, { type: 'milestone' }),
    ],
    links: [
      { id: 'l1', source: 'a', target: 'b', type: 'e2s' },
      { id: 'l2', source: 'b', target: 'c', type: 'e2s' },
    ],
  },
  {
    id: 'critical-path',
    title: 'Critical path + slack',
    tasks: [
      t('root', 'Project', 0, 30, { type: 'summary', progress: 30 }),
      t('a', 'Foundation', 0, 5, { parentId: 'root', progress: 100, taskCategory: 'f1' }),
      t('b', 'Structure', 5, 15, { parentId: 'root', progress: 50, taskCategory: 'f2' }),
      t('c', 'Finishing', 15, 25, { parentId: 'root', progress: 0, taskCategory: 'f3' }),
      t('d', 'Side task', 5, 10, { parentId: 'root', progress: 0, taskCategory: 'transport' }),
    ],
    links: [
      { id: 'l1', source: 'a', target: 'b', type: 'e2s' },
      { id: 'l2', source: 'b', target: 'c', type: 'e2s' },
      { id: 'l3', source: 'a', target: 'd', type: 'e2s' },
    ],
    config: { showCriticalPath: true, showSlack: true },
  },
  {
    id: 'baselines',
    title: 'Baseline comparison (plan vs actual)',
    tasks: [
      t('a', 'Design', 5, 15, {
        progress: 80,
        baseStart: d(0), baseEnd: d(10),
        taskCategory: 'f1',
      }),
      t('b', 'Development', 15, 30, {
        progress: 20,
        baseStart: d(10), baseEnd: d(22),
        taskCategory: 'f2',
      }),
    ],
    config: { showBaselines: true },
  },
  {
    id: 'split-tasks',
    title: 'Split (segmented) task',
    tasks: [
      t('s', 'Machine B maintenance', 0, 20, {
        segments: [
          { start: d(0), end: d(6), $x: 0, $w: 0 },
          { start: d(12), end: d(20), $x: 0, $w: 0 },
        ],
      }),
      t('a', 'Regular task', 2, 14, { progress: 50, taskCategory: 'f2' }),
    ],
  },
  {
    id: 'category-colors',
    title: 'Task category colors',
    tasks: [
      t('f1', 'F1 — Phase 1', 0, 5, { taskCategory: 'f1' }),
      t('f2', 'F2 — Phase 2', 5, 10, { taskCategory: 'f2' }),
      t('f3', 'F3 — Phase 3', 10, 15, { taskCategory: 'f3' }),
      t('tr', 'Transport', 15, 20, { taskCategory: 'transport' }),
      t('in', 'Inspection', 20, 25, { taskCategory: 'inspectie' }),
      t('or', 'Order', 25, 30, { taskCategory: 'order' }),
      t('ge', 'Generic', 30, 35, { taskCategory: 'generic' }),
    ],
  },
  {
    id: 'status-styling',
    title: 'Task status: active / paused / cancelled / completed',
    tasks: [
      t('act', 'Active', 0, 8, { status: 'active', progress: 40 }),
      t('pau', 'Paused', 8, 16, { status: 'paused', progress: 30 }),
      t('can', 'Cancelled', 16, 24, { status: 'cancelled', progress: 60 }),
      t('com', 'Completed', 24, 30, { status: 'completed', progress: 100 }),
    ],
  },
  {
    id: 'holidays-weekends',
    title: 'Weekend + holiday shading',
    tasks: [
      t('a', 'Two-week task', 0, 14, { progress: 0 }),
    ],
    markers: [
      { id: 'holiday', date: d(5), label: 'Holiday', color: 'red' },
    ],
    config: {
      holidays: [d(5)],
    },
  },
  {
    id: 'toolbar-hidden',
    title: 'Toolbar hidden (config.showToolbar: false)',
    tasks: [
      t('a', 'Task', 0, 10, { progress: 50 }),
    ],
    config: { showToolbar: false },
  },
  {
    id: 'empty-state',
    title: 'No tasks — empty state placeholder',
    tasks: [],
  },
  {
    id: 'drag-constraints',
    title: 'Locked + constrained tasks',
    tasks: [
      t('locked', 'Locked milestone', 10, 10, { type: 'milestone', lockStart: true, lockEnd: true }),
      t('min', 'Min 5 days', 0, 8, { minDuration: 5, progress: 30 }),
      t('max', 'Max 10 days', 12, 20, { maxDuration: 10 }),
    ],
  },
];
