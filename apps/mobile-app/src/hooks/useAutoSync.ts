import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { AppState, type AppStateStatus } from 'react-native';
import { useSyncStore } from '@/stores';
import { crashReporter } from '@/services/crashReporter';

const MIN_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useAutoSync() {
  const { sync, status, lastSyncAt } = useSyncStore();
  const wasOffline = useRef(false);

  useEffect(() => {
    // Auto-sync when network comes back online
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = state.isConnected ?? false;

      if (isOnline && wasOffline.current) {
        // Flush crash reports immediately on reconnect (don't wait for sync interval)
        crashReporter.flushPendingReports().catch(() => {});

        const timeSinceSync = lastSyncAt ? Date.now() - lastSyncAt : Infinity;
        if (timeSinceSync > MIN_SYNC_INTERVAL && status !== 'syncing') {
          console.log('[AutoSync] Network restored, syncing...');
          sync();
        }
      }

      wasOffline.current = !isOnline;
    });

    return () => unsubscribe();
  }, [lastSyncAt, status]);

  useEffect(() => {
    // Auto-sync when app comes to foreground
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          const timeSinceSync = lastSyncAt ? Date.now() - lastSyncAt : Infinity;
          if (timeSinceSync > MIN_SYNC_INTERVAL && status !== 'syncing') {
            console.log('[AutoSync] App foregrounded, syncing...');
            sync();
          }
        }
      }
    );

    return () => subscription.remove();
  }, [lastSyncAt, status]);

  // Initial sync on mount
  useEffect(() => {
    if (!lastSyncAt && status === 'idle') {
      sync();
    }
  }, []);
}
