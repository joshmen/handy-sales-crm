import { api } from '@/lib/api';
import { AxiosError } from 'axios';
import { ApiResponse } from './types';

export interface Role {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CreateRoleDto {
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

export interface UpdateRoleDto {
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

class RoleService {
  private async request<T>(
    endpoint: string,
    options: { method?: string; data?: unknown } = {}
  ): Promise<ApiResponse<T>> {
    try {
      let response;
      const { method = 'GET', data } = options;

      switch (method) {
        case 'GET':
          response = await api.get<T>(endpoint);
          break;
        case 'POST':
          response = await api.post<T>(endpoint, data);
          break;
        case 'PUT':
          response = await api.put<T>(endpoint, data);
          break;
        case 'DELETE':
          response = await api.delete<T>(endpoint);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      return {
        success: true,
        data: response.data,
        error: null,
      };
    } catch (error) {
      console.error('API request failed:', error);
      let errorMessage = 'Error desconocido';

      if (error instanceof Error) {
        // Si es un AxiosError, extraer mejor información
        if (error.name === 'AxiosError') {
          const axiosError = error as AxiosError<{ message?: string; title?: string }>;
          if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ERR_NETWORK') {
            errorMessage =
              'No se pudo conectar con el servidor. Verifica que el backend esté corriendo en puerto 5070.';
          } else if (axiosError.response) {
            errorMessage =
              axiosError.response?.data?.message ||
              axiosError.response?.data?.title ||
              axiosError.message ||
              `Error ${axiosError.response?.status}`;
          } else {
            errorMessage = axiosError.message || 'Error de conexión con el servidor';
          }
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        data: null,
        error: errorMessage,
      };
    }
  }

  async getAllRoles(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<Role[] | PaginatedResult<Role>>> {
    let endpoint = '/api/roles';

    if (params) {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
      if (params.search) searchParams.append('search', params.search);
      if (params.isActive !== undefined)
        searchParams.append('isActive', params.isActive.toString());

      const queryString = searchParams.toString();
      if (queryString) {
        endpoint += `?${queryString}`;
      }
    }

    return this.request<Role[] | PaginatedResult<Role>>(endpoint, { method: 'GET' });
  }

  async getActiveRoles(): Promise<Role[]> {
    const response = await this.request<Role[]>('/api/roles/active');
    return response.success ? response.data || [] : [];
  }

  async getRoleById(id: number): Promise<ApiResponse<Role>> {
    return this.request<Role>(`/api/roles/${id}`, { method: 'GET' });
  }

  async createRole(data: CreateRoleDto): Promise<ApiResponse<Role>> {
    return this.request<Role>('/api/roles', {
      method: 'POST',
      data,
    });
  }

  async updateRole(id: number, data: UpdateRoleDto): Promise<ApiResponse<Role>> {
    return this.request<Role>(`/api/roles/${id}`, {
      method: 'PUT',
      data,
    });
  }

  async deleteRole(id: number): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/roles/${id}`, {
      method: 'DELETE',
    });
  }
}

export const roleService = new RoleService();
