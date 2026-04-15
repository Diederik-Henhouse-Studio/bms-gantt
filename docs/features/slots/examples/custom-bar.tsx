import { Gantt, type GanttTask, type GanttSlots } from '@bluemillstudio/gantt';

const tasks: GanttTask[] = [
  { id: 'a', text: 'Alpha', start: new Date('2026-05-01'), end: new Date('2026-05-10'),
    duration: 9, progress: 40, parentId: null, type: 'task', open: false,
    $x: 0, $y: 0, $w: 0, $h: 0, $level: 0 },
];

const slots: GanttSlots = {
  renderTaskBar: (task) => (
    <div className="flex h-full items-center px-2 text-[11px] text-white" data-test="custom">
      {task.text} · {task.progress}%
    </div>
  ),
  renderTaskTooltip: (task) => (
    <div className="space-y-1">
      <strong>{task.text}</strong>
      <div>{task.start.toISOString().slice(0, 10)}</div>
    </div>
  ),
};

export default function CustomBar() {
  return <Gantt tasks={tasks} slots={slots} />;
}
