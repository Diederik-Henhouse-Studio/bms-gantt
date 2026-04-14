// ─────────────────────────────────────────────────────────────
// BMS Gantt – Error Boundary
// Class component required: hooks cannot catch render errors.
// ─────────────────────────────────────────────────────────────

import React from 'react';

// ── Props & State ───────────────────────────────────────────

export interface GanttErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error, context: string) => void;
  fallback?: React.ReactNode;
}

interface GanttErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ── Component ───────────────────────────────────────────────

export class GanttErrorBoundary extends React.Component<
  GanttErrorBoundaryProps,
  GanttErrorBoundaryState
> {
  constructor(props: GanttErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): GanttErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const context = info.componentStack ?? 'unknown component';
    this.props.onError?.(error, context);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Custom fallback overrides the default UI
    if (this.props.fallback) {
      return this.props.fallback;
    }

    // Default fallback UI
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 w-full h-full min-h-[200px] bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900">
            Er is een fout opgetreden in de Gantt chart
          </p>
          {this.state.error && (
            <p className="mt-1 text-xs text-gray-500">
              {this.state.error.message}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={this.handleRetry}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Opnieuw proberen
        </button>
      </div>
    );
  }
}
