// BMS Gantt – Presets barrel export
//
// Example domain integrations. These are intentionally re-exported so
// consumers can study a real-world mapping, but you are expected to
// provide your own presets in your application.

export {
  TASK_CATEGORY_COLORS,
  TASK_STATUS_COLORS,
  GRONDWIJZER_GANTT_CONFIG,
  NL_HOLIDAYS_2026,
  createProjectGanttData,
} from './examples/grondwijzer';

export type {
  GrondwijzerProject,
  ProjectGanttData,
} from './examples/grondwijzer';
