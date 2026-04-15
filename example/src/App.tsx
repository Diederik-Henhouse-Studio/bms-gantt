import { useRef, useState, useMemo } from 'react';
import {
  Gantt,
  type GanttHandle,
  type GanttTask,
  type GanttLink,
  type GanttMarker,
} from '@bluemillstudio/gantt';

function mkTask(t: Partial<GanttTask> & { id: string; text: string; start: Date; end: Date }): GanttTask {
  return {
    progress: 0,
    parentId: null,
    type: 'task',
    open: true,
    duration: Math.max(1, Math.round((t.end.getTime() - t.start.getTime()) / 86_400_000)),
    $x: 0, $y: 0, $w: 0, $h: 0, $level: 0,
    ...t,
  };
}

const today = new Date();
const d = (offset: number) => new Date(today.getTime() + offset * 86_400_000);

const TASKS: GanttTask[] = [
  mkTask({ id: 'root', text: 'Product launch', start: d(-5), end: d(40), type: 'summary', progress: 30 }),
  mkTask({ id: 'design', text: 'Design phase', start: d(-5), end: d(7), progress: 75, parentId: 'root', taskCategory: 'f1' }),
  mkTask({ id: 'impl',   text: 'Implementation', start: d(7), end: d(25), progress: 40, parentId: 'root', taskCategory: 'f2',
    baseStart: d(5), baseEnd: d(20) }),
  mkTask({ id: 'qa',     text: 'QA',             start: d(25), end: d(33), progress: 0, parentId: 'root', taskCategory: 'inspectie' }),
  mkTask({ id: 'launch', text: 'Launch',         start: d(33), end: d(33), type: 'milestone', parentId: 'root' }),
  mkTask({ id: 'retro',  text: 'Retrospective',  start: d(36), end: d(40), progress: 0, status: 'paused', parentId: 'root' }),
];

const LINKS: GanttLink[] = [
  { id: 'l1', source: 'design', target: 'impl', type: 'e2s' },
  { id: 'l2', source: 'impl', target: 'qa', type: 'e2s' },
  { id: 'l3', source: 'qa', target: 'launch', type: 'e2s' },
  { id: 'l4', source: 'launch', target: 'retro', type: 'e2s' },
];

const MARKERS: GanttMarker[] = [
  { id: 'board', date: d(14), label: 'Board review', color: 'orange', dashed: true },
];

export function App() {
  const handle = useRef<GanttHandle>(null);
  const [dark, setDark] = useState(false);
  const [showBaselines, setShowBaselines] = useState(true);
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [snapshot, setSnapshot] = useState<string>('');

  const computedFields = useMemo(
    () => [
      { key: 'risk', compute: (t: GanttTask) => (t.slack ?? Infinity) < 2 ? 'high' : 'low' },
      { key: 'weekFromNow', compute: (t: GanttTask) =>
        Math.round((t.start.getTime() - today.getTime()) / 86_400_000 / 7) },
    ],
    [],
  );

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen p-6 flex flex-col gap-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">@bluemillstudio/gantt example</h1>
            <p className="text-sm text-muted-foreground">
              Showcasing slots, theming, introspection, and computation layers.
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <button
              onClick={() => setDark((x) => !x)}
              className="px-3 py-1.5 rounded border hover:bg-accent"
            >
              {dark ? '☀ Light' : '🌙 Dark'}
            </button>
            <label className="flex items-center gap-1 px-3 py-1.5 rounded border">
              <input type="checkbox" checked={showCriticalPath} onChange={(e) => setShowCriticalPath(e.target.checked)} />
              Critical path
            </label>
            <label className="flex items-center gap-1 px-3 py-1.5 rounded border">
              <input type="checkbox" checked={showBaselines} onChange={(e) => setShowBaselines(e.target.checked)} />
              Baselines
            </label>
            <button
              onClick={() => {
                const snap = handle.current?.snapshot();
                setSnapshot(JSON.stringify(snap, null, 2));
              }}
              className="px-3 py-1.5 rounded border hover:bg-accent"
            >
              📸 Snapshot
            </button>
          </div>
        </header>

        <div className="h-[520px] gantt-container">
          <Gantt
            ref={handle}
            tasks={TASKS}
            links={LINKS}
            markers={MARKERS}
            config={{
              showCriticalPath,
              showBaselines,
              showSlack: true,
              holidays: [d(10)],
            }}
            computedFields={computedFields}
          />
        </div>

        {snapshot && (
          <details className="text-xs" open>
            <summary className="cursor-pointer font-medium">Introspection snapshot (handle.snapshot())</summary>
            <pre className="mt-2 p-3 rounded bg-muted overflow-auto max-h-[40vh]">{snapshot}</pre>
          </details>
        )}
      </div>
    </div>
  );
}
