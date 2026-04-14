// ─────────────────────────────────────────────────────────────
// BMS Gantt – Main public-facing component
// Initialises the Zustand store and renders GanttLayout.
// K6: single useEffect for all prop sync to prevent race conditions.
// H1: cleanup dragState on unmount.
// E1: Error boundary wraps GanttLayout; validation runs before store sync.
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { cn } from '../utils/cn';
import { validateGanttInput } from '../utils/validateTasks';

import { useGanttStore } from '../store';
import type { GanttTask, GanttLink, GanttMarker, GanttConfig } from '../store';
import { GanttLayout } from './GanttLayout';
import { GanttErrorBoundary } from './GanttErrorBoundary';

// ── Props ────────────────────────────────────────────────────

export interface GanttProps {
  tasks: GanttTask[];
  links?: GanttLink[];
  markers?: GanttMarker[];
  config?: Partial<GanttConfig>;
  className?: string;

  // Event callbacks
  onTaskClick?: (task: GanttTask) => void;
  onTaskDoubleClick?: (task: GanttTask) => void;
  onTaskUpdate?: (task: GanttTask) => void;
  onLinkCreate?: (link: GanttLink) => void;
  onLinkDelete?: (linkId: string) => void;
  onError?: (error: Error, context: string) => void;
}

// ── Component ────────────────────────────────────────────────

export function Gantt({
  tasks,
  links = [],
  markers = [],
  config,
  className,
  onTaskClick,
  onTaskDoubleClick,
  onTaskUpdate,
  onLinkCreate,
  onLinkDelete,
  onError,
}: GanttProps) {
  const store = useGanttStore;
  const initialised = useRef(false);

  // K6: Single effect syncs ALL data props together, preventing
  // race conditions where tasks update before links.
  // E1: Validates input and catches recalculate errors.
  useEffect(() => {
    // Validate input before syncing to store
    const validation = validateGanttInput(tasks, links);

    if (validation.warnings.length > 0) {
      onError?.(
        new Error(
          `Gantt validation warnings: ${validation.warnings.join('; ')}`,
        ),
        'validateGanttInput',
      );
    }

    if (!validation.valid) {
      onError?.(
        new Error(
          `Gantt validation errors: ${validation.errors.join('; ')}`,
        ),
        'validateGanttInput',
      );
      return; // Do not sync invalid data to the store
    }

    const state = store.getState();

    const update: Partial<Record<string, unknown>> = {
      tasks,
      links,
      markers,
    };

    if (config) {
      update.config = { ...state.config, ...config };
    }

    store.setState(update);

    try {
      state.recalculate();
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error(String(err));
      onError?.(error, 'recalculate');
    }

    initialised.current = true;
  }, [tasks, links, markers, config]); // eslint-disable-line react-hooks/exhaustive-deps

  // H1: cleanup dragState on unmount to prevent stale state
  useEffect(() => {
    return () => {
      store.setState({ dragState: null });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ─────────────────────────────────────────────────

  return (
    <div
      className={cn(
        'gantt-container w-full h-full flex flex-col overflow-hidden border rounded-lg bg-background',
        className,
      )}
    >
      <GanttErrorBoundary onError={onError}>
        <GanttLayout
          onTaskClick={onTaskClick}
          onTaskDoubleClick={onTaskDoubleClick}
          onTaskUpdate={onTaskUpdate}
          onLinkCreate={onLinkCreate}
          onLinkDelete={onLinkDelete}
        />
      </GanttErrorBoundary>
    </div>
  );
}

export default Gantt;
