import { api, handleApiError } from '@/lib/api';

// ============ TIPOS ============

export interface SubscriptionPlanAdminDto {
  id: number;
  nombre: string;
  codigo: string;
  precioMensual: number;
  precioAnual: number;
  maxUsuarios: number;
  maxProductos: number;
  maxClientesPorMes: number;
  incluyeReportes: boolean;
  incluyeSoportePrioritario: boolean;
  caracteristicas: string[];
  activo: boolean;
  orden: number;
  tenantCount: number;
}

export interface SubscriptionPlanCreateDto {
  nombre: string;
  codigo: string;
  precioMensual: number;
  precioAnual: number;
  maxUsuarios: number;
  maxProductos: number;
  maxClientesPorMes: number;
  incluyeReportes: boolean;
  incluyeSoportePrioritario: boolean;
  caracteristicas: string[];
  orden: number;
}

export interface SubscriptionPlanUpdateDto {
  nombre: string;
  precioMensual: number;
  precioAnual: number;
  maxUsuarios: number;
  maxProductos: number;
  maxClientesPorMes: number;
  incluyeReportes: boolean;
  incluyeSoportePrioritario: boolean;
  caracteristicas: string[];
  activo: boolean;
  orden: number;
}

// ============ SERVICIO ============

class SubscriptionPlanAdminService {
  private basePath = '/api/superadmin/subscription-plans';

  async getAll(): Promise<SubscriptionPlanAdminDto[]> {
    try {
      const res = await api.get<SubscriptionPlanAdminDto[]>(this.basePath);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getById(id: number): Promise<SubscriptionPlanAdminDto> {
    try {
      const res = await api.get<SubscriptionPlanAdminDto>(`${this.basePath}/${id}`);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async create(dto: SubscriptionPlanCreateDto): Promise<{ id: number }> {
    try {
      const res = await api.post<{ id: number }>(this.basePath, dto);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async update(id: number, dto: SubscriptionPlanUpdateDto): Promise<void> {
    try {
      await api.put(`${this.basePath}/${id}`, dto);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async toggle(id: number): Promise<void> {
    try {
      await api.patch(`${this.basePath}/${id}/toggle`);
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const subscriptionPlanAdminService = new SubscriptionPlanAdminService();
