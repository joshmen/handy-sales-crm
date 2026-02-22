import api from './client';
import type {
  SaldoCliente,
  ResumenCartera,
  EstadoCuenta,
  MobileCobro,
  CobroCreateRequest,
} from '@/types/cobro';
import type { PaginatedApiResponse, ApiResponse } from '@/types';

const BASE = '/api/mobile/cobros';

export const cobrosApi = {
  getSaldos: async (clienteId?: number) => {
    const params = clienteId ? { clienteId } : {};
    const { data } = await api.get<ApiResponse<SaldoCliente[]>>(
      `${BASE}/saldos`,
      { params }
    );
    return data.data;
  },

  getResumenCartera: async () => {
    const { data } = await api.get<ApiResponse<ResumenCartera>>(
      `${BASE}/saldos/resumen`
    );
    return data.data;
  },

  getEstadoCuenta: async (clienteId: number) => {
    const { data } = await api.get<ApiResponse<EstadoCuenta>>(
      `${BASE}/cliente/${clienteId}/estado-cuenta`
    );
    return data.data;
  },

  crear: async (cobro: CobroCreateRequest) => {
    const { data } = await api.post<ApiResponse<{ id: number }>>(BASE, cobro);
    return data.data;
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
    return { data: data.data, pagination: data.pagination };
  },
};
