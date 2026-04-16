import { describe, it, beforeEach, afterEach, vi } from 'vitest';
import React, { createRef } from 'react';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { loadAllScenarios, prepareSetup, resolve_, dotPath } from './runner';
import { runProbe, type ProbeContext } from './probes';

// Lazy-load the library so vitest aliases kick in.
const libImport = () => import('@bluemillstudio/gantt');

const scenarios = loadAllScenarios();
const grouped: Record<string, typeof scenarios> = {};
for (const s of scenarios) {
  (grouped[s.featureSlug] ??= []).push(s);
}

const SUPPORTED_KINDS = new Set([
  'unit-call',
  'render',
  'handle-method',
  'keydown',
  'hover',
  'sequence',
]);

for (const [slug, list] of Object.entries(grouped)) {
  describe(`feature: ${slug}`, () => {
    let warnings = 0;
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      warnings = 0;
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { warnings++; });
    });
    afterEach(() => {
      warnSpy.mockRestore();
      cleanup();
    });

    for (const s of list) {
      const title = `${s.id}: ${s.purpose ?? ''}`.trim();

      if (!SUPPORTED_KINDS.has(s.when.kind) || (s as any).skip_runner) {
        it.skip(`[${s.when.kind}] ${title}`, () => {});
        continue;
      }

      // Scenarios that need slots fixtures, seed-store, or test features that
      // jsdom cannot exercise (SVG foreignObject rendering, complex Tailwind selectors).
      if (
        (s.setup as any)?.slots_fixture ||
        (s.setup as any)?.seed_store ||
        (s as any).skip_runner
      ) {
        it.skip(`[needs-fixture/browser] ${title}`, () => {});
        continue;
      }

      it(title, async () => {
        const setup = prepareSetup(s);
        let returnValue: any = undefined;
        let doc: Document | null = null;
        let snapshotFn: (() => any) | undefined = undefined;

        // ── unit-call ─────────────────────────────────────────
        if (s.when.kind === 'unit-call') {
          const mod = await import(s.when.module!);
          const fn = dotOn(mod, s.when.fn!);
          const args = (s.when.args ?? []).map((a) => resolve_(a, setup.fixtures));
          returnValue = typeof fn === 'function' ? fn(...args) : fn;
          if (s.when.then_method && returnValue != null && typeof returnValue[s.when.then_method] === 'function') {
            const chainedArgs = (s.when.then_args ?? []).map((a) => resolve_(a, setup.fixtures));
            returnValue = returnValue[s.when.then_method](...chainedArgs);
          }
        }

        // ── render / handle-method / keydown / hover ──────────
        if (['render', 'handle-method', 'keydown', 'hover', 'sequence'].includes(s.when.kind)) {
          const result = await mountGantt(setup, s);
          doc = result.doc;
          snapshotFn = result.snapshot;

          if (s.when.kind === 'handle-method') {
            const handle = result.handle;
            const method = s.when.method!;
            const args = (s.when.args ?? []).map((a) => resolve_(a, setup.fixtures));
            // Try the handle first, then fall back to the store.
            if (handle && typeof (handle as any)[method] === 'function') {
              returnValue = (handle as any)[method](...args);
            } else {
              const { useGanttStore } = await import('@bluemillstudio/gantt/store');
              const storeState = useGanttStore.getState() as any;
              if (typeof storeState[method] === 'function') {
                act(() => { returnValue = storeState[method](...args); });
                // Re-read snapshot after mutation
                snapshotFn = () => handle?.snapshot?.();
              }
            }
          }

          if (s.when.kind === 'keydown') {
            const target = doc?.querySelector('.gantt-container') ?? doc?.body;
            if (target) {
              act(() => {
                fireEvent.keyDown(target, { key: s.when.key ?? 'Delete' });
              });
            }
          }

          if (s.when.kind === 'hover') {
            const target = doc?.querySelector(s.when.target ?? '[data-gantt-role="task-bar"]');
            if (target) {
              act(() => { fireEvent.mouseEnter(target); });
            }
          }

          if (s.when.kind === 'sequence') {
            const handle = result.handle;
            const { useGanttStore } = await import('@bluemillstudio/gantt/store');
            for (const step of s.when.steps ?? []) {
              if (step.kind === 'handle-method') {
                const args = (step.args ?? []).map((a: any) => resolve_(a, setup.fixtures));
                if (handle && typeof (handle as any)[step.method] === 'function') {
                  returnValue = (handle as any)[step.method](...args);
                } else {
                  const st = useGanttStore.getState() as any;
                  if (typeof st[step.method] === 'function') {
                    act(() => { returnValue = st[step.method](...args); });
                  }
                }
              }
            }
            snapshotFn = () => handle?.snapshot?.();
          }
        }

        // ── probes ────────────────────────────────────────────
        const ctx: ProbeContext = {
          document: doc,
          returnValue,
          consoleWarnings: warnings,
          snapshot: snapshotFn,
        };
        for (const probe of s.then ?? []) {
          ctx.consoleWarnings = warnings;
          runProbe(probe, ctx);
        }
      });
    }
  });
}

// ── Helpers ────────────────────────────────────────────────────

function dotOn(obj: any, path: string): any {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) cur = cur?.[p];
  return cur;
}

async function mountGantt(
  setup: ReturnType<typeof prepareSetup>,
  scenario: (typeof scenarios)[number],
) {
  const { Gantt } = await libImport();
  const handleRef = createRef<any>();

  const tasks = setup.tasks.length > 0 ? setup.tasks : [];
  const links = setup.links;
  const markers = setup.markers;

  // Seed store directly if scenario asks for it (e.g. negative-width tests).
  if (scenario.setup?.seed_store) {
    const { useGanttStore } = await import('@bluemillstudio/gantt/store');
    const seeded = { ...scenario.setup.seed_store };
    // Hydrate dates in seeded flatTasks
    if (Array.isArray(seeded.flatTasks)) {
      seeded.flatTasks = seeded.flatTasks.map((t: any) => {
        const out = { ...t };
        for (const k of ['start', 'end', 'baseStart', 'baseEnd']) {
          if (typeof out[k] === 'string') out[k] = new Date(out[k]);
        }
        return out;
      });
    }
    useGanttStore.setState(seeded);
  }

  let container: HTMLElement;
  act(() => {
    const result = render(
      React.createElement(Gantt, {
        ref: handleRef,
        tasks,
        links,
        markers,
        config: setup.config,
        labels: setup.labels,
      } as any),
    );
    container = result.container;
  });

  return {
    doc: container!.ownerDocument,
    handle: handleRef.current,
    snapshot: () => handleRef.current?.snapshot?.(),
  };
}
