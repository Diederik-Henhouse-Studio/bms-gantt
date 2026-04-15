// BMS Gantt — Store barrel export

// Types
export type {
  GanttTask,
  GanttLink,
  GanttScale,
  ScaleCell,
  GanttMarker,
  GanttConfig,
  GanttState,
  GanttActions,
  DragState,
  DateRange,
  ZoomLevel,
  ZoomConfig,
  TaskType,
  TaskCategory,
  TaskStatus,
  LinkType,
  ScaleUnit,
  LaneGroup,
  ComputedField,
  SummaryAggregator,
} from './types';

// Store
export { useGanttStore, createGanttStore, useTemporalStore } from './ganttStore';

// Selectors
export { selectSingleTaskId } from './selectors';

// Task tree
export {
  flattenTaskTree,
  recalcSummaries,
  getChildren,
  getAllDescendants,
  getAncestors,
  moveTask,
  canMoveTask,
} from './taskTree';

// Scales
export {
  ZOOM_PRESETS,
  calcDateRange,
  generateScaleCells,
  generateAllScaleCells,
  calcTotalWidth,
  dateToX,
  xToDate,
  snapToUnit,
} from './scales';

// Positioning
export {
  positionTasks,
  positionTasksMultiRow,
  calcMultiRowTotalHeight,
  positionBaselines,
  calcLinkPoints,
  positionLinks,
} from './positioning';

// Lane assignment
export {
  detectOverlaps,
  assignLanes,
  groupAndAssignLanes,
} from './laneAssignment';

// Calendar
export type { GanttCalendar } from './calendar';
export { createCalendar } from './calendar';

// Scheduling (PRO features — eigen ontwikkeling)
export {
  topologicalSort,
  detectCycles,
  autoSchedule,
  calcCriticalPath,
  calcSlack,
} from './scheduling';

// Hit-test helpers (pure, no DOM)
export {
  rowAtY,
  cellAtX,
  barAtPoint,
  dateAtX,
} from './hitTest';

// Drag constraints (pure, no DOM)
export {
  applyMoveConstraints,
  applyResizeStartConstraints,
  applyResizeEndConstraints,
} from './dragConstraints';

// Computation layer (pure)
export {
  applyComputedFields,
  applySummaryAggregators,
} from './computation';
