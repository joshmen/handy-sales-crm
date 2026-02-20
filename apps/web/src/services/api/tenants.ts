import { api, handleApiError } from '@/lib/api';
import type {
  Tenant,
  TenantDetail,
  TenantUser,
  TenantCreateRequest,
  TenantUpdateRequest,
  TenantCreateUserRequest,
  SystemMetrics,
} from '@/types/tenant';

class TenantService {
  private basePath = '/api/tenants';

  async getAll(): Promise<Tenant[]> {
    try {
      const response = await api.get<Tenant[]>(this.basePath);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getById(id: number): Promise<TenantDetail> {
    try {
      const response = await api.get<TenantDetail>(`${this.basePath}/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async create(data: TenantCreateRequest): Promise<{ id: number }> {
    try {
      const response = await api.post<{ id: number }>(this.basePath, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async update(id: number, data: TenantUpdateRequest): Promise<void> {
    try {
      await api.put(`${this.basePath}/${id}`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async toggleActivo(id: number, activo: boolean): Promise<void> {
    try {
      await api.patch(`${this.basePath}/${id}/activo`, { activo });
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async batchToggle(ids: number[], activo: boolean): Promise<void> {
    try {
      await api.patch(`${this.basePath}/batch-toggle`, { ids, activo });
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const response = await api.get<SystemMetrics>('/api/dashboard/system-metrics');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getTenantUsers(tenantId: number): Promise<TenantUser[]> {
    try {
      const response = await api.get<TenantUser[]>(`${this.basePath}/${tenantId}/users`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createTenantUser(tenantId: number, data: TenantCreateUserRequest): Promise<{ id: number }> {
    try {
      const response = await api.post<{ id: number }>(`${this.basePath}/${tenantId}/users`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const tenantService = new TenantService();
