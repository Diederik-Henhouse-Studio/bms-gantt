import { Gantt, type GanttTask } from '@bluemillstudio/gantt';

// Two tasks sharing a parent; neither may be dragged over the other.
const base = { progress: 0, type: 'task' as const, open: false, duration: 4,
  $x: 0, $y: 0, $w: 0, $h: 0, $level: 0 };

const tasks: GanttTask[] = [
  { ...base, id: 'p',   text: 'Parent',  parentId: null,
    start: new Date('2026-05-01'), end: new Date('2026-05-25'), type: 'summary' },
  { ...base, id: 'a',   text: 'Surgery A', parentId: 'p', noOverlap: true,
    start: new Date('2026-05-01'), end: new Date('2026-05-05') },
  { ...base, id: 'b',   text: 'Surgery B', parentId: 'p', noOverlap: true,
    start: new Date('2026-05-10'), end: new Date('2026-05-20') },
];

export default function NoOverlap() {
  return <Gantt tasks={tasks} />;
}
