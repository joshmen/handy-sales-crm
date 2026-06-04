import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { AppState, type AppStateStatus } from 'react-native';
import { useSyncStore } from '@/stores';
import { crashReporter } from '@/services/crashReporter';
import { database } from '@/db/database';

const SYNC_DEBOUNCE_MS = 2000; // 2 seconds — groups rapid writes into one sync

// B.3 safety net (fix prod 2026-06-03 post-incidente Rodrigo).
// Si por cualquier razón el sync no se dispara por evento (cambio WDB / network /
// foreground), un timer cada 60s lo intenta. Es muy defensivo pero la última red
// de seguridad antes de perder data del vendedor.
const SAFETY_NET_INTERVAL_MS = 60_000;

export function useAutoSync() {
  const { sync } = useSyncStore();
  const wasOffline = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncIfOnline = () => {
    NetInfo.fetch().then((net) => {
      if (net.isConnected && useSyncStore.getState().status !== 'syncing') {
        useSyncStore.getState().sync();
      }
    }).catch((e) => { if (__DEV__) console.warn('[AutoSync]', e); });
  };

  // Core: auto-sync when WDB tables change (official WDB pattern)
  useEffect(() => {
    const subscription = database.withChangesForTables([
      'pedidos', 'detalle_pedidos', 'ruta_detalles', 'rutas',
      'visitas', 'cobros', 'clientes',
    ]).subscribe(() => {
      // Debounce — wait 2s after last write before syncing
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(syncIfOnline, SYNC_DEBOUNCE_MS);
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
        syncIfOnline();
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
        if (nextState === 'active') syncIfOnline();
      }
    );
    return () => subscription.remove();
  }, []);

  // Initial sync on mount — Reliability Fase 2: gated por NetInfo. Antes
  // disparaba sync() siempre que el (tabs) layout montara, incluyendo offline,
  // generando un error state silencioso. Ahora respeta conexion.
  useEffect(() => { syncIfOnline(); }, []);

  // B.3 safety net interval — última defensa contra pérdida de data. Si los
  // triggers event-driven (WDB change subscription, NetInfo listener,
  // AppState change) fallan o se desuscribieron por bug, este interval
  // cada 60s recupera el sync. Se pausa naturalmente si no hay red
  // (syncIfOnline lo guard).
  useEffect(() => {
    const id = setInterval(syncIfOnline, SAFETY_NET_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
}
