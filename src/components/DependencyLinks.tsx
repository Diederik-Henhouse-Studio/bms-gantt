import React, { useCallback, useMemo } from 'react';
import { useGanttStore } from '../store';
import type { GanttLink } from '../store';
import { useLabels } from '../i18n';

// ── Midpoint helper ─────────────────────────────────────────────────

function getMidpoint(points: string): { x: number; y: number } | null {
  const pairs = points
    .trim()
    .split(/\s+/)
    .map((p) => {
      const [x, y] = p.split(',').map(Number);
      return { x, y };
    });

  if (pairs.length < 2) return null;

  // Walk the polyline to find the point at half total length
  let totalLen = 0;
  const segments: { from: typeof pairs[0]; to: typeof pairs[0]; len: number }[] = [];
  for (let i = 0; i < pairs.length - 1; i++) {
    const dx = pairs[i + 1].x - pairs[i].x;
    const dy = pairs[i + 1].y - pairs[i].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    segments.push({ from: pairs[i], to: pairs[i + 1], len });
    totalLen += len;
  }

  let half = totalLen / 2;
  for (const seg of segments) {
    if (half <= seg.len) {
      const t = seg.len === 0 ? 0 : half / seg.len;
      return {
        x: seg.from.x + (seg.to.x - seg.from.x) * t,
        y: seg.from.y + (seg.to.y - seg.from.y) * t,
      };
    }
    half -= seg.len;
  }

  // Fallback: last point
  return pairs[pairs.length - 1];
}

// ── Component ───────────────────────────────────────────────────────

export function DependencyLinks() {
  const links = useGanttStore((s) => s.visibleLinks);
  const selectedLinkId = useGanttStore((s) => s.selectedLinkId);
  const readonly = useGanttStore((s) => s.config.readonly);
  const totalWidth = useGanttStore((s) => s.totalWidth);
  const totalHeight = useGanttStore((s) => s.totalHeight);
  const selectLink = useGanttStore((s) => s.selectLink);
  const removeLink = useGanttStore((s) => s.removeLink);
  const labels = useLabels();

  const handleLinkClick = useCallback(
    (id: string) => (e: React.MouseEvent) => {
      e.stopPropagation();
      selectLink(id);
    },
    [selectLink],
  );

  const handleDelete = useCallback(
    (id: string) => (e: React.MouseEvent) => {
      e.stopPropagation();
      removeLink(id);
    },
    [removeLink],
  );

  // Find the selected link for the delete button
  const selectedLink = useMemo(
    () => (selectedLinkId ? links.find((l) => l.id === selectedLinkId) : null),
    [links, selectedLinkId],
  );

  const deleteMidpoint = useMemo(() => {
    if (!selectedLink?.$points) return null;
    return getMidpoint(selectedLink.$points);
  }, [selectedLink]);

  if (!links.length) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={totalWidth}
      height={totalHeight}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" className="fill-muted-foreground" />
        </marker>
        <marker
          id="arrowhead-critical"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" className="fill-red-500" />
        </marker>
        <marker
          id="arrowhead-selected"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" className="fill-primary" />
        </marker>
      </defs>

      {links.map((link) => {
        if (!link.$points) return null;

        const isSelected = link.id === selectedLinkId;
        const isCritical = !!link.critical;

        const strokeClass = isCritical
          ? 'stroke-red-500'
          : isSelected
            ? 'stroke-primary'
            : 'stroke-muted-foreground';

        const markerEnd = isCritical
          ? 'url(#arrowhead-critical)'
          : isSelected
            ? 'url(#arrowhead-selected)'
            : 'url(#arrowhead)';

        return (
          <g
            key={link.id}
            data-gantt-role="link"
            data-gantt-link-id={link.id}
            data-gantt-link-source={link.source}
            data-gantt-link-target={link.target}
            data-gantt-link-type={link.type}
            data-gantt-critical={isCritical ? 'true' : undefined}
            data-gantt-selected={isSelected ? 'true' : undefined}
            data-gantt-points={link.$points}
          >
            <polyline
              points={link.$points}
              fill="none"
              stroke="transparent"
              strokeWidth={10}
              pointerEvents="stroke"
              className="cursor-pointer"
              onClick={handleLinkClick(link.id)}
            />
            <polyline
              points={link.$points}
              fill="none"
              strokeWidth={isSelected ? 2.5 : 2}
              className={`${strokeClass} pointer-events-none transition-colors`}
              markerEnd={markerEnd}
            />
          </g>
        );
      })}

      {/* Delete button at midpoint of selected link */}
      {selectedLink && !readonly && deleteMidpoint && (
        <foreignObject
          x={deleteMidpoint.x - 10}
          y={deleteMidpoint.y - 10}
          width={20}
          height={20}
          pointerEvents="auto"
        >
          <button
            type="button"
            onClick={handleDelete(selectedLink.id)}
            className="flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold shadow hover:bg-destructive/90 transition-colors"
            title={labels.deleteLink}
          >
            &times;
          </button>
        </foreignObject>
      )}
    </svg>
  );
}
