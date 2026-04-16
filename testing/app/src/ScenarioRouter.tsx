import { useRef, useMemo } from 'react';
import { Gantt, type GanttHandle } from '@bluemillstudio/gantt';
import { SCENARIOS } from './scenarios';

export function ScenarioRouter() {
  const params = new URLSearchParams(window.location.search);
  const scenarioId = params.get('scenario');
  const handle = useRef<GanttHandle>(null);

  const scenario = useMemo(
    () => SCENARIOS.find((s) => s.id === scenarioId),
    [scenarioId],
  );

  // Expose handle globally so Playwright and Crawl4AI can call it.
  (window as any).__gantt = handle.current;

  // Index page: list all scenarios as links.
  if (!scenario) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-xl font-bold mb-4">Visual Test Scenarios</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Click a scenario to render it. Playwright visits each automatically.
        </p>
        <ul className="space-y-2">
          {SCENARIOS.map((s) => (
            <li key={s.id}>
              <a
                href={`?scenario=${s.id}`}
                className="text-blue-600 hover:underline"
                data-scenario-id={s.id}
              >
                <strong>{s.id}</strong> — {s.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="px-4 py-2 border-b text-sm flex justify-between items-center">
        <div>
          <strong data-testid="scenario-title">{scenario.id}</strong>
          <span className="text-muted-foreground ml-2">{scenario.title}</span>
        </div>
        <a href="/" className="text-blue-600 hover:underline text-xs">← all scenarios</a>
      </header>
      <div className="flex-1 p-2" data-testid="gantt-container">
        <Gantt
          ref={handle}
          tasks={scenario.tasks}
          links={scenario.links}
          markers={scenario.markers}
          config={scenario.config}
        />
      </div>
    </div>
  );
}
