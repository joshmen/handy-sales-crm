import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { AppState, type AppStateStatus } from 'react-native';
import { useSyncStore } from '@/stores';
import { crashReporter } from '@/services/crashReporter';
import { database } from '@/db/database';

const SYNC_DEBOUNCE_MS = 2000; // 2 seconds — groups rapid writes into one sync

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

  // Initial sync on mount
  useEffect(() => { sync(); }, []);
}
