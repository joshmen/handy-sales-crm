// Catálogos comerciales offline-first: listas de precios, precios por producto,
// descuentos por cantidad y promociones. El sync delta los hidrata desde el
// backend (`/api/mobile/sync/pull` ya retorna estas 4 entidades). Cuando el
// admin activa/desactiva algo desde el web, useRealtime escucha el evento
// SignalR correspondiente y dispara performSync() — los componentes que
// observen estos hooks se re-renderizan automáticamente.

import { useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import ListaPrecio from '@/db/models/ListaPrecio';
import PrecioPorProducto from '@/db/models/PrecioPorProducto';
import Descuento from '@/db/models/Descuento';
import Promocion from '@/db/models/Promocion';
import { useObservable } from './useObservable';

/**
 * Listas de precios activas del tenant (catálogo cabecera).
 * Use junto con `useOfflinePreciosPorProducto` para obtener el precio aplicable
 * a un producto dentro de una lista específica.
 */
export function useOfflineListasPrecios() {
  const observable = useMemo(
    () =>
      database
        .get<ListaPrecio>('listas_precio')
        .query(Q.where('activo', true), Q.sortBy('nombre'))
        .observeWithColumns(['nombre', 'activo']),
    [],
  );
  return useObservable(observable);
}

/**
 * Items de la tabla precios_por_producto. Ambos filtros son opcionales:
 * - sin filtros → todos los precios activos
 * - solo productoServerId → precios del producto en TODAS las listas
 * - solo listaPrecioServerId → todos los precios de esa lista
 * - ambos → precio puntual del producto en esa lista (típicamente 0 o 1 fila)
 */
export function useOfflinePreciosPorProducto(opts?: { productoServerId?: number; listaPrecioServerId?: number }) {
  const productoServerId = opts?.productoServerId;
  const listaPrecioServerId = opts?.listaPrecioServerId;
  const observable = useMemo(() => {
    const conditions: Q.Clause[] = [Q.where('activo', true)];
    if (productoServerId != null) conditions.push(Q.where('producto_server_id', productoServerId));
    if (listaPrecioServerId != null) conditions.push(Q.where('lista_precio_id', listaPrecioServerId));
    return database.get<PrecioPorProducto>('precios_por_producto').query(...conditions).observe();
  }, [productoServerId, listaPrecioServerId]);
  return useObservable(observable);
}

/**
 * Descuentos por cantidad activos. Si pasas `productoServerId` filtra solo los
 * aplicables a ese producto (incluye los globales con producto_server_id null).
 */
export function useOfflineDescuentos(productoServerId?: number) {
  const observable = useMemo(() => {
    const conditions: Q.Clause[] = [Q.where('activo', true)];
    if (productoServerId != null) {
      // Aplican: descuentos del producto específico OR descuentos globales (sin producto)
      conditions.push(
        Q.or(
          Q.where('producto_server_id', productoServerId),
          Q.where('producto_server_id', null),
          Q.where('tipo_aplicacion', 'Global'),
        ),
      );
    }
    conditions.push(Q.sortBy('cantidad_minima', Q.asc));
    return database.get<Descuento>('descuentos').query(...conditions).observe();
  }, [productoServerId]);
  return useObservable(observable);
}

/**
 * Promociones vigentes (activo=true + fecha actual entre fecha_inicio y fecha_fin).
 * Si pasas `productoServerId` filtra solo las que aplican (mediante el
 * productoIdsJson o el productoBonificadoId si es BOGO).
 *
 * NOTA: El filtro de fechas se aplica en JS (post-query) porque WatermelonDB
 * Q no soporta comparación de columnas date contra valores dinámicos del runtime
 * de forma reactiva sin re-evaluar. La query base solo trae las activas.
 */
export function useOfflinePromociones(productoServerId?: number) {
  const observable = useMemo(
    () =>
      database
        .get<Promocion>('promociones')
        .query(Q.where('activo', true), Q.sortBy('fecha_inicio', Q.desc))
        .observe(),
    [],
  );
  const { data, isLoading } = useObservable(observable);

  const filtered = useMemo(() => {
    if (!data) return data;
    const now = Date.now();
    return data.filter(p => {
      const inicio = p.fechaInicio?.getTime() ?? 0;
      const fin = p.fechaFin?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (now < inicio || now > fin) return false;
      if (productoServerId == null) return true;
      // BOGO: aplica si el producto está en productoIds (compra) o es el bonificado
      if (p.productoBonificadoId === productoServerId) return true;
      return p.productoIds.includes(productoServerId);
    });
  }, [data, productoServerId]);

  return { data: filtered, isLoading };
}
