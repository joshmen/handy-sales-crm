import { useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { combineLatest, map } from 'rxjs';
import { database } from '@/db/database';
import { useObservable } from './useObservable';

/**
 * Lista de tablas WDB que se empujan al backend via sync push.
 * Reliability Sprint Fase 2: ampliada de 5 a 10 tablas. Antes solo cobertura
 * basica (clientes/pedidos/detalles/visitas/cobros); ahora incluye gastos,
 * devoluciones y ruta_detalles que tambien participan del push y el vendedor
 * no estaba viendo si quedaban pendientes.
 *
 * attachments NO esta aqui — usa su propio campo uploadStatus en lugar de
 * _status. Si se necesita, agregar via useAttachmentsPendingCount aparte.
 */
const SYNCABLE_TABLES = [
  'clientes',
  'pedidos',
  'detalle_pedidos',
  'visitas',
  'cobros',
  'ruta_detalles',
  'gastos',
  'devoluciones_pedido',
  'detalle_devoluciones',
] as const;

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
