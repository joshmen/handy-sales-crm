import { useState, useEffect, useRef } from 'react';
import type { Observable, Subscription } from 'rxjs';

export function useObservable<T>(observable: Observable<T>): {
  data: T | undefined;
  isLoading: boolean;
} {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const subRef = useRef<Subscription | null>(null);

  useEffect(() => {
    setIsLoading(true);
    subRef.current = observable.subscribe({
      next: (value) => {
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
