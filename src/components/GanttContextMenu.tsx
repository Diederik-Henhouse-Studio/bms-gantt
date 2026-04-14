import React, { useEffect, useCallback, useRef } from 'react';
import { useLabels } from '../i18n';

// ── Types ──────────────────────────────────────────────────────────

interface GanttContextMenuProps {
  position: { x: number; y: number } | null;
  taskId: string | null;
  /** Currently selected task ids (includes taskId or is empty when only the right-clicked task applies). */
  selectedTaskIds?: string[];
  onClose: () => void;
  onEditTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onDeleteSelection?: (taskIds: string[]) => void;
  onAddSubtask: (parentId: string) => void;
  onAddLink: (sourceId: string) => void;
}

// ── Component ──────────────────────────────────────────────────────

export function GanttContextMenu({
  position,
  taskId,
  selectedTaskIds = [],
  onClose,
  onEditTask,
  onDeleteTask,
  onDeleteSelection,
  onAddSubtask,
  onAddLink,
}: GanttContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!position) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Defer so the opening right-click doesn't immediately close it
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [position, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!position) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [position, onClose]);

  const labels = useLabels();
  if (!position || !taskId) return null;

  const itemClass =
    'px-3 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm mx-1';

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-popover border rounded-md shadow-lg py-1 min-w-[160px]"
      style={{ left: position.x, top: position.y }}
    >
      <div
        className={itemClass}
        onClick={() => {
          onEditTask(taskId);
          onClose();
        }}
      >
        ✏️ {labels.edit}
      </div>
      <div
        className={itemClass}
        onClick={() => {
          onAddSubtask(taskId);
          onClose();
        }}
      >
        ➕ {labels.addSubtask}
      </div>
      <div
        className={itemClass}
        onClick={() => {
          onAddLink(taskId);
          onClose();
        }}
      >
        🔗 {labels.addLink}
      </div>

      <div className="border-t my-1" />

      {selectedTaskIds.length > 1 && onDeleteSelection ? (
        <div
          className={`${itemClass} text-red-500`}
          onClick={() => {
            onDeleteSelection(selectedTaskIds);
            onClose();
          }}
        >
          🗑️ {labels.delete} ({selectedTaskIds.length})
        </div>
      ) : (
        <div
          className={`${itemClass} text-red-500`}
          onClick={() => {
            onDeleteTask(taskId);
            onClose();
          }}
        >
          🗑️ {labels.delete}
        </div>
      )}
    </div>
  );
}
