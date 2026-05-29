import { api, handleApiError } from '@/lib/api';

export interface GastoListItem {
  id: number;
  usuarioId: number;
  usuarioNombre: string;
  rutaId: number | null;
  rutaCodigo: string | null;
  fechaGasto: string;
  monto: number;
  tipoGasto: number;
  concepto: string;
  notas: string | null;
  comprobanteUrl: string | null;
  moneda: string;
  estado: number; // 0=Activo, 1=Invalidado
  invalidadoPor: string | null;
  invalidadoEn: string | null;
  motivoInvalidacion: string | null;
  creadoEn: string;
}

export interface GastosKpi {
  totalActivos: number;
  totalInvalidados: number;
  countActivos: number;
  countInvalidados: number;
}

export interface GastosListResponse {
  items: GastoListItem[];
  totalCount: number;
  pagina: number;
  tamanoPagina: number;
  kpi: GastosKpi;
}

export interface GastosListParams {
  pagina?: number;
  tamanoPagina?: number;
  usuarioId?: number;
  rutaId?: number;
  tipoGasto?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  soloActivos?: boolean;
}

export const TIPO_GASTO_LABEL: Record<number, string> = {
  0: 'Combustible',
  1: 'Peaje',
  2: 'Comida',
  3: 'Hospedaje',
  4: 'Mantenimiento',
  5: 'Estacionamiento',
  6: 'Papeleria',
  99: 'Otro',
};

class GastosService {
  async list(params: GastosListParams = {}): Promise<GastosListResponse> {
    try {
      const q = new URLSearchParams();
      if (params.pagina) q.append('pagina', params.pagina.toString());
      if (params.tamanoPagina) q.append('tamanoPagina', params.tamanoPagina.toString());
      if (params.usuarioId) q.append('usuarioId', params.usuarioId.toString());
      if (params.rutaId) q.append('rutaId', params.rutaId.toString());
      if (params.tipoGasto !== undefined) q.append('tipoGasto', params.tipoGasto.toString());
      if (params.fechaDesde) q.append('fechaDesde', params.fechaDesde);
      if (params.fechaHasta) q.append('fechaHasta', params.fechaHasta);
      if (params.soloActivos === false) q.append('soloActivos', 'false');

      const response = await api.get<GastosListResponse>(`/gastos?${q.toString()}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async invalidar(id: number, motivo?: string): Promise<void> {
    try {
      await api.post(`/gastos/${id}/invalidar`, { motivo: motivo ?? null });
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const gastosService = new GastosService();
