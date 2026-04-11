'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { reportError } from '@/services/errorReporter';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
          <h1 className="text-2xl font-bold text-foreground">Algo salió mal</h1>
          <p className="text-sm text-muted-foreground">
            Ocurrió un error inesperado. Puedes intentar recargar la página o volver al inicio.
          </p>
          <p className="text-xs text-muted-foreground">
            Si el problema persiste, contacta a soporte.
            {error.digest && <span className="font-mono ml-1">(Ref: {error.digest})</span>}
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reintentar
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-2 text-foreground/80 text-sm font-medium rounded-lg border border-border-default hover:bg-surface-1 transition-colors"
          >
            <Home className="w-4 h-4" />
            Ir al inicio
          </a>
        </div>
      </div>
    </div>
  );
}
