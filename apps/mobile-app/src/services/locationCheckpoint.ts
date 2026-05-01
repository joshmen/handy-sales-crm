import * as Location from 'expo-location';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import UbicacionVendedor from '@/db/models/UbicacionVendedor';
import { api } from '@/api/client';

/**
 * Tracking GPS continuo del vendedor (Fase B). NO inicia automático;
 * el caller (root layout) debe llamar `startCheckpointTimer(usuarioId)`
 * cuando el plan del tenant incluye `tracking_vendedor` y el user es VENDEDOR.
 *
 * Captura un ping en 2 escenarios:
 * 1. `recordPing(tipo, refId?)` invocado desde la UI cuando el vendedor
 *    completa una venta/cobro/visita.
 * 2. Timer cada 15min: si no hubo ping en los últimos 15min, dispara un
 *    ping tipo Checkpoint (heartbeat para saber dónde anda).
 *
 * Persistencia offline-first: cada ping va a WDB con `sincronizado=false`.
 * `flushPendingAsync()` es invocado por el sync engine al pull-completed
 * para enviar batch al backend; si retorna 403 → `disableTracking()`
 * (plan no aplica), purga la cola y para el timer.
 */
export const TipoPing = {
  Venta: 0,
  Cobro: 1,
  Visita: 2,
  InicioRuta: 3,
  FinRuta: 4,
  Checkpoint: 5,
} as const;
export type TipoPingValue = typeof TipoPing[keyof typeof TipoPing];

const CHECKPOINT_INTERVAL_MS = 15 * 60 * 1000; // 15 min
const FLUSH_BATCH_LIMIT = 100; // máx pings por POST

let timerHandle: ReturnType<typeof setInterval> | null = null;
let lastPingAt: number = 0;
let currentUsuarioId: number | null = null;
let trackingDisabled = false;

/**
 * Empieza el timer de checkpoint. Llamar al login post-auth si el tenant
 * tiene la feature. No-op si ya está activo o si trackingDisabled.
 */
export function startCheckpointTimer(usuarioId: number): void {
  if (trackingDisabled) return;
  if (timerHandle) return; // ya corriendo
  currentUsuarioId = usuarioId;
  lastPingAt = 0;

  timerHandle = setInterval(() => {
    const sinceLast = Date.now() - lastPingAt;
    if (sinceLast >= CHECKPOINT_INTERVAL_MS) {
      // Fire-and-forget; un fallo de GPS no debe romper el timer
      recordPing(TipoPing.Checkpoint).catch(() => {});
    }
  }, 60 * 1000); // chequea cada 1min, dispara cuando pasaron >=15
}

export function stopCheckpointTimer(): void {
  if (timerHandle) {
    clearInterval(timerHandle);
    timerHandle = null;
  }
  currentUsuarioId = null;
}

/**
 * Captura un ping GPS y lo encola en WDB. Si falla GPS (timeout,
 * permiso denegado, etc) silencia el error — no es crítico para el
 * flujo de venta.
 */
export async function recordPing(
  tipo: TipoPingValue,
  referenciaId: number | null = null,
): Promise<void> {
  if (trackingDisabled || currentUsuarioId == null) return;

  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return;

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const usuarioId = currentUsuarioId;
    const ahora = Date.now();
    await database.write(async () => {
      await database.get<UbicacionVendedor>('ubicaciones_vendedor').create((rec: any) => {
        rec.usuarioId = usuarioId;
        rec.latitud = pos.coords.latitude;
        rec.longitud = pos.coords.longitude;
        rec.precisionMetros = pos.coords.accuracy ?? null;
        rec.tipo = tipo;
        rec.capturadoEn = new Date(pos.timestamp ?? ahora);
        rec.referenciaId = referenciaId;
        rec.sincronizado = false;
      });
    });
    lastPingAt = ahora;
  } catch {
    // Silent — GPS errors no rompen flujo
  }
}

/**
 * Push pendientes al backend. Llamado por el sync engine post-pull.
 * Idempotente — si nada pendiente, no-op. Si recibe 403, desactiva.
 */
export async function flushPendingAsync(): Promise<{ pushed: number; disabled: boolean }> {
  if (trackingDisabled) return { pushed: 0, disabled: true };

  const collection = database.get<UbicacionVendedor>('ubicaciones_vendedor');
  const pending = await collection
    .query(Q.where('sincronizado', false), Q.take(FLUSH_BATCH_LIMIT))
    .fetch();

  if (pending.length === 0) return { pushed: 0, disabled: false };

  const pings = pending.map(p => ({
    localId: p.id,
    latitud: p.latitud,
    longitud: p.longitud,
    precisionMetros: p.precisionMetros,
    tipo: ['Venta', 'Cobro', 'Visita', 'InicioRuta', 'FinRuta', 'Checkpoint'][p.tipo] ?? 'Checkpoint',
    capturadoEn: p.capturadoEn.toISOString(),
    referenciaId: p.referenciaId,
  }));

  try {
    await api.post('/api/mobile/tracking/batch', { pings });
    // Marca como sincronizados
    await database.write(async () => {
      await Promise.all(pending.map(p => p.update((rec: any) => { rec.sincronizado = true; })));
    });
    return { pushed: pending.length, disabled: false };
  } catch (err: any) {
    const status = err?.response?.status;
    const code = err?.response?.data?.code;
    if (status === 403 && code === 'TRACKING_NOT_IN_PLAN') {
      // Plan no aplica — desactiva tracking, purga cola para no reintentar
      await disableTracking();
      return { pushed: 0, disabled: true };
    }
    // Otros errores (red, 5xx) — dejar pendientes para retry futuro
    return { pushed: 0, disabled: false };
  }
}

/**
 * Desactiva tracking permanentemente en esta sesión: para timer,
 * purga la cola (no las queremos reintentar nunca más con plan invalido).
 */
async function disableTracking(): Promise<void> {
  trackingDisabled = true;
  stopCheckpointTimer();
  try {
    const collection = database.get<UbicacionVendedor>('ubicaciones_vendedor');
    const all = await collection.query().fetch();
    if (all.length > 0) {
      await database.write(async () => {
        await Promise.all(all.map(p => p.destroyPermanently()));
      });
    }
  } catch {
    // ignore — purge is best-effort
  }
}

/** Reset (para tests o re-habilitar tras re-login). */
export function _resetForTests(): void {
  trackingDisabled = false;
  stopCheckpointTimer();
  lastPingAt = 0;
}
