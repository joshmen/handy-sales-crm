// src/services/api/units.ts
import { api, handleApiError } from '@/lib/api';
import { Unit, UnitForm } from '@/types/catalogs';

const BASE_URL = '/unidades-medida';

export const unitService = {
  /**
   * Obtener todas las unidades de medida
   */
  async getAll(): Promise<Unit[]> {
    try {
      const response = await api.get<Unit[]>(BASE_URL);
      return response.data;  // API retorna array directamente
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Obtener una unidad por ID
   */
  async getById(id: number): Promise<Unit> {
    try {
      const response = await api.get<Unit>(`${BASE_URL}/${id}`);
      return response.data;  // API retorna objeto directamente
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Crear una nueva unidad
   */
  async create(data: UnitForm): Promise<{ id: number }> {
    try {
      const response = await api.post<{ id: number }>(BASE_URL, data);
      return response.data;  // API retorna { id } directamente
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Actualizar una unidad existente
   */
  async update(id: number, data: UnitForm): Promise<void> {
    try {
      await api.put(`${BASE_URL}/${id}`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Eliminar una unidad
   */
  async delete(id: number): Promise<void> {
    try {
      await api.delete(`${BASE_URL}/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
