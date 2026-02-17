// src/services/api/zones.ts
import { api, handleApiError } from '@/lib/api';
import {
  Zone,
  ZoneFilters,
  ZoneListResponse,
  ZONE_COLORS,
} from '@/types/zones';

// Backend DTO shape
interface ZonaBackend {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  clientesActivos: number;
}

// Map backend DTO to frontend Zone type
function mapZona(z: ZonaBackend, index: number): Zone {
  return {
    id: String(z.id),
    name: z.nombre,
    description: z.descripcion || '',
    color: ZONE_COLORS[index % ZONE_COLORS.length],
    isEnabled: z.activo,
    userIds: [],
    clientCount: z.clientesActivos || 0,
    prospectCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

class ZoneService {
  private readonly basePath = '/zonas';

  async getZones(filters: ZoneFilters = {}): Promise<ZoneListResponse> {
    try {
      const response = await api.get<ZonaBackend[]>(this.basePath);
      let zones = response.data.map((z, i) => mapZona(z, i));

      // Client-side filtering
      if (filters.search) {
        const search = filters.search.toLowerCase();
        zones = zones.filter(z =>
          z.name.toLowerCase().includes(search) ||
          z.description?.toLowerCase().includes(search)
        );
      }

      if (filters.isEnabled !== undefined) {
        zones = zones.filter(z => z.isEnabled === filters.isEnabled);
      }

      const total = zones.length;

      // Client-side pagination
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const startIndex = (page - 1) * limit;
      const paginatedZones = zones.slice(startIndex, startIndex + limit);
      const totalPages = Math.ceil(total / limit);

      return {
        zones: paginatedZones,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createZone(data: { name: string; description?: string; isEnabled?: boolean }): Promise<Zone> {
    try {
      const response = await api.post<{ id: number }>(this.basePath, {
        nombre: data.name,
        descripcion: data.description || '',
      });
      return {
        id: String(response.data.id),
        name: data.name,
        description: data.description || '',
        color: ZONE_COLORS[0],
        isEnabled: true,
        userIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateZone(data: { id: string; name: string; description?: string; isEnabled?: boolean }): Promise<Zone> {
    try {
      await api.put(`${this.basePath}/${data.id}`, {
        nombre: data.name,
        descripcion: data.description || '',
        activo: data.isEnabled ?? true,
      });
      return {
        id: data.id,
        name: data.name,
        description: data.description || '',
        color: ZONE_COLORS[0],
        isEnabled: data.isEnabled ?? true,
        userIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deleteZone(id: string): Promise<void> {
    try {
      await api.delete(`${this.basePath}/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async toggleActive(id: string, activo: boolean): Promise<void> {
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

export const zoneService = new ZoneService();
export default zoneService;
