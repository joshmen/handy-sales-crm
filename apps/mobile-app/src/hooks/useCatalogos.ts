// Hooks de catalogos read-only. Antes usaban React Query (memoria) — al cerrar
// sesion `queryClient.clear()` borraba todo y el vendedor tenia que re-loguear
// para tenerlos. Ahora leen de WatermelonDB persistente: el sync delta los
// hidrata, los hooks los exponen reactivos. Reportado 2026-04-28.

import { useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import Zona from '@/db/models/Zona';
import CategoriaCliente from '@/db/models/CategoriaCliente';
import CategoriaProducto from '@/db/models/CategoriaProducto';
import FamiliaProducto from '@/db/models/FamiliaProducto';
import { useObservable } from './useObservable';

// Shape compatible con consumidores existentes (CatalogoItem: { id, nombre })
export interface CatalogoItem {
  id: number;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
}

function modelToCatalogoItem(
  records: ReadonlyArray<{ serverId: number; nombre: string; descripcion: string | null; activo: boolean }>,
): CatalogoItem[] {
  return records.map((r) => ({
    id: r.serverId,
    nombre: r.nombre,
    descripcion: r.descripcion,
    activo: r.activo,
  }));
}

export function useZonas() {
  const observable = useMemo(
    () =>
      database
        .get<Zona>('zonas')
        .query(Q.where('activo', true), Q.sortBy('nombre'))
        .observeWithColumns(['nombre', 'activo']),
    [],
  );
  const { data, isLoading } = useObservable(observable);
  return { data: data ? modelToCatalogoItem(data) : undefined, isLoading };
}

export function useCategoriasCliente() {
  const observable = useMemo(
    () =>
      database
        .get<CategoriaCliente>('categorias_cliente')
        .query(Q.where('activo', true), Q.sortBy('nombre'))
        .observeWithColumns(['nombre', 'activo']),
    [],
  );
  const { data, isLoading } = useObservable(observable);
  return { data: data ? modelToCatalogoItem(data) : undefined, isLoading };
}

export function useCategoriasProducto() {
  const observable = useMemo(
    () =>
      database
        .get<CategoriaProducto>('categorias_producto')
        .query(Q.where('activo', true), Q.sortBy('nombre'))
        .observeWithColumns(['nombre', 'activo']),
    [],
  );
  const { data, isLoading } = useObservable(observable);
  return { data: data ? modelToCatalogoItem(data) : undefined, isLoading };
}

export function useFamiliasProducto() {
  const observable = useMemo(
    () =>
      database
        .get<FamiliaProducto>('familias_producto')
        .query(Q.where('activo', true), Q.sortBy('nombre'))
        .observeWithColumns(['nombre', 'activo']),
    [],
  );
  const { data, isLoading } = useObservable(observable);
  return { data: data ? modelToCatalogoItem(data) : undefined, isLoading };
}
