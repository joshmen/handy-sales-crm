import { useMemo } from 'react';
import {
  useOfflineClients,
  useOfflineRutaHoy,
  useOfflineRutaDetalles,
  useOfflineTodayVisits,
} from '@/hooks';
import type Cliente from '@/db/models/Cliente';
import type RutaDetalle from '@/db/models/RutaDetalle';
import type Ruta from '@/db/models/Ruta';
import { ROUTE_ESTADO, STOP_ESTADO } from '@/utils/mapColors';

export interface MapClient {
  id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  latitude: number;
  longitude: number;
  activo: boolean;
  zonaId: number | null;
  categoriaId: number | null;
  serverId: number | null;
}

export interface RouteProgress {
  completed: number;
  total: number;
  percent: number;
}

export function useMapData(search?: string, zonaId?: number) {
  const { data: allClients, isLoading: clientsLoading } = useOfflineClients(search, zonaId);
  const { data: rutas, isLoading: rutasLoading } = useOfflineRutaHoy();
  const route = (rutas && rutas.length > 0 ? rutas[0] : null) as Ruta | null;
  const { data: stops } = useOfflineRutaDetalles(route?.id ?? '');
  const { data: todayVisits } = useOfflineTodayVisits();

  // Clients with valid coordinates
  const mappableClients = useMemo<MapClient[]>(() => {
    if (!allClients) return [];
    return (allClients as Cliente[])
      .filter((c) => c.latitud != null && c.longitud != null)
      .map((c) => ({
        id: c.id,
        nombre: c.nombre,
        direccion: c.direccion,
        telefono: c.telefono,
        latitude: c.latitud!,
        longitude: c.longitud!,
        activo: c.activo,
        zonaId: c.zonaId,
        categoriaId: c.categoriaId,
        serverId: c.serverId,
      }));
  }, [allClients]);

  // Map clienteId → client location (for polyline coordinate lookup)
  const clientLocationMap = useMemo(() => {
    const map = new Map<string, MapClient>();
    for (const c of mappableClients) {
      map.set(c.id, c);
    }
    return map;
  }, [mappableClients]);

  // Map clienteId → stop estado (for marker coloring)
  const routeStopMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!stops) return map;
    for (const s of stops as RutaDetalle[]) {
      map.set(s.clienteId, s.estado);
    }
    return map;
  }, [stops]);

  // Set of clienteIds visited today (for marker coloring)
  const todayVisitSet = useMemo(() => {
    const set = new Set<string>();
    if (!todayVisits) return set;
    for (const v of todayVisits) {
      set.add((v as any).clienteId);
    }
    return set;
  }, [todayVisits]);

  // Ordered route coordinates for polyline
  const routeCoordinates = useMemo(() => {
    if (!stops) return [];
    return (stops as RutaDetalle[])
      .map((s) => {
        const client = clientLocationMap.get(s.clienteId);
        if (!client) return null;
        return { latitude: client.latitude, longitude: client.longitude };
      })
      .filter(Boolean) as { latitude: number; longitude: number }[];
  }, [stops, clientLocationMap]);

  // Stops with client coordinates merged
  const stopsWithCoords = useMemo(() => {
    if (!stops) return [];
    return (stops as RutaDetalle[])
      .map((s) => {
        const client = clientLocationMap.get(s.clienteId);
        return {
          stop: s,
          clienteNombre: client?.nombre ?? 'Cliente',
          clienteDireccion: client?.direccion ?? null,
          clienteTelefono: client?.telefono ?? null,
          clienteServerId: client?.serverId ?? null,
          latitude: client?.latitude ?? null,
          longitude: client?.longitude ?? null,
        };
      })
      .filter((s) => s.latitude != null && s.longitude != null);
  }, [stops, clientLocationMap]);

  // Current stop = first pending or active
  const currentStopIndex = useMemo(() => {
    return stopsWithCoords.findIndex(
      (s) => s.stop.estado === STOP_ESTADO.PENDIENTE || s.stop.estado === STOP_ESTADO.EN_VISITA
    );
  }, [stopsWithCoords]);

  // Next stop = first pending after current
  const nextStop = useMemo(() => {
    if (currentStopIndex < 0) return null;
    const current = stopsWithCoords[currentStopIndex];
    if (current.stop.estado === STOP_ESTADO.EN_VISITA) {
      // Currently visiting — next is the next pending
      const next = stopsWithCoords.find(
        (s, i) => i > currentStopIndex && s.stop.estado === STOP_ESTADO.PENDIENTE
      );
      return next ?? null;
    }
    return current;
  }, [stopsWithCoords, currentStopIndex]);

  // Route progress
  const routeProgress = useMemo<RouteProgress>(() => {
    if (!stopsWithCoords.length) return { completed: 0, total: 0, percent: 0 };
    const completed = stopsWithCoords.filter(
      (s) => s.stop.estado === STOP_ESTADO.COMPLETADA || s.stop.estado === STOP_ESTADO.OMITIDA
    ).length;
    const total = stopsWithCoords.length;
    return {
      completed,
      total,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [stopsWithCoords]);

  const isRouteActive = route?.estado === ROUTE_ESTADO.EN_PROGRESO;

  return {
    mappableClients,
    clientLocationMap,
    route,
    stops: stopsWithCoords,
    routeCoordinates,
    routeStopMap,
    todayVisitSet,
    currentStopIndex,
    nextStop,
    routeProgress,
    isRouteActive,
    isLoading: clientsLoading || rutasLoading,
  };
}
