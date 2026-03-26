import { useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import Ruta from '@/db/models/Ruta';
import RutaDetalle from '@/db/models/RutaDetalle';
import { useObservable } from './useObservable';
import { useAuthStore } from '@/stores';

export function useOfflineRoutes() {
  const user = useAuthStore((s) => s.user);
  const observable = useMemo(() => {
    if (!user?.id) return null;
    return database
      .get<Ruta>('rutas')
      .query(
        Q.where('usuario_id', Number(user.id)),
        Q.where('activo', true),
        Q.sortBy('fecha', Q.desc)
      )
      .observe();
  }, [user?.id]);

  return useObservable(observable);
}

export function useOfflineRutaHoy() {
  const user = useAuthStore((s) => s.user);
  const observable = useMemo(() => {
    if (!user?.id) return null;
    // Widen the window to ±12h around today to handle any timezone offset.
    // A route dated "2026-03-26T00:00:00Z" should show on March 25 local (Mexico UTC-6)
    // and also on March 26 local. This ensures the route always appears on the intended day.
    const now = new Date();
    const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const windowStart = localMidnight - 12 * 3600000; // 12h before local midnight
    const windowEnd = localMidnight + 36 * 3600000;   // 36h after local midnight (covers full day + offset)

    return database
      .get<Ruta>('rutas')
      .query(
        Q.where('usuario_id', Number(user.id)),
        Q.where('activo', true),
        Q.where('fecha', Q.gte(windowStart)),
        Q.where('fecha', Q.lt(windowEnd))
      )
      .observe();
  }, [user?.id]);

  return useObservable(observable);
}

export function useOfflineRutaById(id: string | undefined) {
  const observable = useMemo(() => {
    if (!id) return null;
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
