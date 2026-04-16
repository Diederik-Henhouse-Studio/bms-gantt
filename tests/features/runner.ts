import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, '../..');
const FEATURES = resolve(ROOT, 'docs/features');

export interface Scenario {
  id: string;
  purpose?: string;
  tags?: string[];
  setup?: {
    fixtures?: Record<string, any>;
    tasks?: any[];
    links?: any[];
    markers?: any[];
    config?: any;
    labels?: any;
    seed_store?: any;
  };
  when: {
    kind: string;
    module?: string;
    fn?: string;
    args?: any[];
    method?: string;
    target?: string;
    key?: string;
    steps?: any[];
    then_method?: string;
    then_args?: any[];
  };
  then: Array<{ probe: string; [k: string]: any }>;
  featureSlug: string;
  sourceFile: string;
}

export function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (entry === 'scenarios.yaml') out.push(full);
  }
  return out;
}

export function loadAllScenarios(): Scenario[] {
  const out: Scenario[] = [];
  for (const file of walk(FEATURES).filter((f) => !f.includes('/_template/'))) {
    const docs = YAML.parse(readFileSync(file, 'utf8'));
    if (!Array.isArray(docs)) continue;
    const slug = relative(FEATURES, file).split('/')[0];
    for (const s of docs) {
      out.push({ ...(s as any), featureSlug: slug, sourceFile: file });
    }
  }
  return out;
}

/**
 * Resolve a YAML value that may contain references or interpolations.
 * Supported shapes:
 *   - `{ ref: 'task_a' }` → fixtures.task_a
 *   - strings starting with `__REL_DAYS__:N` → ISO string N days from today
 *   - arrow-function strings `'t => t.progress >= 100'` → eval'd Function
 */
export function resolve_(value: any, fixtures: Record<string, any>): any {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map((v) => resolve_(v, fixtures));
  if (typeof value === 'object') {
    if ('ref' in value && typeof value.ref === 'string') {
      const f = fixtures[value.ref];
      if (!f) throw new Error(`unknown fixture ref: ${value.ref}`);
      return hydrateFixture(f);
    }
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = resolve_(v, fixtures);
    return out;
  }
  if (typeof value === 'string') {
    if (value.startsWith('__REL_DAYS__:')) {
      const n = Number(value.slice('__REL_DAYS__:'.length));
      const d = new Date();
      d.setDate(d.getDate() + n);
      return d;
    }
    // ISO-8601 date-times — common in our YAML fixtures.
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return new Date(value);
    }
    // Arrow-function literal (contains =>)
    if (/=>/.test(value)) {
      try {
        // eslint-disable-next-line no-new-func
        return new Function(`return (${value})`)();
      } catch {
        return value;
      }
    }
  }
  return value;
}

/** Convert fixture objects with ISO date strings into GanttTask-shaped objects. */
function hydrateFixture(f: any): any {
  if (!f || typeof f !== 'object') return f;
  if (Array.isArray(f)) return f.map(hydrateFixture);
  const out: any = { ...f };
  for (const k of ['start', 'end', 'baseStart', 'baseEnd', 'date']) {
    if (typeof out[k] === 'string') out[k] = new Date(out[k]);
  }
  // Hydrate nested arrays (e.g. config.holidays)
  if (Array.isArray(out.holidays)) {
    out.holidays = out.holidays.map((h: any) => (typeof h === 'string' ? new Date(h) : h));
  }
  // Defaults expected on GanttTask so compute fields don't choke.
  if ('id' in out || 'text' in out) {
    out.progress = out.progress ?? 0;
    out.duration = out.duration ?? 0;
    out.parentId = 'parentId' in out ? out.parentId : null;
    out.type = out.type ?? 'task';
    out.open = out.open ?? false;
    out.$x = out.$x ?? 0; out.$y = out.$y ?? 0; out.$w = out.$w ?? 0;
    out.$h = out.$h ?? 0; out.$level = out.$level ?? 0;
  }
  return out;
}

/** Hydrate `setup.tasks` / `setup.fixtures` / `setup.args` and the like. */
export function prepareSetup(s: Scenario): { fixtures: Record<string, any>; tasks: any[]; links: any[]; markers: any[]; config: any; labels: any } {
  const fixtures = s.setup?.fixtures ?? {};
  for (const key of Object.keys(fixtures)) fixtures[key] = hydrateFixture(fixtures[key]);
  const mapDates = (arr: any[] | undefined) => (arr ?? []).map(hydrateFixture);
  return {
    fixtures,
    tasks: mapDates(s.setup?.tasks),
    links: s.setup?.links ?? [],
    markers: mapDates(s.setup?.markers),
    config: hydrateFixture(s.setup?.config ?? {}),
    labels: s.setup?.labels,
  };
}

/** Dot-path walker tolerant of array indices like `bars[0].taskId`. */
export function dotPath(obj: any, path: string): any {
  if (!path) return obj;
  const parts = path.replace(/\[(\-?\d+)\]/g, '.$1').split('.').filter(Boolean);
  let cur: any = obj;
  for (const part of parts) {
    if (cur == null) return undefined;
    if (/^-?\d+$/.test(part)) {
      const n = Number(part);
      const idx = n < 0 && Array.isArray(cur) ? cur.length + n : n;
      cur = Array.isArray(cur) ? cur[idx] : undefined;
    } else {
      cur = cur[part];
    }
  }
  return cur;
}
