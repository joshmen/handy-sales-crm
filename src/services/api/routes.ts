import { api, handleApiResponse, handleApiError, ApiResponse } from '@/lib/api';
import { Route, RouteTemplate, RouteVisit, RouteInventory } from '@/types/routes';

/**
 * Servicio para interactuar con el API de Rutas del backend .NET
 */
class RouteService {
  private basePath = '/routes';

  /**
   * Obtener todas las rutas
   */
  async getRoutes(params?: {
    status?: string;
    zone?: string;
    userId?: string;
    date?: string;
    page?: number;
    pageSize?: number;
  }) {
    try {
      const response = await api.get<ApiResponse<Route[]>>(this.basePath, { params });
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Obtener una ruta por ID
   */
  async getRouteById(id: string) {
    try {
      const response = await api.get<ApiResponse<Route>>(`${this.basePath}/${id}`);
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Crear nueva ruta
   */
  async createRoute(data: Partial<Route>) {
    try {
      const response = await api.post<ApiResponse<Route>>(this.basePath, data);
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Actualizar ruta
   */
  async updateRoute(id: string, data: Partial<Route>) {
    try {
      const response = await api.put<ApiResponse<Route>>(`${this.basePath}/${id}`, data);
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Eliminar ruta
   */
  async deleteRoute(id: string) {
    try {
      const response = await api.delete<ApiResponse<void>>(`${this.basePath}/${id}`);
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Iniciar ruta
   */
  async startRoute(id: string) {
    try {
      const response = await api.post<ApiResponse<Route>>(`${this.basePath}/${id}/start`);
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Cerrar ruta
   */
  async closeRoute(id: string, data: {
    cashCount: number;
    expenses: Array<{ concept: string; amount: number; category: string }>;
    returnedProducts: Array<{ productId: string; quantity: number; reason: string }>;
    notes?: string;
  }) {
    try {
      const response = await api.post<ApiResponse<Route>>(`${this.basePath}/${id}/close`, data);
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Cargar inventario a ruta
   */
  async loadInventory(routeId: string, inventory: RouteInventory[]) {
    try {
      const response = await api.post<ApiResponse<Route>>(
        `${this.basePath}/${routeId}/inventory`,
        { inventory }
      );
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Actualizar visita de ruta
   */
  async updateVisit(routeId: string, visitId: string, data: Partial<RouteVisit>) {
    try {
      const response = await api.put<ApiResponse<RouteVisit>>(
        `${this.basePath}/${routeId}/visits/${visitId}`,
        data
      );
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Completar visita
   */
  async completeVisit(routeId: string, visitId: string, orderData: {
    products: Array<{ productId: string; quantity: number; price: number }>;
    paymentMethod: 'cash' | 'credit' | 'transfer';
    notes?: string;
  }) {
    try {
      const response = await api.post<ApiResponse<RouteVisit>>(
        `${this.basePath}/${routeId}/visits/${visitId}/complete`,
        orderData
      );
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Cancelar visita
   */
  async cancelVisit(routeId: string, visitId: string, reason: string) {
    try {
      const response = await api.post<ApiResponse<RouteVisit>>(
        `${this.basePath}/${routeId}/visits/${visitId}/cancel`,
        { reason }
      );
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Obtener templates de rutas
   */
  async getRouteTemplates(params?: { zone?: string; isActive?: boolean }) {
    try {
      const response = await api.get<ApiResponse<RouteTemplate[]>>(
        `${this.basePath}/templates`,
        { params }
      );
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Crear template de ruta
   */
  async createRouteTemplate(data: Partial<RouteTemplate>) {
    try {
      const response = await api.post<ApiResponse<RouteTemplate>>(
        `${this.basePath}/templates`,
        data
      );
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Crear ruta desde template
   */
  async createRouteFromTemplate(templateId: string, data: {
    userId: string;
    date: string;
    notes?: string;
  }) {
    try {
      const response = await api.post<ApiResponse<Route>>(
        `${this.basePath}/templates/${templateId}/create`,
        data
      );
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Optimizar ruta
   */
  async optimizeRoute(routeId: string) {
    try {
      const response = await api.post<ApiResponse<Route>>(
        `${this.basePath}/${routeId}/optimize`
      );
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Obtener estadísticas de rutas
   */
  async getRouteStatistics(params?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    zone?: string;
  }) {
    try {
      const response = await api.get<ApiResponse<any>>(
        `${this.basePath}/statistics`,
        { params }
      );
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Exportar rutas
   */
  async exportRoutes(format: 'pdf' | 'excel' | 'csv', params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    zone?: string;
  }) {
    try {
      const response = await api.get(
        `${this.basePath}/export/${format}`,
        {
          params,
          responseType: 'blob'
        }
      );
      
      // Crear descarga del archivo
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rutas_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      return true;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Sincronizar ruta offline
   */
  async syncRoute(routeData: any) {
    try {
      const response = await api.post<ApiResponse<Route>>(
        `${this.basePath}/sync`,
        routeData
      );
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const routeService = new RouteService();