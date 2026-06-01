import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { database } from '@/db/database';
import { secureStorage } from '@/utils/storage';
import { STORAGE_KEYS } from '@/utils/constants';
import UbicacionVendedor from '@/db/models/UbicacionVendedor';

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

  // Persistir cada location como ubicacion_vendedor tipo=Checkpoint (5).
  // El flush al backend ocurre en el sync engine cuando la app vuelve a abrir
  // OR cuando otro ping foreground dispara performSync (NetInfo/AppState handlers).
  try {
    await database.write(async () => {
      const col = database.get<UbicacionVendedor>('ubicaciones_vendedor');
      for (const loc of locations) {
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
    if (__DEV__) console.log(`[BgLocationTask] persisted ${locations.length} locations`);
  } catch (err) {
    if (__DEV__) console.warn('[BgLocationTask] persist failed:', err);
  }
});
