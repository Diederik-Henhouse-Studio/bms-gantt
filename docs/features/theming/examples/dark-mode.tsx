import { Gantt, type GanttTask } from '@bluemillstudio/gantt';

// Wrap the chart in a `.dark` ancestor and override the Gantt CSS variables.
// The defaults cover both themes; you only supply what you want different.
const tasks: GanttTask[] = [
  { id: 'a', text: 'Phase 1', start: new Date('2026-05-01'), end: new Date('2026-05-10'),
    duration: 9, progress: 40, parentId: null, type: 'task', open: false,
    $x: 0, $y: 0, $w: 0, $h: 0, $level: 0 },
];

export default function DarkTheme() {
  return (
    <div className="dark">
      <style>{`
        .dark .gantt-container {
          --gantt-weekend-bg: rgb(148 163 184 / 0.08);
          --gantt-holiday-bg: rgb(239 68 68 / 0.18);
          --gantt-critical-color: rgb(252 165 165);
        }
      `}</style>
      <Gantt tasks={tasks} />
    </div>
  );
}
