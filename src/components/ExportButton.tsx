// ─────────────────────────────────────────────────────────────
// BMS Gantt – ExportButton
// PNG and PDF export via html-to-image + jsPDF
// ─────────────────────────────────────────────────────────────

import React, { useState, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

// ── Types ───────────────────────────────────────────────────

type ExportFormat = 'png' | 'pdf';

interface ExportButtonProps {
  /** Ref to the Gantt chart container element to capture */
  chartRef: React.RefObject<HTMLDivElement | null>;
  /** Optional filename prefix (default: 'gantt-export') */
  filename?: string;
}

// ── Helpers ─────────────────────────────────────────────────

function timestamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
}

async function captureElement(
  element: HTMLElement,
): Promise<string> {
  // Temporarily expand the element to full content size so everything is captured
  const original = {
    overflow: element.style.overflow,
    width: element.style.width,
    height: element.style.height,
    maxHeight: element.style.maxHeight,
  };

  // Find the inner content dimensions (the scrollable area)
  const scrollW = element.scrollWidth;
  const scrollH = element.scrollHeight;

  element.style.overflow = 'visible';
  element.style.width = `${scrollW}px`;
  element.style.height = `${scrollH}px`;
  element.style.maxHeight = 'none';

  try {
    const dataUrl = await toPng(element, {
      cacheBust: true,
      pixelRatio: 2, // retina quality
      backgroundColor: '#ffffff',
      width: scrollW,
      height: scrollH,
      style: {
        overflow: 'visible',
      },
    });
    return dataUrl;
  } finally {
    // Restore original styles
    element.style.overflow = original.overflow;
    element.style.width = original.width;
    element.style.height = original.height;
    element.style.maxHeight = original.maxHeight;
  }
}

function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function exportAsPng(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const dataUrl = await captureElement(element);
  downloadDataUrl(dataUrl, `${filename}-${timestamp()}.png`);
}

async function exportAsPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const dataUrl = await captureElement(element);

  // Create an image to get dimensions
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = dataUrl;
  });

  // Determine orientation and page size based on aspect ratio
  const aspectRatio = img.width / img.height;
  const orientation = aspectRatio > 1 ? 'landscape' : 'portrait';

  // Use A3 for large charts, A4 for smaller ones
  const pageSize = img.width > 2000 || img.height > 2000 ? 'a3' : 'a4';

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: pageSize,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Margins
  const margin = 10; // mm
  const availW = pageWidth - margin * 2;
  const availH = pageHeight - margin * 2;

  // Scale image to fit page
  const scale = Math.min(availW / img.width, availH / img.height);
  const imgW = img.width * scale;
  const imgH = img.height * scale;

  // Center on page
  const offsetX = margin + (availW - imgW) / 2;
  const offsetY = margin + (availH - imgH) / 2;

  pdf.addImage(dataUrl, 'PNG', offsetX, offsetY, imgW, imgH);

  pdf.save(`${filename}-${timestamp()}.pdf`);
}

// ── Component ───────────────────────────────────────────────

export function ExportButton({ chartRef, filename = 'gantt-export' }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      const element = chartRef.current;
      if (!element) return;

      setIsExporting(true);
      setShowMenu(false);

      try {
        if (format === 'png') {
          await exportAsPng(element, filename);
        } else {
          await exportAsPdf(element, filename);
        }
      } catch (err) {
        console.error('Export failed:', err);
        alert('Export mislukt. Probeer het opnieuw.');
      } finally {
        setIsExporting(false);
      }
    },
    [chartRef, filename],
  );

  return (
    <div className="relative">
      <button
        type="button"
        className="px-2 py-1 text-xs rounded hover:bg-accent transition-colors select-none disabled:opacity-50"
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        title="Exporteer Gantt chart"
        aria-label="Exporteer"
      >
        {isExporting ? '⏳' : '📥'} Export
      </button>

      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-1 z-50 bg-popover border rounded-md shadow-lg py-1 min-w-[140px]">
            <button
              type="button"
              className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent rounded-sm mx-0"
              onClick={() => handleExport('png')}
            >
              🖼️ PNG afbeelding
            </button>
            <button
              type="button"
              className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent rounded-sm mx-0"
              onClick={() => handleExport('pdf')}
            >
              📄 PDF document
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ExportButton;
