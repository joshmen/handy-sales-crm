import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import { telemetryApi } from '@/api/telemetry';
import { getDeviceId } from '@/api/client';
import { useAuthStore, useSyncStore } from '@/stores';
import { schema } from '@/db/schema';

const schemaVersion = schema.version;

/**
 * B.2 — Heartbeat telemetry (fix prod 2026-06-03 post-incidente Rodrigo).
 *
 * Cada 5 min cuando hay red + app foreground + sesión autenticada:
 *  1) Contar pendings (_status created/updated) por tabla en WDB local
 *  2) POST a /api/mobile/telemetry/heartbeat con device + pendingsByTable + lastSyncAt
 *  3) Si el server retorna shouldForceSyncPush=true, disparar useSyncStore.sync()
 *     inmediatamente (probablemente el cliente lleva mucho sin sync y tiene backlog)
 *
 * Falla silente — heartbeat no es crítico para el usuario, solo es observabilidad
 * para el supervisor. Si falla, simplemente no se reporta este ciclo (5 min más
 * tarde reintenta).
 *
 * IMPORTANTE: no incrementa la batería en idle. Se pausa al perder red o cuando
 * la app va a background. Resume cuando vuelve.
 */

// Tablas que cuentan como pending para el reporte. Mismas que useOldestPendingAge
// (no incluimos tablas read-only como productos/zonas).
const SYNCABLE_TABLES = [
  'clientes',
  'pedidos',
  'detalle_pedidos',
  'visitas',
  'cobros',
  'ruta_detalles',
  'gastos',
  'devoluciones_pedido',
  'detalle_devoluciones',
] as const;

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 min
// Initial delay: dar tiempo a que el sync inicial corra antes del primer heartbeat.
// Si no, el primer heartbeat reportaría todos los locales como pending aunque ya
// estén siendo sincronizados.
const INITIAL_DELAY_MS = 30 * 1000; // 30 s

/**
 * Cuenta records pending por tabla. Retorna mapa {tableName: [mobileRecordId, ...]}.
 * Solo incluye tablas con al menos 1 pending.
 */
async function collectPendingByTable(): Promise<Record<string, string[]>> {
  const result: Record<string, string[]> = {};

  for (const tableName of SYNCABLE_TABLES) {
    try {
      const records = await database.collections
        .get(tableName)
        .query(Q.or(Q.where('_status', 'created'), Q.where('_status', 'updated')))
        .fetch();
      if (records.length > 0) {
        // mobile_record_id = el `id` local de WDB. El server usa éste como
        // dedupe key cuando hace upsert idempotente.
        result[tableName] = records.map((r) => r.id);
      }
    } catch (err) {
      if (__DEV__) {
        console.warn(`[useHeartbeat] failed to count pendings for ${tableName}:`, err);
      }
    }
  }

  return result;
}

export function useHeartbeat() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAppActiveRef = useRef(true);

  const tick = async () => {
    // Skip si no hay sesión (logout entre ticks).
    if (!useAuthStore.getState().isAuthenticated) return;
    if (!isAppActiveRef.current) return;

    // Verificar red antes del POST — sin red no tiene sentido el heartbeat.
    const net = await NetInfo.fetch().catch(() => null);
    if (!net?.isConnected) return;

    try {
      const [deviceId, pendingByTable] = await Promise.all([
        getDeviceId(),
        collectPendingByTable(),
      ]);

      const lastSyncAt = useSyncStore.getState().lastSyncAt;
      const appVersion =
        (Constants.expoConfig?.version as string | undefined) ??
        (Platform.OS === 'android' ? 'unknown-android' : 'unknown');

      const ack = await telemetryApi.sendHeartbeat({
        deviceId,
        pendingByTable,
        lastSyncAt: lastSyncAt ? new Date(lastSyncAt).toISOString() : null,
        appVersion,
        schemaVersion,
      });

      // Server pidió que dispare un sync push (mucho backlog + sync viejo) →
      // forzar sync immediately. Es safe disparar aunque ya esté syncing (el
      // store hace la guard).
      if (ack.shouldForceSyncPush) {
        if (__DEV__) console.log('[useHeartbeat] server requested force sync:', ack.message);
        const syncState = useSyncStore.getState();
        if (syncState.status !== 'syncing') {
          syncState.sync().catch((e) => {
            if (__DEV__) console.warn('[useHeartbeat] force-sync failed:', e);
          });
        }
      }
    } catch (err) {
      // Silent — heartbeat no es crítico. El próximo ciclo reintentará.
      if (__DEV__) console.warn('[useHeartbeat] failed silently:', err);
    }
  };

  // Mantener track de si la app está foreground (no querer pinging en background).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      isAppActiveRef.current = next === 'active';
      // Cuando vuelve a active después de background, disparar inmediato
      // (en vez de esperar al próximo tick) para refrescar el dashboard del admin.
      if (next === 'active' && useAuthStore.getState().isAuthenticated) {
        tick();
      }
    });
    return () => subscription.remove();
  }, []);

  // Loop principal del heartbeat. Solo activo cuando hay sesión.
  useEffect(() => {
    if (!isAuthenticated) {
      // Logout: limpiar timers.
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (initialTimeoutRef.current) clearTimeout(initialTimeoutRef.current);
      return;
    }

    // Initial delay para evitar reportar como pending lo que se va a sync ahora.
    initialTimeoutRef.current = setTimeout(() => {
      tick();
      intervalRef.current = setInterval(tick, HEARTBEAT_INTERVAL_MS);
    }, INITIAL_DELAY_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (initialTimeoutRef.current) clearTimeout(initialTimeoutRef.current);
    };
  }, [isAuthenticated]);
}
