import { Gantt, type GanttTask, type GanttLabels } from '@bluemillstudio/gantt';

const dutch: Partial<GanttLabels> = {
  today: 'Vandaag',
  zoomIn: 'Inzoomen',
  zoomOut: 'Uitzoomen',
  save: 'Opslaan',
  cancel: 'Annuleren',
  delete: 'Verwijderen',
  editTask: 'Taak bewerken',
  zoomLevels: {
    minutes: 'Minuten',
    hours: 'Uren',
    days: 'Dagen',
    weeks: 'Weken',
    months: 'Maanden',
    quarters: 'Kwartalen',
    years: 'Jaren',
  },
};

const tasks: GanttTask[] = [
  { id: 't1', text: 'Taak 1',
    start: new Date('2026-05-01'), end: new Date('2026-05-10'),
    duration: 9, progress: 0, parentId: null, type: 'task', open: false,
    $x: 0, $y: 0, $w: 0, $h: 0, $level: 0 },
];

export default function DutchLocale() {
  return <Gantt tasks={tasks} labels={dutch} />;
}
