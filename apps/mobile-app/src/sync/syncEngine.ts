import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '@/db/database';
import { api } from '@/api/client';
import { syncCursors } from './cursors';
import { mapPullToWatermelon, mapPushFromWatermelon } from './mappers';
import { uploadPendingAttachments, cleanUploadedFiles } from '@/services/evidenceManager';
import { crashReporter } from '@/services/crashReporter';

export interface SyncSummary {
  pulled: number;
  pushed: number;
  conflicts: number;
}

interface SyncOptions {
  onStart?: () => void;
  onFinish?: (info: SyncSummary) => void;
  onError?: (error: Error) => void;
}

export async function performSync(options?: SyncOptions): Promise<void> {
  if (syncCursors.isSyncInProgress()) {
    console.log('[Sync] Already in progress, skipping');
    return;
  }

  options?.onStart?.();
  syncCursors.setSyncInProgress(true);

  let pullCount = 0;
  let pushCount = 0;
  let conflictCount = 0;

  try {
    // Phase 0: Flush any pending crash reports from offline queue
    try {
      await crashReporter.flushPendingReports();
    } catch (flushError) {
      console.warn('[Sync] Crash report flush failed (non-fatal):', flushError);
    }

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

        // Count pulled records
        for (const entityData of Object.values(serverChanges)) {
          if (Array.isArray(entityData)) pullCount += entityData.length;
        }

        const timestamp = new Date(serverTimestamp).getTime();
        const changes = mapPullToWatermelon(serverChanges, lastPulledAt ?? null);

        return { changes, timestamp };
      },

      pushChanges: async ({ changes }) => {
        const payload = await mapPushFromWatermelon(changes);

        // Count pushed records
        for (const arr of Object.values(payload)) {
          if (Array.isArray(arr)) pushCount += arr.length;
        }

        // Only push if there are actual changes
        const hasChanges = pushCount > 0;
        if (!hasChanges) return;

        const response = await api.post('/api/mobile/sync/push', payload);
        const body = response.data as any;

        // Count conflicts from server response
        if (body?.conflicts) {
          conflictCount = Array.isArray(body.conflicts) ? body.conflicts.length : 0;
        }
      },

      sendCreatedAsUpdated: false,
      _unsafeBatchPerCollection: true,
    });

    // Phase 3: Upload pending attachments (deferred, non-fatal)
    try {
      const uploaded = await uploadPendingAttachments();
      if (uploaded > 0) {
        console.log(`[Sync] Uploaded ${uploaded} attachments`);
        await cleanUploadedFiles();
      }
    } catch (attachmentError) {
      console.warn('[Sync] Attachment upload failed (non-fatal):', attachmentError);
    }

    // Phase 4: Flush pending crash reports (deferred from offline)
    try {
      await crashReporter.flushPendingReports();
    } catch {
      // Never block sync for crash report flush
    }

    const summary: SyncSummary = { pulled: pullCount, pushed: pushCount, conflicts: conflictCount };
    syncCursors.setLastSyncAt(Date.now());
    syncCursors.setLastSyncSummary(summary);
    options?.onFinish?.(summary);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[Sync] Failed:', err.message);
    options?.onError?.(err);
    throw err;
  } finally {
    syncCursors.setSyncInProgress(false);
  }
}
