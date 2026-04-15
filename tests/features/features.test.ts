import { describe, it, beforeEach, afterEach, vi } from 'vitest';
import { loadAllScenarios, prepareSetup, resolve_ } from './runner';
import { runProbe, type ProbeContext } from './probes';

const scenarios = loadAllScenarios();
const grouped: Record<string, typeof scenarios> = {};
for (const s of scenarios) {
  (grouped[s.featureSlug] ??= []).push(s);
}

// Kinds we can execute today. The rest are registered as skipped so
// visibility of the gap is preserved.
const SUPPORTED_KINDS = new Set(['unit-call']);

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
    });

    for (const s of list) {
      const title = `${s.id}: ${s.purpose ?? ''}`.trim();

      if (!SUPPORTED_KINDS.has(s.when.kind)) {
        it.skip(`[${s.when.kind}] ${title}`, () => {});
        continue;
      }

      it(title, async () => {
        const setup = prepareSetup(s);
        let returnValue: any = undefined;

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

        const ctx: ProbeContext = {
          document: null,
          returnValue,
          consoleWarnings: warnings,
        };
        for (const probe of s.then ?? []) {
          // Refresh warning count in case the call produced warnings after the probe spun up.
          ctx.consoleWarnings = warnings;
          runProbe(probe, ctx);
        }
      });
    }
  });
}

function dotOn(obj: any, path: string): any {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) cur = cur?.[p];
  return cur;
}
