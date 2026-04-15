import { describe, it, expect } from 'vitest';
import { rowAtY, cellAtX, barAtPoint, dateAtX } from '../store/hitTest';
import { createTask } from './helpers';
import type { ScaleCell } from '../store/types';

function task(id: string, x: number, y: number, w = 80, h = 24) {
  return { ...createTask({ id }), $x: x, $y: y, $w: w, $h: h };
}

describe('hitTest', () => {
  describe('rowAtY', () => {
    it('finds the task containing Y', () => {
      const a = task('a', 0, 0);
      const b = task('b', 0, 30);
      const c = task('c', 0, 60);
      expect(rowAtY(10, [a, b, c])?.id).toBe('a');
      expect(rowAtY(40, [a, b, c])?.id).toBe('b');
      expect(rowAtY(200, [a, b, c])).toBeNull();
    });
  });

  describe('barAtPoint', () => {
    it('returns the bar under the point', () => {
      const a = task('a', 50, 0, 50, 24);
      const b = task('b', 200, 0, 50, 24);
      expect(barAtPoint(60, 10, [a, b])?.id).toBe('a');
      expect(barAtPoint(220, 10, [a, b])?.id).toBe('b');
      expect(barAtPoint(10, 10, [a, b])).toBeNull();
    });
  });

  describe('cellAtX', () => {
    function cell(key: string, width: number, date = new Date()): ScaleCell {
      return {
        key,
        label: key,
        date,
        width,
        unit: 'day',
        isWeekend: false,
        isHoliday: false,
        isToday: false,
      };
    }
    it('finds the cell containing X', () => {
      const row = [cell('a', 20), cell('b', 40), cell('c', 30)];
      expect(cellAtX(5, row)?.key).toBe('a');
      expect(cellAtX(30, row)?.key).toBe('b');
      expect(cellAtX(70, row)?.key).toBe('c');
      expect(cellAtX(500, row)).toBeNull();
    });
  });

  describe('dateAtX', () => {
    it('maps X to a Date within the range', () => {
      const range = { start: new Date('2026-05-01'), end: new Date('2026-05-11') };
      const d = dateAtX(400, range, 800); // half-way across
      expect(d.getDate()).toBe(6);
      expect(d.getMonth()).toBe(4); // May
    });
  });
});
