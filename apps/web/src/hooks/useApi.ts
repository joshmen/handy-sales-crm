import { useState, useCallback, useRef, useEffect } from 'react';
import { AxiosError, AxiosRequestConfig } from 'axios';
import apiInstance, { ApiError, handleApiError } from '@/lib/api';

interface UseApiOptions<T> {
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError) => void;
  cache?: boolean;
  cacheTime?: number;
}

interface UseApiReturn<T> {
  data: T | undefined;
  loading: boolean;
  error: ApiError | null;
  execute: (data?: Record<string, unknown>) => Promise<T | undefined>;
  reset: () => void;
  setData: (data: T) => void;
}

const cache = new Map<string, { data: unknown; timestamp: number }>();

export function useApi<T = unknown>(
  url: string | ((data?: Record<string, unknown>) => string),
  config?: AxiosRequestConfig,
  options?: UseApiOptions<T>
): UseApiReturn<T> {
  const [data, setData] = useState<T | undefined>(options?.initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    async (data?: Record<string, unknown>): Promise<T | undefined> => {
      const finalUrl = typeof url === 'function' ? url(data) : url;
      const cacheKey = `${config?.method || 'GET'}-${finalUrl}-${JSON.stringify(config?.params)}`;

      if (options?.cache && cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        const cacheExpired =
          cached && Date.now() - cached.timestamp > (options.cacheTime || 5 * 60 * 1000);

        if (cached && !cacheExpired) {
          setData(cached.data as T);
          return cached.data as T;
        }
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);

      try {
        const response = await apiInstance.request<T>({
          url: finalUrl,
          signal: abortControllerRef.current.signal,
          ...config,
          ...(data && config?.method !== 'GET' ? { data } : {}),
        });

        const responseData = response.data;

        if (options?.cache) {
          cache.set(cacheKey, { data: responseData, timestamp: Date.now() });
        }

        setData(responseData);
        options?.onSuccess?.(responseData);

        return responseData;
      } catch (err) {
        if ((err as AxiosError).name === 'CanceledError') {
          return undefined;
        }

        const apiError = handleApiError(err);
        setError(apiError);
        options?.onError?.(apiError);

        return undefined;
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [url, config, options]
  );

  const reset = useCallback(() => {
    setData(options?.initialData);
    setError(null);
    setLoading(false);
  }, [options?.initialData]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
    setData,
  };
}
