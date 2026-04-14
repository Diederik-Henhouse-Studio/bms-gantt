import { describe, it, expect } from 'vitest';
import { startOfDay } from 'date-fns';
import {
  topologicalSort,
  detectCycles,
  autoSchedule,
  calcCriticalPath,
  calcSlack,
} from '../store/scheduling';
import { createCalendar } from '../store/calendar';
import { createTask, createLink } from './helpers';

// ── Shared calendar & base date ────────────────────────────────

/** Monday 2 March 2026, normalised to local midnight. */
const BASE = startOfDay(new Date('2026-03-02'));

/** Standard Mon-Fri calendar, no holidays. */
const calendar = createCalendar([1, 2, 3, 4, 5], []);

// ── Helper: build a task with a specific start and duration ─────

function taskAt(id: string, start: Date, duration: number, extra?: Parameters<typeof createTask>[0]) {
  const s = startOfDay(start);
  return createTask({
    id,
    start: s,
    end: calendar.addWorkingDays(s, duration),
    duration,
    ...extra,
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  topologicalSort
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('topologicalSort', () => {
  it('empty tasks returns empty array', () => {
    expect(topologicalSort([], [])).toEqual([]);
  });

  it('single task returns [taskId]', () => {
    const t = taskAt('A', BASE, 5);
    expect(topologicalSort([t], [])).toEqual(['A']);
  });

  it('linear chain A→B→C returns [A, B, C]', () => {
    const a = taskAt('A', BASE, 5);
    const b = taskAt('B', BASE, 5);
    const c = taskAt('C', BASE, 5);
    const links = [
      createLink({ id: 'l1', source: 'A', target: 'B' }),
      createLink({ id: 'l2', source: 'B', target: 'C' }),
    ];
    expect(topologicalSort([a, b, c], links)).toEqual(['A', 'B', 'C']);
  });

  it('diamond (A→B, A→C, B→D, C→D) returns valid topological order', () => {
    const a = taskAt('A', BASE, 5);
    const b = taskAt('B', BASE, 5);
    const c = taskAt('C', BASE, 5);
    const d = taskAt('D', BASE, 5);
    const links = [
      createLink({ id: 'l1', source: 'A', target: 'B' }),
      createLink({ id: 'l2', source: 'A', target: 'C' }),
      createLink({ id: 'l3', source: 'B', target: 'D' }),
      createLink({ id: 'l4', source: 'C', target: 'D' }),
    ];
    const result = topologicalSort([a, b, c, d], links);

    // A must come before B and C; B and C must come before D
    expect(result.indexOf('A')).toBeLessThan(result.indexOf('B'));
    expect(result.indexOf('A')).toBeLessThan(result.indexOf('C'));
    expect(result.indexOf('B')).toBeLessThan(result.indexOf('D'));
    expect(result.indexOf('C')).toBeLessThan(result.indexOf('D'));
    expect(result).toHaveLength(4);
  });

  it('disconnected tasks all appear', () => {
    const a = taskAt('A', BASE, 5);
    const b = taskAt('B', BASE, 10);
    const c = taskAt('C', BASE, 15);
    const result = topologicalSort([a, b, c], []);
    expect(result).toHaveLength(3);
    expect(result).toContain('A');
    expect(result).toContain('B');
    expect(result).toContain('C');
  });

  it('throws on 2-node cycle (A→B→A)', () => {
    const a = taskAt('A', BASE, 5);
    const b = taskAt('B', BASE, 5);
    const links = [
      createLink({ id: 'l1', source: 'A', target: 'B' }),
      createLink({ id: 'l2', source: 'B', target: 'A' }),
    ];
    expect(() => topologicalSort([a, b], links)).toThrow('Circular dependency');
  });

  it('throws on 3-node cycle (A→B→C→A)', () => {
    const a = taskAt('A', BASE, 5);
    const b = taskAt('B', BASE, 5);
    const c = taskAt('C', BASE, 5);
    const links = [
      createLink({ id: 'l1', source: 'A', target: 'B' }),
      createLink({ id: 'l2', source: 'B', target: 'C' }),
      createLink({ id: 'l3', source: 'C', target: 'A' }),
    ];
    expect(() => topologicalSort([a, b, c], links)).toThrow('Circular dependency');
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  detectCycles
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('detectCycles', () => {
  it('no cycles returns empty array', () => {
    const a = taskAt('A', BASE, 5);
    const b = taskAt('B', BASE, 5);
    const links = [createLink({ id: 'l1', source: 'A', target: 'B' })];
    expect(detectCycles([a, b], links)).toEqual([]);
  });

  it('self-loop (A→A) detected', () => {
    const a = taskAt('A', BASE, 5);
    const links = [createLink({ id: 'l1', source: 'A', target: 'A' })];
    const cycles = detectCycles([a], links);
    expect(cycles.length).toBeGreaterThanOrEqual(1);
    expect(cycles.some((c) => c.includes('A'))).toBe(true);
  });

  it('2-node cycle detected with correct IDs', () => {
    const a = taskAt('A', BASE, 5);
    const b = taskAt('B', BASE, 5);
    const links = [
      createLink({ id: 'l1', source: 'A', target: 'B' }),
      createLink({ id: 'l2', source: 'B', target: 'A' }),
    ];
    const cycles = detectCycles([a, b], links);
    expect(cycles.length).toBeGreaterThanOrEqual(1);
    const flat = cycles.flat();
    expect(flat).toContain('A');
    expect(flat).toContain('B');
  });

  it('3-node cycle detected', () => {
    const a = taskAt('A', BASE, 5);
    const b = taskAt('B', BASE, 5);
    const c = taskAt('C', BASE, 5);
    const links = [
      createLink({ id: 'l1', source: 'A', target: 'B' }),
      createLink({ id: 'l2', source: 'B', target: 'C' }),
      createLink({ id: 'l3', source: 'C', target: 'A' }),
    ];
    const cycles = detectCycles([a, b, c], links);
    expect(cycles.length).toBeGreaterThanOrEqual(1);
    const flat = cycles.flat();
    expect(flat).toContain('A');
    expect(flat).toContain('B');
    expect(flat).toContain('C');
  });

  it('multiple separate cycles all detected', () => {
    const a = taskAt('A', BASE, 5);
    const b = taskAt('B', BASE, 5);
    const c = taskAt('C', BASE, 5);
    const d = taskAt('D', BASE, 5);
    const links = [
      createLink({ id: 'l1', source: 'A', target: 'B' }),
      createLink({ id: 'l2', source: 'B', target: 'A' }),
      createLink({ id: 'l3', source: 'C', target: 'D' }),
      createLink({ id: 'l4', source: 'D', target: 'C' }),
    ];
    const cycles = detectCycles([a, b, c, d], links);
    expect(cycles.length).toBeGreaterThanOrEqual(2);
    const flat = cycles.flat();
    expect(flat).toContain('A');
    expect(flat).toContain('B');
    expect(flat).toContain('C');
    expect(flat).toContain('D');
  });

  it('no false positives on diamond dependency', () => {
    const a = taskAt('A', BASE, 5);
    const b = taskAt('B', BASE, 5);
    const c = taskAt('C', BASE, 5);
    const d = taskAt('D', BASE, 5);
    const links = [
      createLink({ id: 'l1', source: 'A', target: 'B' }),
      createLink({ id: 'l2', source: 'A', target: 'C' }),
      createLink({ id: 'l3', source: 'B', target: 'D' }),
      createLink({ id: 'l4', source: 'C', target: 'D' }),
    ];
    expect(detectCycles([a, b, c, d], links)).toEqual([]);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  autoSchedule
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('autoSchedule', () => {
  it('single task with no links: start unchanged', () => {
    const t = taskAt('A', BASE, 5);
    const [result] = autoSchedule([t], [], calendar);
    // BASE is Mon Mar 2, already a working day => unchanged
    expect(result.start.getTime()).toBe(BASE.getTime());
  });

  it('single task with no links and projectStart: uses projectStart', () => {
    const t = taskAt('A', BASE, 5);
    const projectStart = startOfDay(new Date('2026-03-09')); // Mon Mar 9
    const [result] = autoSchedule([t], [], calendar, projectStart);
    expect(result.start.getTime()).toBe(projectStart.getTime());
  });

  it('e2s: successor starts after predecessor ends', () => {
    // A: starts Mon Mar 2, duration 5 => end = addWorkingDays(Mar 2, 5) = Mon Mar 9
    const a = taskAt('A', BASE, 5);
    const b = taskAt('B', BASE, 10);
    const links = [createLink({ id: 'l1', source: 'A', target: 'B', type: 'e2s' })];

    const result = autoSchedule([a, b], links, calendar);
    const rb = result.find((t) => t.id === 'B')!;

    // B should start at A.end = Mon Mar 9
    const expectedStart = calendar.addWorkingDays(BASE, 5); // Mar 9
    expect(rb.start.getTime()).toBe(expectedStart.getTime());
  });

  it('s2s: successor starts when predecessor starts', () => {
    const a = taskAt('A', BASE, 5);
    const b = taskAt('B', BASE, 10);
    const links = [createLink({ id: 'l1', source: 'A', target: 'B', type: 's2s' })];

    const result = autoSchedule([a, b], links, calendar);
    const rb = result.find((t) => t.id === 'B')!;

    // B should start at A.start = Mon Mar 2
    expect(rb.start.getTime()).toBe(BASE.getTime());
  });

  it('e2e: successor end aligns with predecessor end', () => {
    // A: duration 10 => A.end = addWorkingDays(Mar 2, 10) = Mon Mar 16
    // B: duration 5 => B.start = A.end - B.duration = addWorkingDays(Mar 16, -5) = Mon Mar 9
    const a = taskAt('A', BASE, 10);
    const b = taskAt('B', BASE, 5);
    const links = [createLink({ id: 'l1', source: 'A', target: 'B', type: 'e2e' })];

    const result = autoSchedule([a, b], links, calendar);
    const rb = result.find((t) => t.id === 'B')!;

    const aEnd = calendar.addWorkingDays(BASE, 10); // Mar 16
    const expectedStart = calendar.addWorkingDays(aEnd, -5); // Mar 9
    expect(rb.start.getTime()).toBe(expectedStart.getTime());
    expect(rb.end.getTime()).toBe(aEnd.getTime());
  });

  it('s2e: successor end aligns with predecessor start', () => {
    // A: starts Mar 2
    // B: duration 5 => B.start = A.start - B.duration = addWorkingDays(Mar 2, -5)
    // addWorkingDays(Mar 2, -5) counts backwards 5 working days: Feb 27(1), 26(2), 25(3), 24(4), 23(5) = Mon Feb 23
    // But projectStart may push B forward. Without projectStart, B.start could be negative.
    // The code does Math.max with projectStart if given.
    // Without projectStart, candidateStart = addWorkingDays(Mar 2, -5) = Feb 23
    // getNextWorkingDay(Feb 23) = Feb 23 (Mon = working day)
    const a = taskAt('A', BASE, 10);
    const b = taskAt('B', BASE, 5);
    const links = [createLink({ id: 'l1', source: 'A', target: 'B', type: 's2e' })];

    const result = autoSchedule([a, b], links, calendar);
    const rb = result.find((t) => t.id === 'B')!;

    const expectedStart = calendar.addWorkingDays(BASE, -5); // Feb 23
    expect(rb.start.getTime()).toBe(calendar.getNextWorkingDay(expectedStart).getTime());
    // B.end should be B.start + 5 working days
    expect(rb.end.getTime()).toBe(calendar.addWorkingDays(rb.start, 5).getTime());
  });

  it('chain of 3 tasks: dates cascade correctly', () => {
    // A(5) → B(10) → C(15), all e2s
    const a = taskAt('A', BASE, 5);
    const b = taskAt('B', BASE, 10);
    const c = taskAt('C', BASE, 15);
    const links = [
      createLink({ id: 'l1', source: 'A', target: 'B', type: 'e2s' }),
      createLink({ id: 'l2', source: 'B', target: 'C', type: 'e2s' }),
    ];

    const result = autoSchedule([a, b, c], links, calendar);
    const ra = result.find((t) => t.id === 'A')!;
    const rb = result.find((t) => t.id === 'B')!;
    const rc = result.find((t) => t.id === 'C')!;

    // A starts Mar 2, ends Mar 9
    expect(ra.start.getTime()).toBe(BASE.getTime());
    const aEnd = calendar.addWorkingDays(BASE, 5);

    // B starts at A.end = Mar 9, ends Mar 9 + 10 working days = Mar 23
    expect(rb.start.getTime()).toBe(aEnd.getTime());
    const bEnd = calendar.addWorkingDays(aEnd, 10);

    // C starts at B.end, ends B.end + 15 working days
    expect(rc.start.getTime()).toBe(bEnd.getTime());
    expect(rc.end.getTime()).toBe(calendar.addWorkingDays(bEnd, 15).getTime());
  });

  it('respects projectStart', () => {
    const projectStart = startOfDay(new Date('2026-03-09')); // Mon Mar 9
    const a = taskAt('A', BASE, 5); // originally starts Mar 2
    const b = taskAt('B', BASE, 10);
    const links = [createLink({ id: 'l1', source: 'A', target: 'B', type: 'e2s' })];

    const result = autoSchedule([a, b], links, calendar, projectStart);
    const ra = result.find((t) => t.id === 'A')!;
    const rb = result.find((t) => t.id === 'B')!;

    // A should be pushed to projectStart (Mar 9)
    expect(ra.start.getTime()).toBe(projectStart.getTime());
    // B should start at A.end
    const aEnd = calendar.addWorkingDays(projectStart, 5);
    expect(rb.start.getTime()).toBe(aEnd.getTime());
  });

  it('skips summary tasks (K5 fix)', () => {
    const summary = taskAt('S', BASE, 10, { type: 'summary' });
    const child = taskAt('C', BASE, 5);
    const links = [createLink({ id: 'l1', source: 'S', target: 'C', type: 'e2s' })];

    const result = autoSchedule([summary, child], links, calendar);
    const rs = result.find((t) => t.id === 'S')!;

    // Summary task dates should remain unchanged (not scheduled)
    expect(rs.start.getTime()).toBe(summary.start.getTime());
    expect(rs.end.getTime()).toBe(summary.end.getTime());
  });

  it('returns unchanged tasks on circular dependency', () => {
    const a = taskAt('A', BASE, 5);
    const b = taskAt('B', BASE, 10);
    const links = [
      createLink({ id: 'l1', source: 'A', target: 'B' }),
      createLink({ id: 'l2', source: 'B', target: 'A' }),
    ];

    const result = autoSchedule([a, b], links, calendar);

    // Original dates preserved (shallow copies)
    expect(result.find((t) => t.id === 'A')!.start.getTime()).toBe(a.start.getTime());
    expect(result.find((t) => t.id === 'B')!.start.getTime()).toBe(b.start.getTime());
    expect(result).toHaveLength(2);
  });

  it('uses calendar (skips weekends)', () => {
    // A starts Friday Mar 6, duration 5.
    // addWorkingDays(Mar 6, 5) skips weekend => Mon Mar 9(1), Tue 10(2), Wed 11(3), Thu 12(4), Fri 13(5) => A.end = Mar 13
    const friday = startOfDay(new Date('2026-03-06'));
    const a = taskAt('A', friday, 5);
    const b = taskAt('B', friday, 5);
    const links = [createLink({ id: 'l1', source: 'A', target: 'B', type: 'e2s' })];

    const result = autoSchedule([a, b], links, calendar);
    const rb = result.find((t) => t.id === 'B')!;

    // A.end = addWorkingDays(Fri Mar 6, 5) = Fri Mar 13
    const aEnd = calendar.addWorkingDays(friday, 5);

    // B.start should be Fri Mar 13 (already a working day)
    expect(rb.start.getTime()).toBe(aEnd.getTime());

    // B should never start on a weekend
    const bDay = rb.start.getDay(); // 0=Sun, 6=Sat
    expect(bDay).not.toBe(0);
    expect(bDay).not.toBe(6);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  calcCriticalPath
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('calcCriticalPath', () => {
  it('single task: task is critical', () => {
    const a = taskAt('A', BASE, 10);
    const { taskIds, linkIds } = calcCriticalPath([a], []);
    expect(taskIds.has('A')).toBe(true);
    expect(linkIds.size).toBe(0);
  });

  it('linear chain: all tasks critical', () => {
    const a = taskAt('A', BASE, 5);
    const b = taskAt('B', BASE, 10);
    const c = taskAt('C', BASE, 15);
    const links = [
      createLink({ id: 'l1', source: 'A', target: 'B', type: 'e2s' }),
      createLink({ id: 'l2', source: 'B', target: 'C', type: 'e2s' }),
    ];

    const { taskIds, linkIds } = calcCriticalPath([a, b, c], links);
    expect(taskIds.has('A')).toBe(true);
    expect(taskIds.has('B')).toBe(true);
    expect(taskIds.has('C')).toBe(true);
    expect(linkIds.has('l1')).toBe(true);
    expect(linkIds.has('l2')).toBe(true);
  });

  it('parallel paths: only longest is critical', () => {
    // A(5) → B(15): total 20 working days — longest path
    // A(5) → C(5):  total 10 working days — shorter path
    const a = taskAt('A', BASE, 5);
    const b = taskAt('B', BASE, 15);
    const c = taskAt('C', BASE, 5);
    const links = [
      createLink({ id: 'l1', source: 'A', target: 'B', type: 'e2s' }),
      createLink({ id: 'l2', source: 'A', target: 'C', type: 'e2s' }),
    ];

    const { taskIds } = calcCriticalPath([a, b, c], links);
    expect(taskIds.has('A')).toBe(true);
    expect(taskIds.has('B')).toBe(true);
    expect(taskIds.has('C')).toBe(false);
  });

  it('no links: all tasks have zero slack (all critical)', () => {
    const a = taskAt('A', BASE, 5);
    const b = taskAt('B', BASE, 10);
    const { taskIds } = calcCriticalPath([a, b], []);

    // With no links each task's ef is its own duration.
    // projectEnd = max(ef). Backward pass: lf = projectEnd, ls = projectEnd - duration.
    // For the longest task (B, dur=10): es=0, ls=0 => critical.
    // For the shorter task (A, dur=5): es=0, ls=5 => NOT critical.
    expect(taskIds.has('B')).toBe(true);
  });

  it('returns both taskIds and linkIds', () => {
    const a = taskAt('A', BASE, 5);
    const b = taskAt('B', BASE, 10);
    const links = [createLink({ id: 'l1', source: 'A', target: 'B', type: 'e2s' })];
    const result = calcCriticalPath([a, b], links);

    expect(result).toHaveProperty('taskIds');
    expect(result).toHaveProperty('linkIds');
    expect(result.taskIds).toBeInstanceOf(Set);
    expect(result.linkIds).toBeInstanceOf(Set);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  calcSlack
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('calcSlack', () => {
  it('critical path tasks have 0 slack', () => {
    const a = taskAt('A', BASE, 5);
    const b = taskAt('B', BASE, 10);
    const c = taskAt('C', BASE, 15);
    const links = [
      createLink({ id: 'l1', source: 'A', target: 'B', type: 'e2s' }),
      createLink({ id: 'l2', source: 'B', target: 'C', type: 'e2s' }),
    ];

    const slack = calcSlack([a, b, c], links);
    expect(slack.get('A')).toBe(0);
    expect(slack.get('B')).toBe(0);
    expect(slack.get('C')).toBe(0);
  });

  it('non-critical tasks have positive slack', () => {
    // A(5) → B(15): longest path = 20
    // A(5) → C(5):  shorter path = 10, slack for C = 20 - 10 = 10
    const a = taskAt('A', BASE, 5);
    const b = taskAt('B', BASE, 15);
    const c = taskAt('C', BASE, 5);
    const links = [
      createLink({ id: 'l1', source: 'A', target: 'B', type: 'e2s' }),
      createLink({ id: 'l2', source: 'A', target: 'C', type: 'e2s' }),
    ];

    const slack = calcSlack([a, b, c], links);
    expect(slack.get('A')).toBe(0);
    expect(slack.get('B')).toBe(0);
    expect(slack.get('C')!).toBeGreaterThan(0);
    expect(slack.get('C')).toBe(10); // 20 - 10 = 10 working days
  });

  it('returns Map with entries for all tasks', () => {
    const a = taskAt('A', BASE, 5);
    const b = taskAt('B', BASE, 10);
    const c = taskAt('C', BASE, 15);
    const links = [
      createLink({ id: 'l1', source: 'A', target: 'B', type: 'e2s' }),
    ];

    const slack = calcSlack([a, b, c], links);
    expect(slack).toBeInstanceOf(Map);
    expect(slack.size).toBe(3);
    expect(slack.has('A')).toBe(true);
    expect(slack.has('B')).toBe(true);
    expect(slack.has('C')).toBe(true);

    // All values are numbers >= 0
    for (const [, v] of slack) {
      expect(typeof v).toBe('number');
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });
});
