import api from './client';
import { validateResponse } from './validateResponse';
import { ApiResponseSchema, CatalogoItemSchema } from './schemas';
import { z } from 'zod';
import type { ApiResponse } from '@/types';

// Re-export the type from schemas (was originally defined here)
export type { CatalogoItem } from './schemas';

const CatalogoListResponseSchema = ApiResponseSchema(z.array(CatalogoItemSchema));

const BASE = '/api/mobile/catalogos';

export const catalogosApi = {
  getZonas: async () => {
    const { data } = await api.get<ApiResponse<import('./schemas').CatalogoItem[]>>(
      `${BASE}/zonas`
    );
    const validated = validateResponse(
      CatalogoListResponseSchema,
      data,
      'GET /api/mobile/catalogos/zonas'
    );
    return validated.data;
  },

  getCategoriasCliente: async () => {
    const { data } = await api.get<ApiResponse<import('./schemas').CatalogoItem[]>>(
      `${BASE}/categorias-cliente`
    );
    const validated = validateResponse(
      CatalogoListResponseSchema,
      data,
      'GET /api/mobile/catalogos/categorias-cliente'
    );
    return validated.data;
  },

  getCategoriasProducto: async () => {
    const { data } = await api.get<ApiResponse<import('./schemas').CatalogoItem[]>>(
      `${BASE}/categorias-producto`
    );
    const validated = validateResponse(
      CatalogoListResponseSchema,
      data,
      'GET /api/mobile/catalogos/categorias-producto'
    );
    return validated.data;
  },

  getFamiliasProducto: async () => {
    const { data } = await api.get<ApiResponse<import('./schemas').CatalogoItem[]>>(
      `${BASE}/familias-producto`
    );
    const validated = validateResponse(
      CatalogoListResponseSchema,
      data,
      'GET /api/mobile/catalogos/familias-producto'
    );
    return validated.data;
  },
};
