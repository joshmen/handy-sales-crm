"use client";

import { useCallback, useState } from "react";
import { useLoading } from "@/contexts/LoadingContext";

interface UseApiLoadingOptions {
  showGlobalLoader?: boolean;
}

/**
 * Hook para manejar estados de loading de API calls
 *
 * @example
 * // Con loader global (overlay)
 * const { execute, isLoading } = useApiLoading();
 * await execute(() => api.get('/clients'));
 *
 * @example
 * // Sin loader global (solo estado local)
 * const { execute, isLoading } = useApiLoading({ showGlobalLoader: false });
 * await execute(() => api.post('/clients', data));
 */
export function useApiLoading<T = unknown>(options: UseApiLoadingOptions = {}) {
  const { showGlobalLoader = true } = options;
  const { withLoading } = useLoading();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (apiCall: () => Promise<T>): Promise<T> => {
      setIsLoading(true);
      setError(null);

      try {
        if (showGlobalLoader) {
          return await withLoading(apiCall());
        } else {
          return await apiCall();
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [showGlobalLoader, withLoading]
  );

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    execute,
    isLoading,
    error,
    reset,
  };
}

/**
 * Hook para operaciones de mutación (create, update, delete)
 * Muestra el loader global automáticamente
 */
export function useMutationLoading<T = unknown>() {
  return useApiLoading<T>({ showGlobalLoader: true });
}

/**
 * Hook para operaciones de lectura (fetch, list)
 * NO muestra el loader global por defecto (usa skeletons locales)
 */
export function useQueryLoading<T = unknown>() {
  return useApiLoading<T>({ showGlobalLoader: false });
}
