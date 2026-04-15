// ─────────────────────────────────────────────────────────────
// BMS Gantt – Imperative ref handle ("GanttHandle")
// Agents, tests, and advanced consumers call these methods to
// introspect layout state without reading the DOM directly.
// ─────────────────────────────────────────────────────────────

import type { GanttTask, GanttLink, GanttMarker, ScaleCell, DateRange } from './store';

/** One entry in the flat layout snapshot. */
export interface LayoutBar {
  taskId: string;
  text: string;
  type: GanttTask['type'];
  x: number;
  y: number;
  w: number;
  h: number;
  level: number;
  lane?: number;
  groupId?: string;
  start: string; // ISO
  end: string;   // ISO
  progress: number;
  critical: boolean;
  status?: string;
  category?: string;
}

export interface LayoutScaleCell {
  unit: ScaleCell['unit'];
  date: string;
  x: number;
  width: number;
  isWeekend: boolean;
  isHoliday: boolean;
  isToday: boolean;
  label: string;
}

export interface LayoutLink {
  id: string;
  source: string;
  target: string;
  type: GanttLink['type'];
  critical: boolean;
  points?: string;
}

export interface LayoutMarker {
  id: string;
  date: string;
  x: number;
  label?: string;
}

export interface LayoutSnapshot {
  totalWidth: number;
  totalHeight: number;
  cellHeight: number;
  dateRange: { start: string; end: string };
  bars: LayoutBar[];
  scaleRows: LayoutScaleCell[][];
  links: LayoutLink[];
  markers: LayoutMarker[];
  rowMode: 'single' | 'multi';
  zoomLevel: string;
}

export interface AlignmentIssue {
  severity: 'error' | 'warn';
  code: string;
  message: string;
  elementId?: string;
}

export interface AlignmentReport {
  ok: boolean;
  issues: AlignmentIssue[];
}

/**
 * The public shape of the ref attached to <Gantt ref={...}>.
 * Keep methods synchronous and serializable-output so agents
 * and MCP tools can invoke them uniformly.
 */
export interface GanttHandle {
  /** The outer container element, useful for page-level rects. */
  getElement(): HTMLDivElement | null;

  /** Serializable snapshot of the entire current layout. */
  snapshot(): LayoutSnapshot;

  /**
   * Hit test at (x, y) in *content* coordinates (inside the scroll area,
   * not the viewport). Pass a DOMRect-relative point; convert viewport
   * coords with getElement().getBoundingClientRect() first.
   */
  elementAt(x: number, y: number): { kind: 'bar' | 'scale-cell' | null; ref: unknown };

  /** Row (task) at content Y, or null. */
  rowAtY(y: number): LayoutBar | null;

  /** Date at content X. */
  dateAtX(x: number): string;

  /** Scale cell at content X from the finest scale row. */
  cellAtX(x: number): LayoutScaleCell | null;

  /** DOMRect of a task bar in viewport coordinates, or null if not rendered. */
  taskBarRect(taskId: string): DOMRect | null;

  /** Run alignment heuristics; returns a list of issues. */
  validate(): AlignmentReport;
}
