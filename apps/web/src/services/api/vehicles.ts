// src/services/api/vehicles.ts
import { api, handleApiError } from '@/lib/api';
import type { SoftBadgeTone } from '@/components/ui/SoftBadge';

// ─────────────────────────────────────────────────────────────
// Tipos — espejo de VehiculoDto (backend). `tipo` y `estado`
// serializan como ENTEROS (enums TipoVehiculo / EstadoVehiculo).
// ─────────────────────────────────────────────────────────────
export interface Vehiculo {
  id: number;
  placa: string;
  tipo: number;          // 0 = Seca, 1 = Refrigerada
  tipoNombre: string;
  capacidadUnidades: number;
  vendedorId: number | null;
  vendedorNombre: string | null;
  kilometraje: number | null;
  estado: number;        // 0 = Disponible, 1 = EnRuta, 2 = Mantenimiento, 3 = Baja
  estadoNombre: string;
  activo: boolean;
}

export interface VehiculoCreateData {
  placa: string;
  tipo: number;
  capacidadUnidades: number;
  vendedorId?: number | null;
  kilometraje?: number | null;
  estado?: number;
}

export interface VehiculoUpdateData extends VehiculoCreateData {
  id: number;
  activo: boolean;
}

// ─────────────────────────────────────────────────────────────
// Etiquetas + tonos para las pills de estado/tipo.
// ─────────────────────────────────────────────────────────────
export const TIPO_VEHICULO_LABEL: Record<number, string> = {
  0: 'Seca',
  1: 'Refrigerada',
};

export const ESTADO_VEHICULO_LABEL: Record<number, string> = {
  0: 'Disponible',
  1: 'En ruta',
  2: 'Mantenimiento',
  3: 'Baja',
};

// Disponible → success, EnRuta → primary, Mantenimiento → warning, Baja → default.
export const ESTADO_VEHICULO_TONE: Record<number, SoftBadgeTone> = {
  0: 'success',
  1: 'primary',
  2: 'warning',
  3: 'default',
};

interface VehiculosListResponse {
  items?: Vehiculo[];
}

class VehiclesService {
  private readonly basePath = '/api/vehicles';

  async getVehiculos(params?: Record<string, string | number | boolean>): Promise<Vehiculo[]> {
    try {
      const query = params
        ? '?' + new URLSearchParams(
            Object.entries(params).map(([k, v]) => [k, String(v)])
          ).toString()
        : '';
      const response = await api.get<Vehiculo[] | VehiculosListResponse>(`${this.basePath}${query}`);
      const data = response.data;
      return Array.isArray(data) ? data : data.items ?? [];
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getVehiculo(id: number): Promise<Vehiculo> {
    try {
      const response = await api.get<Vehiculo>(`${this.basePath}/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createVehiculo(data: VehiculoCreateData): Promise<{ id: number }> {
    try {
      const response = await api.post<{ id: number }>(this.basePath, {
        placa: data.placa,
        tipo: data.tipo,
        capacidadUnidades: data.capacidadUnidades,
        vendedorId: data.vendedorId ?? null,
        kilometraje: data.kilometraje ?? null,
        estado: data.estado ?? 0,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateVehiculo(id: number, data: VehiculoUpdateData): Promise<void> {
    try {
      await api.put(`${this.basePath}/${id}`, {
        id,
        placa: data.placa,
        tipo: data.tipo,
        capacidadUnidades: data.capacidadUnidades,
        vendedorId: data.vendedorId ?? null,
        kilometraje: data.kilometraje ?? null,
        estado: data.estado ?? 0,
        activo: data.activo,
      });
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deleteVehiculo(id: number): Promise<void> {
    try {
      await api.delete(`${this.basePath}/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async toggleActive(id: number, activo: boolean): Promise<void> {
    try {
      await api.patch(`${this.basePath}/${id}/activo`, { activo });
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async batchToggleActive(ids: number[], activo: boolean): Promise<void> {
    try {
      await api.patch(`${this.basePath}/batch-toggle`, { ids, activo });
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const vehiclesService = new VehiclesService();
export default vehiclesService;
