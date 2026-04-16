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
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
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
