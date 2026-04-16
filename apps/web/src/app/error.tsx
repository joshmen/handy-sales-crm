'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { reportError } from '@/services/errorReporter';
import { useTranslations } from 'next-intl';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errorPage');

  useEffect(() => {
    console.error('[GlobalError]', error);
    reportError(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-1 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('description')}
          </p>
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
            {t('goToHome')}
          </a>
        </div>
      </div>
    </div>
  );
}
