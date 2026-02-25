import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { requestLocationWithDialog } from '@/utils/permissions';

interface UserLocation {
  latitude: number;
  longitude: number;
}

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const granted = await requestLocationWithDialog();
        if (!granted) {
          if (mounted) {
            setError('Permiso de ubicación denegado');
            setLoading(false);
          }
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (mounted) {
          setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      } catch (e) {
        if (mounted) {
          setError('No se pudo obtener la ubicación');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  return { location, loading, error };
}
