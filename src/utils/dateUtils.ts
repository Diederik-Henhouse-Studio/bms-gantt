import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  endOfDay,
  addDays,
  addMinutes,
  addWeeks,
  addMonths,
  addQuarters,
  addYears,
  differenceInDays,
  differenceInMinutes,
  differenceInWeeks,
  differenceInMonths,
  differenceInQuarters,
  differenceInYears,
  format,
} from "date-fns";
import { enUS } from "date-fns/locale/en-US";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TimeUnit = "minute" | "hour" | "day" | "week" | "month" | "quarter" | "year";

// ---------------------------------------------------------------------------
// Unit boundary helpers
// ---------------------------------------------------------------------------

export function getUnitStart(date: Date, unit: TimeUnit): Date {
  switch (unit) {
    case "minute": {
      const d = new Date(date);
      d.setSeconds(0, 0);
      return d;
    }
    case "hour": {
      const d = new Date(date);
      d.setMinutes(0, 0, 0);
      return d;
    }
    case "day":
      return startOfDay(date);
    case "week":
      return startOfWeek(date, { weekStartsOn: 1 });
    case "month":
      return startOfMonth(date);
    case "quarter":
      return startOfQuarter(date);
    case "year":
      return startOfYear(date);
  }
}

export function getUnitEnd(date: Date, unit: TimeUnit): Date {
  switch (unit) {
    case "minute": {
      const d = new Date(date);
      d.setSeconds(59, 999);
      return d;
    }
    case "hour": {
      const d = new Date(date);
      d.setMinutes(59, 59, 999);
      return d;
    }
    case "day":
      return endOfDay(date);
    case "week": {
      const start = startOfWeek(date, { weekStartsOn: 1 });
      return endOfDay(addDays(start, 6));
    }
    case "month": {
      const start = startOfMonth(date);
      return endOfDay(addDays(addMonths(start, 1), -1));
    }
    case "quarter": {
      const start = startOfQuarter(date);
      return endOfDay(addDays(addMonths(start, 3), -1));
    }
    case "year": {
      const start = startOfYear(date);
      return endOfDay(addDays(addYears(start, 1), -1));
    }
  }
}

// ---------------------------------------------------------------------------
// Arithmetic
// ---------------------------------------------------------------------------

export function addUnit(date: Date, unit: TimeUnit, amount: number): Date {
  switch (unit) {
    case "minute":
      return addMinutes(date, amount);
    case "hour": {
      const d = new Date(date);
      d.setHours(d.getHours() + amount);
      return d;
    }
    case "day":
      return addDays(date, amount);
    case "week":
      return addWeeks(date, amount);
    case "month":
      return addMonths(date, amount);
    case "quarter":
      return addQuarters(date, amount);
    case "year":
      return addYears(date, amount);
  }
}

/**
 * Difference between two dates expressed in the given unit.
 * Returns a positive number when `end` is after `start`.
 */
export function diffUnits(start: Date, end: Date, unit: TimeUnit): number {
  switch (unit) {
    case "minute":
      return differenceInMinutes(end, start);
    case "hour":
      return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    case "day":
      return differenceInDays(end, start);
    case "week":
      return differenceInWeeks(end, start);
    case "month":
      return differenceInMonths(end, start);
    case "quarter":
      return differenceInQuarters(end, start);
    case "year":
      return differenceInYears(end, start);
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const DEFAULT_FORMATS: Record<TimeUnit, string> = {
  year: "yyyy",
  quarter: "Qo yyyy",
  month: "MMM yyyy",
  week: "'W'w",
  day: "d",
  hour: "HH:mm",
  minute: "HH:mm",
};

/**
 * Format a date for display in a scale header cell.
 * Uses English (en-US) locale by default.
 */
export function formatScaleLabel(
  date: Date,
  unit: TimeUnit,
  formatStr?: string,
): string {
  const fmt = formatStr ?? DEFAULT_FORMATS[unit];
  return format(date, fmt, { locale: enUS });
}
