import { useEffect, useRef, useCallback } from 'react';
import { useApi } from './useApi';
import { AxiosRequestConfig } from 'axios';

interface UseApiQueryOptions<T> {
  enabled?: boolean;
  refetchInterval?: number;
  refetchOnWindowFocus?: boolean;
  staleTime?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error | unknown) => void;
  initialData?: T;
}

export function useApiQuery<T = unknown>(
  key: string | string[],
  url: string,
  config?: AxiosRequestConfig,
  options?: UseApiQueryOptions<T>
) {
  const {
    enabled = true,
    refetchInterval,
    refetchOnWindowFocus = true,
    staleTime = 5 * 60 * 1000,
    ...apiOptions
  } = options || {};

  const queryKey = Array.isArray(key) ? key.join('-') : key;
  const lastFetchTime = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const api = useApi<T>(url, config, {
    ...apiOptions,
    cache: true,
    cacheTime: staleTime,
  });

  const isStale = useCallback(() => {
    return Date.now() - lastFetchTime.current > staleTime;
  }, [staleTime]);

  const fetchData = useCallback(async () => {
    if (enabled && (lastFetchTime.current === 0 || isStale())) {
      const result = await api.execute();
      lastFetchTime.current = Date.now();
      return result;
    }
  }, [enabled, api.execute, isStale]);

  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [enabled, queryKey, fetchData]);

  useEffect(() => {
    if (refetchInterval && enabled) {
      intervalRef.current = setInterval(() => {
        fetchData();
      }, refetchInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [refetchInterval, enabled, fetchData]);

  useEffect(() => {
    if (!refetchOnWindowFocus || !enabled) return;

    const handleFocus = () => {
      if (isStale()) {
        fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, enabled, fetchData, isStale]);

  return {
    ...api,
    refetch: fetchData,
    isStale: isStale(),
  };
}
