// ─────────────────────────────────────────────────────────────
// BMS Gantt – Domain-specific integration layer
// Connects the generic Gantt to grondbeheer domain
// (F1/F2/F3 formulieren, Schiphol projecten)
// ─────────────────────────────────────────────────────────────

import type {
  TaskCategory,
  GanttTask,
  GanttLink,
  GanttMarker,
  GanttConfig,
} from '../../store/types';

// ━━━ Color mappings ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Bar colour per task category. */
export const TASK_CATEGORY_COLORS: Record<TaskCategory, string> = {
  f1: '#3b82f6',         // blue-500
  f2: '#10b981',         // emerald-500
  f3: '#f59e0b',         // amber-500
  transport: '#8b5cf6',  // purple-500
  inspectie: '#06b6d4',  // cyan-500
  order: '#eab308',      // yellow-500
  generic: '#6366f1',    // indigo-500
};

/** Bar colour per Moonbase task status. */
export const TASK_STATUS_COLORS: Record<string, string> = {
  concept: '#9ca3af',        // gray-400
  ingediend: '#3b82f6',      // blue-500
  in_beoordeling: '#f59e0b', // amber-500
  goedgekeurd: '#10b981',    // emerald-500
  in_uitvoering: '#6366f1',  // indigo-500
  afgerond: '#6b7280',       // gray-500
  afgewezen: '#ef4444',      // red-500
  vertraagd: '#ef4444',      // red-500
};

// ━━━ Moonbase project interface ━━━━━━━━━━━━━━━━━━━━━━━━━

/** Moonbase project as received from the domain layer. */
export interface MoonbaseProject {
  id: string;
  naam: string;
  projectnr: string;
  status: string;
  datumStart: string;
  datumEind?: string;
  f1Status?: string;
  f1SubmittedAt?: string;
  f1BkvDate?: string;
  f2Status?: string;
  f2SubmittedAt?: string;
  f2ApprovedAt?: string;
  f3Status?: string;
  f3SubmittedAt?: string;
  stromen?: Array<{
    id: string;
    beschrijving: string;
    startDatum: string;
    eindDatum: string;
    volume: number;
    status: string;
  }>;
  orders?: Array<{
    id: string;
    orderNumber: string;
    status: string;
    submittedAt?: string;
    approvedAt?: string;
  }>;
}

// ━━━ Helpers ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Default computed visual properties for a new task. */
const ZERO_LAYOUT = { $x: 0, $y: 0, $w: 0, $h: 0, $level: 0 } as const;

/**
 * Parse an ISO date string. Returns the parsed Date, or `fallback` when
 * the input is undefined / empty.
 */
function parseDate(iso: string | undefined, fallback: Date): Date {
  if (!iso) return fallback;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? fallback : d;
}

/** Add `days` calendar days to a Date (immutable). */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Rough working-day count between two dates (Mon-Fri). */
function workingDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return Math.max(count, 1);
}

// ━━━ createProjectGanttData ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Output of `createProjectGanttData`. */
export interface ProjectGanttData {
  tasks: GanttTask[];
  links: GanttLink[];
  markers: GanttMarker[];
}

/**
 * Convert a Moonbase project into Gantt tasks, links, and markers.
 *
 * Generated structure:
 * - Summary task for the project
 *   - F1 task (f1SubmittedAt -> f1BkvDate)
 *   - F2 task (f2SubmittedAt -> f2ApprovedAt)
 *   - Transport tasks (one per stroom)
 *   - Order tasks (one per order)
 *   - F3 task (near project end)
 * - Links: F1->F2, F2->transports, transports->F3
 * - Markers: BKV-afgiftedatum, project deadline
 */
export function createProjectGanttData(
  project: MoonbaseProject,
): ProjectGanttData {
  const tasks: GanttTask[] = [];
  const links: GanttLink[] = [];
  const markers: GanttMarker[] = [];

  const projectStart = new Date(project.datumStart);
  const projectEnd = project.datumEind
    ? new Date(project.datumEind)
    : addDays(projectStart, 180);

  const summaryId = `project-${project.id}`;

  // ── Summary task ──────────────────────────────────────────
  tasks.push({
    id: summaryId,
    text: `${project.projectnr} — ${project.naam}`,
    start: projectStart,
    end: projectEnd,
    duration: workingDaysBetween(projectStart, projectEnd),
    progress: 0,
    parentId: null,
    type: 'summary',
    open: true,
    ...ZERO_LAYOUT,
    taskCategory: 'generic',
    projectId: project.id,
    status: 'active',
  });

  // ── F1 task ───────────────────────────────────────────────
  const f1Id = `f1-${project.id}`;
  const f1Start = parseDate(project.f1SubmittedAt, projectStart);
  const f1End = parseDate(project.f1BkvDate, addDays(f1Start, 30));

  tasks.push({
    id: f1Id,
    text: 'F1 — Melding',
    start: f1Start,
    end: f1End,
    duration: workingDaysBetween(f1Start, f1End),
    progress: project.f1Status === 'goedgekeurd' ? 100 : 0,
    parentId: summaryId,
    type: 'task',
    open: false,
    ...ZERO_LAYOUT,
    taskCategory: 'f1',
    projectId: project.id,
    status: project.f1Status === 'goedgekeurd' ? 'completed' : 'active',
    color: TASK_CATEGORY_COLORS.f1,
  });

  // ── F2 task ───────────────────────────────────────────────
  const f2Id = `f2-${project.id}`;
  const f2Start = parseDate(project.f2SubmittedAt, addDays(f1End, 1));
  const f2End = parseDate(project.f2ApprovedAt, addDays(f2Start, 21));

  tasks.push({
    id: f2Id,
    text: 'F2 — Toepassing',
    start: f2Start,
    end: f2End,
    duration: workingDaysBetween(f2Start, f2End),
    progress: project.f2Status === 'goedgekeurd' ? 100 : 0,
    parentId: summaryId,
    type: 'task',
    open: false,
    ...ZERO_LAYOUT,
    taskCategory: 'f2',
    projectId: project.id,
    status: project.f2Status === 'goedgekeurd' ? 'completed' : 'active',
    color: TASK_CATEGORY_COLORS.f2,
  });

  // Link: F1 -> F2 (finish-to-start)
  links.push({
    id: `link-f1-f2-${project.id}`,
    source: f1Id,
    target: f2Id,
    type: 'e2s',
  });

  // ── Transport tasks (one per stroom) ─────────────────────
  const transportIds: string[] = [];

  if (project.stromen) {
    for (const stroom of project.stromen) {
      const transportId = `transport-${stroom.id}`;
      transportIds.push(transportId);

      const tStart = new Date(stroom.startDatum);
      const tEnd = new Date(stroom.eindDatum);

      tasks.push({
        id: transportId,
        text: `Transport — ${stroom.beschrijving}`,
        start: tStart,
        end: tEnd,
        duration: workingDaysBetween(tStart, tEnd),
        progress: stroom.status === 'afgerond' ? 100 : 0,
        parentId: summaryId,
        type: 'task',
        open: false,
        ...ZERO_LAYOUT,
        taskCategory: 'transport',
        projectId: project.id,
        status: stroom.status === 'afgerond' ? 'completed' : 'active',
        color: TASK_CATEGORY_COLORS.transport,
      });

      // Link: F2 -> transport (finish-to-start)
      links.push({
        id: `link-f2-transport-${stroom.id}`,
        source: f2Id,
        target: transportId,
        type: 'e2s',
      });
    }
  }

  // ── Order tasks (one per order) ──────────────────────────
  if (project.orders) {
    for (const order of project.orders) {
      const orderId = `order-${order.id}`;
      const oStart = parseDate(order.submittedAt, f2Start);
      const oEnd = parseDate(order.approvedAt, addDays(oStart, 7));

      tasks.push({
        id: orderId,
        text: `Order ${order.orderNumber}`,
        start: oStart,
        end: oEnd,
        duration: workingDaysBetween(oStart, oEnd),
        progress: order.status === 'goedgekeurd' ? 100 : 0,
        parentId: summaryId,
        type: 'task',
        open: false,
        ...ZERO_LAYOUT,
        taskCategory: 'order',
        projectId: project.id,
        status: order.status === 'goedgekeurd' ? 'completed' : 'active',
        color: TASK_CATEGORY_COLORS.order,
      });
    }
  }

  // ── F3 task ───────────────────────────────────────────────
  const f3Id = `f3-${project.id}`;
  const f3Start = parseDate(project.f3SubmittedAt, addDays(projectEnd, -14));
  const f3End = addDays(f3Start, 7);

  tasks.push({
    id: f3Id,
    text: 'F3 — Evaluatie',
    start: f3Start,
    end: f3End,
    duration: workingDaysBetween(f3Start, f3End),
    progress: project.f3Status === 'goedgekeurd' ? 100 : 0,
    parentId: summaryId,
    type: 'task',
    open: false,
    ...ZERO_LAYOUT,
    taskCategory: 'f3',
    projectId: project.id,
    status: project.f3Status === 'goedgekeurd' ? 'completed' : 'active',
    color: TASK_CATEGORY_COLORS.f3,
  });

  // Links: transports -> F3 (finish-to-start)
  for (const transportId of transportIds) {
    links.push({
      id: `link-transport-f3-${transportId}`,
      source: transportId,
      target: f3Id,
      type: 'e2s',
    });
  }

  // ── Markers ──────────────────────────────────────────────
  if (project.f1BkvDate) {
    markers.push({
      id: `marker-bkv-${project.id}`,
      date: new Date(project.f1BkvDate),
      label: 'BKV-afgiftedatum',
      color: '#3b82f6',
      dashed: false,
    });
  }

  if (project.datumEind) {
    markers.push({
      id: `marker-deadline-${project.id}`,
      date: new Date(project.datumEind),
      label: 'Project deadline',
      color: '#ef4444',
      dashed: true,
    });
  }

  return { tasks, links, markers };
}

// ━━━ Default config ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Default Gantt configuration for Moonbase instances. */
export const MOONBASE_GANTT_CONFIG: Partial<GanttConfig> = {
  cellHeight: 36,
  barHeight: 24,
  barPadding: 6,
  showBaselines: true,
  showCriticalPath: false,
  showSlack: false,
  readonly: false,
  workingDays: [1, 2, 3, 4, 5],
  holidays: [], // Populated per instance
};

// ━━━ Dutch holidays 2026 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Official Dutch public holidays for 2026.
 *
 * - Nieuwjaarsdag:       1 jan
 * - Goede Vrijdag:       3 apr
 * - Eerste Paasdag:      5 apr
 * - Tweede Paasdag:      6 apr
 * - Koningsdag:          27 apr
 * - Bevrijdingsdag:      5 mei
 * - Hemelvaartsdag:      14 mei
 * - Eerste Pinksterdag:  24 mei
 * - Tweede Pinksterdag:  25 mei
 * - Eerste Kerstdag:     25 dec
 * - Tweede Kerstdag:     26 dec
 */
export const NL_HOLIDAYS_2026: Date[] = [
  new Date('2026-01-01'), // Nieuwjaarsdag
  new Date('2026-04-03'), // Goede Vrijdag
  new Date('2026-04-05'), // Eerste Paasdag
  new Date('2026-04-06'), // Tweede Paasdag
  new Date('2026-04-27'), // Koningsdag
  new Date('2026-05-05'), // Bevrijdingsdag
  new Date('2026-05-14'), // Hemelvaartsdag
  new Date('2026-05-24'), // Eerste Pinksterdag
  new Date('2026-05-25'), // Tweede Pinksterdag
  new Date('2026-12-25'), // Eerste Kerstdag
  new Date('2026-12-26'), // Tweede Kerstdag
];
