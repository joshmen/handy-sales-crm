import { api, handleApiError } from '@/lib/api';
import { PackageX, AlertTriangle, CalendarX, ClipboardX, UserX, Replace, FileQuestion, type LucideIcon } from 'lucide-react';

export interface DevolucionDetalle {
  id: number;
  productoId: number;
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  impuesto: number;
  total: number;
}

export interface DevolucionListItem {
  id: number;
  usuarioId: number;
  usuarioNombre: string;
  rutaId: number | null;
  rutaCodigo: string | null;
  pedidoId: number;
  pedidoNumero: string;
  clienteId: number;
  clienteNombre: string;
  fechaDevolucion: string;
  motivo: number;
  notas: string | null;
  tipoReembolso: number; // 0=SaldoFavor, 1=Efectivo
  montoTotal: number;
  fotoEvidenciaUrl: string | null;
  estado: number; // 0=Activa, 1=Anulada
  anuladaPor: string | null;
  anuladaEn: string | null;
  motivoAnulacion: string | null;
  creadoEn: string;
  detalles: DevolucionDetalle[];
}

export interface DevolucionesKpi {
  totalSaldoFavor: number;
  totalEfectivo: number;
  totalGeneral: number;
  countActivas: number;
  countAnuladas: number;
}

export interface DevolucionesListResponse {
  items: DevolucionListItem[];
  totalCount: number;
  pagina: number;
  tamanoPagina: number;
  kpi: DevolucionesKpi;
}

export interface DevolucionesListParams {
  pagina?: number;
  tamanoPagina?: number;
  usuarioId?: number;
  rutaId?: number;
  clienteId?: number;
  motivo?: number;
  tipoReembolso?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  soloActivas?: boolean;
}

// Mirror del enum backend MotivoDevolucion en DevolucionPedido.cs
export const MOTIVO_DEVOLUCION_LABEL: Record<number, string> = {
  0: 'Dano en transporte',
  1: 'No conforme',
  2: 'Producto vencido',
  3: 'Error en pedido',
  4: 'Cliente se retracta',
  5: 'Producto incorrecto',
  99: 'Otro',
};

export const MOTIVO_DEVOLUCION_ICON: Record<number, LucideIcon> = {
  0: PackageX, 1: AlertTriangle, 2: CalendarX, 3: ClipboardX, 4: UserX, 5: Replace, 99: FileQuestion,
};

export const MOTIVO_DEVOLUCION_COLOR: Record<number, string> = {
  0: 'text-red-600', 1: 'text-amber-600', 2: 'text-orange-600', 3: 'text-blue-600',
  4: 'text-purple-600', 5: 'text-rose-600', 99: 'text-slate-400',
};

// Tipo reembolso — el badge en cada card
export const TIPO_REEMBOLSO_LABEL: Record<number, string> = {
  0: 'Saldo a favor',
  1: 'Efectivo',
};

export const TIPO_REEMBOLSO_COLOR: Record<number, string> = {
  0: 'bg-blue-100 text-blue-700 border-blue-200',
  1: 'bg-amber-100 text-amber-700 border-amber-200',
};

class DevolucionesService {
  async list(params: DevolucionesListParams = {}): Promise<DevolucionesListResponse> {
    try {
      const q = new URLSearchParams();
      if (params.pagina) q.append('pagina', params.pagina.toString());
      if (params.tamanoPagina) q.append('tamanoPagina', params.tamanoPagina.toString());
      if (params.usuarioId) q.append('usuarioId', params.usuarioId.toString());
      if (params.rutaId) q.append('rutaId', params.rutaId.toString());
      if (params.clienteId) q.append('clienteId', params.clienteId.toString());
      if (params.motivo !== undefined) q.append('motivo', params.motivo.toString());
      if (params.tipoReembolso !== undefined) q.append('tipoReembolso', params.tipoReembolso.toString());
      if (params.fechaDesde) q.append('fechaDesde', params.fechaDesde);
      if (params.fechaHasta) q.append('fechaHasta', params.fechaHasta);
      if (params.soloActivas === false) q.append('soloActivas', 'false');

      const response = await api.get<DevolucionesListResponse>(`/devoluciones?${q.toString()}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async anular(id: number, motivo?: string): Promise<void> {
    try {
      await api.post(`/devoluciones/${id}/anular`, { motivo: motivo ?? null });
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const devolucionesService = new DevolucionesService();
