import { useRef } from 'react';
import { Gantt, type GanttHandle, type GanttTask } from '@bluemillstudio/gantt';

const tasks: GanttTask[] = [
  {
    id: 't1',
    text: 'Design',
    start: new Date('2026-05-01'),
    end: new Date('2026-05-10'),
    duration: 9,
    progress: 30,
    parentId: null,
    type: 'task',
    open: false,
    $x: 0, $y: 0, $w: 0, $h: 0, $level: 0,
  },
];

export default function SnapshotDemo() {
  const handle = useRef<GanttHandle>(null);

  function logSnapshot() {
    const snap = handle.current?.snapshot();
    console.log(JSON.stringify(snap, null, 2));
  }

  return (
    <>
      <button onClick={logSnapshot}>Dump snapshot</button>
      <Gantt ref={handle} tasks={tasks} />
    </>
  );
}
