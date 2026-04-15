import { expect } from 'vitest';
import { dotPath } from './runner';

export interface ProbeContext {
  document: Document | null;
  returnValue: any;
  consoleWarnings: number;
  snapshot?: () => any;
}

/** Execute one probe from a scenario's `then` array. */
export function runProbe(probe: any, ctx: ProbeContext): void {
  const name: string = probe.probe;

  if (name === 'dom.count') {
    const el = ctx.document?.querySelectorAll(probe.selector) ?? [];
    const count = el.length;
    assertComparator(count, probe);
    return;
  }

  if (name === 'dom.attribute') {
    const el = ctx.document?.querySelector(probe.selector);
    const val = el?.getAttribute(probe.attribute);
    assertComparator(val, probe);
    return;
  }

  if (name === 'dom.text') {
    const el = ctx.document?.querySelector(probe.selector);
    const val = el?.textContent?.trim();
    assertComparator(val, probe);
    return;
  }

  if (name === 'console.warnings') {
    assertComparator(ctx.consoleWarnings, probe);
    return;
  }

  if (name === 'handle.validate') {
    const snap = ctx.returnValue;
    expect(snap.ok).toBe(probe.expect?.ok ?? true);
    return;
  }

  if (name.startsWith('handle.snapshot')) {
    const snap = ctx.snapshot?.() ?? ctx.returnValue;
    const path = name === 'handle.snapshot' ? '' : name.slice('handle.snapshot.'.length);
    const v = dotPath(snap, path);
    assertComparator(v, probe);
    return;
  }

  if (name === 'return' || name.startsWith('return.') || name.startsWith('return[')) {
    const path = name === 'return' ? '' : name.replace(/^return\.?/, '');
    const v = dotPath(ctx.returnValue, path);
    assertComparator(v, probe);
    return;
  }

  throw new Error(`Unknown probe: ${name}`);
}

function normalise(v: any): any {
  if (v instanceof Date) return v.toISOString();
  return v;
}

function assertComparator(actual: any, probe: any): void {
  const a = normalise(actual);
  if ('eq' in probe) {
    if (probe.eq === null) expect(a).toBeFalsy();
    else expect(a).toStrictEqual(probe.eq);
    return;
  }
  if ('gte' in probe) {
    expect(Number(a)).toBeGreaterThanOrEqual(probe.gte);
    return;
  }
  if ('gt' in probe) {
    expect(Number(a)).toBeGreaterThan(probe.gt);
    return;
  }
  if ('lte' in probe) {
    expect(Number(a)).toBeLessThanOrEqual(probe.lte);
    return;
  }
  if ('lt' in probe) {
    expect(Number(a)).toBeLessThan(probe.lt);
    return;
  }
  if ('match' in probe) {
    const re = new RegExp(probe.match);
    expect(String(a)).toMatch(re);
    return;
  }
  if ('type' in probe) {
    expect(typeof actual).toBe(probe.type);
    return;
  }
  if ('approx' in probe) {
    expect(Number(a)).toBeCloseTo(probe.approx, 1);
    return;
  }
  if ('contains_object' in probe) {
    expect(actual).toEqual(expect.arrayContaining([expect.objectContaining(probe.contains_object)]));
    return;
  }
  if ('all' in probe) {
    expect(Array.isArray(actual)).toBe(true);
    for (const item of actual) expect(item).toEqual(expect.objectContaining(probe.all));
    return;
  }
  throw new Error(`probe has no known comparator: ${JSON.stringify(probe)}`);
}
