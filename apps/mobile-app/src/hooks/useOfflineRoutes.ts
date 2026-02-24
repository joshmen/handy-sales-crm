import { useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import Ruta from '@/db/models/Ruta';
import RutaDetalle from '@/db/models/RutaDetalle';
import { useObservable } from './useObservable';

export function useOfflineRoutes() {
  const observable = useMemo(() => {
    return database
      .get<Ruta>('rutas')
      .query(Q.where('activo', true), Q.sortBy('fecha', Q.desc))
      .observe();
  }, []);

  return useObservable(observable);
}

export function useOfflineRutaHoy() {
  const observable = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    const tomorrowMs = todayMs + 86400000;

    return database
      .get<Ruta>('rutas')
      .query(
        Q.where('activo', true),
        Q.where('fecha', Q.gte(todayMs)),
        Q.where('fecha', Q.lt(tomorrowMs))
      )
      .observe();
  }, []);

  return useObservable(observable);
}

export function useOfflineRutaById(id: string) {
  const observable = useMemo(() => {
    return database.get<Ruta>('rutas').findAndObserve(id);
  }, [id]);

  return useObservable(observable);
}

export function useOfflineRutaDetalles(rutaId: string) {
  const observable = useMemo(() => {
    return database
      .get<RutaDetalle>('ruta_detalles')
      .query(Q.where('ruta_id', rutaId), Q.sortBy('orden', Q.asc))
      .observe();
  }, [rutaId]);

  return useObservable(observable);
}
