// src/services/api/gastos-contables.ts
// Gastos contables (deducibles) que alimentan el Estado de Resultados, IVA y DIOT.
// NO confundir con `gastos.ts` (gastos de ruta reportados desde móvil, endpoint /gastos).
import { api, handleApiError } from '@/lib/api';

// ============ TIPOS ============

export type GastoContableCategoria =
  | 'Sueldos'
  | 'Comisiones'
  | 'Combustible'
  | 'Renta'
  | 'Servicios'
  | 'Otros';

export const GASTO_CONTABLE_CATEGORIAS: GastoContableCategoria[] = [
  'Sueldos',
  'Comisiones',
  'Combustible',
  'Renta',
  'Servicios',
  'Otros',
];

export interface GastoContable {
  id: number;
  fecha: string;
  categoria: string;
  descripcion: string;
  base: number;
  iva: number;
  total: number;
  proveedorRfc?: string;
  proveedorNombre?: string;
  usuarioId?: number;
  creadoEn: string;
}

export interface GastosContablesListResponse {
  items: GastoContable[];
  total: number;
  totalBase: number;
  totalIva: number;
  totalGeneral: number;
}

export interface CreateGastoContableRequest {
  fecha: string;
  categoria: string;
  descripcion: string;
  base: number;
  iva: number;
  proveedorRfc?: string;
  proveedorNombre?: string;
}

export type UpdateGastoContableRequest = Partial<CreateGastoContableRequest>;

function formatParams(params: { desde?: string; hasta?: string }) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

// ============ SERVICIO ============

const basePath = '/api/gastos-contables';

export async function getGastosContables(
  params: { desde?: string; hasta?: string } = {}
): Promise<GastosContablesListResponse> {
  try {
    const res = await api.get<GastosContablesListResponse>(`${basePath}${formatParams(params)}`);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function createGastoContable(payload: CreateGastoContableRequest): Promise<GastoContable> {
  try {
    const res = await api.post<GastoContable>(basePath, payload);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function updateGastoContable(id: number, payload: UpdateGastoContableRequest): Promise<GastoContable> {
  try {
    const res = await api.patch<GastoContable>(`${basePath}/${id}`, payload);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function deleteGastoContable(id: number): Promise<void> {
  try {
    await api.delete(`${basePath}/${id}`);
  } catch (error) {
    throw handleApiError(error);
  }
}
