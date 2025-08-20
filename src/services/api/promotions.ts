// src/services/api/promotions.ts
import { 
  Promotion, 
  CreatePromotionDto, 
  UpdatePromotionDto, 
  PromotionFilters,
  PromotionStats,
  PromotionReport,
  PromotionValidation,
  PromotionImportResult
} from '@/types/promotions';
import { ApiResponse, PaginatedResponse } from '@/types';

const API_BASE = '/api/promotions';

export const promotionsApi = {
  // CRUD básico
  getAll: async (filters?: PromotionFilters): Promise<PaginatedResponse<Promotion>> => {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    
    const url = `${API_BASE}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Error fetching promotions');
    }
    
    return response.json();
  },

  getById: async (id: string): Promise<ApiResponse<Promotion>> => {
    const response = await fetch(`${API_BASE}/${id}`);
    
    if (!response.ok) {
      throw new Error('Error fetching promotion');
    }
    
    return response.json();
  },

  create: async (data: CreatePromotionDto): Promise<ApiResponse<Promotion>> => {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Error creating promotion');
    }
    
    return response.json();
  },

  update: async (id: string, data: UpdatePromotionDto): Promise<ApiResponse<Promotion>> => {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Error updating promotion');
    }
    
    return response.json();
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Error deleting promotion');
    }
    
    return response.json();
  },

  // Funciones específicas de promociones
  toggleStatus: async (id: string): Promise<ApiResponse<Promotion>> => {
    const response = await fetch(`${API_BASE}/${id}/toggle-status`, {
      method: 'PATCH',
    });
    
    if (!response.ok) {
      throw new Error('Error toggling promotion status');
    }
    
    return response.json();
  },

  duplicate: async (id: string): Promise<ApiResponse<Promotion>> => {
    const response = await fetch(`${API_BASE}/${id}/duplicate`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Error duplicating promotion');
    }
    
    return response.json();
  },

  validate: async (id: string, data?: Record<string, unknown>): Promise<ApiResponse<PromotionValidation>> => {
    const response = await fetch(`${API_BASE}/${id}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data || {}),
    });
    
    if (!response.ok) {
      throw new Error('Error validating promotion');
    }
    
    return response.json();
  },

  // Estadísticas y reportes
  getStats: async (dateRange?: { from: Date; to: Date }): Promise<ApiResponse<PromotionStats>> => {
    const params = new URLSearchParams();
    
    if (dateRange) {
      params.append('from', dateRange.from.toISOString());
      params.append('to', dateRange.to.toISOString());
    }
    
    const url = `${API_BASE}/stats${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Error fetching promotion stats');
    }
    
    return response.json();
  },

  getReport: async (dateRange: { from: Date; to: Date }): Promise<ApiResponse<PromotionReport>> => {
    const params = new URLSearchParams({
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString(),
    });
    
    const response = await fetch(`${API_BASE}/report?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error('Error fetching promotion report');
    }
    
    return response.json();
  },

  // Importación y exportación
  import: async (file: File): Promise<ApiResponse<PromotionImportResult>> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE}/import`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Error importing promotions');
    }
    
    return response.json();
  },

  export: async (filters?: PromotionFilters): Promise<Blob> => {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    
    const url = `${API_BASE}/export${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Error exporting promotions');
    }
    
    return response.blob();
  },

  // Búsqueda de productos (para el formulario)
  searchProducts: async (query: string): Promise<ApiResponse<{id: string; name: string; code: string}[]>> => {
    const params = new URLSearchParams({ search: query });
    const response = await fetch(`/api/products/search?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error('Error searching products');
    }
    
    return response.json();
  },

  // Obtener zonas disponibles
  getAvailableZones: async (): Promise<ApiResponse<string[]>> => {
    const response = await fetch('/api/zones');
    
    if (!response.ok) {
      throw new Error('Error fetching zones');
    }
    
    return response.json();
  },

  // Obtener categorías disponibles
  getAvailableCategories: async (): Promise<ApiResponse<string[]>> => {
    const response = await fetch('/api/categories');
    
    if (!response.ok) {
      throw new Error('Error fetching categories');
    }
    
    return response.json();
  },
};