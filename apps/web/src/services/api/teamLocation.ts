import { api, handleApiError } from '@/lib/api';

export type FuenteUbicacion = 'visita' | 'parada' | 'pedido' | 'cobro' | 'checkpoint' | 'inicio_ruta' | 'fin_ruta' | 'tracking';

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
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getActividadDelDia(usuarioId: number, dia?: string): Promise<ActividadGpsDelDia> {
    try {
      const params = dia ? `?dia=${encodeURIComponent(dia)}` : '';
      const response = await api.get<ActividadGpsDelDia>(`${this.basePath}/usuarios/${usuarioId}/actividad-gps${params}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const teamLocationService = new TeamLocationService();
