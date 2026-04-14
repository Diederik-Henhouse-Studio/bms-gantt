// ─────────────────────────────────────────────────────────────
// BMS Gantt – Working days calendar
// Business day calculations and holiday management
// ─────────────────────────────────────────────────────────────

import { getDay, startOfDay, addDays, isBefore } from 'date-fns';

// ━━━ GanttCalendar interface ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Calendar abstraction for working-day arithmetic. */
export interface GanttCalendar {
  /** Returns `true` if the given date is a working day. */
  isWorkingDay(date: Date): boolean;
  /**
   * Add (or subtract) a number of working days to a date.
   * Negative values count backwards.
   */
  addWorkingDays(date: Date, days: number): Date;
  /**
   * Count working days between two dates.
   * Start is inclusive, end is exclusive.
   */
  countWorkingDays(start: Date, end: Date): number;
  /** Return the next working day strictly after `date` (or `date` itself if it is a working day). */
  getNextWorkingDay(date: Date): Date;
  /** Return the previous working day at or before `date`. */
  getPrevWorkingDay(date: Date): Date;
}

// ━━━ Helpers ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Convert date-fns `getDay()` (0 = Sun … 6 = Sat)
 * to ISO day-of-week (1 = Mon … 7 = Sun).
 */
function toIsoDay(date: Date): number {
  const d = getDay(date); // 0 = Sun
  return d === 0 ? 7 : d;
}

/**
 * Build a Set of normalised holiday timestamps for O(1) lookup.
 */
function buildHolidaySet(holidays: Date[]): Set<number> {
  return new Set(holidays.map((d) => startOfDay(d).getTime()));
}

// ━━━ Factory ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Create a calendar that knows which days are working days and
 * which dates are holidays.
 *
 * @param workingDays ISO weekday numbers (1 = Mon … 7 = Sun).
 *                    Defaults to Monday – Friday.
 * @param holidays    Specific dates treated as non-working.
 */
export function createCalendar(
  workingDays: number[] = [1, 2, 3, 4, 5],
  holidays: Date[] = [],
): GanttCalendar {
  const workingSet = new Set(workingDays);
  const holidaySet = buildHolidaySet(holidays);

  function isWorkingDay(date: Date): boolean {
    if (!workingSet.has(toIsoDay(date))) return false;
    if (holidaySet.has(startOfDay(date).getTime())) return false;
    return true;
  }

  // K8: Max iterations to prevent infinite loop if all days are non-working
  const MAX_ITER = 10_000;

  function getNextWorkingDay(date: Date): Date {
    let d = startOfDay(date);
    let i = 0;
    while (!isWorkingDay(d)) {
      if (++i > MAX_ITER) throw new Error('getNextWorkingDay: geen werkdag gevonden binnen 10.000 dagen');
      d = addDays(d, 1);
    }
    return d;
  }

  function getPrevWorkingDay(date: Date): Date {
    let d = startOfDay(date);
    let i = 0;
    while (!isWorkingDay(d)) {
      if (++i > MAX_ITER) throw new Error('getPrevWorkingDay: geen werkdag gevonden binnen 10.000 dagen');
      d = addDays(d, -1);
    }
    return d;
  }

  function addWorkingDays(date: Date, days: number): Date {
    let d = startOfDay(date);
    const step = days >= 0 ? 1 : -1;
    let remaining = Math.abs(days);
    let i = 0;

    while (remaining > 0) {
      if (++i > MAX_ITER) throw new Error('addWorkingDays: limiet bereikt (10.000 iteraties)');
      d = addDays(d, step);
      if (isWorkingDay(d)) {
        remaining--;
      }
    }
    return d;
  }

  function countWorkingDays(start: Date, end: Date): number {
    const s = startOfDay(start);
    const e = startOfDay(end);

    // Handle reversed range
    if (isBefore(e, s)) {
      return -countWorkingDays(end, start);
    }

    let count = 0;
    let d = s;
    let i = 0;
    while (isBefore(d, e)) {
      if (++i > MAX_ITER) throw new Error('countWorkingDays: limiet bereikt (10.000 iteraties)');
      if (isWorkingDay(d)) count++;
      d = addDays(d, 1);
    }
    return count;
  }

  return {
    isWorkingDay,
    addWorkingDays,
    countWorkingDays,
    getNextWorkingDay,
    getPrevWorkingDay,
  };
}
