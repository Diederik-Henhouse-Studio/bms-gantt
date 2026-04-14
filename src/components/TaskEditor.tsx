// ─────────────────────────────────────────────────────────────
// BMS Gantt – TaskEditor dialog
// Modal editor for a single GanttTask. Plain HTML + Tailwind.
// ─────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react';
import { format, differenceInCalendarDays, addDays } from 'date-fns';
import type { GanttTask, TaskType, TaskCategory } from '../store/types';

// ━━━ Props ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface TaskEditorProps {
  /** The task to edit. Pass `null` to close / hide the dialog. */
  task: GanttTask | null;
  /** Called with only the changed fields when the user clicks "Opslaan". */
  onSave: (taskId: string, updates: Partial<GanttTask>) => void;
  /** Called when the user confirms deletion. */
  onDelete: (taskId: string) => void;
  /** Called to close the dialog without saving. */
  onClose: () => void;
}

// ━━━ Constants ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: 'task', label: 'Taak' },
  { value: 'summary', label: 'Samenvatting' },
  { value: 'milestone', label: 'Mijlpaal' },
];

const CATEGORY_OPTIONS: { value: TaskCategory; label: string }[] = [
  { value: 'f1', label: 'F1 – Fase 1' },
  { value: 'f2', label: 'F2 – Fase 2' },
  { value: 'f3', label: 'F3 – Fase 3' },
  { value: 'transport', label: 'Transport' },
  { value: 'inspectie', label: 'Inspectie' },
  { value: 'order', label: 'Order' },
  { value: 'generic', label: 'Generiek' },
];

// ━━━ Helpers ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Format a Date to yyyy-MM-dd for <input type="date">. */
const toDateString = (d: Date): string => format(d, 'yyyy-MM-dd');

/** Parse a yyyy-MM-dd string to a Date (local midnight). */
const fromDateString = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// ━━━ Component ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const TaskEditor: React.FC<TaskEditorProps> = ({
  task,
  onSave,
  onDelete,
  onClose,
}) => {
  // ── Local form state ──────────────────────────────────────
  const [text, setText] = useState('');
  const [type, setType] = useState<TaskType>('task');
  const [category, setCategory] = useState<TaskCategory>('generic');
  const [startStr, setStartStr] = useState('');
  const [endStr, setEndStr] = useState('');
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [notes, setNotes] = useState('');

  // ── Sync local state when task prop changes ───────────────
  useEffect(() => {
    if (!task) return;
    setText(task.text);
    setType(task.type);
    setCategory(task.taskCategory ?? 'generic');
    setStartStr(toDateString(task.start));
    setEndStr(toDateString(task.end));
    setDuration(differenceInCalendarDays(task.end, task.start));
    setProgress(task.progress);
    setNotes('');
  }, [task]);

  // ── Escape key ────────────────────────────────────────────
  useEffect(() => {
    if (!task) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [task, onClose]);

  // ── Date / duration sync ──────────────────────────────────
  const handleStartChange = useCallback(
    (value: string) => {
      setStartStr(value);
      if (value && endStr) {
        setDuration(differenceInCalendarDays(fromDateString(endStr), fromDateString(value)));
      }
    },
    [endStr],
  );

  const handleEndChange = useCallback(
    (value: string) => {
      setEndStr(value);
      if (startStr && value) {
        setDuration(differenceInCalendarDays(fromDateString(value), fromDateString(startStr)));
      }
    },
    [startStr],
  );

  const handleDurationChange = useCallback(
    (value: number) => {
      setDuration(value);
      if (startStr) {
        setEndStr(toDateString(addDays(fromDateString(startStr), value)));
      }
    },
    [startStr],
  );

  // ── Save handler (only changed fields) ────────────────────
  const handleSave = useCallback(() => {
    if (!task) return;

    const updates: Partial<GanttTask> = {};

    if (text !== task.text) updates.text = text;
    if (type !== task.type) updates.type = type;
    if (category !== (task.taskCategory ?? 'generic')) updates.taskCategory = category;

    const newStart = fromDateString(startStr);
    const newEnd = fromDateString(endStr);

    if (newStart.getTime() !== task.start.getTime()) updates.start = newStart;
    if (newEnd.getTime() !== task.end.getTime()) updates.end = newEnd;

    const newDuration = differenceInCalendarDays(newEnd, newStart);
    if (newDuration !== task.duration) updates.duration = newDuration;

    if (progress !== task.progress) updates.progress = progress;

    onSave(task.id, updates);
  }, [task, text, type, category, startStr, endStr, progress, onSave]);

  // ── Delete handler ────────────────────────────────────────
  const handleDelete = useCallback(() => {
    if (!task) return;
    if (window.confirm(`Weet je zeker dat je "${task.text}" wilt verwijderen?`)) {
      onDelete(task.id);
    }
  }, [task, onDelete]);

  // ── Backdrop click ────────────────────────────────────────
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  // ── Render nothing when closed ────────────────────────────
  if (!task) return null;

  // ── Shared input styles ───────────────────────────────────
  const inputCls =
    'w-full rounded border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';
  const labelCls = 'text-sm font-medium text-muted-foreground';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-xl">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Taak bewerken</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Sluiten"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <hr className="mb-4 border-border" />

        {/* ── Form ───────────────────────────────────────────── */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-4"
        >
          {/* Naam */}
          <div className="flex flex-col gap-1">
            <label className={labelCls} htmlFor="te-name">
              Naam
            </label>
            <input
              id="te-name"
              type="text"
              className={inputCls}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          {/* Type + Categorie */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className={labelCls} htmlFor="te-type">
                Type
              </label>
              <select
                id="te-type"
                className={inputCls}
                value={type}
                onChange={(e) => setType(e.target.value as TaskType)}
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelCls} htmlFor="te-category">
                Categorie
              </label>
              <select
                id="te-category"
                className={inputCls}
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Start + Eind + Duur */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className={labelCls} htmlFor="te-start">
                Start
              </label>
              <input
                id="te-start"
                type="date"
                className={inputCls}
                value={startStr}
                onChange={(e) => handleStartChange(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelCls} htmlFor="te-end">
                Eind
              </label>
              <input
                id="te-end"
                type="date"
                className={inputCls}
                value={endStr}
                onChange={(e) => handleEndChange(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelCls} htmlFor="te-duration">
                Duur (dagen)
              </label>
              <input
                id="te-duration"
                type="number"
                min={0}
                className={inputCls}
                value={duration}
                onChange={(e) => handleDurationChange(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Voortgang */}
          <div className="flex flex-col gap-1">
            <label className={labelCls} htmlFor="te-progress">
              Voortgang: {progress}%
            </label>
            <input
              id="te-progress"
              type="range"
              min={0}
              max={100}
              className="w-full accent-primary"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
            />
          </div>

          {/* Notities */}
          <div className="flex flex-col gap-1">
            <label className={labelCls} htmlFor="te-notes">
              Notities
            </label>
            <textarea
              id="te-notes"
              rows={3}
              className={inputCls + ' resize-y'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <hr className="border-border" />

          {/* ── Footer buttons ──────────────────────────────── */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleDelete}
              className="rounded px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
            >
              Verwijderen
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                Annuleren
              </button>
              <button
                type="submit"
                className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Opslaan
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskEditor;
