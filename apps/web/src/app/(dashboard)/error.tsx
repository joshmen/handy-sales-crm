'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { reportError } from '@/services/errorReporter';
import { useTranslations } from 'next-intl';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errorPage');

  useEffect(() => {
    console.error('[DashboardError]', error);
    reportError(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-amber-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">{t('dashboardTitle')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('dashboardDescription')}
          </p>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-3 text-left">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground/70">
                {t('devErrorDetails')}
              </summary>
              <pre className="mt-2 p-3 bg-surface-3 rounded-lg text-xs text-red-700 overflow-auto max-h-40">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
          <p className="text-xs text-muted-foreground">
            {t('persistsContact')}
            {error.digest && <span className="font-mono ml-1">(Ref: {error.digest})</span>}
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            {t('retry')}
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-2 text-foreground/80 text-sm font-medium rounded-lg border border-border-default hover:bg-surface-1 transition-colors"
          >
            <Home className="w-4 h-4" />
            {t('dashboard')}
          </a>
        </div>
      </div>
    </div>
  );
}
