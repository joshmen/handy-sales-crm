import { useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import Producto from '@/db/models/Producto';
import { useObservable } from './useObservable';

export function useOfflineProducts(search?: string, categoriaId?: number) {
  const observable = useMemo(() => {
    const conditions: Q.Clause[] = [Q.where('activo', true)];

    if (search && search.length > 0) {
      conditions.push(Q.where('nombre', Q.like(`%${Q.sanitizeLikeString(search)}%`)));
    }
    if (categoriaId) {
      conditions.push(Q.where('categoria_id', categoriaId));
    }

    conditions.push(Q.sortBy('nombre', Q.asc));

    return database.get<Producto>('productos').query(...conditions).observe();
  }, [search, categoriaId]);

  return useObservable(observable);
}

export function useOfflineProductById(id: string | undefined) {
  const observable = useMemo(() => {
    if (!id) return null;
    return database.get<Producto>('productos').findAndObserve(id);
  }, [id]);

  return useObservable(observable);
}
