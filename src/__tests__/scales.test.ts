import { describe, it, expect } from 'vitest';
import {
  calcDateRange,
  generateScaleCells,
  dateToX,
  xToDate,
  snapToUnit,
  ZOOM_PRESETS,
} from '../store/scales';
import { createTask, createMarker, createConfig } from './helpers';
import { addDays, startOfDay, startOfWeek, isSameDay, isMonday } from 'date-fns';

// ═══════════════════════════════════════════════════════════════
// calcDateRange
// ═══════════════════════════════════════════════════════════════

describe('calcDateRange', () => {
  it('empty tasks + markers: returns default range (-30 to +60 days)', () => {
    const now = new Date();
    const range = calcDateRange([], []);
    // Start should be roughly 30 days before now
    const diffStart = Math.abs(range.start.getTime() - addDays(now, -30).getTime());
    expect(diffStart).toBeLessThan(2000); // within 2 seconds tolerance
    // End should be roughly 60 days after now
    const diffEnd = Math.abs(range.end.getTime() - addDays(now, 60).getTime());
    expect(diffEnd).toBeLessThan(2000);
  });

  it('single task: range encompasses task with padding', () => {
    const task = createTask({
      start: new Date('2026-06-01'),
      end: new Date('2026-06-15'),
    });
    const range = calcDateRange([task], []);
    // Default padding = 7 days
    expect(range.start.getTime()).toBeLessThanOrEqual(
      addDays(new Date('2026-06-01'), -7).getTime(),
    );
    expect(range.end.getTime()).toBeGreaterThanOrEqual(
      addDays(new Date('2026-06-15'), 7).getTime(),
    );
  });

  it('filters NaN dates (K7 fix)', () => {
    const good = createTask({
      start: new Date('2026-06-01'),
      end: new Date('2026-06-10'),
    });
    const bad = createTask({
      start: new Date('invalid'),
      end: new Date('also-invalid'),
    });
    const range = calcDateRange([good, bad], []);
    // Should not throw and range should be based on the good task only
    expect(range.start.getTime()).toBeLessThanOrEqual(new Date('2026-06-01').getTime());
    expect(range.end.getTime()).toBeGreaterThanOrEqual(new Date('2026-06-10').getTime());
  });

  it('markers extend the range', () => {
    const task = createTask({
      start: new Date('2026-06-01'),
      end: new Date('2026-06-10'),
    });
    const marker = createMarker({
      date: new Date('2026-08-01'),
    });
    const range = calcDateRange([task], [marker]);
    // End must encompass the marker date + padding
    expect(range.end.getTime()).toBeGreaterThanOrEqual(new Date('2026-08-01').getTime());
  });

  it('custom padding works', () => {
    const task = createTask({
      start: new Date('2026-06-10'),
      end: new Date('2026-06-20'),
    });
    const range = calcDateRange([task], [], 14);
    expect(range.start.getTime()).toBeLessThanOrEqual(
      addDays(new Date('2026-06-10'), -14).getTime(),
    );
    expect(range.end.getTime()).toBeGreaterThanOrEqual(
      addDays(new Date('2026-06-20'), 14).getTime(),
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// generateScaleCells
// ═══════════════════════════════════════════════════════════════

describe('generateScaleCells', () => {
  const dateRange = {
    start: new Date('2026-06-01'),
    end: new Date('2026-06-15'),
  };
  const dayScale = { unit: 'day' as const, format: 'd', step: 1 };

  it('produces cells for a date range', () => {
    const cells = generateScaleCells(dateRange, dayScale, 32);
    // 14 days range, so roughly 14-15 cells (depending on boundary snapping)
    expect(cells.length).toBeGreaterThanOrEqual(14);
    expect(cells.length).toBeLessThanOrEqual(16);
  });

  it('cells have correct labels and widths', () => {
    const cells = generateScaleCells(dateRange, dayScale, 32);
    for (const cell of cells) {
      expect(cell.label).toBeDefined();
      expect(typeof cell.label).toBe('string');
      expect(cell.width).toBeGreaterThanOrEqual(0);
      expect(cell.key).toBeDefined();
      expect(cell.unit).toBe('day');
    }
  });

  it('marks weekends with isWeekend', () => {
    const cells = generateScaleCells(dateRange, dayScale, 32);
    // June 6 2026 is a Saturday, June 7 is a Sunday
    const weekendCells = cells.filter((c) => c.isWeekend);
    expect(weekendCells.length).toBeGreaterThan(0);
    // All weekend cells should fall on Saturday (6) or Sunday (0)
    for (const wc of weekendCells) {
      const day = wc.date.getDay();
      expect(day === 0 || day === 6).toBe(true);
    }
  });

  it('marks today with isToday', () => {
    // Create a range that includes today
    const now = new Date();
    const todayRange = {
      start: addDays(now, -2),
      end: addDays(now, 2),
    };
    const cells = generateScaleCells(todayRange, dayScale, 32);
    const todayCells = cells.filter((c) => c.isToday);
    expect(todayCells.length).toBe(1);
  });

  it('handles single-day range', () => {
    const singleDayRange = {
      start: new Date('2026-06-10'),
      end: new Date('2026-06-11'),
    };
    const cells = generateScaleCells(singleDayRange, dayScale, 32);
    expect(cells.length).toBeGreaterThanOrEqual(1);
  });

  it('loop guard: does not hang on zero-step (K10 fix)', () => {
    // step=0 would cause addUnit to not advance; the guard should prevent infinite loop
    const zeroStepScale = { unit: 'day' as const, format: 'd', step: 0 };
    // This should return quickly, not hang
    const cells = generateScaleCells(dateRange, zeroStepScale, 32);
    // Either breaks immediately (zero step -> no advance) or returns cells normally
    expect(Array.isArray(cells)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// dateToX
// ═══════════════════════════════════════════════════════════════

describe('dateToX', () => {
  const dateRange = {
    start: new Date('2026-06-01'),
    end: new Date('2026-06-30'),
  };
  const totalWidth = 1000;

  it('start of range = 0', () => {
    const x = dateToX(dateRange.start, dateRange, totalWidth);
    expect(x).toBe(0);
  });

  it('end of range = totalWidth', () => {
    const x = dateToX(dateRange.end, dateRange, totalWidth);
    expect(x).toBeCloseTo(totalWidth, 0);
  });

  it('midpoint = totalWidth/2 (roughly)', () => {
    const midDate = new Date(
      (dateRange.start.getTime() + dateRange.end.getTime()) / 2,
    );
    const x = dateToX(midDate, dateRange, totalWidth);
    expect(x).toBeCloseTo(totalWidth / 2, 0);
  });

  it('zero totalMs returns 0', () => {
    const sameDate = new Date('2026-06-15');
    const zeroRange = { start: sameDate, end: sameDate };
    const x = dateToX(new Date('2026-06-15'), zeroRange, totalWidth);
    expect(x).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// xToDate
// ═══════════════════════════════════════════════════════════════

describe('xToDate', () => {
  const dateRange = {
    start: new Date('2026-06-01'),
    end: new Date('2026-06-30'),
  };
  const totalWidth = 1000;

  it('inverse of dateToX (round-trip test)', () => {
    const originalDate = new Date('2026-06-15T12:00:00');
    const x = dateToX(originalDate, dateRange, totalWidth);
    const recovered = xToDate(x, dateRange, totalWidth);
    // Should round-trip within 1 second
    expect(Math.abs(recovered.getTime() - originalDate.getTime())).toBeLessThan(1000);
  });

  it('zero totalWidth returns start date', () => {
    const result = xToDate(500, dateRange, 0);
    expect(result.getTime()).toBe(dateRange.start.getTime());
  });

  it('zero totalMs returns start date (H5 fix)', () => {
    const sameDate = new Date('2026-06-15');
    const zeroRange = { start: sameDate, end: sameDate };
    const result = xToDate(100, zeroRange, totalWidth);
    expect(result.getTime()).toBe(sameDate.getTime());
  });
});

// ═══════════════════════════════════════════════════════════════
// snapToUnit
// ═══════════════════════════════════════════════════════════════

describe('snapToUnit', () => {
  it('snaps to nearest day boundary', () => {
    // 10:00 -> closer to start of day
    const morning = new Date('2026-06-15T10:00:00');
    const snapped = snapToUnit(morning, 'day');
    expect(isSameDay(snapped, startOfDay(morning))).toBe(true);

    // 18:00 -> closer to start of next day
    const evening = new Date('2026-06-15T18:00:00');
    const snappedEvening = snapToUnit(evening, 'day');
    expect(isSameDay(snappedEvening, new Date('2026-06-16'))).toBe(true);
  });

  it('snaps to nearest week boundary (Monday)', () => {
    // Wednesday June 10 2026 -> closer to Monday June 8 (start of that week)
    const wed = new Date('2026-06-10T06:00:00');
    const snapped = snapToUnit(wed, 'week');
    // Should snap to start of week (Monday June 8)
    const weekStart = startOfWeek(wed, { weekStartsOn: 1 });
    expect(snapped.getTime()).toBe(weekStart.getTime());

    // Saturday June 13 2026 -> closer to Monday June 15 (next week start)
    const sat = new Date('2026-06-13T18:00:00');
    const snappedSat = snapToUnit(sat, 'week');
    // Should snap to next Monday (June 15)
    expect(isMonday(snappedSat)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// ZOOM_PRESETS
// ═══════════════════════════════════════════════════════════════

describe('ZOOM_PRESETS', () => {
  const expectedLevels = ['minutes', 'hours', 'days', 'weeks', 'months', 'quarters', 'years'] as const;

  it('all 7 levels exist', () => {
    for (const level of expectedLevels) {
      expect(ZOOM_PRESETS[level]).toBeDefined();
      expect(ZOOM_PRESETS[level].cellWidth).toBeGreaterThan(0);
      expect(ZOOM_PRESETS[level].scales.length).toBeGreaterThan(0);
    }
  });

  it('years preset has at least 1 scale', () => {
    expect(ZOOM_PRESETS.years.scales.length).toBeGreaterThanOrEqual(1);
    expect(ZOOM_PRESETS.years.scales[0].unit).toBe('year');
  });

  it('minutes preset uses minute + hour scales', () => {
    const scales = ZOOM_PRESETS.minutes.scales;
    const units = scales.map((s) => s.unit);
    expect(units).toContain('minute');
    expect(units).toContain('hour');
  });
});

describe('generateScaleCells — isHoliday', () => {
  it('flags cells matching provided holidays', () => {
    const range = { start: new Date('2026-05-01'), end: new Date('2026-05-10') };
    const scale = { unit: 'day' as const, step: 1, format: 'd' };
    const holidays = [new Date('2026-05-05')];
    const cells = generateScaleCells(range, scale, 32, holidays);
    const holidayCell = cells.find((c) => c.date.getDate() === 5 && c.date.getMonth() === 4);
    expect(holidayCell?.isHoliday).toBe(true);
    const regular = cells.find((c) => c.date.getDate() === 6 && c.date.getMonth() === 4);
    expect(regular?.isHoliday).toBe(false);
  });

  it('omits isHoliday when holidays not supplied (defaults to false)', () => {
    const range = { start: new Date('2026-05-01'), end: new Date('2026-05-05') };
    const scale = { unit: 'day' as const, step: 1, format: 'd' };
    const cells = generateScaleCells(range, scale, 32);
    expect(cells.every((c) => c.isHoliday === false)).toBe(true);
  });
});
