import api from './client';
import type { ApiResponse } from '@/types';

const BASE = '/api/mobile/catalogos';

export interface CatalogoItem {
  id: number;
  nombre: string;
  descripcion?: string;
}

export const catalogosApi = {
  getZonas: async () => {
    const { data } = await api.get<ApiResponse<CatalogoItem[]>>(`${BASE}/zonas`);
    return data.data;
  },

  getCategoriasCliente: async () => {
    const { data } = await api.get<ApiResponse<CatalogoItem[]>>(
      `${BASE}/categorias-cliente`
    );
    return data.data;
  },

  getCategoriasProducto: async () => {
    const { data } = await api.get<ApiResponse<CatalogoItem[]>>(
      `${BASE}/categorias-producto`
    );
    return data.data;
  },

  getFamiliasProducto: async () => {
    const { data } = await api.get<ApiResponse<CatalogoItem[]>>(
      `${BASE}/familias-producto`
    );
    return data.data;
  },
};
