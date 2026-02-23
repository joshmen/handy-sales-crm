import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '@/db/database';
import { api } from '@/api/client';
import { syncCursors } from './cursors';
import { mapPullToWatermelon, mapPushFromWatermelon } from './mappers';

interface SyncOptions {
  onStart?: () => void;
  onFinish?: (info: { pulled: number; pushed: number }) => void;
  onError?: (error: Error) => void;
}

export async function performSync(options?: SyncOptions): Promise<void> {
  if (syncCursors.isSyncInProgress()) {
    console.log('[Sync] Already in progress, skipping');
    return;
  }

  options?.onStart?.();
  syncCursors.setSyncInProgress(true);

  try {
    await synchronize({
      database,

      pullChanges: async ({ lastPulledAt }) => {
        const lastSync = lastPulledAt
          ? new Date(lastPulledAt).toISOString()
          : null;

        const response = await api.post('/api/mobile/sync/pull', {
          lastSyncTimestamp: lastSync,
          entityTypes: null,
        });

        // The /pull endpoint returns: { success, data: { clientes, productos, ... }, summary, serverTimestamp }
        const body = response.data as any;
        const serverChanges = body.data ?? body;
        const serverTimestamp = body.serverTimestamp ?? serverChanges.serverTimestamp;

        const timestamp = new Date(serverTimestamp).getTime();
        const changes = mapPullToWatermelon(serverChanges, lastPulledAt ?? null);

        return { changes, timestamp };
      },

      pushChanges: async ({ changes }) => {
        const payload = mapPushFromWatermelon(changes);

        // Only push if there are actual changes
        const hasChanges = Object.values(payload).some(
          (arr: any) => Array.isArray(arr) && arr.length > 0
        );
        if (!hasChanges) return;

        await api.post('/api/mobile/sync/push', payload);
      },

      sendCreatedAsUpdated: false,
      _unsafeBatchPerCollection: true,
    });

    syncCursors.setLastSyncAt(Date.now());
    options?.onFinish?.({ pulled: 0, pushed: 0 });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[Sync] Failed:', err.message);
    options?.onError?.(err);
    throw err;
  } finally {
    syncCursors.setSyncInProgress(false);
  }
}
