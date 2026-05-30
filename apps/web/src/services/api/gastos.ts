import { api, handleApiError } from '@/lib/api';
import { Fuel, Receipt, Coffee, Bed, Wrench, ParkingSquare, FileQuestion, FileText, type LucideIcon } from 'lucide-react';

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

// Iconos y colores compartidos entre /gastos page y close screen — single source of truth.
export const TIPO_GASTO_ICON: Record<number, LucideIcon> = {
  0: Fuel, 1: Receipt, 2: Coffee, 3: Bed, 4: Wrench, 5: ParkingSquare, 6: FileText, 99: FileQuestion,
};

export const TIPO_GASTO_COLOR: Record<number, string> = {
  0: 'text-orange-600', 1: 'text-blue-600', 2: 'text-yellow-600', 3: 'text-purple-600',
  4: 'text-gray-600', 5: 'text-green-600', 6: 'text-slate-600', 99: 'text-slate-400',
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
