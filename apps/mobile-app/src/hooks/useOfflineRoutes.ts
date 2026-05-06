import { useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import Ruta from '@/db/models/Ruta';
import RutaDetalle from '@/db/models/RutaDetalle';
import RutaPedido from '@/db/models/RutaPedido';
import RutaCarga from '@/db/models/RutaCarga';
import { useObservable } from './useObservable';
import { useAuthStore } from '@/stores';
import { useEmpresa } from './useEmpresa';
import { startOfDayInTz } from '@/utils/dateTz';

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
  const { data: empresa } = useEmpresa();
  const tz = empresa?.timezone || 'America/Mexico_City';

  const observable = useMemo(() => {
    if (!user?.id) return null;
    // Window de ±12h alrededor del inicio de día en TZ tenant.
    // Un ruta con fecha "2026-03-26T00:00:00Z" debe aparecer tanto en marzo 25
    // local (Mexico UTC-6) como marzo 26 local. El ±12h cubre cualquier offset.
    // Usar tenant TZ en vez de device TZ corrige el bug cuando vendedor tiene
    // device en otra zona o tenant opera en TZ distinta a CDMX.
    const tenantMidnight = startOfDayInTz(tz).getTime();
    const windowStart = tenantMidnight - 12 * 3600000;
    const windowEnd = tenantMidnight + 36 * 3600000;

    return database
      .get<Ruta>('rutas')
      .query(
        Q.where('usuario_id', Number(user.id)),
        Q.where('activo', true),
        Q.where('fecha', Q.gte(windowStart)),
        Q.where('fecha', Q.lt(windowEnd)),
        // Excluir estados terminales: Cancelada (3), Cerrada (6). Reportado
        // 2026-05-05: vendedor2 veía solo "RUTA DE MARTES Cancelada" en
        // pantalla "Hoy" mientras la nueva ruta asignada no aparecía. La
        // ruta cancelada ya no es accionable y solo confunde.
        Q.where('estado', Q.notIn([3, 6])),
      )
      .observe();
  }, [user?.id, tz]);

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

/**
 * Pedidos cargados a la ruta (admin asigna desde web). Read-only en mobile.
 * Permite al vendedor ver qué pedidos lleva físicamente en el camión para entregar.
 */
export function useOfflineRutaPedidos(rutaId: string) {
  const observable = useMemo(() => {
    if (!rutaId) return null;
    return database
      .get<RutaPedido>('ruta_pedidos')
      .query(Q.where('ruta_id', rutaId), Q.where('activo', true))
      .observe();
  }, [rutaId]);

  return useObservable(observable);
}

/**
 * Productos sueltos cargados a la ruta para venta directa libre durante el día.
 * Read-only en mobile (admin define la carga desde web).
 */
export function useOfflineRutaCarga(rutaId: string) {
  const observable = useMemo(() => {
    if (!rutaId) return null;
    return database
      .get<RutaCarga>('ruta_carga')
      .query(Q.where('ruta_id', rutaId), Q.where('activo', true))
      .observe();
  }, [rutaId]);

  return useObservable(observable);
}
