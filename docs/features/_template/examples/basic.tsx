// Minimal, type-checked reference example for the feature.
// Keep the file under ~30 lines; complex variants get their own *.tsx.

import { Gantt, type GanttTask } from '@bluemillstudio/gantt';

const tasks: GanttTask[] = [
  {
    id: 't1',
    text: 'Replace me',
    start: new Date('2026-05-01'),
    end: new Date('2026-05-10'),
    duration: 9,
    progress: 0,
    parentId: null,
    type: 'task',
    open: false,
    $x: 0, $y: 0, $w: 0, $h: 0, $level: 0,
  },
];

export default function Example() {
  return <Gantt tasks={tasks} />;
}
