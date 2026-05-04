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
      const responseData = (err as { response?: { data?: unknown } })?.response?.data as
        | { message?: string; errors?: string[]; [k: string]: unknown }
        | undefined;

      const backendMsg = responseData?.message ?? (err as { message?: string })?.message;

      // FluentValidation devuelve { "FieldName": ["error1", ...] } sin .message.
      // Extraer el primer error de validación si está presente, para evitar
      // mostrar el fallback genérico cuando hay info útil del backend.
      // Reportado admin@jeyma.com 2026-05-04: edit team member fallaba con
      // error genérico aunque backend devolvía mensaje específico de validación.
      let validationFirstMsg: string | undefined;
      if (responseData && typeof responseData === 'object' && !backendMsg) {
        const candidateKeys = Object.keys(responseData).filter(
          (k) => k !== 'errors' && k !== 'message' && Array.isArray((responseData as Record<string, unknown>)[k])
        );
        for (const k of candidateKeys) {
          const arr = (responseData as Record<string, unknown>)[k] as unknown[];
          if (arr.length && typeof arr[0] === 'string') {
            validationFirstMsg = arr[0] as string;
            break;
          }
        }
      }

      const effective = backendMsg ?? validationFirstMsg;

      // Ignore the generic axios "Request failed with status code ..." boilerplate —
      // that's not a real business message.
      const isGeneric =
        !effective ||
        effective.toLowerCase().startsWith('request failed with status') ||
        effective.toLowerCase() === 'network error';

      if (isGeneric) {
        toast.error(fallbackMessage);
        return;
      }

      toast.error(tApi(effective));
    },
    [tApi]
  );
}
