// Hooks de catalogos criticos (v15, 2026-04-28). Patron identico a useCatalogos:
// leen de WatermelonDB persistente, observable reactivo, offline real.

import { useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import ListaPrecio from '@/db/models/ListaPrecio';
import Usuario from '@/db/models/Usuario';
import MetaVendedor from '@/db/models/MetaVendedor';
import DatosEmpresa from '@/db/models/DatosEmpresa';
import { useObservable } from './useObservable';

export interface ListaPrecioItem {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface UsuarioItem {
  id: number;
  nombre: string;
  email: string;
  rol: string | null;
  avatarUrl: string | null;
  activo: boolean;
}

export interface MetaVendedorItem {
  id: number;
  usuarioId: number;
  tipo: string;
  periodo: string;
  monto: number;
  fechaInicio: Date;
  fechaFin: Date;
  activo: boolean;
}

export interface DatosEmpresaItem {
  id: number;
  razonSocial: string | null;
  identificadorFiscal: string | null;
  tipoIdentificadorFiscal: string;
  telefono: string | null;
  email: string | null;
  contacto: string | null;
  direccion: string | null;
  ciudad: string | null;
  estado: string | null;
  codigoPostal: string | null;
  sitioWeb: string | null;
  descripcion: string | null;
}

export function useListasPrecio() {
  const observable = useMemo(
    () =>
      database
        .get<ListaPrecio>('listas_precio')
        .query(Q.where('activo', true), Q.sortBy('nombre'))
        .observeWithColumns(['nombre', 'activo']),
    [],
  );
  const { data, isLoading } = useObservable(observable);
  return {
    data: data?.map((l) => ({
      id: l.serverId,
      nombre: l.nombre,
      descripcion: l.descripcion,
      activo: l.activo,
    })) as ListaPrecioItem[] | undefined,
    isLoading,
  };
}

/** Hook helper: dado un listaPreciosId, devuelve el nombre. */
export function useListaPrecioNombre(listaPreciosId: number | null | undefined): string | null {
  const { data } = useListasPrecio();
  if (!listaPreciosId || !data) return null;
  return data.find((l) => l.id === listaPreciosId)?.nombre ?? null;
}

export function useUsuarios() {
  const observable = useMemo(
    () =>
      database
        .get<Usuario>('usuarios')
        .query(Q.where('activo', true), Q.sortBy('nombre'))
        .observeWithColumns(['nombre', 'activo']),
    [],
  );
  const { data, isLoading } = useObservable(observable);
  return {
    data: data?.map((u) => ({
      id: u.serverId,
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      avatarUrl: u.avatarUrl,
      activo: u.activo,
    })) as UsuarioItem[] | undefined,
    isLoading,
  };
}

/** Solo vendedores (rol VENDEDOR). Util para supervisores que asignan rutas. */
export function useVendedores() {
  const observable = useMemo(
    () =>
      database
        .get<Usuario>('usuarios')
        .query(Q.where('activo', true), Q.where('rol', 'VENDEDOR'), Q.sortBy('nombre'))
        .observeWithColumns(['nombre', 'rol', 'activo']),
    [],
  );
  const { data, isLoading } = useObservable(observable);
  return {
    data: data?.map((u) => ({
      id: u.serverId,
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      avatarUrl: u.avatarUrl,
      activo: u.activo,
    })) as UsuarioItem[] | undefined,
    isLoading,
  };
}

export function useMetasVendedor(usuarioId?: number) {
  const observable = useMemo(() => {
    const conditions: Q.Clause[] = [Q.where('activo', true)];
    if (usuarioId) conditions.push(Q.where('usuario_id', usuarioId));
    return database
      .get<MetaVendedor>('metas_vendedor')
      .query(...conditions)
      .observeWithColumns(['monto', 'tipo', 'periodo', 'activo']);
  }, [usuarioId]);
  const { data, isLoading } = useObservable(observable);
  return {
    data: data?.map((m) => ({
      id: m.serverId,
      usuarioId: m.usuarioId,
      tipo: m.tipo,
      periodo: m.periodo,
      monto: m.monto,
      fechaInicio: m.fechaInicio,
      fechaFin: m.fechaFin,
      activo: m.activo,
    })) as MetaVendedorItem[] | undefined,
    isLoading,
  };
}

export function useDatosEmpresa() {
  const observable = useMemo(
    () =>
      database
        .get<DatosEmpresa>('datos_empresa')
        .query()
        .observeWithColumns([
          'razon_social',
          'identificador_fiscal',
          'telefono',
          'email',
        ]),
    [],
  );
  const { data, isLoading } = useObservable(observable);
  const empresa = data?.[0];
  return {
    data: empresa
      ? ({
          id: empresa.serverId,
          razonSocial: empresa.razonSocial,
          identificadorFiscal: empresa.identificadorFiscal,
          tipoIdentificadorFiscal: empresa.tipoIdentificadorFiscal,
          telefono: empresa.telefono,
          email: empresa.email,
          contacto: empresa.contacto,
          direccion: empresa.direccion,
          ciudad: empresa.ciudad,
          estado: empresa.estado,
          codigoPostal: empresa.codigoPostal,
          sitioWeb: empresa.sitioWeb,
          descripcion: empresa.descripcion,
        } as DatosEmpresaItem)
      : undefined,
    isLoading,
  };
}
