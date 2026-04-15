import { Gantt, type GanttTask } from '@bluemillstudio/gantt';

// A launch milestone that cannot be moved: both edges locked.
const tasks: GanttTask[] = [
  {
    id: 'launch',
    text: 'Product launch',
    start: new Date('2026-05-20'),
    end: new Date('2026-05-20'),
    lockStart: true,
    lockEnd: true,
    duration: 0,
    progress: 0,
    parentId: null,
    type: 'milestone',
    open: false,
    $x: 0, $y: 0, $w: 0, $h: 0, $level: 0,
  },
];

export default function LockedMilestone() {
  return <Gantt tasks={tasks} />;
}
