import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { AppState, type AppStateStatus } from 'react-native';
import Toast from 'react-native-toast-message';
import { useSyncStore } from '@/stores';
import { crashReporter } from '@/services/crashReporter';
import { database } from '@/db/database';

const SYNC_DEBOUNCE_MS = 2000; // 2 seconds — groups rapid writes into one sync

// B.3 safety net (fix prod 2026-06-03 post-incidente Rodrigo).
// Si por cualquier razón el sync no se dispara por evento (cambio WDB / network /
// foreground), un timer cada 60s lo intenta. Es muy defensivo pero la última red
// de seguridad antes de perder data del vendedor.
const SAFETY_NET_INTERVAL_MS = 60_000;

// Sprint 1 audit code-quality: threshold para mostrar Toast persistente de
// "Sincronizacion automatica fallando". Solo dispara si >=2 fallos auto-sync
// dentro de la ventana — evita spam pero notifica si red esta verdaderamente
// caida o hay bug de auth silente.
const AUTO_FAIL_THRESHOLD = 2;
const AUTO_FAIL_WINDOW_MS = 5 * 60_000; // 5 min

interface AutoFailState {
  count: number;
  windowStartMs: number;
  toastShownAt: number;
}

export function useAutoSync() {
  const { sync } = useSyncStore();
  const wasOffline = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Sprint 1: rastrear fallos silenciosos de auto-sync para alertar al user
  // si la app cree que sincroniza pero en realidad lleva varios fallos.
  const autoFail = useRef<AutoFailState>({ count: 0, windowStartMs: 0, toastShownAt: 0 });

  const recordAutoSyncOutcome = (trigger: 'wdb_change' | 'network_online' | 'foreground' | 'safety_net' | 'mount', err: unknown) => {
    if (!err) {
      // Reset on success.
      autoFail.current.count = 0;
      autoFail.current.windowStartMs = 0;
      return;
    }
    const now = Date.now();
    const state = autoFail.current;
    if (now - state.windowStartMs > AUTO_FAIL_WINDOW_MS) {
      state.count = 1;
      state.windowStartMs = now;
    } else {
      state.count += 1;
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (__DEV__) console.warn(`[AutoSync] ${trigger} failed (${state.count}/${AUTO_FAIL_THRESHOLD}):`, msg);
    void crashReporter.reportEvent('auto_sync_failed', { trigger, error: msg, attemptInWindow: state.count });

    if (state.count >= AUTO_FAIL_THRESHOLD && now - state.toastShownAt > AUTO_FAIL_WINDOW_MS) {
      Toast.show({
        type: 'error',
        text1: 'Sincronización automática fallando',
        text2: 'Verifica tu conexión o vuelve a iniciar sesión si el problema persiste.',
        visibilityTime: 5000,
        position: 'bottom',
      });
      state.toastShownAt = now;
      void crashReporter.reportEvent('auto_sync_repeated_failure', { count: state.count, lastError: msg });
    }
  };

  const syncIfOnline = (trigger: 'wdb_change' | 'network_online' | 'foreground' | 'safety_net' | 'mount') => {
    NetInfo.fetch().then((net) => {
      if (net.isConnected && useSyncStore.getState().status !== 'syncing') {
        useSyncStore.getState().sync()
          .then(() => recordAutoSyncOutcome(trigger, null))
          .catch((err) => recordAutoSyncOutcome(trigger, err));
      }
    }).catch((e) => recordAutoSyncOutcome(trigger, e));
  };

  // Core: auto-sync when WDB tables change (official WDB pattern)
  useEffect(() => {
    const subscription = database.withChangesForTables([
      'pedidos', 'detalle_pedidos', 'ruta_detalles', 'rutas',
      'visitas', 'cobros', 'clientes',
    ]).subscribe(() => {
      // Debounce — wait 2s after last write before syncing
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => syncIfOnline('wdb_change'), SYNC_DEBOUNCE_MS);
    });

    return () => {
      subscription.unsubscribe();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  // Auto-sync when network comes back online
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = state.isConnected ?? false;
      if (isOnline && wasOffline.current) {
        crashReporter.flushPendingReports().catch(() => {});
        syncIfOnline('network_online');
      }
      wasOffline.current = !isOnline;
    });
    return () => unsubscribe();
  }, []);

  // Auto-sync when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') syncIfOnline('foreground');
      }
    );
    return () => subscription.remove();
  }, []);

  // Initial sync on mount — Reliability Fase 2: gated por NetInfo. Antes
  // disparaba sync() siempre que el (tabs) layout montara, incluyendo offline,
  // generando un error state silencioso. Ahora respeta conexion.
  useEffect(() => { syncIfOnline('mount'); }, []);

  // B.3 safety net interval — última defensa contra pérdida de data. Si los
  // triggers event-driven (WDB change subscription, NetInfo listener,
  // AppState change) fallan o se desuscribieron por bug, este interval
  // cada 60s recupera el sync. Se pausa naturalmente si no hay red
  // (syncIfOnline lo guard).
  useEffect(() => {
    const id = setInterval(() => syncIfOnline('safety_net'), SAFETY_NET_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
}
