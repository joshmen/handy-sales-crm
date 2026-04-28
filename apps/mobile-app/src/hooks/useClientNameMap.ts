import { useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import Cliente from '@/db/models/Cliente';
import { useObservable } from './useObservable';

/**
 * Returns a reactive Map<clienteId, nombre> for resolving client names locally.
 * Useful for screens that show pedidos, cobros, or ruta detalles with client names.
 *
 * @param ids Array de client IDs a cargar. Pasar el set único de ids necesarios
 *            por la pantalla — antes el hook permitía undefined que cargaba toda
 *            la tabla clientes reactivamente (lag con 1000+ clientes y re-render
 *            en cada navegación).
 *
 * @example
 *   const clienteIds = useMemo(
 *     () => Array.from(new Set(pedidos?.map(p => p.clienteId) ?? [])),
 *     [pedidos]
 *   );
 *   const clientNames = useClientNameMap(clienteIds);
 */
export function useClientNameMap(ids: string[]) {
  // Stable key para useMemo — evita rebuilds innecesarios cuando el array es
  // semánticamente igual pero referencialmente nuevo. .sort() asegura orden estable.
  const key = useMemo(() => ids.slice().sort().join(','), [ids]);

  const observable = useMemo(() => {
    if (ids.length === 0) return null;
    return database.get<Cliente>('clientes').query(Q.where('id', Q.oneOf(ids))).observe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const { data: clientes } = useObservable(observable);

  return useMemo(() => {
    const map = new Map<string, string>();
    clientes?.forEach((c) => map.set(c.id, c.nombre));
    return map;
  }, [clientes]);
}
