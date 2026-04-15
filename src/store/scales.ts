import {
  addDays,
  endOfDay,
  startOfDay,
  isWeekend,
  isSameDay,
} from "date-fns";
import type { GanttTask, GanttMarker, GanttScale, ScaleCell, DateRange, ZoomLevel } from "./types";
import {
  getUnitStart,
  getUnitEnd,
  addUnit,
  diffUnits,
  formatScaleLabel,
} from "../utils/dateUtils";

// ---------------------------------------------------------------------------
// Types local to this module
// ---------------------------------------------------------------------------

type ZoomPresetKey = ZoomLevel;

interface ZoomPreset {
  scales: { unit: GanttScale["unit"]; format: string }[];
  cellWidth: number;
}

// ---------------------------------------------------------------------------
// Zoom presets
// ---------------------------------------------------------------------------

export const ZOOM_PRESETS: Record<ZoomPresetKey, ZoomPreset> = {
  minutes: {
    scales: [
      { unit: "hour", format: "HH:00" },
      { unit: "minute", format: "mm" },
    ],
    cellWidth: 20,
  },
  hours: {
    scales: [
      { unit: "day", format: "d MMM" },
      { unit: "hour", format: "HH" },
    ],
    cellWidth: 40,
  },
  days: {
    scales: [
      { unit: "month", format: "MMM yyyy" },
      { unit: "day", format: "d" },
    ],
    cellWidth: 32,
  },
  weeks: {
    scales: [
      { unit: "month", format: "MMM yyyy" },
      { unit: "week", format: "'W'w" },
    ],
    cellWidth: 80,
  },
  months: {
    scales: [
      { unit: "year", format: "yyyy" },
      { unit: "month", format: "MMM" },
    ],
    cellWidth: 80,
  },
  quarters: {
    scales: [
      { unit: "year", format: "yyyy" },
      { unit: "quarter", format: "'Q'Q" },
    ],
    cellWidth: 100,
  },
  years: {
    scales: [
      { unit: "year", format: "yyyy" },
    ],
    cellWidth: 120,
  },
} as const;

// ---------------------------------------------------------------------------
// Date range
// ---------------------------------------------------------------------------

/**
 * Compute the min/max date range from all tasks and markers, with padding.
 * Falls back to a sensible default when there are no dates at all.
 */
export function calcDateRange(
  tasks: GanttTask[],
  markers: GanttMarker[],
  paddingDays: number = 7,
): DateRange {
  // K7: Filter out null/undefined AND invalid dates (NaN)
  const allDates: Date[] = [
    ...tasks.flatMap((t) => [t.start, t.end]),
    ...markers.map((m) => m.date),
  ].filter((d): d is Date => d != null && !isNaN(d.getTime()));

  if (allDates.length === 0) {
    const now = new Date();
    return {
      start: addDays(now, -30),
      end: addDays(now, 60),
    };
  }

  const timestamps = allDates.map((d) => d.getTime());
  const minMs = Math.min(...timestamps);
  const maxMs = Math.max(...timestamps);

  return {
    start: addDays(startOfDay(new Date(minMs)), -paddingDays),
    end: addDays(endOfDay(new Date(maxMs)), paddingDays),
  };
}

// ---------------------------------------------------------------------------
// Scale-cell generation
// ---------------------------------------------------------------------------

/**
 * Generate ScaleCell[] for one scale row.
 *
 * Walks from range start to range end by unit steps. Each cell gets a pixel
 * width proportional to how much of its unit interval falls inside the
 * visible date range. Cells are annotated with `isWeekend` and `isToday`.
 */
export function generateScaleCells(
  dateRange: DateRange,
  scale: GanttScale,
  cellWidth: number,
  holidays: Date[] = [],
): ScaleCell[] {
  // Pre-index holidays by yyyy-mm-dd for O(1) lookup per cell.
  const holidaySet = new Set<string>();
  for (const h of holidays) {
    if (h instanceof Date && !isNaN(h.getTime())) {
      holidaySet.add(
        `${h.getFullYear()}-${h.getMonth()}-${h.getDate()}`,
      );
    }
  }
  const isHolidayDate = (d: Date): boolean =>
    holidaySet.has(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  const cells: ScaleCell[] = [];
  const { start, end } = dateRange;
  const step = scale.step ?? 1;

  // Snap to the unit boundary at or before range start
  let current = getUnitStart(start, scale.unit);

  const totalMs = end.getTime() - start.getTime();

  // K10: max iterations to prevent infinite loop if addUnit doesn't advance
  const MAX_SCALE_CELLS = 50_000;
  let iterations = 0;

  while (current < end) {
    if (++iterations > MAX_SCALE_CELLS) {
      console.warn('generateScaleCells: limiet bereikt (50.000 cellen)');
      break;
    }

    const next = addUnit(current, scale.unit, step);

    // Safety: if addUnit didn't advance, break to prevent infinite loop
    if (next.getTime() <= current.getTime()) {
      console.warn('generateScaleCells: addUnit niet vooruit, loop gestopt');
      break;
    }

    // Clamp the cell interval to the visible range
    const cellStart = current < start ? start : current;
    const cellEnd = next > end ? end : next;
    const cellMs = cellEnd.getTime() - cellStart.getTime();

    // Full unit duration (unclipped) for proportional width
    const fullMs = next.getTime() - current.getTime();
    const width = fullMs > 0 ? (cellMs / fullMs) * cellWidth * step : cellWidth;

    cells.push({
      key: `${scale.unit}-${current.getTime()}`,
      label: formatScaleLabel(current, scale.unit, scale.format),
      date: current,
      width: Math.max(width, 0),
      unit: scale.unit,
      isWeekend: isWeekend(current),
      isHoliday: isHolidayDate(current),
      isToday: isSameDay(current, new Date()),
    });

    current = next;
  }

  return cells;
}

/**
 * Generate ScaleCell[][] for all scale rows.
 */
export function generateAllScaleCells(
  dateRange: DateRange,
  scales: GanttScale[],
  cellWidth: number,
  holidays: Date[] = [],
): ScaleCell[][] {
  return scales.map((scale) =>
    generateScaleCells(dateRange, scale, cellWidth, holidays),
  );
}

/**
 * Sum of all cell widths in the finest (last) scale row.
 */
export function calcTotalWidth(scaleCells: ScaleCell[][]): number {
  if (scaleCells.length === 0) return 0;
  const finestRow = scaleCells[scaleCells.length - 1];
  return finestRow.reduce((sum, cell) => sum + cell.width, 0);
}

// ---------------------------------------------------------------------------
// Date <-> pixel conversion
// ---------------------------------------------------------------------------

/**
 * Convert a date to a pixel X position via linear interpolation.
 */
export function dateToX(
  date: Date,
  dateRange: DateRange,
  totalWidth: number,
): number {
  const totalMs = dateRange.end.getTime() - dateRange.start.getTime();
  if (totalMs === 0) return 0;
  const offsetMs = date.getTime() - dateRange.start.getTime();
  return (offsetMs / totalMs) * totalWidth;
}

/**
 * Convert a pixel X position back to a date (inverse of dateToX).
 * Useful for drag operations.
 */
export function xToDate(
  x: number,
  dateRange: DateRange,
  totalWidth: number,
): Date {
  const totalMs = dateRange.end.getTime() - dateRange.start.getTime();
  // H5: guards voor division by zero en NaN
  if (totalWidth === 0 || totalMs === 0) return new Date(dateRange.start);
  const ms = (x / totalWidth) * totalMs;
  return new Date(dateRange.start.getTime() + ms);
}

// ---------------------------------------------------------------------------
// Snap helper
// ---------------------------------------------------------------------------

/**
 * Snap a date to the nearest unit boundary.
 * Compares distance to the unit start vs. unit end and picks the closer one.
 */
export function snapToUnit(
  date: Date,
  unit: GanttScale["unit"],
): Date {
  const unitStart = getUnitStart(date, unit);
  const unitEnd = addUnit(unitStart, unit, 1);

  const distToStart = Math.abs(date.getTime() - unitStart.getTime());
  const distToEnd = Math.abs(date.getTime() - unitEnd.getTime());

  return distToStart <= distToEnd ? unitStart : unitEnd;
}
