import { useMemo } from 'react';
import { database } from '@/db/database';
import Cliente from '@/db/models/Cliente';
import { useObservable } from './useObservable';

/**
 * Returns a reactive Map<clienteId, nombre> for resolving client names locally.
 * Useful for screens that show pedidos, cobros, or ruta detalles with client names.
 */
export function useClientNameMap() {
  const observable = useMemo(() => {
    return database.get<Cliente>('clientes').query().observe();
  }, []);

  const { data: clientes } = useObservable(observable);

  return useMemo(() => {
    const map = new Map<string, string>();
    clientes?.forEach((c) => map.set(c.id, c.nombre));
    return map;
  }, [clientes]);
}
