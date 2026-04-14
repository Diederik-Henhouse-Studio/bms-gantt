// ─────────────────────────────────────────────────────────────
// BMS Gantt – GanttGrid (task list panel)
// TanStack Table data grid · React 18 + Tailwind CSS
// ─────────────────────────────────────────────────────────────

import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { format, addDays, parse } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { useLabels } from '../i18n';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from '@tanstack/react-table';
import { useGanttStore } from '../store';
import type { GanttTask, LaneGroup } from '../store/types';

interface GanttGridProps {
  /** Pixel width of the grid panel, controlled by GanttLayout via the resizer. */
  width: number;
}

// ── Inline edit helper ────────────────────────────────────

function EditableCell({
  value,
  onSave,
  onCancel,
  type = 'text',
}: {
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
  type?: string;
}) {
  const [v, setV] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <input
      ref={ref}
      type={type}
      value={v}
      min={type === 'number' ? 0 : undefined}
      max={type === 'range' ? 100 : undefined}
      onChange={(e) => {
        setV(e.target.value);
        if (type === 'range') onSave(e.target.value);
      }}
      onBlur={() => onSave(v)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSave(v);
        if (e.key === 'Escape') onCancel();
      }}
      className="w-full h-full px-1 py-0 text-sm border rounded bg-background"
    />
  );
}

// ── Column helper ──────────────────────────────────────────

const columnHelper = createColumnHelper<GanttTask>();

// ── Component ──────────────────────────────────────────────

export const GanttGrid: React.FC<GanttGridProps> = ({ width }) => {
  const flatTasks = useGanttStore((s) => s.flatTasks);
  const selectedTaskIds = useGanttStore((s) => s.selectedTaskIds);
  const config = useGanttStore((s) => s.config);
  const taskGroups = useGanttStore((s) => s.taskGroups);
  const selectTask = useGanttStore((s) => s.selectTask);
  const toggleTaskOpen = useGanttStore((s) => s.toggleTaskOpen);
  const updateTask = useGanttStore((s) => s.updateTask);
  const labels = useLabels();

  const [editingCell, setEditingCell] = useState<{ taskId: string; columnId: string } | null>(null);

  const handleToggle = useCallback(
    (e: React.MouseEvent, taskId: string) => {
      e.stopPropagation();
      toggleTaskOpen(taskId);
    },
    [toggleTaskOpen],
  );

  // ── Column definitions ─────────────────────────────────

  const columns = useMemo<ColumnDef<GanttTask, any>[]>(
    () => [
      columnHelper.accessor('text', {
        id: 'text',
        header: labels.columnTask,
        size: 200,
        minSize: 100,
        maxSize: 400,
        enableResizing: true,
        cell: ({ row }) => {
          const task = row.original;
          const indent = task.$level * 20 + 8;
          const isSummary = task.type === 'summary';
          const isMilestone = task.type === 'milestone';
          const hasChildren = isSummary;
          const isEditing =
            editingCell?.taskId === task.id && editingCell?.columnId === 'text';

          if (isEditing) {
            return (
              <div style={{ paddingLeft: indent }}>
                <EditableCell
                  value={task.text}
                  onSave={(v) => {
                    updateTask(task.id, { text: v });
                    setEditingCell(null);
                  }}
                  onCancel={() => setEditingCell(null)}
                />
              </div>
            );
          }

          return (
            <div
              className="flex items-center gap-1 min-w-0"
              style={{ paddingLeft: indent }}
            >
              {hasChildren ? (
                <button
                  className="shrink-0 p-0.5 rounded hover:bg-muted/80 text-muted-foreground"
                  onClick={(e) => handleToggle(e, task.id)}
                  aria-label={task.open ? 'Collapse' : 'Expand'}
                >
                  <span className="text-xs">
                    {task.open ? '▼' : '▶'}
                  </span>
                </button>
              ) : (
                <span className="shrink-0 w-[18px]" />
              )}

              {isMilestone && (
                <span className="shrink-0 text-xs text-primary">◆</span>
              )}

              <span
                className={`truncate ${isSummary ? 'font-bold' : ''}`}
                title={task.text}
              >
                {task.text}
              </span>
            </div>
          );
        },
      }),

      columnHelper.accessor('start', {
        id: 'start',
        header: labels.columnStart,
        size: 90,
        minSize: 70,
        maxSize: 120,
        enableResizing: true,
        cell: ({ getValue, row }) => {
          const task = row.original;
          const isEditing =
            editingCell?.taskId === task.id && editingCell?.columnId === 'start';

          if (isEditing) {
            return (
              <EditableCell
                value={format(getValue() as Date, 'yyyy-MM-dd')}
                type="date"
                onSave={(v) => {
                  const parsed = parse(v, 'yyyy-MM-dd', new Date());
                  if (!isNaN(parsed.getTime())) {
                    updateTask(task.id, { start: parsed });
                  }
                  setEditingCell(null);
                }}
                onCancel={() => setEditingCell(null)}
              />
            );
          }

          return format(getValue() as Date, 'dd MMM', { locale: enUS });
        },
      }),

      columnHelper.accessor('end', {
        id: 'end',
        header: labels.columnEnd,
        size: 90,
        minSize: 70,
        maxSize: 120,
        enableResizing: true,
        cell: ({ getValue, row }) => {
          const task = row.original;
          const isEditing =
            editingCell?.taskId === task.id && editingCell?.columnId === 'end';

          if (isEditing) {
            return (
              <EditableCell
                value={format(getValue() as Date, 'yyyy-MM-dd')}
                type="date"
                onSave={(v) => {
                  const parsed = parse(v, 'yyyy-MM-dd', new Date());
                  if (!isNaN(parsed.getTime())) {
                    updateTask(task.id, { end: parsed });
                  }
                  setEditingCell(null);
                }}
                onCancel={() => setEditingCell(null)}
              />
            );
          }

          return format(getValue() as Date, 'dd MMM', { locale: enUS });
        },
      }),

      columnHelper.display({
        id: 'duration',
        header: labels.columnDuration,
        size: 60,
        minSize: 40,
        maxSize: 100,
        enableResizing: true,
        cell: ({ row }) => {
          const task = row.original;
          const isEditing =
            editingCell?.taskId === task.id && editingCell?.columnId === 'duration';

          if (isEditing) {
            return (
              <EditableCell
                value={String(task.duration)}
                type="number"
                onSave={(v) => {
                  const days = Math.max(0, parseInt(v, 10) || 0);
                  updateTask(task.id, { end: addDays(task.start, days) });
                  setEditingCell(null);
                }}
                onCancel={() => setEditingCell(null)}
              />
            );
          }

          return task.type === 'milestone' ? '—' : `${task.duration}d`;
        },
      }),

      columnHelper.accessor('progress', {
        id: 'progress',
        header: labels.columnProgress,
        size: 70,
        minSize: 50,
        maxSize: 120,
        enableResizing: true,
        cell: ({ getValue, row }) => {
          const task = row.original;
          const progress = getValue() as number;
          const isEditing =
            editingCell?.taskId === task.id && editingCell?.columnId === 'progress';

          if (isEditing) {
            return (
              <EditableCell
                value={String(Math.round(progress))}
                type="range"
                onSave={(v) => {
                  updateTask(task.id, { progress: Number(v) });
                  setEditingCell(null);
                }}
                onCancel={() => setEditingCell(null)}
              />
            );
          }

          return (
            <div className="flex items-center gap-1">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {Math.round(progress)}%
              </span>
            </div>
          );
        },
      }),
    ],
    [handleToggle, editingCell, updateTask, labels],
  );

  // ── Task lookup for multi-row mode ─────────────────────
  const taskMap = useMemo(() => {
    const map = new Map<string, GanttTask>();
    for (const t of flatTasks) map.set(t.id, t);
    return map;
  }, [flatTasks]);

  // ── Table instance (used for single-row mode) ─────────
  // We use flatTasks directly (already flattened respecting open/close).
  // Expansion is handled by our store's toggleTaskOpen + re-flatten,
  // NOT by TanStack's built-in tree expansion.

  const table = useReactTable({
    data: flatTasks,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row) => row.id,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    enableColumnFilters: true,
  });

  // ── Shared header renderer ────────────────────────────
  const renderTableHeader = () => (
    <thead>
      {table.getHeaderGroups().map((headerGroup) => (
        <tr
          key={headerGroup.id}
          className="bg-muted/50 text-xs font-medium uppercase sticky top-0 z-10 border-b border-border"
        >
          {headerGroup.headers.map((header) => (
            <th
              key={header.id}
              className="relative text-left text-xs font-medium text-muted-foreground uppercase px-2"
              style={{ width: header.getSize() }}
            >
              {header.isPlaceholder
                ? null
                : flexRender(header.column.columnDef.header, header.getContext())}
              {header.column.getCanResize() && (
                <div
                  onMouseDown={header.getResizeHandler()}
                  onTouchStart={header.getResizeHandler()}
                  className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none hover:bg-primary/30 ${
                    header.column.getIsResizing() ? 'bg-primary/50' : ''
                  }`}
                />
              )}
            </th>
          ))}
        </tr>
      ))}
      {/* ── Filter row ────────────────────────────────────── */}
      <tr className="border-b bg-background">
        {table.getHeaderGroups()[0].headers.map((header) => (
          <th key={header.id} className="px-1 py-0.5" style={{ width: header.getSize() }}>
            {header.column.getCanFilter() && (
              <input
                type="text"
                value={(header.column.getFilterValue() ?? '') as string}
                onChange={(e) =>
                  header.column.setFilterValue(e.target.value || undefined)
                }
                placeholder="Filter..."
                className="w-full text-xs px-1 py-0.5 border rounded bg-background text-foreground placeholder:text-muted-foreground"
              />
            )}
          </th>
        ))}
      </tr>
    </thead>
  );

  // ── Task row renderer (shared between modes) ──────────
  const renderTaskRow = (task: GanttTask) => {
    const isSelected = selectedTaskIds.includes(task.id);
    // Use the TanStack row if available (for cell rendering context)
    const row = table.getRowModel().rowsById[task.id];
    if (!row) return null;

    return (
      <tr
        key={task.id}
        className={[
          'border-b border-border text-sm cursor-pointer transition-colors',
          isSelected ? 'bg-primary/10' : 'hover:bg-muted/50',
        ].join(' ')}
        style={{ height: config.cellHeight }}
        onClick={(e) =>
          selectTask(task.id, {
            ctrl: e.ctrlKey || e.metaKey,
            shift: e.shiftKey,
          })
        }
      >
        {row.getVisibleCells().map((cell) => (
          <td
            key={cell.id}
            className="px-2 text-sm text-muted-foreground whitespace-nowrap overflow-hidden"
            style={{ width: cell.column.getSize() }}
            onDoubleClick={() => {
              if (!config.readonly) {
                setEditingCell({ taskId: task.id, columnId: cell.column.id });
              }
            }}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ))}
      </tr>
    );
  };

  // ── Render ─────────────────────────────────────────────

  const isMultiRow = config.rowMode === 'multi' && taskGroups.length > 0;
  const colCount = table.getVisibleFlatColumns().length;

  return (
    <div
      className="overflow-hidden border-r border-border flex flex-col"
      style={{ width }}
    >
      <table className="w-full table-fixed border-collapse">
        {renderTableHeader()}

        <tbody>
          {isMultiRow
            ? /* ── Multi-row mode: group headers + lane rows ── */
              taskGroups.map((group) => (
                <React.Fragment key={`group-${group.id}`}>
                  {/* Group header row */}
                  <tr
                    className="bg-muted/70 border-b border-border"
                    style={{ height: config.cellHeight }}
                  >
                    <td
                      colSpan={colCount}
                      className="px-3 text-sm font-semibold text-foreground"
                    >
                      {group.label}
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        ({group.taskIds.length})
                      </span>
                    </td>
                  </tr>
                  {/* Task rows within this group */}
                  {group.taskIds.map((taskId) => {
                    const task = taskMap.get(taskId);
                    if (!task) return null;
                    return renderTaskRow(task);
                  })}
                </React.Fragment>
              ))
            : /* ── Single-row mode: standard TanStack rows ── */
              table.getRowModel().rows.map((row) => {
                const task = row.original;
                return renderTaskRow(task);
              })}
        </tbody>
      </table>
    </div>
  );
};

export default GanttGrid;
