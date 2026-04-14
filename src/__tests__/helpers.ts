import type {
  GanttTask,
  GanttLink,
  GanttMarker,
  GanttConfig,
} from '../store/types';

// ── Factory: GanttTask ──────────────────────────────────────────

export function createTask(overrides?: Partial<GanttTask>): GanttTask {
  return {
    id: crypto.randomUUID(),
    text: 'Test taak',
    start: new Date('2026-03-01'),
    end: new Date('2026-03-15'),
    duration: 10,
    progress: 0,
    parentId: null,
    type: 'task',
    open: true,
    $x: 0,
    $y: 0,
    $w: 100,
    $h: 24,
    $level: 0,
    ...overrides,
  };
}

// ── Factory: GanttLink ──────────────────────────────────────────

export function createLink(overrides?: Partial<GanttLink>): GanttLink {
  return {
    id: crypto.randomUUID(),
    source: '',
    target: '',
    type: 'e2s',
    $points: '',
    ...overrides,
  };
}

// ── Factory: GanttMarker ────────────────────────────────────────

export function createMarker(overrides?: Partial<GanttMarker>): GanttMarker {
  return {
    id: crypto.randomUUID(),
    date: new Date('2026-03-10'),
    label: 'Milestone',
    color: 'blue',
    dashed: false,
    ...overrides,
  };
}

// ── Factory: GanttConfig ────────────────────────────────────────

export function createConfig(overrides?: Partial<GanttConfig>): GanttConfig {
  return {
    scales: [
      { unit: 'month', format: 'MMM yyyy', step: 1 },
      { unit: 'week', format: "'W'w", step: 1 },
    ],
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
    workingDays: [1, 2, 3, 4, 5],
    holidays: [],
    ...overrides,
  };
}

// ── Pre-built task set ──────────────────────────────────────────

export function createTaskSet() {
  const rootA = createTask({
    id: 'root-a',
    text: 'Project A',
    type: 'summary',
    start: new Date('2026-03-01'),
    end: new Date('2026-03-20'),
    duration: 14,
  });

  const rootB = createTask({
    id: 'root-b',
    text: 'Project B',
    start: new Date('2026-03-21'),
    end: new Date('2026-04-05'),
    duration: 12,
  });

  const rootC = createTask({
    id: 'root-c',
    text: 'Project C',
    start: new Date('2026-04-06'),
    end: new Date('2026-04-20'),
    duration: 10,
  });

  const childA1 = createTask({
    id: 'child-a1',
    text: 'Deeltaak A1',
    parentId: 'root-a',
    start: new Date('2026-03-01'),
    end: new Date('2026-03-10'),
    duration: 7,
    $level: 1,
  });

  const childA2 = createTask({
    id: 'child-a2',
    text: 'Deeltaak A2',
    parentId: 'root-a',
    start: new Date('2026-03-11'),
    end: new Date('2026-03-20'),
    duration: 7,
    $level: 1,
  });

  const linkA1toA2 = createLink({
    id: 'link-a1-a2',
    source: 'child-a1',
    target: 'child-a2',
    type: 'e2s',
  });

  const linkAtoB = createLink({
    id: 'link-a-b',
    source: 'root-a',
    target: 'root-b',
    type: 'e2s',
  });

  return {
    rootA,
    rootB,
    rootC,
    childA1,
    childA2,
    links: [linkA1toA2, linkAtoB],
  };
}
