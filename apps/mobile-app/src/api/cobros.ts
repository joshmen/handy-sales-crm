import api from './client';
import { validateResponse } from './validateResponse';
import {
  ApiResponseSchema,
  PaginatedApiResponseSchema,
  SaldoClienteSchema,
  ResumenCarteraSchema,
  EstadoCuentaSchema,
  MobileCobroSchema,
} from './schemas';
import { z } from 'zod';
import type {
  SaldoCliente,
  ResumenCartera,
  EstadoCuenta,
  MobileCobro,
  CobroCreateRequest,
} from '@/types/cobro';
import type { PaginatedApiResponse, ApiResponse } from '@/types';

const SaldosResponseSchema = ApiResponseSchema(z.array(SaldoClienteSchema));
const ResumenResponseSchema = ApiResponseSchema(ResumenCarteraSchema);
const EstadoCuentaResponseSchema = ApiResponseSchema(EstadoCuentaSchema);
const CrearCobroResponseSchema = ApiResponseSchema(
  z.object({ id: z.number() }).passthrough()
);
const CobrosListResponseSchema = PaginatedApiResponseSchema(MobileCobroSchema);

const BASE = '/api/mobile/cobros';

export const cobrosApi = {
  getSaldos: async (clienteId?: number) => {
    const params = clienteId ? { clienteId } : {};
    const { data } = await api.get<ApiResponse<SaldoCliente[]>>(
      `${BASE}/saldos`,
      { params }
    );
    const validated = validateResponse(
      SaldosResponseSchema,
      data,
      'GET /api/mobile/cobros/saldos'
    );
    return validated.data;
  },

  getResumenCartera: async () => {
    const { data } = await api.get<ApiResponse<ResumenCartera>>(
      `${BASE}/saldos/resumen`
    );
    const validated = validateResponse(
      ResumenResponseSchema,
      data,
      'GET /api/mobile/cobros/saldos/resumen'
    );
    return validated.data;
  },

  getEstadoCuenta: async (clienteId: number) => {
    const { data } = await api.get<ApiResponse<EstadoCuenta>>(
      `${BASE}/cliente/${clienteId}/estado-cuenta`
    );
    const validated = validateResponse(
      EstadoCuentaResponseSchema,
      data,
      `GET /api/mobile/cobros/cliente/${clienteId}/estado-cuenta`
    );
    return validated.data;
  },

  crear: async (cobro: CobroCreateRequest) => {
    const { data } = await api.post<ApiResponse<{ id: number }>>(BASE, cobro);
    const validated = validateResponse(
      CrearCobroResponseSchema,
      data,
      'POST /api/mobile/cobros'
    );
    return validated.data;
  },

  misCobros: async (params: {
    clienteId?: number;
    desde?: string;
    hasta?: string;
    pagina?: number;
    porPagina?: number;
  }) => {
    const { data } = await api.get<PaginatedApiResponse<MobileCobro>>(
      `${BASE}/mis-cobros`,
      { params }
    );
    const validated = validateResponse(
      CobrosListResponseSchema,
      data,
      'GET /api/mobile/cobros/mis-cobros'
    );
    return { data: validated.data, pagination: validated.pagination };
  },
};
