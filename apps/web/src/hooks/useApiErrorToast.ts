'use client';

import { useCallback } from 'react';
import { toast } from '@/hooks/useToast';
import { useBackendTranslation } from '@/hooks/useBackendTranslation';

/**
 * Uniform error toast for API failures.
 *
 * Extracts the backend business-rule message from an axios-style error, runs it
 * through the `tApi` translator (backendMessages dict + bidirectional regex
 * patterns), and shows a toast. Falls back to a caller-provided generic message
 * only when the backend did not return a message.
 *
 * Replaces the anti-pattern `catch (_err) { toast.error(t('errorSaving')) }` which
 * swallows the backend message and leaves the user guessing what went wrong.
 *
 * Usage:
 *   const showApiError = useApiErrorToast();
 *   try {
 *     await service.create(dto);
 *   } catch (err) {
 *     showApiError(err, t('errorCreating')); // t('errorCreating') is the fallback
 *   }
 */
export function useApiErrorToast() {
  const { tApi } = useBackendTranslation();

  return useCallback(
    (err: unknown, fallbackMessage: string): void => {
      const backendMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as { message?: string })?.message;

      // Ignore the generic axios "Request failed with status code ..." boilerplate —
      // that's not a real business message.
      const isGeneric =
        !backendMsg ||
        backendMsg.toLowerCase().startsWith('request failed with status') ||
        backendMsg.toLowerCase() === 'network error';

      if (isGeneric) {
        toast.error(fallbackMessage);
        return;
      }

      toast.error(tApi(backendMsg));
    },
    [tApi]
  );
}
