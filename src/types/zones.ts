// src/types/zones.ts
import { BaseEntity } from './index';

export interface Zone extends BaseEntity {
  name: string;
  description?: string;
  color: string;           // Color hex para identificar en el mapa
  isEnabled: boolean;      // Habilitado/Deshabilitado
  
  // Relaciones
  userIds: string[];       // IDs de usuarios asignados a esta zona
  clientCount?: number;    // Número de clientes en esta zona (calculado)
  projectCount?: number;   // Número de proyectos/habilidades en esta zona (calculado)
  
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

// Colores predefinidos para las zonas
export const ZONE_COLORS = [
  '#FF6B6B', // Rojo
  '#4ECDC4', // Turquesa
  '#45B7D1', // Azul
  '#96CEB4', // Verde claro
  '#FFEAA7', // Amarillo
  '#DDA0DD', // Lila
  '#98D8C8', // Verde agua
  '#F7DC6F', // Amarillo dorado
  '#BB8FCE', // Púrpura claro
  '#85C1E9', // Azul claro
  '#F8C471', // Naranja claro
  '#82E0AA', // Verde menta
  '#F1948A', // Rosa salmón
  '#85929E', // Gris azulado
  '#D7BDE2', // Lavanda
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
