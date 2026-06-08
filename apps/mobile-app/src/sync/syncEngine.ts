import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '@/db/database';
import { api } from '@/api/client';
import { syncCursors } from './cursors';
import { mapPullToWatermelon, mapPushFromWatermelon } from './mappers';
import { uploadPendingAttachments, cleanUploadedFiles, recoverOrphanAttachmentStamps } from '@/services/evidenceManager';
import { crashReporter } from '@/services/crashReporter';
import { useAuthStore } from '@/stores/authStore';
import { withRetry } from './retry';
import { resolveConflict } from './conflictResolver';

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
  /**
   * Audit 2026-06-07 (Fase 3): per-entity errors reportados por el backend
   * tras los savepoints. NO incluye errores HTTP del push entero (esos throwean
   * y se manejan por el catch en performSync). Es el conteo de entities que
   * fallaron individualmente server-side pero el resto del batch commiteó.
   */
  errors?: number;
}

/**
 * Sprint 1 audit code-quality: feedback granular del sync engine.
 * Permite que el UI muestre "Enviando 12 de 47 pedidos" en lugar de
 * un spinner generico que deja al usuario "a ciegas".
 *
 * Phases:
 *  - flush_crash: vaciando cola de crash reports offline
 *  - pull: bajando cambios del server
 *  - apply_pull: aplicando cambios al WDB local
 *  - push: subiendo cambios locales al server
 *  - attachments: subiendo fotos/firmas pendientes
 *  - done: sync terminado (current=total=0, opcional emitir)
 */
export type SyncPhase = 'flush_crash' | 'pull' | 'apply_pull' | 'push' | 'attachments' | 'done';

export interface SyncProgress {
  phase: SyncPhase;
  current: number;
  total: number;
  entity?: string;
}

interface SyncOptions {
  onStart?: () => void;
  onFinish?: (info: SyncSummary) => void;
  onError?: (error: Error) => void;
  /**
   * Sprint 1: callback opcional de progreso. Backwards compatible.
   * Llamado al inicio de cada fase + cada N items dentro de la fase.
   */
  onProgress?: (progress: SyncProgress) => void;
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
  let errorCount = 0;

  try {
    // Phase 0: Flush any pending crash reports from offline queue
    options?.onProgress?.({ phase: 'flush_crash', current: 0, total: 0 });
    try {
      await crashReporter.flushPendingReports();
    } catch (flushError) {
      if (__DEV__) console.warn('[Sync] Crash report flush failed (non-fatal):', flushError);
    }

    await synchronize({
      database,

      pullChanges: async ({ lastPulledAt }) => {
        // Sprint 1: signal de inicio de pull. current/total se conocen tras recibir response.
        options?.onProgress?.({ phase: 'pull', current: 0, total: 0 });
        const lastSync = lastPulledAt
          ? new Date(lastPulledAt).toISOString()
          : null;

        if (__DEV__) console.log('[Sync] Pull lastSync:', lastSync);
        // Reliability Fase 2: retry exponencial ante 5xx/network. Sin esto un
        // 503 transitorio dejaba la sync en estado error hasta el proximo trigger.
        const response = await withRetry('pull', () => api.post('/api/mobile/sync/pull', {
          lastSyncTimestamp: lastSync,
          entityTypes: null,
        }));

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

        // Sprint 1: ya conocemos el total del pull (bajamos todo en una request).
        // Emitir progreso para que UI muestre "Bajando X registros".
        options?.onProgress?.({ phase: 'pull', current: pullCount, total: pullCount });

        options?.onProgress?.({ phase: 'apply_pull', current: 0, total: pullCount });
        const timestamp = new Date(serverTimestamp).getTime();
        const changes = await mapPullToWatermelon(serverChanges, lastPulledAt ?? null);

        if (__DEV__) console.log('[Sync] Mapped changes for', Object.keys(changes).length, 'tables');

        options?.onProgress?.({ phase: 'apply_pull', current: pullCount, total: pullCount });
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

        // Sprint 1: signal de inicio de push con total conocido.
        options?.onProgress?.({ phase: 'push', current: 0, total: pushCount });

        // Only push if there are actual changes
        const hasChanges = pushCount > 0;
        if (!hasChanges) return;

        // B.3 (fix prod 2026-06-03 post-incidente Rodrigo): retry exponencial
        // AGRESIVO en push. Backend 503/timeout transitorio no debe dejar datos
        // locales en limbo. Pre-incidente: default 2s/4s/8s (12s total).
        // Post-incidente: 500ms/2s/5s (7.5s total + jitter) — más responsive
        // mientras el vendedor está finalizando un pedido, esperar 12s es UX
        // terrible. La diferencia entre 7.5s y 12s no afecta éxito de retry
        // (transient errors típicamente se recuperan en 500ms-2s).
        const response = await withRetry(
          'push',
          () => api.post('/api/mobile/sync/push', payload),
          { maxAttempts: 3, baseDelayMs: 500, maxDelayMs: 5000 },
        );
        const body = response.data as any;

        // Count conflicts from server response
        if (body?.conflicts) {
          conflictCount = Array.isArray(body.conflicts) ? body.conflicts.length : 0;
        }

        // Store ID mappings to apply after sync completes
        const mappings = body?.data?.createdIdMappings ?? body?.createdIdMappings ?? [];
        if (mappings.length) pendingIdMappings.push(...mappings);

        // Audit 2026-06-07 (Fase 3): leer response.errors[] que el server reporta
        // por entity tras los savepoints. Pre-fix, mobile asumia "HTTP 200 = todo
        // synced" y WDB marcaba TODO como _status:'synced' incluso si una entity
        // fallo server-side — divergencia silenciosa + posible loop si la entity
        // se reedita y el push del mismo error se repite.
        //
        // Comportamiento ahora:
        //   - Loggear cada error a crashReporter con entityType/entityId/message
        //     para diagnostico en field via AWS CloudWatch.
        //   - NO throw — eso haria que WDB no marcara NINGUNA entity synced
        //     y reintentara TODO el batch (volveriamos al loop original).
        //   - El usuario ve las entities exitosas commiteadas, las fallidas
        //     quedan en estado divergente local (WDB synced, server con error).
        //     Hardening futuro: surfacear toast al user + circuit breaker en
        //     useAutoSync (ya documentado en plan Fase 3 mobile-side).
        const errors = body?.data?.errors ?? body?.errors ?? [];
        if (Array.isArray(errors) && errors.length > 0) {
          errorCount += errors.length;
          if (__DEV__) {
            console.warn(`[Sync] push completed with ${errors.length} per-entity error(s):`);
            for (const e of errors) {
              console.warn(
                `  - ${e.entityType ?? e.EntityType}#${e.entityId ?? e.EntityId} (${e.operation ?? e.Operation}): ${e.message ?? e.Message}`,
              );
            }
          }
          // Reportar como warning event (NO crash) — el sync no fallo, solo
          // algunas entities. Backend ya commiteó las demas via savepoints.
          try {
            crashReporter.reportEvent('sync_push_per_entity_errors', {
              count: errors.length,
              first_error_type: errors[0]?.entityType ?? errors[0]?.EntityType ?? 'unknown',
              first_error_msg: (errors[0]?.message ?? errors[0]?.Message ?? '').slice(0, 200),
              all_types: Array.from(new Set(errors.map((e: any) => e.entityType ?? e.EntityType ?? 'unknown'))).join(','),
            });
          } catch {
            // crashReporter offline — el log __DEV__ arriba ya cubrió en local.
          }
        }

        // Sprint 1: push terminado.
        options?.onProgress?.({ phase: 'push', current: pushCount, total: pushCount });
      },

      sendCreatedAsUpdated: true,

      // B.5 conflict resolver — extraído a ./conflictResolver.ts para testabilidad
      // (apps/mobile-app/src/sync/__tests__/conflictResolver.test.ts).
      // Reglas vivas allí, este lambda solo delega.
      conflictResolver: resolveConflict,
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
    // Sprint 1: signal de inicio de attachments. uploadPendingAttachments no
    // expone progreso per-file por ahora — refactor futuro.
    options?.onProgress?.({ phase: 'attachments', current: 0, total: 0 });
    try {
      const uploaded = await uploadPendingAttachments();
      if (uploaded > 0) {
        if (__DEV__) console.log(`[Sync] Uploaded ${uploaded} attachments`);
        await cleanUploadedFiles();
      }
      options?.onProgress?.({ phase: 'attachments', current: uploaded, total: uploaded });
    } catch (attachmentError) {
      if (__DEV__) console.warn('[Sync] Attachment upload failed (non-fatal):', attachmentError);
    }

    // Phase 3.5: Recovery sweep — para attachments uploaded cuya URL no quedo en
    // el parent (gasto/devolucion) por race/stamp fallido. Stampea localmente,
    // marca dirty, y el proximo sync push lleva la URL al server. Bug prod 29/5.
    try {
      const recovered = await recoverOrphanAttachmentStamps();
      if (recovered > 0 && __DEV__) console.log(`[Sync] Recovered ${recovered} orphan attachment stamps`);
    } catch (recoveryError) {
      if (__DEV__) console.warn('[Sync] Orphan stamp recovery failed (non-fatal):', recoveryError);
    }

    // Phase 4: Flush pending crash reports (deferred from offline)
    try {
      await crashReporter.flushPendingReports();
    } catch (crashFlushError) {
      // Never block sync for crash report flush
      if (__DEV__) console.warn('[Sync] Crash report flush failed (non-fatal):', crashFlushError);
    }

    // Phase 5: Flush pending GPS pings (Fase B tracking-vendedor)
    try {
      const { flushPendingAsync } = await import('@/services/locationCheckpoint');
      const result = await flushPendingAsync();
      if (__DEV__ && result.pushed > 0) console.log(`[Sync] Pushed ${result.pushed} GPS pings`);
      if (__DEV__ && result.disabled) console.log('[Sync] Tracking disabled (plan no aplica)');
    } catch (gpsFlushError) {
      // Never block sync for GPS ping flush
      if (__DEV__) console.warn('[Sync] GPS ping flush failed (non-fatal):', gpsFlushError);
    }

    // Phase 6: Sync notification history (rescata pushes que no llegaron en
    // vivo — app cerrada, sin red en el momento, fresh install). Best-effort.
    try {
      const { syncNotificationsFromBackend } = await import('@/services/notificationSync');
      const added = await syncNotificationsFromBackend();
      if (__DEV__ && added > 0) console.log(`[Sync] Pulled ${added} notifications from backend`);
    } catch (notificationSyncError) {
      // Never block sync for notification history fetch
      if (__DEV__) console.warn('[Sync] Notification history fetch failed (non-fatal):', notificationSyncError);
    }

    const summary: SyncSummary = { pulled: pullCount, pushed: pushCount, conflicts: conflictCount, errors: errorCount };
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
    // Reliability Fase 2: telemetry — solo reportar errores NO-red (los de red
    // son normales offline-first y harian ruido). El crashReporter ya tiene
    // PII redaction + offline queue, asi que esto integra al pipeline de Sentry
    // si esta configurado, o queda en queue local para next flush.
    if (!isNetworkError) {
      crashReporter.reportCrash(err, 'SyncEngine', 'WARNING').catch(() => { /* never block sync */ });
    }
    options?.onError?.(err);
    throw err;
  } finally {
    // sync state managed by syncStore, not here
  }
}
