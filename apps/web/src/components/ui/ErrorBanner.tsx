import React from 'react';
import { useTranslations } from 'next-intl';

interface ErrorBannerProps {
  error: string | null;
  onRetry?: () => void;
  retryLabel?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  error,
  onRetry,
  retryLabel,
}) => {
  const tc = useTranslations('common');
  const label = retryLabel ?? tc('retry');
  if (!error) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm"
    >
      {error}
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-4 underline hover:no-underline"
        >
          {label}
        </button>
      )}
    </div>
  );
};
