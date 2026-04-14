// BMS Gantt — Main entry point

// The public component
export { Gantt } from './components';
export type { GanttProps } from './components';
export { GanttErrorBoundary } from './components';
export type { GanttErrorBoundaryProps } from './components';

// Validation
export { validateGanttInput } from './utils/validateTasks';
export type { ValidationResult } from './utils/validateTasks';

// Store (for advanced/external usage)
export { useGanttStore, createGanttStore, useTemporalStore, selectSingleTaskId } from './store';

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
  TaskType,
  TaskCategory,
  LinkType,
} from './store';

// i18n
export type { GanttLabels } from './i18n';
export { DEFAULT_LABELS } from './i18n';

// Presets (example domain integration)
export * from './presets';
