import { useState, useEffect, useCallback } from 'react';
import { watchPosition } from '@/services/geoCheckin';
import type * as Location from 'expo-location';

interface Coordinates {
  latitude: number;
  longitude: number;
}

export function useLocationTracking(enabled: boolean) {
  const [position, setPosition] = useState<Coordinates | null>(null);

  useEffect(() => {
    if (!enabled) {
      setPosition(null);
      return;
    }

    let subscription: Location.LocationSubscription | null = null;
    let mounted = true;

    (async () => {
      try {
        subscription = await watchPosition((coords) => {
          if (mounted) setPosition(coords);
        }, 10000);
      } catch (e) {
        // Permission denied or location unavailable — silent fail
        if (__DEV__) console.warn('[Location]', e);
      }
    })();

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [enabled]);

  const refresh = useCallback(async () => {
    try {
      const { getCurrentPosition } = await import('@/services/geoCheckin');
      const coords = await getCurrentPosition();
      setPosition(coords);
    } catch (e) {
      // silent
      if (__DEV__) console.warn('[Location]', e);
    }
  }, []);

  return { position, refresh };
}
