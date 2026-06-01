import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';

/**
 * Edad del registro pendiente mas viejo en horas.
 * null si no hay pendientes.
 *
 * Reliability Sprint Fase 2: visibilidad para el vendedor cuando datos llevan
 * mucho tiempo sin subir al backend. Banner amarillo > 24h, rojo > 72h.
 *
 * Implementacion: query MIN(created_at) across las tablas syncables.
 * Polling cada 5min porque created_at no cambia con _status (no es buen
 * candidato para subscribe-on-changes); el banner no necesita reactividad
 * sub-segundo.
 */

const SYNCABLE_TABLES = [
  'clientes', 'pedidos', 'detalle_pedidos', 'visitas', 'cobros',
  'ruta_detalles', 'gastos', 'devoluciones_pedido', 'detalle_devoluciones',
] as const;

const POLL_INTERVAL_MS = 5 * 60 * 1000;

export function useOldestPendingAge(): number | null {
  const [oldestAgeHours, setOldestAgeHours] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const computeOldest = async () => {
      try {
        const now = Date.now();
        let oldestMs: number | null = null;

        for (const tableName of SYNCABLE_TABLES) {
          const records = await database.collections
            .get(tableName)
            .query(
              Q.or(Q.where('_status', 'created'), Q.where('_status', 'updated')),
              Q.sortBy('created_at', Q.asc),
              Q.take(1),
            )
            .fetch();
          if (records.length > 0) {
            const ts = (records[0] as { createdAt?: Date | number }).createdAt;
            const tsMs = ts instanceof Date ? ts.getTime() : Number(ts ?? 0);
            if (tsMs > 0 && (oldestMs === null || tsMs < oldestMs)) {
              oldestMs = tsMs;
            }
          }
        }

        if (cancelled) return;
        if (oldestMs === null) {
          setOldestAgeHours(null);
        } else {
          const ageHours = (now - oldestMs) / (1000 * 60 * 60);
          setOldestAgeHours(ageHours);
        }
      } catch (err) {
        if (__DEV__) console.warn('[useOldestPendingAge] failed:', err);
      }
    };

    computeOldest();
    const interval = setInterval(computeOldest, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return oldestAgeHours;
}
