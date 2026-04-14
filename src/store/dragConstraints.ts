import type { GanttTask } from './types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / MS_PER_DAY;
}

function clampDurationEnd(start: Date, end: Date, min?: number, max?: number): Date {
  const days = daysBetween(start, end);
  if (min != null && days < min) {
    return new Date(start.getTime() + min * MS_PER_DAY);
  }
  if (max != null && days > max) {
    return new Date(start.getTime() + max * MS_PER_DAY);
  }
  return end;
}

function clampDurationStart(start: Date, end: Date, min?: number, max?: number): Date {
  const days = daysBetween(start, end);
  if (min != null && days < min) {
    return new Date(end.getTime() - min * MS_PER_DAY);
  }
  if (max != null && days > max) {
    return new Date(end.getTime() - max * MS_PER_DAY);
  }
  return start;
}

function overlapsSibling(
  taskId: string,
  parentId: string | null,
  start: Date,
  end: Date,
  all: GanttTask[],
): boolean {
  for (const other of all) {
    if (other.id === taskId) continue;
    if (other.parentId !== parentId) continue;
    if (other.type === 'summary') continue;
    if (other.end.getTime() <= start.getTime()) continue;
    if (other.start.getTime() >= end.getTime()) continue;
    return true;
  }
  return false;
}

export interface MoveResult {
  start: Date;
  end: Date;
  /** True when the proposed change was blocked by a constraint. */
  blocked: boolean;
}

/** Apply constraints for a move (both start + end shift by the same delta). */
export function applyMoveConstraints(
  task: GanttTask,
  nextStart: Date,
  nextEnd: Date,
  all: GanttTask[],
): MoveResult {
  if (task.lockStart || task.lockEnd) {
    return { start: task.start, end: task.end, blocked: true };
  }
  if (task.noOverlap && overlapsSibling(task.id, task.parentId, nextStart, nextEnd, all)) {
    return { start: task.start, end: task.end, blocked: true };
  }
  return { start: nextStart, end: nextEnd, blocked: false };
}

/** Apply constraints for a resize-start (end stays fixed). */
export function applyResizeStartConstraints(
  task: GanttTask,
  nextStart: Date,
  fixedEnd: Date,
  all: GanttTask[],
): MoveResult {
  if (task.lockStart) {
    return { start: task.start, end: task.end, blocked: true };
  }
  const clamped = clampDurationStart(nextStart, fixedEnd, task.minDuration, task.maxDuration);
  if (task.noOverlap && overlapsSibling(task.id, task.parentId, clamped, fixedEnd, all)) {
    return { start: task.start, end: task.end, blocked: true };
  }
  return { start: clamped, end: fixedEnd, blocked: clamped.getTime() !== nextStart.getTime() };
}

/** Apply constraints for a resize-end (start stays fixed). */
export function applyResizeEndConstraints(
  task: GanttTask,
  fixedStart: Date,
  nextEnd: Date,
  all: GanttTask[],
): MoveResult {
  if (task.lockEnd) {
    return { start: task.start, end: task.end, blocked: true };
  }
  const clamped = clampDurationEnd(fixedStart, nextEnd, task.minDuration, task.maxDuration);
  if (task.noOverlap && overlapsSibling(task.id, task.parentId, fixedStart, clamped, all)) {
    return { start: task.start, end: task.end, blocked: true };
  }
  return { start: fixedStart, end: clamped, blocked: clamped.getTime() !== nextEnd.getTime() };
}
