// src/types/zones.ts
import { BaseEntity } from './index';

export interface Zone extends BaseEntity {
  name: string;
  description?: string;
  color: string;           // Color hex para identificar en el mapa
  isEnabled: boolean;      // Habilitado/Deshabilitado
  
  // Relaciones
  userIds: string[];       // IDs de usuarios asignados a esta zona
  vendedorId?: number | null;  // Vendedor (Usuario rol VENDEDOR) responsable de la zona
  vendedorName?: string;       // Nombre del vendedor asignado (para mostrar en la lista)
  clientCount?: number;    // Número de clientes en esta zona (calculado)
  projectCount?: number;   // Número de proyectos/habilidades en esta zona (calculado)
  prospectCount?: number;  // Número de prospectos en esta zona (calculado)

  // Frecuencia de visita
  frecuenciaVisita?: number;   // 0=Semanal, 1=Quincenal, 2=Mensual
  frecuenciaNombre?: string;   // Etiqueta del backend (Semanal/Quincenal/Mensual)

  // Métricas (de GET /zonas/stats)
  ventasMes?: number;          // Ventas del mes en moneda
  ticketPromedio?: number;     // Ticket promedio en moneda
  coberturaPct?: number;       // % de cobertura (0-100)

  // Configuración del mapa (para futuro zonificador)
  boundaries?: ZoneBoundary[];
  mapSettings?: {
    centerLatitude?: number;
    centerLongitude?: number;
    zoomLevel?: number;
  };
}

// Para definir los límites de una zona en el mapa
export interface ZoneBoundary {
  id: string;
  zoneId: string;
  coordinates: {
    latitude: number;
    longitude: number;
  }[];
  type: 'polygon' | 'circle';
  radius?: number; // Para círculos
}

// Formulario para crear/editar zonas
export interface ZoneForm {
  name: string;
  description?: string;
  color: string;
  isEnabled: boolean;
  userIds: string[];
}

// Filtros para la lista de zonas
export interface ZoneFilters {
  search?: string;
  isEnabled?: boolean;
  hasUsers?: boolean;
  sortBy?: 'name' | 'createdAt' | 'clientCount' | 'userCount';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Estadísticas de zonas para el dashboard
export interface ZoneMetrics {
  totalZones: number;
  enabledZones: number;
  disabledZones: number;
  zonesWithUsers: number;
  zonesWithoutUsers: number;
  totalClientsInZones: number;
}

// Paleta categórica alineada al diseño Claude (blue-forward, sin pastels random).
export const ZONE_COLORS = [
  '#0176D3', // Azul primario
  '#2563EB', // Azul
  '#7C3AED', // Violeta
  '#D97706', // Ámbar
  '#DC2626', // Rojo
  '#0891B2', // Cian
  '#DB2777', // Rosa
  '#65A30D', // Verde
  '#0D8A7A', // Verde azulado
  '#6366F1', // Índigo
] as const;

export type ZoneColor = typeof ZONE_COLORS[number];

// Request/Response para APIs
export interface CreateZoneRequest {
  name: string;
  description?: string;
  color: string;
  isEnabled: boolean;
  userIds: string[];
}

export interface UpdateZoneRequest extends Partial<CreateZoneRequest> {
  id: string;
}

export interface ZoneListResponse {
  zones: Zone[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ZoneWithDetails extends Zone {
  users?: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>;
  clients?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}
