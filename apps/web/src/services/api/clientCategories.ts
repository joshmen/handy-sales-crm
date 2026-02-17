// src/services/api/clientCategories.ts
import { api, handleApiError } from '@/lib/api';
import { ClientCategory, ClientCategoryForm } from '@/types/catalogs';

const BASE_URL = '/categorias-clientes';

export const clientCategoryService = {
  /**
   * Obtener todas las categorías de clientes
   */
  async getAll(): Promise<ClientCategory[]> {
    try {
      const response = await api.get<ClientCategory[]>(BASE_URL);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Obtener una categoría por ID
   */
  async getById(id: number): Promise<ClientCategory> {
    try {
      const response = await api.get<ClientCategory>(`${BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Crear una nueva categoría
   */
  async create(data: ClientCategoryForm): Promise<{ id: number }> {
    try {
      const response = await api.post<{ id: number }>(BASE_URL, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Actualizar una categoría existente
   */
  async update(id: number, data: ClientCategoryForm): Promise<void> {
    try {
      await api.put(`${BASE_URL}/${id}`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Eliminar una categoría
   */
  async delete(id: number): Promise<void> {
    try {
      await api.delete(`${BASE_URL}/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
