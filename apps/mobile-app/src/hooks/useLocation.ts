import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { requestLocationWithDialog } from '@/utils/permissions';

interface UserLocation {
  latitude: number;
  longitude: number;
}

// Timeout para getCurrentPositionAsync. Sin esto, en interiores sin GPS y sin
// posición cacheada el spinner del mapa quedaba indefinido.
const GPS_TIMEOUT_MS = 8_000;

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

        // Race entre la lectura GPS real y un timeout para no bloquear UI
        // si el sensor está colgado (interior sin señal, mock provider, etc.).
        const loc = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), GPS_TIMEOUT_MS)),
        ]);

        if (!mounted) return;

        if (!loc) {
          // Timeout: intentar última posición conocida como fallback antes de fallar.
          const last = await Location.getLastKnownPositionAsync().catch(() => null);
          if (last && mounted) {
            setLocation({
              latitude: last.coords.latitude,
              longitude: last.coords.longitude,
            });
          } else if (mounted) {
            setError('GPS no disponible (timeout)');
          }
        } else {
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
