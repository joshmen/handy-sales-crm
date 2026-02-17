// src/services/api/productFamilies.ts
import { api, handleApiResponse, handleApiError } from '@/lib/api';
import { ProductFamily, CreateProductFamilyDto, UpdateProductFamilyDto } from '@/types/product-families';

const BASE_URL = '/familias-productos';

export const productFamilyService = {
  /**
   * Obtener todas las familias de productos
   */
  async getAll(): Promise<ProductFamily[]> {
    try {
      const response = await api.get<ProductFamily[]>(BASE_URL);
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Obtener una familia por ID
   */
  async getById(id: string): Promise<ProductFamily> {
    try {
      const response = await api.get<ProductFamily>(`${BASE_URL}/${id}`);
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Crear una nueva familia
   */
  async create(data: CreateProductFamilyDto): Promise<{ id: string }> {
    try {
      const response = await api.post<{ id: string }>(BASE_URL, data);
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Actualizar una familia existente
   */
  async update(id: string, data: UpdateProductFamilyDto): Promise<void> {
    try {
      await api.put(`${BASE_URL}/${id}`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Eliminar una familia
   */
  async delete(id: string): Promise<void> {
    try {
      await api.delete(`${BASE_URL}/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
