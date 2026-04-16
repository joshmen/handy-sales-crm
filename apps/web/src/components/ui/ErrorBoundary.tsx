'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { reportError } from '@/services/errorReporter';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function ErrorBoundaryFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  const tc = useTranslations('common');
  return (
    <div className="flex items-center justify-center min-h-[40vh] px-4">
      <div className="max-w-sm w-full text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">
            {tc('errorDisplayingContent')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {tc('unexpectedProblem')}
          </p>
          {process.env.NODE_ENV === 'development' && error && (
            <details className="mt-2 text-left">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground/70">
                {tc('details')}
              </summary>
              <pre className="mt-1 p-2 bg-surface-3 rounded text-xs text-red-700 overflow-auto max-h-32">
                {error.message}
              </pre>
            </details>
          )}
        </div>
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          {tc('retry')}
        </button>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo.componentStack);
    reportError(error, { componentStack: errorInfo.componentStack });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorBoundaryFallback
          error={this.state.error}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}
