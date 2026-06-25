import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from '@/db/database';
import { api } from '@/api/client';
import Producto from '@/db/models/Producto';
import { useAuthStore } from '@/stores/authStore';
import { mapProductoToRaw } from './mappers';

/**
 * Bug 3 fix (2026-06-25) — "siempre llega TATEMADA".
 *
 * El catálogo del móvil se baja por sync incremental (`ActualizadoEn > since`,
 * ver SyncRepository.GetProductosModifiedSinceAsync). Si en el server se
 * renumeran/recrean productos con fechas NO futuras (reset+reseed, limpieza de
 * duplicados, re-importación a nivel DB), los dispositivos que ya sincronizaron
 * NUNCA vuelven a bajar el catálogo: conservan productos viejos cuyo `server_id`
 * ahora apunta a OTRO producto. Vender uno manda el `server_id` viejo y el server
 * lo guarda mapeado al producto ACTUAL de ese id (ej. id 1 = "SALSA CASERA
 * TATEMADA"). El ticket del dispositivo muestra el nombre viejo (denormalizado en
 * WDB) y la web el producto actual: divergen.
 *
 * Esta rutina hace UNA reconciliación completa del catálogo por versión: trae el
 * catálogo entero del server (pull con `lastSyncTimestamp=null`, solo productos)
 * y reemplaza la tabla local `productos` exactamente — purga registros stale
 * (cuyo `server_id` ya no existe en el server) y upsertea los actuales con el id
 * canónico `String(server_id)` (mismo invariante que `mapProductoToRaw`, para que
 * el sync incremental posterior los matchee sin duplicar). Idempotente, guardada
 * por flag de versión.
 *
 * Seguridad anti-wipe: si el fetch falla o devuelve 0 productos teniendo el local
 * poblado, NO borra nada (evita vaciar el catálogo por un error transitorio) y
 * reintenta en el próximo arranque (no setea el flag).
 */

// Bump este valor para forzar una nueva reconciliación en un fix futuro.
export const CATALOG_RECONCILE_VERSION = '2026-06-25.v1';
const FLAG_KEY = '@sync:catalogReconcile';

export interface CatalogReconcilePlan {
  /** true = abortar sin tocar nada (guard anti-wipe). */
  skipped: boolean;
  /** WDB ids locales a destruir (su server_id ya no existe en el catálogo). */
  deleteLocalIds: string[];
}

/**
 * Lógica de decisión PURA de la reconciliación (sin WDB) — testeable directo.
 * Reemplazo exacto: borra locales cuyo id (= String(server_id)) ya no está en
 * el catálogo del server; el resto se upsertea.
 *
 * Guard anti-wipe: catálogo del server vacío + local poblado = probable error
 * transitorio → skipped, no borrar nada.
 */
export function planCatalogReconcile(
  serverProducts: { id: number | string }[],
  localIds: string[],
): CatalogReconcilePlan {
  if (serverProducts.length === 0 && localIds.length > 0) {
    return { skipped: true, deleteLocalIds: [] };
  }
  const serverIds = new Set(serverProducts.map((p) => String(p.id)));
  const deleteLocalIds = localIds.filter((id) => !serverIds.has(id));
  return { skipped: false, deleteLocalIds };
}

/**
 * Reemplaza la tabla local `productos` con el set autoritativo del server.
 * Devuelve un resumen para tests/telemetría. Exportada para testeo directo.
 */
export async function reconcileLocalCatalog(serverProducts: any[]): Promise<{
  upserted: number;
  deleted: number;
  skipped: boolean;
}> {
  const collection = database.get<Producto>('productos');
  const local = await collection.query().fetch();

  const plan = planCatalogReconcile(serverProducts, local.map((lp) => lp.id));
  if (plan.skipped) {
    return { upserted: 0, deleted: 0, skipped: true };
  }

  await database.write(async () => {
    // Reemplazo completo y atómico: borra el catálogo local y lo recrea como
    // 'synced' desde el set autoritativo del server. destroyPermanently (NO
    // markAsDeleted): productos read-only, no se envía delete al server. Los
    // registros nuevos llevan id = String(server_id) (mismo invariante que
    // mapProductoToRaw) para que el sync incremental posterior matchee sin
    // duplicar. Si el write falla, rollback → nunca deja el catálogo vacío.
    await database.batch(local.map((lp) => lp.prepareDestroyPermanently()));
    await database.batch(
      serverProducts.map((sp) =>
        collection.prepareCreateFromDirtyRaw({ ...mapProductoToRaw(sp), _status: 'synced' }),
      ),
    );
  });

  return { upserted: serverProducts.length, deleted: plan.deleteLocalIds.length, skipped: false };
}

/**
 * Trae el catálogo completo del tenant y lo reconcilia. One-shot por versión.
 * Best-effort: nunca throwea (no debe bloquear el arranque/sync).
 */
export async function reconcileProductCatalogOnce(): Promise<void> {
  try {
    const done = await AsyncStorage.getItem(FLAG_KEY);
    if (done === CATALOG_RECONCILE_VERSION) return;

    // Requiere sesión activa (tenant + token).
    if (!useAuthStore.getState().user) return;

    // Catálogo completo: pull con since=null, solo productos. SIN maxRecords
    // para evitar paginación parcial (que podría disparar borrados erróneos).
    const response = await api.post('/api/mobile/sync/pull', {
      lastSyncTimestamp: null,
      entityTypes: ['productos'],
    });
    const body = (response?.data ?? {}) as Record<string, any>;
    const serverChanges = (body.data ?? body) as Record<string, any>;
    const serverProducts: any[] = Array.isArray(serverChanges.productos)
      ? serverChanges.productos
      : [];

    const result = await reconcileLocalCatalog(serverProducts);

    if (result.skipped) {
      // No setear el flag → reintentar en el próximo sync.
      if (__DEV__) {
        console.warn('[CatalogReconcile] server devolvió 0 productos con catálogo local poblado; abortado sin borrar.');
      }
      return;
    }

    await AsyncStorage.setItem(FLAG_KEY, CATALOG_RECONCILE_VERSION);
    if (__DEV__) {
      console.log(`[CatalogReconcile] OK — upserted=${result.upserted}, deleted=${result.deleted}`);
    }
  } catch (e) {
    // Best-effort: reintenta en el próximo arranque (flag no se setea).
    if (__DEV__) console.warn('[CatalogReconcile] falló (no fatal):', e);
  }
}
