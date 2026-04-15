import { describe, it, expect } from 'vitest';
import { filterTasks, sortTasks, groupTasksBy } from '../query';
import { createTask } from './helpers';

function t(id: string, over: Partial<Parameters<typeof createTask>[0]> = {}) {
  return createTask({ id, ...over });
}

describe('filterTasks', () => {
  const a = t('a', { text: 'Alpha', progress: 20, status: 'active' });
  const b = t('b', { text: 'Beta', progress: 80, status: 'completed' });
  const c = t('c', { text: 'Gamma', progress: 0, status: 'paused', critical: true });

  it('filters by text (case-insensitive substring)', () => {
    expect(filterTasks([a, b, c], { text: 'alp' })).toEqual([a]);
  });

  it('filters by status (single or array)', () => {
    expect(filterTasks([a, b, c], { status: 'active' })).toEqual([a]);
    expect(filterTasks([a, b, c], { status: ['active', 'paused'] })).toEqual([a, c]);
  });

  it('filters by progress range', () => {
    expect(filterTasks([a, b, c], { progressGte: 50 })).toEqual([b]);
    expect(filterTasks([a, b, c], { progressLte: 20 })).toEqual([a, c]);
  });

  it('filters by critical', () => {
    expect(filterTasks([a, b, c], { critical: true })).toEqual([c]);
  });

  it('filters by overlaps range', () => {
    const x = t('x', { start: new Date('2026-05-01'), end: new Date('2026-05-10') });
    const y = t('y', { start: new Date('2026-06-01'), end: new Date('2026-06-10') });
    const r = filterTasks([x, y], {
      overlaps: { start: new Date('2026-05-05'), end: new Date('2026-05-20') },
    });
    expect(r).toEqual([x]);
  });

  it('supports custom where predicate', () => {
    expect(filterTasks([a, b, c], { where: (t) => t.text.startsWith('A') })).toEqual([a]);
  });
});

describe('sortTasks', () => {
  it('sorts by single key ascending', () => {
    const tasks = [t('a', { progress: 50 }), t('b', { progress: 10 }), t('c', { progress: 90 })];
    const sorted = sortTasks(tasks, 'progress');
    expect(sorted.map((x) => x.id)).toEqual(['b', 'a', 'c']);
  });

  it('supports desc direction', () => {
    const tasks = [t('a', { progress: 50 }), t('b', { progress: 10 })];
    const sorted = sortTasks(tasks, { by: 'progress', dir: 'desc' });
    expect(sorted.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('supports multi-key sort', () => {
    const tasks = [
      t('a', { text: 'X', progress: 50 }),
      t('b', { text: 'Y', progress: 50 }),
      t('c', { text: 'X', progress: 10 }),
    ];
    const sorted = sortTasks(tasks, 'text', { by: 'progress', dir: 'desc' });
    expect(sorted.map((x) => x.id)).toEqual(['a', 'c', 'b']);
  });

  it('supports custom key function', () => {
    const tasks = [t('a', { duration: 5 }), t('b', { duration: 10 })];
    const sorted = sortTasks(tasks, (t) => -t.duration);
    expect(sorted.map((x) => x.id)).toEqual(['b', 'a']);
  });
});

describe('groupTasksBy', () => {
  it('groups by key function preserving insertion order', () => {
    const a = t('a', { status: 'active' });
    const b = t('b', { status: 'completed' });
    const c = t('c', { status: 'active' });
    const g = groupTasksBy([a, b, c], (t) => t.status ?? '');
    expect([...g.keys()]).toEqual(['active', 'completed']);
    expect(g.get('active')?.map((x) => x.id)).toEqual(['a', 'c']);
  });
});
