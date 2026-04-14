// ─────────────────────────────────────────────────────────────
// BMS Gantt – Input validation
// Validates tasks and links before they enter the store.
// Returns warnings (non-blocking) and errors (blocking).
// ─────────────────────────────────────────────────────────────

import type { GanttTask, GanttLink } from '../store/types';

// ── Result type ─────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

// ── Validator ───────────────────────────────────────────────

export function validateGanttInput(
  tasks: GanttTask[],
  links: GanttLink[],
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // ── Task validation ─────────────────────────────────────

  const taskIds = new Set<string>();

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];

    // ID must be a non-empty string
    if (!task.id || typeof task.id !== 'string' || task.id.trim() === '') {
      errors.push(`Task at index ${i} has an empty or missing id.`);
      continue;
    }

    // Duplicate task IDs
    if (taskIds.has(task.id)) {
      errors.push(`Duplicate task id: "${task.id}".`);
    }
    taskIds.add(task.id);

    // Start must be a valid Date
    if (!(task.start instanceof Date) || isNaN(task.start.getTime())) {
      errors.push(`Task "${task.id}": start is not a valid Date.`);
    }

    // End must be a valid Date
    if (!(task.end instanceof Date) || isNaN(task.end.getTime())) {
      errors.push(`Task "${task.id}": end is not a valid Date.`);
    }

    // Start <= end (warning, not error — milestones may have start === end)
    if (
      task.start instanceof Date &&
      task.end instanceof Date &&
      !isNaN(task.start.getTime()) &&
      !isNaN(task.end.getTime()) &&
      task.start > task.end
    ) {
      warnings.push(
        `Task "${task.id}": start (${task.start.toISOString()}) is after end (${task.end.toISOString()}).`,
      );
    }

    // Progress should be 0-100
    if (
      typeof task.progress === 'number' &&
      (task.progress < 0 || task.progress > 100)
    ) {
      warnings.push(
        `Task "${task.id}": progress ${task.progress} is outside 0-100 range.`,
      );
    }
  }

  // ── Link validation ─────────────────────────────────────

  const linkIds = new Set<string>();

  for (let i = 0; i < links.length; i++) {
    const link = links[i];

    // ID must be a non-empty string
    if (!link.id || typeof link.id !== 'string' || link.id.trim() === '') {
      errors.push(`Link at index ${i} has an empty or missing id.`);
      continue;
    }

    // Duplicate link IDs
    if (linkIds.has(link.id)) {
      errors.push(`Duplicate link id: "${link.id}".`);
    }
    linkIds.add(link.id);

    // Source must reference an existing task
    if (!taskIds.has(link.source)) {
      errors.push(
        `Link "${link.id}": source "${link.source}" does not reference an existing task.`,
      );
    }

    // Target must reference an existing task
    if (!taskIds.has(link.target)) {
      errors.push(
        `Link "${link.id}": target "${link.target}" does not reference an existing task.`,
      );
    }

    // No self-referencing links
    if (link.source === link.target) {
      errors.push(
        `Link "${link.id}": self-referencing link (source === target: "${link.source}").`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}
