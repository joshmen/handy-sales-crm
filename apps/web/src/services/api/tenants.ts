import { api, handleApiError } from '@/lib/api';
import type {
  Tenant,
  TenantDetail,
  TenantUser,
  TenantCreateRequest,
  TenantUpdateRequest,
  TenantCreateUserRequest,
  SystemMetrics,
  SystemTrends,
  GlobalUserPaginatedResponse,
  GlobalUserFilters,
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

  async getSystemTrends(days = 30): Promise<SystemTrends> {
    try {
      const response = await api.get<SystemTrends>(`/api/dashboard/system-trends?days=${days}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getGlobalUsers(params: GlobalUserFilters = {}): Promise<GlobalUserPaginatedResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.set('page', params.page.toString());
      if (params.pageSize) queryParams.set('pageSize', params.pageSize.toString());
      if (params.search) queryParams.set('search', params.search);
      if (params.tenantId) queryParams.set('tenantId', params.tenantId.toString());
      if (params.rol) queryParams.set('rol', params.rol);
      if (params.activo !== undefined) queryParams.set('activo', params.activo.toString());

      const query = queryParams.toString();
      const url = query ? `/api/dashboard/global-users?${query}` : '/api/dashboard/global-users';
      const response = await api.get<GlobalUserPaginatedResponse>(url);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const tenantService = new TenantService();
