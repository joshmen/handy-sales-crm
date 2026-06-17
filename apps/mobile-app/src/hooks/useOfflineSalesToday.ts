import { useMemo } from 'react';
import { switchMap, map, of } from 'rxjs';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import Pedido from '@/db/models/Pedido';
import DetallePedido from '@/db/models/DetallePedido';
import { useObservable } from './useObservable';
import { useTenantLocale } from './useTenantLocale';
import { startOfDayInTz } from '@/utils/dateTz';

/**
 * Unidades totales vendidas HOY por el vendedor, de forma REACTIVA y
 * route-independent. Suma `detalle_pedidos.cantidad` de todos los pedidos de hoy
 * (venta directa + preventa + entregas), exista o no una ruta activa y estén o
 * no los productos precargados en `ruta_carga`.
 *
 * Por qué: la barra "Productos" del card de ruta solo refleja la carga
 * precargada (`ruta_carga.cantidadVendida + cantidadEntregada`), así que una
 * venta directa de un producto NO cargado —o cualquier venta sin ruta— no movía
 * ningún indicador del home. Este hook alimenta el KPI "Vendido (uds)" que vive
 * en el bloque "Resumen del día", siempre visible.
 *
 * NO se filtra por `usuario_id`: la WDB del dispositivo solo contiene los
 * pedidos del vendedor logueado (el pull trae solo los suyos y el cross-user
 * leak guard wipea la DB al cambiar de usuario). Además los pedidos traídos por
 * sync tienen `usuario_id = 0` en WDB (el pull no lo popula), así que filtrar
 * por él dejaba el KPI siempre en 0 — bug detectado en prueba real jun 2026.
 * Mismo criterio que `useOfflineOrders` (que alimenta "Ventas hoy" $ y sí
 * funciona): la WDB es de un solo vendedor, el filtro sobra.
 *
 * Reactividad: una venta directa crea pedido + detalles en una sola
 * `database.write`; el observable de pedidos re-emite (nuevo registro), el
 * `switchMap` re-suscribe la query de detalles y el total sube al instante, sin
 * depender de `ruta_carga` ni de sync.
 */
export function useOfflineSalesToday() {
  const { tz } = useTenantLocale();

  const observable = useMemo(() => {
    // Ventana real de día [00:00, 24h) en TZ del tenant. A diferencia de las
    // rutas (cuyo `fecha` es un marcador de día-calendario @ 00:00 UTC y usa
    // ±12h), `created_at` del pedido es el instante real de creación, así que la
    // ventana correcta es medianoche-a-medianoche del tenant.
    const dayStart = startOfDayInTz(tz || 'America/Mexico_City').getTime();
    const dayEnd = dayStart + 24 * 3600000;

    return database
      .get<Pedido>('pedidos')
      .query(
        Q.where('activo', true),
        // estado >= 1 (confirmado en adelante) y != 6 (cancelado): mismo criterio
        // que el KPI "Ventas hoy" ($). Excluye borradores (0) y cancelados (6).
        Q.where('estado', Q.gte(1)),
        Q.where('estado', Q.notEq(6)),
        Q.where('created_at', Q.gte(dayStart)),
        Q.where('created_at', Q.lt(dayEnd)),
      )
      .observeWithColumns(['estado', 'activo'])
      .pipe(
        switchMap((pedidos) => {
          const ids = pedidos.map((p) => p.id);
          if (ids.length === 0) return of(0);
          return database
            .get<DetallePedido>('detalle_pedidos')
            .query(Q.where('pedido_id', Q.oneOf(ids)))
            .observeWithColumns(['cantidad'])
            .pipe(
              map((detalles) =>
                detalles.reduce((sum, d) => sum + (d.cantidad ?? 0), 0),
              ),
            );
        }),
      );
  }, [tz]);

  return useObservable(observable);
}
