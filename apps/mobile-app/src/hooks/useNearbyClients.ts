import { useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import Cliente from '@/db/models/Cliente';
import { useObservable } from './useObservable';
import { useUserLocation } from './useLocation';
import { haversineMeters } from '@/utils/haversine';

export interface NearbyCliente {
  cliente: Cliente;
  distanciaM: number;
}

const DEFAULT_RADIUS_KM = 0.5; // 500m por default
const DEFAULT_LIMIT = 10;

/**
 * Devuelve clientes con coords dentro del radio dado, ordenados por distancia
 * ascendente. Reactivo: re-evalúa cuando cambia la ubicación del vendedor o
 * el observable de WatermelonDB. SIN red — Haversine puro JS sobre records
 * sincronizados localmente.
 *
 * Si el GPS no está disponible o no hay clientes con coords, retorna lista
 * vacía silenciosamente (graceful degradation).
 */
export function useNearbyClients(radiusKm: number = DEFAULT_RADIUS_KM, limit: number = DEFAULT_LIMIT) {
  const { location, loading: gpsLoading, error: gpsError } = useUserLocation();

  // Observa todos los clientes activos. Filtramos por coords presentes en JS
  // porque WDB no soporta Q.notEq(null) sobre @field number consistentemente.
  const observable = useMemo(
    () => database.get<Cliente>('clientes').query(Q.where('activo', true)).observe(),
    [],
  );
  const { data: clientes, isLoading: dbLoading } = useObservable(observable);

  const nearby = useMemo<NearbyCliente[]>(() => {
    if (!location || !clientes) return [];
    const center = { latitud: location.latitude, longitud: location.longitude };
    const radiusM = radiusKm * 1000;

    return clientes
      .filter(c => c.latitud != null && c.longitud != null)
      .map(c => ({
        cliente: c,
        distanciaM: haversineMeters(center, { latitud: c.latitud as number, longitud: c.longitud as number }),
      }))
      .filter(x => x.distanciaM <= radiusM)
      .sort((a, b) => a.distanciaM - b.distanciaM)
      .slice(0, limit);
  }, [location, clientes, radiusKm, limit]);

  return {
    nearby,
    isLoading: gpsLoading || dbLoading,
    hasGps: !!location,
    gpsError,
  };
}
