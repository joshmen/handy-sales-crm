import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import { secureStorage } from '@/utils/storage';
import { STORAGE_KEYS } from '@/utils/constants';
import UbicacionVendedor from '@/db/models/UbicacionVendedor';
// 2026-06-08 — anti-spam throttle pre-persist. Modulo puro sin deps nativas
// para que sea testeable. Re-export desde aqui para mantener backward compat
// con tests/imports previos que vivian en locationBackgroundTask.
import {
  filterCheckpointsByThrottle,
  ACCURACY_MAX_METERS,
  MIN_INTERVAL_SECONDS,
  MIN_DISTANCE_METERS,
  type PersistedCheckpoint,
} from './locationThrottle';
export { filterCheckpointsByThrottle, ACCURACY_MAX_METERS, MIN_INTERVAL_SECONDS, MIN_DISTANCE_METERS };

/**
 * Background location task — corre en JS context SEPARADO cuando el OS entrega
 * locations al foreground service. Sobrevive app kill + screen lock.
 *
 * Reliability Sprint Fase 3 — el `setInterval` foreground del checkpoint
 * antiguo morí­a cuando vendedor cierra app. Esto reemplaza ese mecanismo con
 * native foreground service (Android) + UIBackgroundModes location (iOS).
 *
 * CRÍTICO: el handler de TaskManager.defineTask NO tiene acceso al React tree
 * (no hooks, no stores Zustand, no QueryClient). Solo singletons + AsyncStorage/
 * SecureStore. Por eso leemos usuarioId del SecureStore en lugar del store.
 */
export const LOCATION_TASK_NAME = 'handysuites-location-checkpoint';

// Aux: leer usuarioId persistido (set por el flujo de login en authStore).
// Si SecureStore falla o no hay user, retornamos null y skip el ping.
async function getCurrentUsuarioIdForBackgroundTask(): Promise<number | null> {
  try {
    const raw = await secureStorage.get(STORAGE_KEYS.USER_DATA);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: number | string };
    const id = typeof parsed.id === 'number' ? parsed.id : parseInt(String(parsed.id ?? '0'), 10);
    return id > 0 ? id : null;
  } catch {
    return null;
  }
}

/**
 * Last persisted Checkpoint del usuario. Usado para throttle por tiempo+distancia.
 * Query WDB: ubicaciones_vendedor.tipo=5 + usuario_id=X, ORDER BY capturado_en DESC, take 1.
 * Devuelve null si no hay ningun Checkpoint previo (primer ping del vendedor).
 */
async function getLastCheckpoint(usuarioId: number): Promise<PersistedCheckpoint | null> {
  try {
    const col = database.get<UbicacionVendedor>('ubicaciones_vendedor');
    const rows = await col
      .query(
        Q.where('usuario_id', usuarioId),
        Q.where('tipo', 5),
        Q.sortBy('capturado_en', Q.desc),
        Q.take(1),
      )
      .fetch();
    if (rows.length === 0) return null;
    const r = rows[0] as any;
    return {
      capturadoEn: r.capturadoEn instanceof Date ? r.capturadoEn : new Date(r.capturadoEn),
      latitud: typeof r.latitud === 'number' ? r.latitud : Number(r.latitud),
      longitud: typeof r.longitud === 'number' ? r.longitud : Number(r.longitud),
    };
  } catch {
    return null;
  }
}

/**
 * Define el task headless. Se llama UNA VEZ al boot del JS (importar este
 * modulo desde root layout o syncEngine garantiza el registro).
 *
 * No re-defines: TaskManager.defineTask es idempotente per-name pero solo
 * desde el mismo modulo. Importarlo desde 2 lugares está OK; lo importante
 * es que se ejecute ANTES de Location.startLocationUpdatesAsync.
 */
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    if (__DEV__) console.warn('[BgLocationTask] error:', error);
    return;
  }
  if (!data) return;

  const { locations } = data as { locations: Location.LocationObject[] };
  if (!locations?.length) return;

  const usuarioId = await getCurrentUsuarioIdForBackgroundTask();
  if (!usuarioId) {
    if (__DEV__) console.warn('[BgLocationTask] no usuarioId in storage — skip batch');
    return;
  }

  // 2026-06-08 (anti-spam GPS): el OS Android entrega arrays de 1-N locations
  // por callback (Doze wakeup, GPS chipset jitter). Antes persistia TODAS;
  // ahora throttle pre-persist con haversine + tiempo. Reduce ~135x el
  // volumen storage (verificado en staging: 10 pings/100s → ~1 ping/min).
  const lastCheckpoint = await getLastCheckpoint(usuarioId);
  const accepted = filterCheckpointsByThrottle(locations, lastCheckpoint);
  if (accepted.length === 0) {
    if (__DEV__) console.log(`[BgLocationTask] all ${locations.length} locations throttled`);
    return;
  }

  // Persistir cada location aceptada como ubicacion_vendedor tipo=Checkpoint (5).
  // El flush al backend ocurre en el sync engine cuando la app vuelve a abrir
  // OR cuando otro ping foreground dispara performSync (NetInfo/AppState handlers).
  try {
    await database.write(async () => {
      const col = database.get<UbicacionVendedor>('ubicaciones_vendedor');
      for (const loc of accepted) {
        await col.create((rec: any) => {
          rec.usuarioId = usuarioId;
          rec.latitud = loc.coords.latitude;
          rec.longitud = loc.coords.longitude;
          rec.precisionMetros = loc.coords.accuracy ?? null;
          // 5 = TipoPing.Checkpoint (heartbeat sin referenciaId)
          rec.tipo = 5;
          rec.capturadoEn = new Date(loc.timestamp ?? Date.now());
          rec.referenciaId = null;
          rec.sincronizado = false;
        });
      }
    });
    if (__DEV__) console.log(`[BgLocationTask] persisted ${accepted.length}/${locations.length} locations (throttled ${locations.length - accepted.length})`);
  } catch (err) {
    if (__DEV__) console.warn('[BgLocationTask] persist failed:', err);
  }
});
