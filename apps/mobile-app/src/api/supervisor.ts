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
} from './schemas/supervisor';
import type {
  VendedorEquipo,
  SupervisorDashboard,
  UbicacionVendedor,
  ActividadItem,
  VendedorResumen,
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

  getVendedorResumen: async (vendedorId: number): Promise<VendedorResumen> => {
    const { data } = await api.get<ApiResponse<VendedorResumen>>(
      `${BASE}/vendedor/${vendedorId}/resumen`
    );
    const validated = validateResponse(
      VendedorResumenResponseSchema,
      data,
      `GET /api/mobile/supervisor/vendedor/${vendedorId}/resumen`
    );
    return validated.data;
  },
};
