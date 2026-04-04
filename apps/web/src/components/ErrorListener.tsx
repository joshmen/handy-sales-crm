'use client';

import { useEffect } from 'react';
import { reportError } from '@/services/errorReporter';

export function ErrorListener() {
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      reportError(e.error || new Error(e.message), {
        type: 'unhandled_error',
        filename: e.filename,
        lineno: e.lineno,
      });
    };
    const handleRejection = (e: PromiseRejectionEvent) => {
      reportError(
        e.reason instanceof Error ? e.reason : new Error(String(e.reason)),
        { type: 'unhandled_rejection' }
      );
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return null;
}
