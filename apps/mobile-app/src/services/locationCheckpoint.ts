import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import UbicacionVendedor from '@/db/models/UbicacionVendedor';
import { api } from '@/api/client';
// Importar el task service registra TaskManager.defineTask (modulo top-level).
// CRITICO: debe importarse antes de Location.startLocationUpdatesAsync.
import { LOCATION_TASK_NAME } from './locationBackgroundTask';

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
  InicioJornada: 6,
  FinJornada: 7,
  StopAutomatico: 8,
} as const;
export type TipoPingValue = typeof TipoPing[keyof typeof TipoPing];

const CHECKPOINT_INTERVAL_MS = 15 * 60 * 1000; // 15 min
const FLUSH_BATCH_LIMIT = 100; // máx pings por POST

let lastPingAt: number = 0;
let currentUsuarioId: number | null = null;
let trackingDisabled = false;
let backgroundActive = false;

/**
 * Empieza el tracking de checkpoint. Llamar al login post-auth si el tenant
 * tiene la feature. No-op si ya está activo o si trackingDisabled.
 *
 * Reliability Sprint Fase 3: ahora usa Location.startLocationUpdatesAsync
 * (background-capable via foreground service) en lugar del setInterval JS
 * viejo que morí­a al cerrar app. El task handler vive en
 * locationBackgroundTask.ts y persiste como tipo=Checkpoint.
 */
export function startCheckpointTimer(usuarioId: number): void {
  if (trackingDisabled) return;
  currentUsuarioId = usuarioId;
  lastPingAt = 0;

  // Best-effort — si fallan permisos o config Expo Go (no soporta foreground
  // service nativo), no rompemos el resto del flujo. recordPing() por event
  // sigue funcionando como fallback.
  startBackgroundLocationUpdates(usuarioId).catch((err) => {
    if (__DEV__) console.warn('[locationCheckpoint] startBackground failed (fallback to foreground-only):', err);
  });
}

export function stopCheckpointTimer(): void {
  stopBackgroundLocationUpdates().catch(() => { /* swallow */ });
  currentUsuarioId = null;
}

/**
 * Verifica + solicita permisos foreground primero, luego background (Android
 * 10+ requiere prompt SEPARADO para "Permitir todo el tiempo"). Returns true
 * solo si ambos granted. Si user elige "Solo mientras uso la app", retorna
 * false — caller debe avisar y dejar tracking foreground-only.
 */
export async function ensureBackgroundLocationPermission(): Promise<boolean> {
  try {
    let { status: fg } = await Location.getForegroundPermissionsAsync();
    if (fg !== 'granted') {
      const req = await Location.requestForegroundPermissionsAsync();
      fg = req.status;
    }
    if (fg !== 'granted') return false;

    let { status: bg } = await Location.getBackgroundPermissionsAsync();
    if (bg !== 'granted') {
      const req = await Location.requestBackgroundPermissionsAsync();
      bg = req.status;
    }
    return bg === 'granted';
  } catch (err) {
    if (__DEV__) console.warn('[locationCheckpoint] permission flow error:', err);
    return false;
  }
}

/**
 * Arranca el foreground service de location updates. El task headless
 * locationBackgroundTask.ts persiste cada batch a WDB como tipo=Checkpoint.
 *
 * Config:
 * - Accuracy.Balanced — ~10-100m, mejor balance bateria vs cobertura
 * - timeInterval 15min: heartbeat aunque vendedor este quieto
 * - distanceInterval 0: solo respetar timeInterval (no spam por movimiento)
 * - foregroundService: notif persistente (Android obliga)
 * - showsBackgroundLocationIndicator: iOS, indica al user que app trackea
 */
export async function startBackgroundLocationUpdates(usuarioId: number): Promise<void> {
  if (trackingDisabled) return;
  if (backgroundActive) return;
  currentUsuarioId = usuarioId;

  const granted = await ensureBackgroundLocationPermission();
  if (!granted) {
    if (__DEV__) console.warn('[locationCheckpoint] background permission denied — staying foreground-only');
    return;
  }

  // Idempotente: si por algun motivo ya estaba started, stopear primero.
  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
  if (alreadyStarted) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => {});
  }

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: CHECKPOINT_INTERVAL_MS,
    distanceInterval: 0,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true, // iOS only
    foregroundService: {
      notificationTitle: 'HandySuites · jornada activa',
      notificationBody: 'Tu ubicacion se comparte con el supervisor mientras trabajas.',
      notificationColor: '#2563eb',
    },
  });
  backgroundActive = true;
  if (__DEV__) console.log('[locationCheckpoint] background updates started');
}

export async function stopBackgroundLocationUpdates(): Promise<void> {
  if (!backgroundActive) return;
  try {
    const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
    if (isStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  } catch (err) {
    if (__DEV__) console.warn('[locationCheckpoint] stop background failed:', err);
  } finally {
    backgroundActive = false;
  }
}

/** Returns true if foreground service de location esta corriendo. */
export function isBackgroundTrackingActive(): boolean {
  return backgroundActive;
}

/**
 * Timestamp ms del último ping registrado en esta sesión. Útil para el
 * watcher de inactividad — si pasaron >N horas sin ningún ping (lo cual
 * implica sin venta/cobro/visita/checkpoint), cerramos jornada.
 */
export function getLastPingAt(): number {
  return lastPingAt;
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
  if (trackingDisabled) return;

  // Auto-start de jornada implícito: si el vendedor confirma una venta/cobro/
  // visita SIN jornada activa, arrancamos automáticamente. Es el flujo principal
  // (no hay botón "Iniciar jornada" en home — esto reemplaza ese gesture).
  // No aplica para tipos que ya son de inicio/fin/checkpoint para evitar loops.
  //
  // FIX 2026-05-02: si el día/hora actual NO está en el horario laboral
  // configurado por el admin, NO auto-iniciar. Antes el watcher cerraba la
  // jornada inmediato después del auto-start, generando spam de 3 pings
  // (Venta + InicioJornada + StopAutomatico) en el mismo timestamp. Reportado
  // en Jeyma sábado 2026-05-02 con `dias_laborables='1,2,3,4,5'` (sin sábado).
  const esEventoNegocio = tipo === TipoPing.Venta || tipo === TipoPing.Cobro || tipo === TipoPing.Visita;
  if (esEventoNegocio) {
    try {
      const { getEmpresaConfigSnapshot } = await import('@/utils/empresaConfigSnapshot');
      const { enHorarioLaboral } = await import('@/utils/horarioLaboral');
      const cfg = getEmpresaConfigSnapshot();
      const enHorario = !cfg
        ? true // sin snapshot → no podemos validar, mejor permitir (caso primer login)
        : enHorarioLaboral(cfg.horaInicioJornada, cfg.horaFinJornada, cfg.diasLaborables);

      if (enHorario) {
        const { useJornadaStore } = await import('@/stores/jornadaStore');
        const jornada = useJornadaStore.getState();
        // PRIVACY: si el vendedor cerró jornada explícitamente (motivoStop='manual'),
        // no la reactivamos automáticamente por una Venta/Cobro/Visita. Respetamos
        // la decisión del vendedor. La venta/cobro/visita se persiste igual, sólo
        // que sin tracking GPS continuo hasta que el vendedor inicie manualmente
        // otra jornada (botón "Reanudar" en JornadaCard).
        // Reportado prod 2026-05-26 — Rodrigo: tras cerrar jornada el GPS seguía.
        if (!jornada.activa && jornada.motivoStop !== 'manual') {
          await jornada.iniciarJornada('manual');
          // Toast informativo — el vendedor ve por qué arrancó el indicador
          // "Tracking activo" en home.
          try {
            const ToastModule = await import('react-native-toast-message');
            ToastModule.default.show({
              type: 'info',
              text1: 'Jornada iniciada',
              text2: 'Tu ubicación se registra mientras tu jornada esté activa.',
              visibilityTime: 4000,
            });
          } catch { /* ignore */ }
        }
      }
      // Si NO está en horario laboral: no auto-iniciar jornada. La venta/
      // cobro/visita se registra normalmente; solo no se trackea ubicación
      // GPS continua. Admin puede agregar el día actual a `diasLaborables`
      // desde /settings si quiere capturar la actividad de hoy.
    } catch { /* ignore */ }
  }

  if (currentUsuarioId == null) return;

  try {
    let { status } = await Location.getForegroundPermissionsAsync();
    // Si nunca se pidió, lanzamos el prompt aquí. Sin esto, un vendedor
    // que jamás abre Mapa (donde se pide hoy) nunca dispara tracking.
    if (status === 'undetermined') {
      const req = await Location.requestForegroundPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;

    // getCurrentPositionAsync puede tardar (espera fix fresco) o fallar en
    // ambientes sin GPS lock (interiores, primer arranque, emulador). Fallback
    // a la última posición conocida — mejor un ping con coords cacheadas que
    // un silent skip que pierde el evento.
    let pos: Location.LocationObject | null = null;
    try {
      pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    } catch {
      pos = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 });
    }
    if (!pos) return;

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

    // Mec 4 — reset notif local de inactividad. Si el ping fue de un
    // evento de negocio (Venta/Cobro/Visita), reschedule para 2h después.
    // El timer de la notif anterior se cancela primero.
    if (esEventoNegocio) {
      try {
        const notifs = await import('@/services/jornadaNotifications');
        await notifs.rescheduleInactividadNotification();
      } catch {
        // ignore — notif no es crítica
      }
    }
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
    tipo: ['Venta', 'Cobro', 'Visita', 'InicioRuta', 'FinRuta', 'Checkpoint', 'InicioJornada', 'FinJornada', 'StopAutomatico'][p.tipo] ?? 'Checkpoint',
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
  await stopBackgroundLocationUpdates().catch(() => {});
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
  stopBackgroundLocationUpdates().catch(() => {});
  lastPingAt = 0;
}
