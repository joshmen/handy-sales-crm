import { useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import Cliente from '@/db/models/Cliente';
import { useObservable } from './useObservable';

/**
 * Returns a reactive Map<clienteId, nombre> for resolving client names locally.
 * Useful for screens that show pedidos, cobros, or ruta detalles with client names.
 *
 * @param ids Optional array of client IDs to filter by. When provided, only those
 *            clients are loaded from WatermelonDB. When omitted, all clients are loaded.
 */
export function useClientNameMap(ids?: string[]) {
  const observable = useMemo(() => {
    if (ids && ids.length > 0) {
      return database.get<Cliente>('clientes').query(Q.where('id', Q.oneOf(ids))).observe();
    }
    return database.get<Cliente>('clientes').query().observe();
  }, [ids?.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: clientes } = useObservable(observable);

  return useMemo(() => {
    const map = new Map<string, string>();
    clientes?.forEach((c) => map.set(c.id, c.nombre));
    return map;
  }, [clientes]);
}
