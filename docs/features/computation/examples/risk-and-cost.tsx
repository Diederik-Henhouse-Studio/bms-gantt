import { Gantt, type GanttTask } from '@bluemillstudio/gantt';

const tasks: GanttTask[] = [
  { id: 'a', text: 'A', start: new Date('2026-05-01'), end: new Date('2026-05-05'),
    duration: 4, progress: 20, parentId: null, type: 'task', open: false,
    $x: 0, $y: 0, $w: 0, $h: 0, $level: 0 },
];

export default function RiskAndCost() {
  return (
    <Gantt
      tasks={tasks}
      config={{ showSlack: true }}
      computedFields={[
        { key: 'risk', compute: (t) => (t.slack ?? Infinity) < 2 ? 'high' : 'low' },
        { key: 'cost', compute: (t) => 1200 * t.duration },
      ]}
      summaryAggregators={{
        totalCost: (kids) => kids.reduce((s, c) => s + Number(c.$computed?.cost ?? 0), 0),
      }}
    />
  );
}
