import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '@/db/database';
import { api } from '@/api/client';
import { syncCursors } from './cursors';
import { mapPullToWatermelon, mapPushFromWatermelon } from './mappers';
import { uploadPendingAttachments, cleanUploadedFiles } from '@/services/evidenceManager';
import { crashReporter } from '@/services/crashReporter';
import { useAuthStore } from '@/stores/authStore';

/**
 * Strips records whose tenantId doesn't match the authenticated user's tenant.
 * Guards against a rogue/misconfigured server returning cross-tenant data.
 */
function filterByTenant(items: any[] | undefined, currentTenantId: number): any[] {
  if (!items?.length) return [];
  return items.filter((record) => {
    const recordTenant = record.tenantId ?? record.tenant_id;
    // If the server record carries no tenantId at all, allow it through —
    // some lightweight DTOs omit it. Only reject explicit mismatches.
    if (recordTenant === undefined || recordTenant === null) return true;
    const match = Number(recordTenant) === currentTenantId;
    if (!match) {
      console.warn(
        `[Sync] Tenant mismatch — record tenantId=${recordTenant} vs current=${currentTenantId}. Discarding.`
      );
    }
    return match;
  });
}

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
  options?.onStart?.();

  let pullCount = 0;
  const pendingIdMappings: any[] = [];
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

        if (__DEV__) console.log('[Sync] Pull lastSync:', lastSync);
        const response = await api.post('/api/mobile/sync/pull', {
          lastSyncTimestamp: lastSync,
          entityTypes: null,
        });

        const body = response.data as any;
        const rawServerChanges = body.data ?? body;
        const serverTimestamp = body.serverTimestamp ?? rawServerChanges.serverTimestamp;

        // Security: discard any records that belong to a different tenant.
        const currentTenantId = Number(useAuthStore.getState().user?.tenantId ?? 0);

        const serverChanges = currentTenantId
          ? {
              ...rawServerChanges,
              clientes:  filterByTenant(rawServerChanges.clientes,  currentTenantId),
              productos: filterByTenant(rawServerChanges.productos, currentTenantId),
              pedidos:   filterByTenant(rawServerChanges.pedidos,   currentTenantId),
              visitas:   filterByTenant(rawServerChanges.visitas,   currentTenantId),
              rutas:     rawServerChanges.rutas,     // Rutas don't have tenantId in DTO — already filtered server-side by user
              cobros:    filterByTenant(rawServerChanges.cobros,    currentTenantId),
              preciosPorProducto: rawServerChanges.preciosPorProducto,  // Read-only catalogs — already tenant-filtered server-side
              descuentos:         rawServerChanges.descuentos,
              promociones:        rawServerChanges.promociones,
            }
          : rawServerChanges;

        // Count pulled records
        for (const entityData of Object.values(serverChanges)) {
          if (Array.isArray(entityData)) pullCount += entityData.length;
        }

        const timestamp = new Date(serverTimestamp).getTime();
        const changes = mapPullToWatermelon(serverChanges, lastPulledAt ?? null);

        if (__DEV__) console.log('[Sync] Mapped changes for', Object.keys(changes).length, 'tables');

        return { changes, timestamp };
      },

      pushChanges: async ({ changes }) => {
        const payload = await mapPushFromWatermelon(changes);

        // Count pushed records
        for (const arr of Object.values(payload)) {
          if (Array.isArray(arr)) pushCount += arr.length;
        }

        // Log what's being pushed
        const summary = Object.entries(payload)
          .filter(([, v]) => Array.isArray(v) && (v as any[]).length > 0)
          .map(([k, v]) => `${k}:${(v as any[]).length}`)
          .join(', ');
        if (__DEV__ && summary) console.log('[Sync] Pushing:', summary);

        // Only push if there are actual changes
        const hasChanges = pushCount > 0;
        if (!hasChanges) return;

        const response = await api.post('/api/mobile/sync/push', payload);
        const body = response.data as any;

        // Count conflicts from server response
        if (body?.conflicts) {
          conflictCount = Array.isArray(body.conflicts) ? body.conflicts.length : 0;
        }

        // Store ID mappings to apply after sync completes
        const mappings = body?.data?.createdIdMappings ?? body?.createdIdMappings ?? [];
        if (mappings.length) pendingIdMappings.push(...mappings);
      },

      sendCreatedAsUpdated: true,
    });

    // Phase 2b: Apply server ID mappings for records created during push (batched)
    if (pendingIdMappings.length) {
      await database.write(async () => {
        const updates: any[] = [];
        for (const m of pendingIdMappings) {
          try {
            const record = await database.get(m.entityType).find(m.localId);
            updates.push(record.prepareUpdate((r: any) => { r.server_id = m.serverId; }));
          } catch { /* record not found */ }
        }
        if (updates.length) await database.batch(...updates);
      });
      if (__DEV__) console.log('[Sync] Applied', pendingIdMappings.length, 'ID mappings');
    }

    // Phase 3: Upload pending attachments (deferred, non-fatal)
    try {
      const uploaded = await uploadPendingAttachments();
      if (uploaded > 0) {
        if (__DEV__) console.log(`[Sync] Uploaded ${uploaded} attachments`);
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
    // sync state managed by syncStore, not here
  }
}
