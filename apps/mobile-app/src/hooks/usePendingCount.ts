import { useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import { useObservable } from './useObservable';

const SYNCABLE_TABLES = ['clientes', 'pedidos', 'detalle_pedidos', 'visitas', 'cobros'] as const;

export function usePendingCount() {
  const observable = useMemo(() => {
    // Count records with pending sync status across all syncable tables
    // WatermelonDB marks records as 'created' or 'updated' when they have local changes
    const queries = SYNCABLE_TABLES.map((table) =>
      database.collections
        .get(table)
        .query(
          Q.or(
            Q.where('_status', 'created'),
            Q.where('_status', 'updated')
          )
        )
        .observeCount()
    );

    // Combine all observables into a single sum
    const { combineLatest, map } = require('rxjs');
    return combineLatest(queries).pipe(
      map((counts: number[]) => counts.reduce((sum, c) => sum + c, 0))
    );
  }, []);

  return useObservable<number>(observable);
}
