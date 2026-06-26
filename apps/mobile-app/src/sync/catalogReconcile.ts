import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DirtyRaw } from '@nozbe/watermelondb/RawRecord';
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
 * y reconcilia la tabla local `productos` — purga registros stale (cuyo
 * `server_id` ya no existe en el server), actualiza los existentes con la
 * identidad actual, y crea los nuevos con el id canónico `String(server_id)`
 * (mismo invariante que `mapProductoToRaw`, para que el sync incremental posterior
 * los matchee sin duplicar). Idempotente, guardada por flag de versión.
 *
 * Seguridad: TODA la reconciliación va en UN solo `database.batch(...)` — una
 * sola transacción SQLite, atómica (si falla, rollback completo; no deja el
 * catálogo a medias/vacío). Guards anti-wipe: respuesta vacía, o respuesta
 * sospechosamente menor al catálogo local (truncamiento) → no toca nada y
 * reintenta en el próximo sync.
 */

// Bump este valor para forzar una nueva reconciliación en un fix futuro.
export const CATALOG_RECONCILE_VERSION = '2026-06-25.v1';
const FLAG_KEY = '@sync:catalogReconcile';

// Guard de ratio: si el catálogo local tiene al menos N productos y el server
// devuelve menos del R% de ellos, asumimos respuesta truncada/erronea y NO
// borramos (evita vaciar el catálogo por un bug del server). Conservador: solo
// atrapa truncamientos gruesos, no borrados legítimos moderados.
const RATIO_GUARD_MIN_LOCAL = 8;
const RATIO_GUARD_MIN_SERVER_FRACTION = 0.25;

export interface CatalogReconcilePlan {
  /** true = abortar sin tocar nada (guards anti-wipe). */
  skipped: boolean;
  /** WDB ids locales a destruir (su server_id ya no existe en el catálogo). */
  deleteLocalIds: string[];
}

/**
 * Lógica de decisión PURA de la reconciliación (sin WDB) — testeable directo.
 * Reemplazo exacto: borra locales cuyo id (= String(server_id)) ya no está en el
 * catálogo del server; el resto se upsertea.
 *
 * Guards anti-wipe:
 *  1) server vacío + local poblado → skip (probable error transitorio).
 *  2) ratio: local grande + server devuelve una fracción mínima → skip
 *     (probable truncamiento del server).
 */
export function planCatalogReconcile(
  serverProducts: { id: number | string }[],
  localIds: string[],
): CatalogReconcilePlan {
  const serverIds = new Set(serverProducts.map((p) => String(p.id)));

  // Guard 1: catálogo del server vacío con local poblado.
  if (serverIds.size === 0 && localIds.length > 0) {
    return { skipped: true, deleteLocalIds: [] };
  }
  // Guard 2: respuesta sospechosamente truncada.
  if (
    localIds.length >= RATIO_GUARD_MIN_LOCAL &&
    serverIds.size < localIds.length * RATIO_GUARD_MIN_SERVER_FRACTION
  ) {
    return { skipped: true, deleteLocalIds: [] };
  }

  const deleteLocalIds = localIds.filter((id) => !serverIds.has(id));
  return { skipped: false, deleteLocalIds };
}

/** Asigna los campos de un DirtyRaw de producto a un modelo WDB (para update). */
function applyRawToModel(m: Producto, raw: DirtyRaw): void {
  m.serverId = (raw.server_id as number) ?? null;
  m.nombre = (raw.nombre as string) ?? '';
  m.descripcion = (raw.descripcion as string | null) ?? null;
  m.sku = (raw.sku as string | null) ?? null;
  m.codigoBarras = (raw.codigo_barras as string | null) ?? null;
  m.precio = (raw.precio as number) ?? 0;
  m.categoriaId = (raw.categoria_id as number | null) ?? null;
  m.familiaId = (raw.familia_id as number | null) ?? null;
  m.unidadMedidaId = (raw.unidad_medida_id as number | null) ?? null;
  m.unidadMedidaNombre = (raw.unidad_medida_nombre as string | null) ?? null;
  m.stockDisponible = (raw.stock_disponible as number) ?? 0;
  m.stockMinimo = (raw.stock_minimo as number) ?? 0;
  m.imagenUrl = (raw.imagen_url as string | null) ?? null;
  m.activo = (raw.activo as boolean) ?? true;
  m.version = (raw.version as number) ?? 1;
  m.precioIncluyeIva = (raw.precio_incluye_iva as boolean) ?? true;
  m.tasaImpuestoId = (raw.tasa_impuesto_id as number | null) ?? null;
  m.tasa = (raw.tasa as number) ?? 0.16;
  m.updatedAt = new Date((raw.updated_at as number) ?? Date.now());
}

/**
 * Reconcilia la tabla local `productos` con el set autoritativo del server.
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

  // Dedup por id (last-write-wins): el server puede emitir el mismo id dos veces
  // (joins sin DISTINCT, dedup de catalogo mid-flight). Sin esto, dos INSERT con
  // el mismo PK rompen el batch entero. El path normal usa dedupeChangeset; aquí
  // lo replicamos con un Map.
  const byId = new Map<string, any>();
  for (const sp of serverProducts) byId.set(String(sp.id), sp);

  const localById = new Map(local.map((lp) => [lp.id, lp] as const));
  const deleteSet = new Set(plan.deleteLocalIds);

  // UN solo batch = UNA transacción SQLite = atómico. Si cualquier op falla,
  // SQLite revierte TODO el batch (no deja el catálogo a medias/vacío). Cada id
  // aparece en exactamente una categoría (huérfano→destroy, existente→update,
  // nuevo→create), así que no hay destroy+create del mismo id en el batch.
  const ops: any[] = [];
  for (const lp of local) {
    if (deleteSet.has(lp.id)) {
      // destroyPermanently (NO markAsDeleted): productos read-only en mobile, no
      // se envía un delete al server.
      ops.push(lp.prepareDestroyPermanently());
    }
  }
  for (const [id, sp] of byId) {
    const raw = mapProductoToRaw(sp);
    const existing = localById.get(id);
    if (existing) {
      ops.push(existing.prepareUpdate((m: Producto) => applyRawToModel(m, raw)));
    } else {
      ops.push(collection.prepareCreateFromDirtyRaw({ ...raw, _status: 'synced' }));
    }
  }

  await database.write(async () => {
    await database.batch(ops);
  });

  return { upserted: byId.size, deleted: plan.deleteLocalIds.length, skipped: false };
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

    // Catálogo completo: pull con since=null, solo productos. SIN maxRecords para
    // evitar paginación parcial (que dispararia borrados erróneos).
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
        console.warn('[CatalogReconcile] respuesta vacía/truncada; abortado sin borrar.');
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
