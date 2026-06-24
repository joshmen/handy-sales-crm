import { api, handleApiError } from '@/lib/api';

/**
 * Backend serializa DateTimes (Kind=Unspecified por Npgsql legacy mode) sin
 * sufijo 'Z'. Sin Z, `new Date(str)` los interpreta como hora LOCAL del browser
 * → diff negativo → formatTimeAgo se queda en "hace unos segundos" eterno.
 * Normalizamos a UTC explícito en el client API.
 */
function ensureUtc(value: string): string {
  if (!value) return value;
  // Ya tiene Z u offset (+/-HH:MM): respetar
  if (/[Zz]$|[+-]\d{2}:?\d{2}$/.test(value)) return value;
  return value + 'Z';
}

export type FuenteUbicacion =
  | 'visita'
  | 'parada'
  | 'pedido'
  | 'cobro'
  | 'checkpoint'
  | 'inicio_ruta'
  | 'fin_ruta'
  | 'inicio_jornada'
  | 'fin_jornada'
  | 'stop_automatico'
  | 'tracking';

export interface UltimaUbicacionVendedor {
  usuarioId: number;
  nombre: string;
  email: string | null;
  ultimaActividad: string; // ISO date
  ultimaLat: number;
  ultimaLng: number;
  fuente: FuenteUbicacion;
  clienteId: number | null;
  clienteNombre: string | null;
}

export type EstadoVendedorGps = 'en_ruta' | 'inactivo' | 'sin_senal';

/**
 * Roster enriquecido para la pantalla "Histórico GPS" (master-detail).
 * `ultimaActividad` puede ser null si el vendedor no tiene actividad reciente.
 */
export interface RosterGpsItem {
  usuarioId: number;
  nombre: string;
  email: string | null;
  avatarUrl: string | null;
  supervisorId: number | null;
  supervisorNombre: string | null;
  zonas: string[];
  ultimaActividad: string | null;
  ultimaLat: number | null;
  ultimaLng: number | null;
  fuente: FuenteUbicacion | null;
  clienteNombre: string | null;
  status: EstadoVendedorGps;
  tieneRutaHoy: boolean;
}

export interface EventoGpsDelDia {
  tipo: FuenteUbicacion;
  cuando: string;
  latitud: number;
  longitud: number;
  clienteId: number | null;
  clienteNombre: string | null;
  distanciaCliente: number | null;
  referenciaId: number | null;
}

export interface ActividadGpsDelDia {
  dia: string;
  usuarioId: number;
  eventos: EventoGpsDelDia[];
}

class TeamLocationService {
  private readonly basePath = '/api/team';

  async getUltimasUbicaciones(): Promise<UltimaUbicacionVendedor[]> {
    try {
      const response = await api.get<UltimaUbicacionVendedor[]>(`${this.basePath}/ubicaciones-recientes`);
      return response.data.map(u => ({ ...u, ultimaActividad: ensureUtc(u.ultimaActividad) }));
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getRosterGps(): Promise<RosterGpsItem[]> {
    try {
      const response = await api.get<RosterGpsItem[]>(`${this.basePath}/roster-gps`);
      return response.data.map(r => ({
        ...r,
        ultimaActividad: r.ultimaActividad ? ensureUtc(r.ultimaActividad) : null,
      }));
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getActividadDelDia(usuarioId: number, dia?: string): Promise<ActividadGpsDelDia> {
    try {
      const params = dia ? `?dia=${encodeURIComponent(dia)}` : '';
      const response = await api.get<ActividadGpsDelDia>(`${this.basePath}/usuarios/${usuarioId}/actividad-gps${params}`);
      return {
        ...response.data,
        eventos: response.data.eventos.map(ev => ({ ...ev, cuando: ensureUtc(ev.cuando) })),
      };
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const teamLocationService = new TeamLocationService();
