import { api, handleApiError } from '@/lib/api';

export interface MetaVendedor {
  id: number;
  tenantId: number;
  usuarioId: number;
  usuarioNombre: string;
  tipo: 'ventas' | 'visitas' | 'pedidos';
  periodo: 'semanal' | 'mensual';
  monto: number;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  creadoEn: string;
  autoRenovar: boolean;
}

export interface CreateMetaVendedorRequest {
  usuarioId: number;
  tipo: string;
  periodo: string;
  monto: number;
  fechaInicio: string;
  fechaFin: string;
  autoRenovar?: boolean;
}

export interface UpdateMetaVendedorRequest {
  tipo: string;
  periodo: string;
  monto: number;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  autoRenovar?: boolean;
}

const BASE = '/api/metas';

class MetaVendedorService {
  async getAll(usuarioId?: number): Promise<MetaVendedor[]> {
    try {
      const params = usuarioId ? `?usuarioId=${usuarioId}` : '';
      const res = await api.get<MetaVendedor[]>(`${BASE}${params}`);
      return res.data;
    } catch (e) { throw handleApiError(e); }
  }

  async getById(id: number): Promise<MetaVendedor> {
    try {
      const res = await api.get<MetaVendedor>(`${BASE}/${id}`);
      return res.data;
    } catch (e) { throw handleApiError(e); }
  }

  async create(data: CreateMetaVendedorRequest): Promise<{ id: number }> {
    try {
      const res = await api.post<{ id: number }>(BASE, data);
      return res.data;
    } catch (e) { throw handleApiError(e); }
  }

  async update(id: number, data: UpdateMetaVendedorRequest): Promise<void> {
    try { await api.put(`${BASE}/${id}`, data); }
    catch (e) { throw handleApiError(e); }
  }

  async delete(id: number): Promise<void> {
    try { await api.delete(`${BASE}/${id}`); }
    catch (e) { throw handleApiError(e); }
  }

  async toggleActivo(id: number, activo: boolean): Promise<void> {
    try { await api.patch(`${BASE}/${id}/activo`, { activo }); }
    catch (e) { throw handleApiError(e); }
  }
}

export const metaVendedorService = new MetaVendedorService();
