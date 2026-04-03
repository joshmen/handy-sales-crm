import { useMemo, useState, useEffect } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import Cliente from '@/db/models/Cliente';
import { useObservable } from './useObservable';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function useOfflineClients(search?: string, zonaId?: number) {
  const debouncedSearch = useDebounce(search, 300);

  const observable = useMemo(() => {
    const conditions: Q.Clause[] = [Q.where('activo', true)];

    if (debouncedSearch && debouncedSearch.length > 0) {
      conditions.push(Q.where('nombre', Q.like(`%${Q.sanitizeLikeString(debouncedSearch)}%`)));
    }
    if (zonaId) {
      conditions.push(Q.where('zona_id', zonaId));
    }

    conditions.push(Q.sortBy('nombre', Q.asc));

    return database.get<Cliente>('clientes').query(...conditions).observe();
  }, [debouncedSearch, zonaId]);

  return useObservable(observable);
}

export function useOfflineClientById(id: string | undefined) {
  const observable = useMemo(() => {
    if (!id) return null;
    return database.get<Cliente>('clientes').findAndObserve(id);
  }, [id]);

  return useObservable(observable);
}
