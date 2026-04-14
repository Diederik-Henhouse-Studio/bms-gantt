import { describe, it, expect } from 'vitest';
import { createCalendar } from '../store/calendar';

/** Create a local-midnight date (avoids UTC vs local timezone mismatches). */
function day(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d);
}

// March 2 2026 is a Monday
const MON = day(2026, 3, 2);
const TUE = day(2026, 3, 3);
const WED = day(2026, 3, 4);
const THU = day(2026, 3, 5);
const FRI = day(2026, 3, 6);
const SAT = day(2026, 3, 7);
const SUN = day(2026, 3, 8);
const NEXT_MON = day(2026, 3, 9);

// ── isWorkingDay ───────────────────────────────────────────────

describe('isWorkingDay', () => {
  const cal = createCalendar();

  it('Monday-Friday are working days (default)', () => {
    expect(cal.isWorkingDay(MON)).toBe(true);
    expect(cal.isWorkingDay(TUE)).toBe(true);
    expect(cal.isWorkingDay(WED)).toBe(true);
    expect(cal.isWorkingDay(THU)).toBe(true);
    expect(cal.isWorkingDay(FRI)).toBe(true);
  });

  it('Saturday/Sunday are not working days', () => {
    expect(cal.isWorkingDay(SAT)).toBe(false);
    expect(cal.isWorkingDay(SUN)).toBe(false);
  });

  it('holiday is not a working day even if weekday', () => {
    const holiday = day(2026, 3, 4); // Wednesday
    const calH = createCalendar([1, 2, 3, 4, 5], [holiday]);
    expect(calH.isWorkingDay(holiday)).toBe(false);
  });

  it('custom workingDays [1,2,3] (Mon-Wed only)', () => {
    const cal3 = createCalendar([1, 2, 3]);
    expect(cal3.isWorkingDay(MON)).toBe(true);
    expect(cal3.isWorkingDay(WED)).toBe(true);
    expect(cal3.isWorkingDay(THU)).toBe(false);
    expect(cal3.isWorkingDay(FRI)).toBe(false);
    expect(cal3.isWorkingDay(SAT)).toBe(false);
  });
});

// ── addWorkingDays ─────────────────────────────────────────────

describe('addWorkingDays', () => {
  const cal = createCalendar();

  it('adds 5 working days (skips weekend)', () => {
    // Mon Mar 2 + 5 working days = Mon Mar 9
    const result = cal.addWorkingDays(MON, 5);
    expect(result).toEqual(NEXT_MON);
  });

  it('adds 0 days returns same day', () => {
    const result = cal.addWorkingDays(MON, 0);
    expect(result).toEqual(MON);
  });

  it('negative days counts backward', () => {
    // Mon Mar 9 - 5 working days = Mon Mar 2
    const result = cal.addWorkingDays(NEXT_MON, -5);
    expect(result).toEqual(MON);
  });

  it('skips holidays', () => {
    // Make Wednesday Mar 4 a holiday
    const calH = createCalendar([1, 2, 3, 4, 5], [WED]);
    // Mon Mar 2 + 3 working days: Tue Mar 3, skip Wed (holiday), Thu Mar 5, Fri Mar 6
    const result = calH.addWorkingDays(MON, 3);
    expect(result).toEqual(FRI);
  });
});

// ── countWorkingDays ───────────────────────────────────────────

describe('countWorkingDays', () => {
  const cal = createCalendar();

  it('counts correctly over a week (5 working days Mon-Fri)', () => {
    // Mon Mar 2 to Mon Mar 9 (start inclusive, end exclusive) = 5 working days
    const count = cal.countWorkingDays(MON, NEXT_MON);
    expect(count).toBe(5);
  });

  it('reversed range returns negative', () => {
    const count = cal.countWorkingDays(NEXT_MON, MON);
    expect(count).toBe(-5);
  });

  it('same day returns 0', () => {
    const count = cal.countWorkingDays(MON, MON);
    expect(count).toBe(0);
  });

  it('skips holidays', () => {
    // Make Wednesday Mar 4 a holiday
    const calH = createCalendar([1, 2, 3, 4, 5], [WED]);
    // Mon Mar 2 to Mon Mar 9 should be 4 (Mon, Tue, Thu, Fri)
    const count = calH.countWorkingDays(MON, NEXT_MON);
    expect(count).toBe(4);
  });
});

// ── getNextWorkingDay ──────────────────────────────────────────

describe('getNextWorkingDay', () => {
  const cal = createCalendar();

  it('returns same day if already working day', () => {
    const result = cal.getNextWorkingDay(MON);
    expect(result).toEqual(MON);
  });

  it('skips to Monday if Saturday', () => {
    const result = cal.getNextWorkingDay(SAT);
    expect(result).toEqual(NEXT_MON);
  });

  it('skips holidays', () => {
    // Mon Mar 2 is a holiday, next working day should be Tue Mar 3
    const calH = createCalendar([1, 2, 3, 4, 5], [MON]);
    const result = calH.getNextWorkingDay(MON);
    expect(result).toEqual(TUE);
  });
});

// ── getPrevWorkingDay ──────────────────────────────────────────

describe('getPrevWorkingDay', () => {
  const cal = createCalendar();

  it('returns same day if already working day', () => {
    const result = cal.getPrevWorkingDay(FRI);
    expect(result).toEqual(FRI);
  });

  it('skips to Friday if Sunday', () => {
    const result = cal.getPrevWorkingDay(SUN);
    expect(result).toEqual(FRI);
  });
});
