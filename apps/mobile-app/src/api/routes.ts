import { api } from './client';
import type { ApiResponse, MobileRuta, MobileRutaDetalle } from '@/types';

class MobileRutasApi {
  private basePath = '/api/mobile/rutas';

  async getHoy(): Promise<MobileRuta | null> {
    try {
      const response = await api.get<ApiResponse<MobileRuta>>(
        `${this.basePath}/hoy`
      );
      return response.data.data;
    } catch {
      return null;
    }
  }

  async getPendientes(): Promise<MobileRuta[]> {
    const response = await api.get<ApiResponse<MobileRuta[]>>(
      `${this.basePath}/pendientes`
    );
    return response.data.data;
  }

  async getById(id: number): Promise<MobileRuta> {
    const response = await api.get<ApiResponse<MobileRuta>>(
      `${this.basePath}/${id}`
    );
    return response.data.data;
  }

  async iniciar(id: number): Promise<MobileRuta> {
    const response = await api.post<ApiResponse<MobileRuta>>(
      `${this.basePath}/${id}/iniciar`
    );
    return response.data.data;
  }

  async completar(id: number, kilometrosReales?: number): Promise<MobileRuta> {
    const response = await api.post<ApiResponse<MobileRuta>>(
      `${this.basePath}/${id}/completar`,
      kilometrosReales !== undefined ? { kilometrosReales } : undefined
    );
    return response.data.data;
  }

  async cancelar(id: number, razon: string): Promise<MobileRuta> {
    const response = await api.post<ApiResponse<MobileRuta>>(
      `${this.basePath}/${id}/cancelar`,
      { razon }
    );
    return response.data.data;
  }

  async getParadaActual(rutaId: number): Promise<MobileRutaDetalle | null> {
    try {
      const response = await api.get<ApiResponse<MobileRutaDetalle>>(
        `${this.basePath}/${rutaId}/parada-actual`
      );
      return response.data.data;
    } catch {
      return null;
    }
  }

  async getSiguienteParada(rutaId: number): Promise<MobileRutaDetalle | null> {
    try {
      const response = await api.get<ApiResponse<MobileRutaDetalle>>(
        `${this.basePath}/${rutaId}/siguiente-parada`
      );
      return response.data.data;
    } catch {
      return null;
    }
  }

  async llegarParada(detalleId: number, latitud: number, longitud: number) {
    const response = await api.post<ApiResponse<MobileRutaDetalle>>(
      `${this.basePath}/paradas/${detalleId}/llegar`,
      { latitud, longitud }
    );
    return response.data.data;
  }

  async salirParada(detalleId: number) {
    const response = await api.post<ApiResponse<MobileRutaDetalle>>(
      `${this.basePath}/paradas/${detalleId}/salir`
    );
    return response.data.data;
  }

  async omitirParada(detalleId: number, razon: string) {
    const response = await api.post<ApiResponse<MobileRutaDetalle>>(
      `${this.basePath}/paradas/${detalleId}/omitir`,
      { razon }
    );
    return response.data.data;
  }
}

export const rutasApi = new MobileRutasApi();
