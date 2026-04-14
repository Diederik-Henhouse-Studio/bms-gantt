// ─────────────────────────────────────────────────────────────
// BMS Gantt – Type definitions
// Custom-built Gantt component · React 18 + Zustand + date-fns
// ─────────────────────────────────────────────────────────────

import type { LaneGroup } from './laneAssignment';
export type { LaneGroup };

// ━━━ Domain enums & literals ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Structural role of a task row in the Gantt. */
export type TaskType = 'task' | 'summary' | 'milestone';

/**
 * Optional task category for domain-specific colouring.
 * The default literals are retained as an example of how a consumer
 * can model their own task taxonomy; see `presets/examples/grondwijzer.ts`.
 */
export type TaskCategory =
  | 'f1'
  | 'f2'
  | 'f3'
  | 'transport'
  | 'inspectie'
  | 'order'
  | 'generic';

/** Task lifecycle status. */
export type TaskStatus =
  | 'planned'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';

/**
 * Dependency type between two tasks.
 *
 * - e2s – finish-to-start (most common)
 * - e2e – finish-to-finish
 * - s2s – start-to-start
 * - s2e – start-to-finish
 */
export type LinkType = 'e2s' | 'e2e' | 's2s' | 's2e';

/** Timeline unit granularity. */
export type ScaleUnit =
  | 'minute'
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'quarter'
  | 'year';

// ━━━ Split-task segment ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** One contiguous segment of a split (interrupted) task. */
export interface TaskSegment {
  /** Segment start date. */
  start: Date;
  /** Segment end date. */
  end: Date;
  /** Computed pixel x-offset relative to the timeline origin. */
  $x: number;
  /** Computed pixel width of this segment. */
  $w: number;
}

// ━━━ GanttTask ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Core task entity rendered as a bar (or diamond for milestones)
 * on the Gantt chart.
 */
export interface GanttTask {
  // ── Identity ──────────────────────────────────────────────
  /** Unique task identifier. */
  id: string;
  /** Human-readable task label shown in the grid and on the bar. */
  text: string;

  // ── Schedule ──────────────────────────────────────────────
  /** Scheduled start date. */
  start: Date;
  /** Scheduled end date. */
  end: Date;
  /**
   * Duration expressed in working days.
   * Derived from start/end minus non-working days & holidays.
   */
  duration: number;

  // ── Progress & hierarchy ──────────────────────────────────
  /** Completion percentage (0 – 100). */
  progress: number;
  /** Parent task id for tree nesting, or `null` for root-level tasks. */
  parentId: string | null;
  /** Structural role: regular task, roll-up summary, or zero-duration milestone. */
  type: TaskType;
  /**
   * Whether the subtask tree beneath this task is expanded.
   * Only meaningful when `type === 'summary'`.
   */
  open: boolean;

  // ── Computed visual properties (set by recalculate) ───────
  /** Pixel x-offset from the timeline origin. */
  $x: number;
  /** Pixel y-offset from the top of the task area. */
  $y: number;
  /** Pixel width of the task bar. */
  $w: number;
  /** Pixel height of the task bar. */
  $h: number;
  /**
   * Indent depth in the task tree (0 = root).
   * Used for left-padding in the grid column.
   */
  $level: number;

  // ── Computed lane properties (set by laneAssignment) ──────
  /** Sub-lane index within a multi-row group (0-based). Set by laneAssignment. */
  $lane?: number;
  /** Group identifier for multi-row mode. */
  $groupId?: string;

  // ── Computed baseline visual properties (set by positionBaselines) ──
  /** Baseline bar pixel x-offset. */
  $bx?: number;
  /** Baseline bar pixel y-offset. */
  $by?: number;
  /** Baseline bar pixel width. */
  $bw?: number;
  /** Baseline bar pixel height. */
  $bh?: number;

  // ── PRO: Baseline ─────────────────────────────────────────
  /**
   * Baseline start date (original plan).
   * Shown as a shadow bar when `showBaselines` is enabled.
   */
  baseStart?: Date;
  /**
   * Baseline end date (original plan).
   */
  baseEnd?: Date;

  // ── PRO: Critical path ────────────────────────────────────
  /**
   * Whether this task lies on the critical path.
   * Calculated via forward/backward pass when `showCriticalPath` is enabled.
   */
  critical?: boolean;
  /**
   * Total float / slack in working days.
   * A task with slack === 0 is critical.
   */
  slack?: number;

  // ── PRO: Split tasks ──────────────────────────────────────
  /**
   * When a task is split (interrupted), each contiguous work period
   * is represented as a segment. An unsplit task has no segments.
   */
  segments?: TaskSegment[];

  // ── Optional domain fields ────────────────────────────────
  /** Domain-specific task category (consumer-defined). */
  taskCategory?: TaskCategory;
  /** Foreign key to a parent project / dossier in the consumer's data model. */
  projectId?: string;
  /** Lifecycle status of the task. */
  status?: TaskStatus;
  /**
   * Override bar colour (CSS value).
   * When unset the colour is derived from `taskCategory`.
   */
  color?: string;
}

// ━━━ GanttLink ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Dependency link rendered as an arrow between two task bars. */
export interface GanttLink {
  /** Unique link identifier. */
  id: string;
  /** Id of the predecessor task. */
  source: string;
  /** Id of the successor task. */
  target: string;
  /** Dependency type (finish-to-start, etc.). */
  type: LinkType;
  /** Whether this link sits on the critical path. */
  critical?: boolean;

  // ── Computed ──────────────────────────────────────────────
  /**
   * Pre-calculated SVG polyline `points` attribute string.
   * Set by the layout engine after every recalculation.
   * Example: `"120,45 140,45 140,90 160,90"`
   */
  $points?: string;
}

// ━━━ GanttScale & ScaleCell ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Configuration for one row of the timeline header.
 * Multiple scales are stacked (e.g. months on top, days below).
 */
export interface GanttScale {
  /** Time unit this scale row represents. */
  unit: ScaleUnit;
  /**
   * How many units each cell spans.
   * E.g. `{ unit: 'day', step: 1 }` = one cell per day.
   */
  step: number;
  /**
   * date-fns format string used to render the cell label.
   * E.g. `'MMM yyyy'`, `'EEE d'`, `'HH:mm'`.
   */
  format: string;
}

/** One rendered cell in a timeline header row. */
export interface ScaleCell {
  /** Stable React key (typically `unit-isoDate`). */
  key: string;
  /** Display label produced by formatting `date` with the scale's format string. */
  label: string;
  /** The date this cell starts at. */
  date: Date;
  /** Pixel width of this cell. */
  width: number;
  /** The scale unit this cell belongs to. */
  unit: ScaleUnit;
  /** Whether this cell falls on a weekend day (Sat/Sun by default). */
  isWeekend: boolean;
  /** Whether this cell contains today's date. */
  isToday: boolean;
}

// ━━━ GanttMarker ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Vertical marker line drawn across the full chart height. */
export interface GanttMarker {
  /** Unique marker identifier. */
  id: string;
  /** Date at which the marker is positioned. */
  date: Date;
  /** Optional label shown above the marker line. */
  label?: string;
  /** CSS colour value for the marker line. */
  color?: string;
  /** Render as a dashed line instead of solid. */
  dashed?: boolean;
}

// ━━━ GanttConfig ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Component-level configuration for layout, behaviour & features. */
export interface GanttConfig {
  // ── Scale & sizing ────────────────────────────────────────
  /** Ordered list of header scale rows (top to bottom). */
  scales: GanttScale[];
  /** Pixel width of a single base-unit cell. */
  cellWidth: number;
  /** Pixel height of a task row (including padding). */
  cellHeight: number;
  /** Pixel height of the task bar within a row. */
  barHeight: number;
  /** Vertical padding above and below the bar within a row (px). */
  barPadding: number;

  // ── Behaviour ─────────────────────────────────────────────
  /** When `true` the chart is display-only: no drag, no edit. */
  readonly: boolean;
  /** Snap unit for drag operations. Tasks snap to the nearest boundary of this unit. `null` disables snapping. */
  snapUnit: ScaleUnit | null;
  /** Row layout mode. 'single' = one task per row (default). 'multi' = multiple items per row with lane stacking. */
  rowMode: 'single' | 'multi';
  /** Field to group tasks by when rowMode is 'multi'. Default: 'parentId'. */
  groupBy: string;

  // ── Feature flags ─────────────────────────────────────────
  /** Show baseline (shadow) bars behind the actual bars. */
  showBaselines: boolean;
  /** Highlight the critical path in red. */
  showCriticalPath: boolean;
  /** Show slack/float indicators on non-critical tasks. */
  showSlack: boolean;

  // ── Calendar ──────────────────────────────────────────────
  /**
   * ISO weekday numbers considered working days.
   * 1 = Monday … 7 = Sunday.
   * @default [1, 2, 3, 4, 5]
   */
  workingDays: number[];
  /**
   * Specific dates treated as non-working (public holidays, etc.).
   * Compared by calendar date (time portion ignored).
   */
  holidays: Date[];
}

// ━━━ Zoom ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Named zoom preset identifier. */
export type ZoomLevel =
  | 'minutes'
  | 'hours'
  | 'days'
  | 'weeks'
  | 'months'
  | 'quarters'
  | 'years';

/**
 * Predefined zoom preset mapping a `ZoomLevel` to concrete
 * scale rows and cell width.
 */
export interface ZoomConfig {
  /** Human-readable label for the zoom button / menu. */
  label: string;
  /** The zoom level this config represents. */
  level: ZoomLevel;
  /** Scale rows active at this zoom level. */
  scales: GanttScale[];
  /** Base cell width (px) at this zoom level. */
  cellWidth: number;
}

// ━━━ DragState (discriminated union) ━━━━━━━━━━━━━━━━━━━━━━━━

/** Common fields shared by all active drag operations. */
interface DragStateBase {
  /** Id of the task being manipulated. */
  taskId: string;
  /** Viewport x at drag start (px). */
  startX: number;
  /** Viewport y at drag start (px). */
  startY: number;
  /** Current viewport x (px). */
  currentX: number;
  /** Current viewport y (px). */
  currentY: number;
  /** Snapshot of the task before the drag began, used for cancel / preview. */
  originalTask: GanttTask;
}

/** Dragging an entire task bar horizontally to reschedule it. */
export interface DragStateMove extends DragStateBase {
  type: 'move';
}

/** Dragging the left edge of a task bar to change its start date. */
export interface DragStateResizeStart extends DragStateBase {
  type: 'resize-start';
}

/** Dragging the right edge of a task bar to change its end date. */
export interface DragStateResizeEnd extends DragStateBase {
  type: 'resize-end';
}

/** Dragging the progress handle inside a task bar. */
export interface DragStateProgress extends DragStateBase {
  type: 'progress';
}

/** Dragging from a link anchor to create a new dependency. */
export interface DragStateLinkCreate extends DragStateBase {
  type: 'link-create';
}

/**
 * Discriminated union of all possible drag operations.
 * `null` when no drag is active.
 */
export type DragState =
  | DragStateMove
  | DragStateResizeStart
  | DragStateResizeEnd
  | DragStateProgress
  | DragStateLinkCreate;

/** Shorthand for the drag type discriminator values. */
export type DragType = DragState['type'];

// ━━━ Date range ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Computed visible date boundaries of the timeline. */
export interface DateRange {
  /** Earliest date shown on the timeline (left edge). */
  start: Date;
  /** Latest date shown on the timeline (right edge). */
  end: Date;
}

// ━━━ GanttActions ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** All mutating actions exposed by the Zustand store. */
export interface GanttActions {
  // ── Task CRUD ─────────────────────────────────────────────
  /** Add a new task. Triggers recalculate. */
  addTask: (task: GanttTask) => void;
  /** Partially update an existing task by id. Triggers recalculate. */
  updateTask: (id: string, patch: Partial<Omit<GanttTask, 'id'>>) => void;
  /** Remove a task and any links referencing it. Triggers recalculate. */
  removeTask: (id: string) => void;

  // ── Link CRUD ─────────────────────────────────────────────
  /** Add a dependency link. Triggers recalculate. */
  addLink: (link: GanttLink) => void;
  /** Partially update an existing link by id. */
  updateLink: (id: string, patch: Partial<Omit<GanttLink, 'id'>>) => void;
  /** Remove a dependency link. */
  removeLink: (id: string) => void;

  // ── Marker CRUD ───────────────────────────────────────────
  /** Add a vertical marker. */
  addMarker: (marker: GanttMarker) => void;
  /** Update a marker by id. */
  updateMarker: (id: string, patch: Partial<Omit<GanttMarker, 'id'>>) => void;
  /** Remove a marker by id. */
  removeMarker: (id: string) => void;

  // ── Selection ─────────────────────────────────────────────
  /** Select a task (or deselect by passing `null`). Supports Ctrl (toggle) and Shift (range). */
  selectTask: (id: string | null, opts?: { ctrl?: boolean; shift?: boolean }) => void;
  /** Replace the entire task selection with the given ids. */
  selectTasks: (ids: string[]) => void;
  /** Select a link (or deselect by passing `null`). */
  selectLink: (id: string | null) => void;

  // ── Tree ──────────────────────────────────────────────────
  /** Toggle the `open` state of a summary task to show/hide its children. */
  toggleTaskOpen: (id: string) => void;

  // ── Scheduling ────────────────────────────────────────────
  /**
   * Move a task to a new start date, preserving its duration.
   * Adjusts the end date accordingly.
   */
  moveTask: (id: string, newStart: Date) => void;

  // ── Viewport ──────────────────────────────────────────────
  /** Update the scroll position of the chart viewport. */
  setScroll: (scrollTop: number, scrollLeft: number) => void;
  /** Switch to a predefined zoom level. Replaces scales and cellWidth. */
  setZoom: (level: ZoomLevel) => void;

  // ── Layout engine ─────────────────────────────────────────
  /**
   * Recompute all derived state: flatTasks ordering, pixel positions,
   * scale cells, total dimensions, link polyline points, and
   * optionally the critical path.
   */
  recalculate: () => void;

  // ── Drag operations ───────────────────────────────────────
  /** Begin a drag interaction. Sets `dragState`. */
  startDrag: (drag: DragState) => void;
  /** Update pointer coordinates during an active drag. */
  updateDrag: (currentX: number, currentY: number) => void;
  /** Finalise (commit) or cancel the current drag. Clears `dragState`. */
  endDrag: (cancelled?: boolean) => void;

  // ── Config ───────────────────────────────────────────────
  /** Partially update the active configuration. Triggers recalculate. */
  updateConfig: (patch: Partial<GanttConfig>) => void;

  // ── PRO: Auto-schedule ───────────────────────────────────
  /** Run forward-pass auto-scheduling on all tasks. */
  autoScheduleTasks: () => void;

  // ── Undo / Redo ──────────────────────────────────────────
  /** Undo the last data mutation (tasks/links/markers). */
  undo: () => void;
  /** Redo the last undone data mutation. */
  redo: () => void;
}

// ━━━ GanttState ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Full Zustand store shape: data + computed + UI + actions. */
export interface GanttState extends GanttActions {
  // ── Source data ───────────────────────────────────────────
  /** All tasks keyed by insertion order. */
  tasks: GanttTask[];
  /** All dependency links. */
  links: GanttLink[];
  /** Vertical marker lines. */
  markers: GanttMarker[];
  /** Active configuration. */
  config: GanttConfig;

  // ── Computed / derived (set by recalculate) ───────────────
  /**
   * Flat, display-ordered list of tasks respecting tree open/close state.
   * Hidden children of collapsed summaries are excluded.
   * Each task's `$x`, `$y`, `$w`, `$h`, `$level` are populated.
   */
  flatTasks: GanttTask[];
  /**
   * 2D array of header cells: one inner array per scale row.
   * `scaleCells[0]` is the topmost header row.
   */
  scaleCells: ScaleCell[][];
  /** Computed date boundaries of the visible timeline. */
  dateRange: DateRange;
  /** Total pixel width of the timeline area. */
  totalWidth: number;
  /** Total pixel height of the task area. */
  totalHeight: number;
  /**
   * Links with computed $points for rendering. Only includes links
   * whose source AND target are visible (not collapsed). K2: brondata
   * `links` blijft altijd intact; dit is de gerenderde subset.
   */
  visibleLinks: GanttLink[];
  /** Task groups for multi-row mode. Empty in single mode. */
  taskGroups: LaneGroup[];

  // ── UI state ──────────────────────────────────────────────
  /** Currently selected task ids (supports multi-select). Empty array = no selection. */
  selectedTaskIds: string[];
  /** Currently selected link id, or `null`. */
  selectedLinkId: string | null;
  /** Current vertical scroll offset (px). */
  scrollTop: number;
  /** Current horizontal scroll offset (px). */
  scrollLeft: number;
  /** Active zoom preset. */
  zoomLevel: ZoomLevel;

  // ── Drag ──────────────────────────────────────────────────
  /** Active drag operation, or `null` when idle. */
  dragState: DragState | null;
}
