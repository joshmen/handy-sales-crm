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
    // Window simétrico de ±12h alrededor del inicio de día en TZ tenant.
    // Una ruta con fecha "2026-05-06T00:00:00Z" representa "miércoles 6 mayo"
    // en cualquier TZ (convención: fecha = día calendario @ 00:00 UTC).
    // Para martes 5 mayo CDMX (tenantMidnight = 5 mayo 06:00 UTC):
    //   window = [4 mayo 18:00 UTC, 5 mayo 18:00 UTC]
    //   - MARTES (5 mayo 00:00 UTC) → dentro ✓
    //   - MIERCOLES (6 mayo 00:00 UTC) → fuera ✓
    // Bug previo (2026-05-05): el end era +36h en vez de +12h, lo cual
    // incluía rutas del día siguiente y vendedor2 vio "RUTA DE MIERCOLES"
    // en su pantalla "Hoy" cuando aún era martes — y aceptó la ruta por
    // error pensando que era la de hoy.
    const tenantMidnight = startOfDayInTz(tz).getTime();
    const windowStart = tenantMidnight - 12 * 3600000;
    const windowEnd = tenantMidnight + 12 * 3600000;

    return database
      .get<Ruta>('rutas')
      .query(
        Q.where('usuario_id', Number(user.id)),
        Q.where('activo', true),
        Q.where('fecha', Q.gte(windowStart)),
        Q.where('fecha', Q.lt(windowEnd)),
        // Excluir estados terminales/no-accionables:
        // - Completada (2): vendedor terminó todas las paradas; va al historial
        // - Cancelada (3): admin la canceló
        // - Cerrada (6): admin cerró formalmente
        // Reportado 2026-05-05: tras completar una ruta y recibir la siguiente,
        // tap en notif abría la completada (no la nueva). Filtrar Completada
        // hace que useOfflineRutaHoy solo retorne rutas accionables.
        Q.where('estado', Q.notIn([2, 3, 6])),
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
