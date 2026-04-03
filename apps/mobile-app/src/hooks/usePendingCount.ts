import { useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { combineLatest, map } from 'rxjs';
import { database } from '@/db/database';
import { useObservable } from './useObservable';

const SYNCABLE_TABLES = ['clientes', 'pedidos', 'detalle_pedidos', 'visitas', 'cobros'] as const;

export function usePendingCount() {
  const observable = useMemo(() => {
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

    return combineLatest(queries).pipe(
      map((counts: number[]) => counts.reduce((sum, c) => sum + c, 0))
    );
  }, []);

  return useObservable<number>(observable);
}
