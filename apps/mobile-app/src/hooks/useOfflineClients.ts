import { useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import Cliente from '@/db/models/Cliente';
import { useObservable } from './useObservable';

export function useOfflineClients(search?: string, zonaId?: number) {
  const observable = useMemo(() => {
    const conditions: Q.Clause[] = [Q.where('activo', true)];

    if (search && search.length > 0) {
      conditions.push(Q.where('nombre', Q.like(`%${Q.sanitizeLikeString(search)}%`)));
    }
    if (zonaId) {
      conditions.push(Q.where('zona_id', zonaId));
    }

    conditions.push(Q.sortBy('nombre', Q.asc));

    return database.get<Cliente>('clientes').query(...conditions).observe();
  }, [search, zonaId]);

  return useObservable(observable);
}

export function useOfflineClientById(id: string | undefined) {
  const observable = useMemo(() => {
    if (!id) return null;
    return database.get<Cliente>('clientes').findAndObserve(id);
  }, [id]);

  return useObservable(observable);
}
