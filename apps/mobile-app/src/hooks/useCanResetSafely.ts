import { useEffect, useMemo, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import { combineLatest, type Subscription } from 'rxjs';
import { database } from '@/db/database';
import { useJornadaStore } from '@/stores';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSyncStore } from '@/stores';
import { useAuthStore } from '@/stores/authStore';

/**
 * C.2 hardening (fix prod 2026-06-04 post-incidente Rodrigo):
 *
 * Hook reactivo que retorna si es SEGURO ejecutar resetDatabase() (wipe
 * completo WDB + side effects). El gate canRestore original solo verificaba
 * pendingCount + pendingAttachments + isOnline + !isSyncing, pero ignoraba:
 *  - ubicaciones_vendedor con sincronizado=false (cientos de pings GPS)
 *  - jornada activa (perder tracking de jornada = perder contexto operativo)
 *  - attachments pendientes (fotos no subidas)
 *
 * Severidades:
 *  - 'block': datos del usuario que el wipe DESTRUYE sin recuperacion (pedidos,
 *    cobros, visitas, clientes, detalles, attachments). El usuario tendria que
 *    re-capturar manualmente. canReset=false.
 *  - 'warn': datos operacionales no recuperables pero tampoco input directo del
 *    usuario (GPS pings, jornada activa). Se muestran como advertencia pero
 *    NO bloquean restore. El usuario decide informado.
 *
 * canReset = isOnline && !isSyncing && blockers.filter(b => b.severity==='block').length === 0
 *
 * El consumer puede mostrar:
 *  - blockers de 'block' -> lista clara para sincronizar antes
 *  - blockers de 'warn' -> advertencia opcional dentro del modal
 */

export type Severity = 'block' | 'warn';

export interface Blocker {
  table: string;
  label: string;
  count: number;
  severity: Severity;
}

interface BlockerDef {
  table: string;
  label: string;
  severity: Severity;
  /** Filtro WatermelonDB para identificar registros pendientes. */
  pendingFilter: Q.Clause;
}

const TABLES: ReadonlyArray<BlockerDef> = [
  { table: 'clientes', label: 'Clientes', severity: 'block', pendingFilter: Q.or(Q.where('_status', 'created'), Q.where('_status', 'updated')) },
  { table: 'pedidos', label: 'Pedidos', severity: 'block', pendingFilter: Q.or(Q.where('_status', 'created'), Q.where('_status', 'updated')) },
  { table: 'detalle_pedidos', label: 'Detalles de pedido', severity: 'block', pendingFilter: Q.or(Q.where('_status', 'created'), Q.where('_status', 'updated')) },
  { table: 'visitas', label: 'Visitas', severity: 'block', pendingFilter: Q.or(Q.where('_status', 'created'), Q.where('_status', 'updated')) },
  { table: 'cobros', label: 'Cobros', severity: 'block', pendingFilter: Q.or(Q.where('_status', 'created'), Q.where('_status', 'updated')) },
  { table: 'attachments', label: 'Fotos y firmas sin subir', severity: 'block', pendingFilter: Q.or(Q.where('upload_status', 'pending'), Q.where('upload_status', 'failed')) },
  // 'warn' tier — informativo, NO bloquea restore
  { table: 'ubicaciones_vendedor', label: 'Ubicaciones GPS sin enviar', severity: 'warn', pendingFilter: Q.where('sincronizado', false) },
];

export interface CanResetSafelyResult {
  canReset: boolean;
  blockers: Blocker[];
  /** Subset de blockers con severity='block' (los que impiden el restore). */
  hardBlockers: Blocker[];
  /** Subset de blockers con severity='warn' (advertencias informativas). */
  softWarnings: Blocker[];
  isLoading: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  /**
   * Fix prod 2026-06-05 (data-loss prevention):
   * Soft-logout server-side. JWT local sigue pero el server rechaza requests
   * con 401 SESSION_REVOKED. El SessionExpiredBanner ya consume este flag.
   */
  sessionExpired: boolean;
  /**
   * True cuando sessionExpired=true (independiente de hardBlockers).
   * Hardening 2026-06-05: bloquea SIEMPRE el restore con sesion expirada, no
   * solo cuando hay pendientes. Razon: aunque hardBlockers=0, el wipe deja
   * WDB vacio y el sync pull post-wipe falla 401 -> usuario queda con app
   * "en cero" sin recovery hasta re-login. El toast de "Datos restaurados"
   * miente. La UI debe forzar Iniciar sesion antes de cualquier restore.
   * El override 'Restaurar de todos modos' queda como escape solo cuando
   * hardBlockers > 0 (hay algo conscientemente que perder).
   */
  sessionExpiredBlocksDestructive: boolean;
}

export function useCanResetSafely(): CanResetSafelyResult {
  const { isConnected } = useNetworkStatus();
  const isOnline = !!isConnected;
  const status = useSyncStore((s) => s.status);
  const isSyncing = status === 'syncing';
  const jornadaActiva = useJornadaStore((s) => s.activa);
  const sessionExpired = useAuthStore((s) => s.sessionExpired);

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Combinar observables WDB de las 7 tablas + jornada activa via combineLatest.
  // Reactive: el hook re-evalua automaticamente cuando cualquiera de las
  // colas cambia (pedido nuevo, sync completa, ping GPS, etc.).
  useEffect(() => {
    setIsLoading(true);
    let sub: Subscription | null = null;
    try {
      const observables = TABLES.map((def) =>
        database.collections.get(def.table).query(def.pendingFilter).observeCount(),
      );

      sub = combineLatest(observables).subscribe({
        next: (values: number[]) => {
          const next: Record<string, number> = {};
          TABLES.forEach((def, idx) => {
            next[def.table] = values[idx] ?? 0;
          });
          setCounts(next);
          setIsLoading(false);
        },
        error: (err) => {
          if (__DEV__) console.warn('[useCanResetSafely] observe error:', err);
          setIsLoading(false);
        },
      });
    } catch (err) {
      if (__DEV__) console.warn('[useCanResetSafely] init error:', err);
      setIsLoading(false);
    }

    return () => {
      sub?.unsubscribe();
    };
  }, []);

  const result = useMemo<CanResetSafelyResult>(() => {
    const blockers: Blocker[] = [];

    for (const def of TABLES) {
      const count = counts[def.table] ?? 0;
      if (count > 0) {
        blockers.push({
          table: def.table,
          label: def.label,
          count,
          severity: def.severity,
        });
      }
    }

    // Jornada activa es 'warn' (no bloquea, advierte)
    if (jornadaActiva) {
      blockers.push({
        table: 'jornada',
        label: 'Jornada laboral activa',
        count: 1,
        severity: 'warn',
      });
    }

    const hardBlockers = blockers.filter((b) => b.severity === 'block');
    const softWarnings = blockers.filter((b) => b.severity === 'warn');
    // canReset NO incluye sessionExpired: la pantalla aplica el gate
    // destructivo via sessionExpiredBlocksDestructive en restaurar-datos.tsx.
    const canReset = isOnline && !isSyncing && hardBlockers.length === 0;
    // Hardening 2026-06-05: sessionExpired bloquea SIEMPRE el restore,
    // independiente de hardBlockers. Si la sesion expiro:
    //  - hardBlockers > 0: wipe + sync push = 401 = pendientes perdidos
    //  - hardBlockers === 0: wipe + sync pull = 401 = WDB en cero sin
    //    recovery hasta re-login. El toast de exito miente al usuario.
    // Forzar 'Iniciar sesion' como CTA primario en ambos casos.
    const sessionExpiredBlocksDestructive = sessionExpired;

    return {
      canReset,
      blockers,
      hardBlockers,
      softWarnings,
      isLoading,
      isOnline,
      isSyncing,
      sessionExpired,
      sessionExpiredBlocksDestructive,
    };
  }, [counts, isOnline, isSyncing, isLoading, jornadaActiva, sessionExpired]);

  return result;
}
