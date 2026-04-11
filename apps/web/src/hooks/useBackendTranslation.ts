import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

/**
 * Hook that provides a function to translate backend API messages.
 * Backend sends messages in Spanish; this maps them to the user's locale.
 *
 * Usage:
 *   const { tApi } = useBackendTranslation();
 *   toast.error(tApi(response.data.message) || t('fallback'));
 */
export function useBackendTranslation() {
  const t = useTranslations('backendMessages');

  const tApi = useCallback(
    (message: string | undefined | null): string => {
      if (!message) return '';
      try {
        const translated = t(message);
        return translated;
      } catch {
        // Key not found in translations — return original message
        return message;
      }
    },
    [t]
  );

  return { tApi };
}
