/**
 * B.1 eager-save (fix prod 2026-06-04 post-incidente Rodrigo).
 *
 * Después de que el vendedor crea un Pedido offline en WatermelonDB local,
 * disparamos en fire-and-forget este helper para que el server tenga una
 * copia con Estado=Borrador INMEDIATAMENTE — antes de que el sync push
 * normal eventually lo mande. Garantiza durabilidad server-side si el
 * SQLite local se borra (uninstall, factory reset, corruption).
 *
 * Comportamiento offline-first preservado:
 *  - Si NO hay red: la llamada falla silenciosamente. El sync push normal
 *    eventualmente lo subirá cuando vuelva la red.
 *  - Si hay red intermitente: withRetry hace 2 intentos con backoff exponencial
 *    (1s, 2s). Si ambos fallan, fallback al sync push.
 *  - Si hay red OK: el server retorna 200 con serverId; actualizamos el WDB
 *    Pedido.serverId para que el próximo sync push NO duplique.
 *
 * Idempotencia garantizada server-side vía mobile_record_id (WDB id) — si
 * el mismo eager-save se reintenta (cliente y server crashearon entre push y
 * ack), el server retorna el Pedido existente sin crear duplicado.
 */

import { withRetry } from '@/sync/retry';
import { crashReporter } from '@/services/crashReporter';
import { database } from '@/db/database';
import { pedidosApi, type PedidoEagerSavePayload } from '@/api/orders';
import type Pedido from '@/db/models/Pedido';
import type { OfflineOrderItem } from '@/db/actions';

interface EagerSaveOptions {
  /** Si true, throw el error en vez de capturarlo. Útil para tests. */
  rethrow?: boolean;
}

/**
 * Dispara el eager-save del pedido recién creado. Llamar DESPUÉS de que
 * database.write() resolvió — el `pedido` debe tener `id` asignado por WDB.
 *
 * SIEMPRE usar como fire-and-forget: `void eagerSavePedido(pedido, items)`.
 * No bloquea ni la UI ni el sync engine. El error se reporta a crashReporter
 * pero no se propaga (excepto en tests con `rethrow: true`).
 */
export async function eagerSavePedido(
  pedido: Pedido,
  items: OfflineOrderItem[],
  options: EagerSaveOptions = {},
): Promise<void> {
  // Mapear WDB Pedido + items al payload del endpoint.
  // Nota: el server NO recalcula BOGO/tasas en eager-save (solo persiste como
  // Borrador). Los montos pre-calculados client-side se respetan tal cual.
  // El sync push posterior promueve el Estado y recalcula si hace falta.
  const payload: PedidoEagerSavePayload = {
    mobileRecordId: pedido.id,
    clienteId: pedido.clienteServerId ?? 0,
    fechaPedido: pedido.fechaPedido?.toISOString() ?? new Date().toISOString(),
    tipoVenta: pedido.tipoVenta,
    subtotal: pedido.subtotal,
    descuento: pedido.descuento,
    impuesto: pedido.impuesto,
    total: pedido.total,
    notas: pedido.notas ?? null,
    latitud: pedido.latitud ?? null,
    longitud: pedido.longitud ?? null,
    detalles: items.map((item) => {
      const lineSubtotal = item.precioUnitario * item.cantidad - (item.descuento ?? 0);
      return {
        productoId: item.productoServerId ?? 0,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        descuento: item.descuento ?? 0,
        subtotal: lineSubtotal,
        impuesto: 0, // server reconcilia en sync push
        total: lineSubtotal,
      };
    }),
  };

  // Skip if no clienteServerId — el pedido es para un cliente creado offline
  // que aún no se sincronizó; el sync push normal manejará ambos juntos.
  if (payload.clienteId === 0) {
    return;
  }

  try {
    // withRetry: 2 intentos con backoff exponencial. Cota ligera porque el sync
    // push normal eventually toma over si esto falla.
    const result = await withRetry('eagerSavePedido', () => pedidosApi.eagerSave(payload), {
      maxAttempts: 2,
      baseDelayMs: 1000,
      maxDelayMs: 5000,
    });

    // Update WDB Pedido.serverId para que el próximo sync push detecte el match
    // vía server_id y NO duplique. Skip update si el pedido ya tiene serverId
    // (race: sync push corrió antes que nosotros).
    if (result.serverId && !pedido.serverId) {
      await database.write(async () => {
        await pedido.update((record: any) => {
          record.serverId = result.serverId;
        });
      });
    }
  } catch (err) {
    // Silent fail — no romper UI, sync push se encarga eventualmente.
    const error = err instanceof Error ? err : new Error(String(err));
    if (__DEV__) {
      console.warn('[EagerSave] failed (silent, sync push will retry):', error.message);
    }
    // Log a crashReporter solo si es un error 5xx o inesperado — los 4xx
    // (auth fail, bad request) son señales de que algo está mal en el cliente
    // que el sync push también va a fallar; no spammear el log con cada uno.
    crashReporter.reportCrash(error, 'eagerSavePedido', 'WARNING');

    if (options.rethrow) {
      throw error;
    }
  }
}
