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

// WatermelonDB no permite synchronize() concurrentes. Deduplicamos llamadas paralelas
// (típico cuando llegan varios eventos SignalR juntos) reusando la misma promesa.
let inflightSync: Promise<void> | null = null;

export async function performSync(options?: SyncOptions): Promise<void> {
  if (inflightSync) return inflightSync;
  inflightSync = doPerformSync(options).finally(() => {
    inflightSync = null;
  });
  return inflightSync;
}

async function doPerformSync(options?: SyncOptions): Promise<void> {
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
      if (__DEV__) console.warn('[Sync] Crash report flush failed (non-fatal):', flushError);
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

        // Defensive parse: pull endpoint puede devolver `{data: {...}}` o
        // directamente `{...}` legado. Si body es null/undefined (network falla
        // o backend devuelve vacío), tratamos como pull sin cambios para evitar
        // crash en el resto del pipeline.
        const body = (response.data ?? {}) as Record<string, any>;
        const rawServerChanges = (body.data ?? body) as Record<string, any>;
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
              // Catalogos basicos (read-only, tenant-filtered server-side)
              zonas:              rawServerChanges.zonas,
              categoriasCliente:  rawServerChanges.categoriasCliente,
              categoriasProducto: rawServerChanges.categoriasProducto,
              familiasProducto:   rawServerChanges.familiasProducto,
              // Catalogos criticos (v15)
              listasPrecio:       rawServerChanges.listasPrecio,
              usuarios:           rawServerChanges.usuarios,
              metasVendedor:      rawServerChanges.metasVendedor,
              datosEmpresa:       rawServerChanges.datosEmpresa,
            }
          : rawServerChanges;

        // Count pulled records
        for (const entityData of Object.values(serverChanges)) {
          if (Array.isArray(entityData)) pullCount += entityData.length;
        }

        const timestamp = new Date(serverTimestamp).getTime();
        const changes = await mapPullToWatermelon(serverChanges, lastPulledAt ?? null);

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

    // Phase 2b: Server ID mappings — log only, don't modify records
    // WDB's prepareUpdate marks records as _status='updated' which causes
    // an infinite re-push loop. Instead, we rely on the server-side idempotency
    // check (localId fingerprint) to prevent duplicate creation on re-push.
    // The duplicate record from pull will be cleaned up on the NEXT sync
    // when buildServerIdMap correctly maps server_id → local_id.
    if (pendingIdMappings.length && __DEV__) {
      console.log(`[Sync] Received ${pendingIdMappings.length} ID mappings (server-side dedup handles cleanup)`);
    }

    // Phase 3: Upload pending attachments (deferred, non-fatal)
    try {
      const uploaded = await uploadPendingAttachments();
      if (uploaded > 0) {
        if (__DEV__) console.log(`[Sync] Uploaded ${uploaded} attachments`);
        await cleanUploadedFiles();
      }
    } catch (attachmentError) {
      if (__DEV__) console.warn('[Sync] Attachment upload failed (non-fatal):', attachmentError);
    }

    // Phase 4: Flush pending crash reports (deferred from offline)
    try {
      await crashReporter.flushPendingReports();
    } catch {
      // Never block sync for crash report flush
    }

    // Phase 5: Flush pending GPS pings (Fase B tracking-vendedor)
    try {
      const { flushPendingAsync } = await import('@/services/locationCheckpoint');
      const result = await flushPendingAsync();
      if (__DEV__ && result.pushed > 0) console.log(`[Sync] Pushed ${result.pushed} GPS pings`);
      if (__DEV__ && result.disabled) console.log('[Sync] Tracking disabled (plan no aplica)');
    } catch {
      // Never block sync for GPS ping flush
    }

    // Phase 6: Sync notification history (rescata pushes que no llegaron en
    // vivo — app cerrada, sin red en el momento, fresh install). Best-effort.
    try {
      const { syncNotificationsFromBackend } = await import('@/services/notificationSync');
      const added = await syncNotificationsFromBackend();
      if (__DEV__ && added > 0) console.log(`[Sync] Pulled ${added} notifications from backend`);
    } catch {
      // Never block sync for notification history fetch
    }

    const summary: SyncSummary = { pulled: pullCount, pushed: pushCount, conflicts: conflictCount };
    // Atomic batch write — await garantiza persistencia antes de resolver el
    // sync. Sin esto, un logout justo después podía dejar storage stale.
    await syncCursors.commitSyncResult(summary);
    options?.onFinish?.(summary);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    // Sync failures por red caída son normales en una app offline-first;
    // solo logueamos a warn para no disparar el RedBox/Toast de RN.
    const isNetworkError = /network|timeout|fetch|abort|ECONN/i.test(err.message);
    if (__DEV__) {
      if (isNetworkError) console.warn('[Sync] Network unavailable:', err.message);
      else console.warn('[Sync] Failed:', err.message);
    }
    options?.onError?.(err);
    throw err;
  } finally {
    // sync state managed by syncStore, not here
  }
}
