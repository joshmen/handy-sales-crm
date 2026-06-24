// src/services/api/zones.ts
import { api, handleApiError } from '@/lib/api';
import {
  Zone,
  ZoneFilters,
  ZoneListResponse,
  ZONE_COLORS,
} from '@/types/zones';

// Backend DTO shape (GET /zonas y GET /zonas/stats)
interface ZonaBackend {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  clientesActivos: number;
  centroLatitud?: number | null;
  centroLongitud?: number | null;
  radioKm?: number | null;
  vendedorId?: number | null;
  vendedorNombre?: string | null;
  color?: string | null;
  frecuenciaVisita?: number;
  frecuenciaNombre?: string;
  ventasMes?: number;
  ticketPromedio?: number;
  coberturaPct?: number;
}

// Map backend DTO to frontend Zone type
function mapZona(z: ZonaBackend, index: number): Zone {
  return {
    id: String(z.id),
    name: z.nombre,
    description: z.descripcion || '',
    // Usa el color real del backend; si viene null/vacío, cae al palette determinista por índice.
    color: (z.color && z.color.trim()) ? z.color : ZONE_COLORS[index % ZONE_COLORS.length],
    isEnabled: z.activo,
    userIds: [],
    vendedorId: z.vendedorId ?? null,
    vendedorName: z.vendedorNombre ?? undefined,
    clientCount: z.clientesActivos || 0,
    prospectCount: 0,
    frecuenciaVisita: z.frecuenciaVisita ?? 0,
    frecuenciaNombre: z.frecuenciaNombre ?? undefined,
    ventasMes: z.ventasMes ?? 0,
    ticketPromedio: z.ticketPromedio ?? 0,
    coberturaPct: z.coberturaPct ?? 0,
    mapSettings: z.centroLatitud != null && z.centroLongitud != null
      ? { centerLatitude: z.centroLatitud, centerLongitude: z.centroLongitud, zoomLevel: z.radioKm ?? undefined }
      : undefined,
    boundaries: z.centroLatitud != null && z.centroLongitud != null && z.radioKm != null
      ? [{
          id: `zone-${z.id}-circle`,
          zoneId: String(z.id),
          coordinates: [{ latitude: z.centroLatitud, longitude: z.centroLongitud }],
          type: 'circle' as const,
          radius: z.radioKm,
        }]
      : undefined,
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

  /**
   * GET /zonas/stats — zonas con métricas reales (ventasMes, ticketPromedio,
   * coberturaPct, color, frecuencia). Mismo mapeo que getZones pero con todos
   * los campos del DTO extendido. La página la usa para KPIs/lista reales.
   */
  async getZonesStats(filters: ZoneFilters = {}): Promise<ZoneListResponse> {
    try {
      const response = await api.get<ZonaBackend[]>(`${this.basePath}/stats`);
      let zones = response.data.map((z, i) => mapZona(z, i));

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
      const page = filters.page || 1;
      const limit = filters.limit || 200;
      const startIndex = (page - 1) * limit;
      const paginatedZones = zones.slice(startIndex, startIndex + limit);
      const totalPages = Math.ceil(total / limit);

      return { zones: paginatedZones, total, page, limit, totalPages };
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createZone(data: { name: string; description?: string; isEnabled?: boolean; color?: string; frecuenciaVisita?: number; centroLatitud?: number; centroLongitud?: number; radioKm?: number; vendedorId?: number | null }): Promise<Zone> {
    try {
      const response = await api.post<{ id: number }>(this.basePath, {
        nombre: data.name,
        descripcion: data.description || '',
        color: data.color ?? null,
        frecuenciaVisita: data.frecuenciaVisita ?? 0,
        centroLatitud: data.centroLatitud ?? null,
        centroLongitud: data.centroLongitud ?? null,
        radioKm: data.radioKm ?? null,
        vendedorId: data.vendedorId ?? null,
      });
      return {
        id: String(response.data.id),
        name: data.name,
        description: data.description || '',
        color: data.color ?? ZONE_COLORS[0],
        isEnabled: true,
        userIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateZone(data: { id: string; name: string; description?: string; isEnabled?: boolean; color?: string; frecuenciaVisita?: number; centroLatitud?: number; centroLongitud?: number; radioKm?: number; vendedorId?: number | null }): Promise<Zone> {
    try {
      await api.put(`${this.basePath}/${data.id}`, {
        id: parseInt(data.id, 10),
        nombre: data.name,
        descripcion: data.description || '',
        activo: data.isEnabled ?? true,
        color: data.color ?? null,
        frecuenciaVisita: data.frecuenciaVisita ?? 0,
        centroLatitud: data.centroLatitud ?? null,
        centroLongitud: data.centroLongitud ?? null,
        radioKm: data.radioKm ?? null,
        vendedorId: data.vendedorId ?? null,
      });
      return {
        id: data.id,
        name: data.name,
        description: data.description || '',
        color: data.color ?? ZONE_COLORS[0],
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
