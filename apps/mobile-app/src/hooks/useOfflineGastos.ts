import { useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import Gasto from '@/db/models/Gasto';
import { useObservable } from './useObservable';

/**
 * Gastos del usuario actual, ordenados por fecha_gasto desc.
 * Solo activos (no eliminados). Estado=Invalidado igual aparece (en gris en UI).
 */
export function useOfflineGastos(usuarioId: number) {
  const observable = useMemo(() => {
    return database
      .get<Gasto>('gastos')
      .query(
        Q.where('usuario_id', usuarioId),
        Q.where('activo', true),
        Q.sortBy('fecha_gasto', Q.desc),
      )
      .observe();
  }, [usuarioId]);
  return useObservable(observable);
}

export function useOfflineGastoById(id: string | undefined) {
  const observable = useMemo(() => {
    if (!id) return null;
    return database.get<Gasto>('gastos').findAndObserve(id);
  }, [id]);
  return useObservable(observable);
}
