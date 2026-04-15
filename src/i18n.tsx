import { createContext, useContext, type ReactNode } from 'react';
import type { ZoomLevel } from './store';

export interface GanttLabels {
  today: string;
  goToToday: string;
  scrollLeft: string;
  scrollRight: string;
  undo: string;
  redo: string;
  criticalPath: string;
  criticalPathTitle: string;
  baselines: string;
  baselinesTitle: string;
  autoPlan: string;
  autoPlanTitle: string;
  slack: string;
  slackTitle: string;
  rows: string;
  rowsTitle: string;
  zoomIn: string;
  zoomOut: string;
  export: string;
  exportChart: string;
  exportAsPng: string;
  exportAsPdf: string;
  deleteLink: string;
  delete: string;
  edit: string;
  addSubtask: string;
  addLink: string;
  save: string;
  cancel: string;
  editTask: string;
  name: string;
  start: string;
  end: string;
  durationDays: string;
  progress: string;
  type: string;
  category: string;
  notes: string;
  close: string;
  emptyState: string;
  columnTask: string;
  columnStart: string;
  columnEnd: string;
  columnDuration: string;
  columnProgress: string;
  columnStatus: string;
  taskTypes: { task: string; summary: string; milestone: string };
  zoomLevels: Record<ZoomLevel, string>;
}

export const DEFAULT_LABELS: GanttLabels = {
  today: 'Today',
  goToToday: 'Go to today',
  scrollLeft: 'Scroll left',
  scrollRight: 'Scroll right',
  undo: 'Undo (Ctrl+Z)',
  redo: 'Redo (Ctrl+Shift+Z)',
  criticalPath: 'Critical path',
  criticalPathTitle: 'Show/hide critical path',
  baselines: 'Baselines',
  baselinesTitle: 'Show/hide baselines',
  autoPlan: 'Auto-plan',
  autoPlanTitle: 'Auto-schedule based on dependencies',
  slack: 'Slack',
  slackTitle: 'Show/hide slack/float',
  rows: 'Rows',
  rowsTitle: 'Row mode: single or multiple items per row',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  export: 'Export',
  exportChart: 'Export Gantt chart',
  exportAsPng: 'Export as PNG',
  exportAsPdf: 'Export as PDF',
  deleteLink: 'Delete link',
  delete: 'Delete',
  edit: 'Edit',
  addSubtask: 'Add subtask',
  addLink: 'Add dependency',
  save: 'Save',
  cancel: 'Cancel',
  editTask: 'Edit task',
  name: 'Name',
  start: 'Start',
  end: 'End',
  durationDays: 'Duration (days)',
  progress: 'Progress',
  type: 'Type',
  category: 'Category',
  notes: 'Notes',
  close: 'Close',
  emptyState: 'No tasks to display',
  columnTask: 'Task',
  columnStart: 'Start',
  columnEnd: 'End',
  columnDuration: 'Duration',
  columnProgress: 'Progress',
  columnStatus: 'Status',
  taskTypes: { task: 'Task', summary: 'Summary', milestone: 'Milestone' },
  zoomLevels: {
    minutes: 'Minutes',
    hours: 'Hours',
    days: 'Days',
    weeks: 'Weeks',
    months: 'Months',
    quarters: 'Quarters',
    years: 'Years',
  },
};

const LabelsContext = createContext<GanttLabels>(DEFAULT_LABELS);

export function LabelsProvider({
  labels,
  children,
}: {
  labels?: Partial<GanttLabels>;
  children: ReactNode;
}) {
  const merged: GanttLabels = labels
    ? {
        ...DEFAULT_LABELS,
        ...labels,
        taskTypes: { ...DEFAULT_LABELS.taskTypes, ...labels.taskTypes },
        zoomLevels: { ...DEFAULT_LABELS.zoomLevels, ...labels.zoomLevels },
      }
    : DEFAULT_LABELS;
  return <LabelsContext.Provider value={merged}>{children}</LabelsContext.Provider>;
}

export function useLabels(): GanttLabels {
  return useContext(LabelsContext);
}
