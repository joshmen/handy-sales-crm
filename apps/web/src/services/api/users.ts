import { api } from '@/lib/api';
import { ApiResponse } from './types';

export interface User {
  id: number;
  email: string;
  tenantId: number;
  nombre?: string;
  telefono?: string;
  verificado?: boolean;
  fechaVerificacion?: string;
  esAdmin?: boolean;
  esSuperAdmin?: boolean;
  activo?: boolean;
  creadoEn?: string;
  actualizadoEn?: string;
  ultimoAcceso?: string;
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

export interface CreateUserRequest {
  email: string;
  password: string;
  nombre: string;
  esAdmin: boolean;
  tenantId: number;
  telefono?: string;
}

export interface UpdateUserRequest {
  nombre: string;
  esAdmin: boolean;
  activo: boolean;
  telefono?: string;
  verificado?: boolean;
}

class UsersService {
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
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      return {
        success: false,
        data: null,
        error: errorMessage,
      };
    }
  }

  async getAllUsers(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    isActive?: boolean;
    role?: string;
  }): Promise<ApiResponse<User[] | PaginatedResult<User>>> {
    let endpoint = '/api/usuarios';

    if (params) {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
      if (params.search) searchParams.append('search', params.search);
      if (params.isActive !== undefined)
        searchParams.append('isActive', params.isActive.toString());
      if (params.role) searchParams.append('role', params.role);

      const queryString = searchParams.toString();
      if (queryString) {
        endpoint += `?${queryString}`;
      }
    }

    return this.request<User[] | PaginatedResult<User>>(endpoint, { method: 'GET' });
  }

  async getUserById(id: number): Promise<ApiResponse<User>> {
    return this.request<User>(`/api/usuarios/${id}`, { method: 'GET' });
  }

  async createUser(user: CreateUserRequest): Promise<ApiResponse<User>> {
    return this.request<User>('/api/usuarios', {
      method: 'POST',
      data: user,
    });
  }

  async updateUser(id: number, user: UpdateUserRequest): Promise<ApiResponse<User>> {
    return this.request<User>(`/api/usuarios/${id}`, {
      method: 'PUT',
      data: user,
    });
  }

  async deleteUser(id: number): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/usuarios/${id}`, {
      method: 'DELETE',
    });
  }

  async batchToggleActive(ids: number[], activo: boolean): Promise<ApiResponse<{ actualizados: number }>> {
    try {
      const response = await api.patch<{ actualizados: number }>('/api/usuarios/batch-toggle', { ids, activo });
      return {
        success: true,
        data: response.data,
        error: null,
      };
    } catch (error) {
      console.error('Batch toggle failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      return {
        success: false,
        data: null,
        error: errorMessage,
      };
    }
  }
}

export const usersService = new UsersService();
