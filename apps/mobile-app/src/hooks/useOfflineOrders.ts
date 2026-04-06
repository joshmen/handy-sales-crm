import { useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import Pedido from '@/db/models/Pedido';
import DetallePedido from '@/db/models/DetallePedido';
import { useObservable } from './useObservable';

export function useOfflineOrders(clienteId?: string) {
  const observable = useMemo(() => {
    const conditions: Q.Clause[] = [Q.where('activo', true)];

    if (clienteId) {
      conditions.push(Q.where('cliente_id', clienteId));
    }

    conditions.push(Q.sortBy('created_at', Q.desc));

    return database.get<Pedido>('pedidos').query(...conditions).observeWithColumns(['numero_pedido', 'estado', 'server_id', 'total']);
  }, [clienteId]);

  return useObservable(observable);
}

export function useOfflineOrderById(id: string | undefined) {
  const observable = useMemo(() => {
    if (!id) return null;
    return database.get<Pedido>('pedidos').findAndObserve(id);
  }, [id]);

  return useObservable(observable);
}

export function useOfflineOrderDetalles(pedidoId: string) {
  const observable = useMemo(() => {
    return database
      .get<DetallePedido>('detalle_pedidos')
      .query(Q.where('pedido_id', pedidoId))
      .observe();
  }, [pedidoId]);

  return useObservable(observable);
}
