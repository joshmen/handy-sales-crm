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

        console.log('[Sync] Pulling from server... lastSync:', lastSync);
        const response = await api.post('/api/mobile/sync/pull', {
          lastSyncTimestamp: lastSync,
          entityTypes: null,
        });

        // The /pull endpoint returns: { success, data: { clientes, productos, ... }, summary, serverTimestamp }
        const body = response.data as any;
        const rawServerChanges = body.data ?? body;
        const serverTimestamp = body.serverTimestamp ?? rawServerChanges.serverTimestamp;

        console.log('[Sync] Raw rutas from server:', rawServerChanges.rutas?.length ?? 0);
        if (rawServerChanges.rutas?.length) {
          rawServerChanges.rutas.forEach((r: any) =>
            console.log(`[Sync]   ruta id=${r.id} usuarioId=${r.usuarioId} nombre=${r.nombre} estado=${r.estado} fecha=${r.fecha}`)
          );
        }

        // Security: discard any records that belong to a different tenant.
        const currentTenantId = Number(useAuthStore.getState().user?.tenantId ?? 0);
        const currentUserId = Number(useAuthStore.getState().user?.id ?? 0);
        console.log('[Sync] Current user:', currentUserId, 'tenant:', currentTenantId);

        const serverChanges = currentTenantId
          ? {
              ...rawServerChanges,
              clientes:  filterByTenant(rawServerChanges.clientes,  currentTenantId),
              productos: filterByTenant(rawServerChanges.productos, currentTenantId),
              pedidos:   filterByTenant(rawServerChanges.pedidos,   currentTenantId),
              visitas:   filterByTenant(rawServerChanges.visitas,   currentTenantId),
              rutas:     rawServerChanges.rutas,     // Rutas don't have tenantId in DTO — already filtered server-side by user
              cobros:    filterByTenant(rawServerChanges.cobros,    currentTenantId),
            }
          : rawServerChanges;

        console.log('[Sync] After filter - rutas:', serverChanges.rutas?.length ?? 0);

        // Count pulled records
        for (const entityData of Object.values(serverChanges)) {
          if (Array.isArray(entityData)) pullCount += entityData.length;
        }

        const timestamp = new Date(serverTimestamp).getTime();
        const changes = mapPullToWatermelon(serverChanges, lastPulledAt ?? null);

        console.log('[Sync] Mapped rutas - created:', changes.rutas?.created?.length ?? 0, 'updated:', changes.rutas?.updated?.length ?? 0);

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

        // Server IDs for new records are now assigned directly
        // in revision.tsx via pedidosApi.create() + pedido.setServerId()
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
