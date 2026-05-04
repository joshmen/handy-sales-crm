import api from './client';
import { validateResponse } from './validateResponse';
import { ApiResponseSchema } from './schemas';
import { z } from 'zod';
import {
  VendedorEquipoSchema,
  SupervisorDashboardSchema,
  UbicacionVendedorSchema,
  ActividadItemSchema,
  VendedorResumenSchema,
  TenantResumenSchema,
  TenantPedidoListItemSchema,
  TenantCobroListItemSchema,
} from './schemas/supervisor';
import type {
  VendedorEquipo,
  SupervisorDashboard,
  UbicacionVendedor,
  ActividadItem,
  VendedorResumen,
  TenantResumen,
  TenantPedidoListItem,
  TenantCobroListItem,
} from './schemas/supervisor';
import type { ApiResponse } from '@/types';

const VendedoresResponseSchema = ApiResponseSchema(z.array(VendedorEquipoSchema));
const DashboardResponseSchema = ApiResponseSchema(SupervisorDashboardSchema);
const UbicacionesResponseSchema = ApiResponseSchema(z.array(UbicacionVendedorSchema));
const ActividadResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(ActividadItemSchema),
  usuarios: z.record(z.string(), z.string()),
  count: z.number(),
}).passthrough();
const VendedorResumenResponseSchema = ApiResponseSchema(VendedorResumenSchema);
const TenantResumenResponseSchema = ApiResponseSchema(TenantResumenSchema);

// Paginated list response shape (data[] + total + page + pageSize + hasMore)
const TenantPedidosListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(TenantPedidoListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  hasMore: z.boolean(),
}).passthrough();
const TenantCobrosListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(TenantCobroListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  hasMore: z.boolean(),
}).passthrough();

export interface TenantPedidosPage {
  data: TenantPedidoListItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
export interface TenantCobrosPage {
  data: TenantCobroListItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

const BASE = '/api/mobile/supervisor';

export const supervisorApi = {
  getMisVendedores: async (): Promise<VendedorEquipo[]> => {
    const { data } = await api.get<ApiResponse<VendedorEquipo[]>>(
      `${BASE}/mis-vendedores`
    );
    const validated = validateResponse(
      VendedoresResponseSchema,
      data,
      'GET /api/mobile/supervisor/mis-vendedores'
    );
    return validated.data;
  },

  getDashboard: async (): Promise<SupervisorDashboard> => {
    const { data } = await api.get<ApiResponse<SupervisorDashboard>>(
      `${BASE}/dashboard`
    );
    const validated = validateResponse(
      DashboardResponseSchema,
      data,
      'GET /api/mobile/supervisor/dashboard'
    );
    return validated.data;
  },

  getUbicaciones: async (): Promise<UbicacionVendedor[]> => {
    const { data } = await api.get<ApiResponse<UbicacionVendedor[]>>(
      `${BASE}/ubicaciones`
    );
    const validated = validateResponse(
      UbicacionesResponseSchema,
      data,
      'GET /api/mobile/supervisor/ubicaciones'
    );
    return validated.data;
  },

  getActividad: async (): Promise<{ data: ActividadItem[]; usuarios: Record<string, string> }> => {
    const { data } = await api.get(`${BASE}/actividad`);
    const validated = ActividadResponseSchema.parse(data);
    return { data: validated.data, usuarios: validated.usuarios };
  },

  getVendedorResumen: async (
    vendedorId: number,
    opts?: { fecha?: string; rango?: '7d' }
  ): Promise<VendedorResumen> => {
    const params = new URLSearchParams();
    if (opts?.rango === '7d') params.set('rango', '7d');
    else if (opts?.fecha) params.set('fecha', opts.fecha);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const { data } = await api.get<ApiResponse<VendedorResumen>>(
      `${BASE}/vendedor/${vendedorId}/resumen${qs}`
    );
    const validated = validateResponse(
      VendedorResumenResponseSchema,
      data,
      `GET /api/mobile/supervisor/vendedor/${vendedorId}/resumen${qs}`
    );
    return validated.data;
  },

  // Admin only — agregados de TODO el tenant del día actual (TZ del tenant).
  // Permite a admin@jeyma.com ver "lo que se vendió hoy" en la app sin tener
  // que sincronizar la data de cada vendedor en WatermelonDB.
  getResumenTenant: async (): Promise<TenantResumen> => {
    const { data } = await api.get<ApiResponse<TenantResumen>>(
      `${BASE}/resumen-tenant`
    );
    const validated = validateResponse(
      TenantResumenResponseSchema,
      data,
      'GET /api/mobile/supervisor/resumen-tenant'
    );
    return validated.data;
  },

  // Admin/Supervisor — lista paginada de pedidos del tenant del día.
  // Reportado admin@jeyma.com 2026-05-04: tab Vender vacío para admin.
  getTenantPedidos: async (
    opts?: { dia?: string; page?: number; pageSize?: number }
  ): Promise<TenantPedidosPage> => {
    const params = new URLSearchParams();
    if (opts?.dia) params.set('dia', opts.dia);
    if (opts?.page) params.set('page', String(opts.page));
    if (opts?.pageSize) params.set('pageSize', String(opts.pageSize));
    const qs = params.toString() ? `?${params.toString()}` : '';
    const { data } = await api.get(`${BASE}/pedidos${qs}`);
    const validated = TenantPedidosListResponseSchema.parse(data);
    return {
      data: validated.data,
      total: validated.total,
      page: validated.page,
      pageSize: validated.pageSize,
      hasMore: validated.hasMore,
    };
  },

  getTenantCobros: async (
    opts?: { dia?: string; page?: number; pageSize?: number }
  ): Promise<TenantCobrosPage> => {
    const params = new URLSearchParams();
    if (opts?.dia) params.set('dia', opts.dia);
    if (opts?.page) params.set('page', String(opts.page));
    if (opts?.pageSize) params.set('pageSize', String(opts.pageSize));
    const qs = params.toString() ? `?${params.toString()}` : '';
    const { data } = await api.get(`${BASE}/cobros${qs}`);
    const validated = TenantCobrosListResponseSchema.parse(data);
    return {
      data: validated.data,
      total: validated.total,
      page: validated.page,
      pageSize: validated.pageSize,
      hasMore: validated.hasMore,
    };
  },
};
