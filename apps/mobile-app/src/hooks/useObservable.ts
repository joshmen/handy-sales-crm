import { useState, useEffect, useRef } from 'react';
import type { Observable, Subscription } from 'rxjs';

export function useObservable<T>(observable: Observable<T> | null): {
  data: T | undefined;
  isLoading: boolean;
} {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(!!observable);
  const subRef = useRef<Subscription | null>(null);

  useEffect(() => {
    if (!observable) {
      setData(undefined);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    subRef.current = observable.subscribe({
      next: (value) => {
        if (__DEV__) console.log('[useObservable] emit', Array.isArray(value) ? `${value.length} items` : typeof value);
        setData(value);
        setIsLoading(false);
      },
      error: (err) => {
        console.error('[useObservable] Error:', err);
        setIsLoading(false);
      },
    });

    return () => {
      subRef.current?.unsubscribe();
    };
  }, [observable]);

  return { data, isLoading };
}
