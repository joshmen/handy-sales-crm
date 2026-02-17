// src/services/api/productCategories.ts
import { api, handleApiError } from '@/lib/api';
import { ProductCategory, ProductCategoryForm } from '@/types/catalogs';

const BASE_URL = '/categorias-productos';

export const productCategoryService = {
  /**
   * Obtener todas las categorías de productos
   */
  async getAll(): Promise<ProductCategory[]> {
    try {
      const response = await api.get<ProductCategory[]>(BASE_URL);
      return response.data;  // API retorna array directamente
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Obtener una categoría por ID
   */
  async getById(id: number): Promise<ProductCategory> {
    try {
      const response = await api.get<ProductCategory>(`${BASE_URL}/${id}`);
      return response.data;  // API retorna objeto directamente
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Crear una nueva categoría
   */
  async create(data: ProductCategoryForm): Promise<{ id: number }> {
    try {
      const response = await api.post<{ id: number }>(BASE_URL, data);
      return response.data;  // API retorna { id } directamente
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Actualizar una categoría existente
   */
  async update(id: number, data: ProductCategoryForm): Promise<void> {
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
