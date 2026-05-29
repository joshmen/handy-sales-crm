import { api } from './client';
import { validateResponse } from './validateResponse';
import {
  ApiResponseSchema,
  MobileRutaSchema,
  MobileRutaDetalleSchema,
} from './schemas';
import { z } from 'zod';
import type { ApiResponse, MobileRuta, MobileRutaDetalle } from '@/types';

const RutaResponseSchema = ApiResponseSchema(MobileRutaSchema);
const RutaArrayResponseSchema = ApiResponseSchema(z.array(MobileRutaSchema));
const DetalleResponseSchema = ApiResponseSchema(MobileRutaDetalleSchema);

class MobileRutasApi {
  private basePath = '/api/mobile/rutas';

  async getHoy(): Promise<MobileRuta | null> {
    try {
      const response = await api.get<ApiResponse<MobileRuta>>(
        `${this.basePath}/hoy`
      );
      const validated = validateResponse(
        RutaResponseSchema,
        response.data,
        'GET /api/mobile/rutas/hoy'
      );
      return validated.data;
    } catch (e) {
      if (__DEV__) console.warn('[Routes]', e);
      return null;
    }
  }

  async getPendientes(): Promise<MobileRuta[]> {
    const response = await api.get<ApiResponse<MobileRuta[]>>(
      `${this.basePath}/pendientes`
    );
    const validated = validateResponse(
      RutaArrayResponseSchema,
      response.data,
      'GET /api/mobile/rutas/pendientes'
    );
    return validated.data;
  }

  async getById(id: number): Promise<MobileRuta> {
    const response = await api.get<ApiResponse<MobileRuta>>(
      `${this.basePath}/${id}`
    );
    const validated = validateResponse(
      RutaResponseSchema,
      response.data,
      `GET /api/mobile/rutas/${id}`
    );
    return validated.data;
  }

  async iniciar(id: number): Promise<MobileRuta> {
    const response = await api.post<ApiResponse<MobileRuta>>(
      `${this.basePath}/${id}/iniciar`
    );
    const validated = validateResponse(
      RutaResponseSchema,
      response.data,
      `POST /api/mobile/rutas/${id}/iniciar`
    );
    return validated.data;
  }

  async aceptar(id: number): Promise<AceptarRutaResponse> {
    const response = await api.post<AceptarRutaResponse>(
      `${this.basePath}/${id}/aceptar`
    );
    return response.data;
  }

  async completar(id: number, kilometrosReales?: number): Promise<MobileRuta> {
    const response = await api.post<ApiResponse<MobileRuta>>(
      `${this.basePath}/${id}/completar`,
      kilometrosReales !== undefined ? { kilometrosReales } : undefined
    );
    const validated = validateResponse(
      RutaResponseSchema,
      response.data,
      `POST /api/mobile/rutas/${id}/completar`
    );
    return validated.data;
  }

  async cancelar(id: number, razon: string): Promise<MobileRuta> {
    const response = await api.post<ApiResponse<MobileRuta>>(
      `${this.basePath}/${id}/cancelar`,
      { razon }
    );
    const validated = validateResponse(
      RutaResponseSchema,
      response.data,
      `POST /api/mobile/rutas/${id}/cancelar`
    );
    return validated.data;
  }

  async getParadaActual(rutaId: number): Promise<MobileRutaDetalle | null> {
    try {
      const response = await api.get<ApiResponse<MobileRutaDetalle>>(
        `${this.basePath}/${rutaId}/parada-actual`
      );
      const validated = validateResponse(
        DetalleResponseSchema,
        response.data,
        `GET /api/mobile/rutas/${rutaId}/parada-actual`
      );
      return validated.data;
    } catch (e) {
      if (__DEV__) console.warn('[Routes]', e);
      return null;
    }
  }

  async getSiguienteParada(rutaId: number): Promise<MobileRutaDetalle | null> {
    try {
      const response = await api.get<ApiResponse<MobileRutaDetalle>>(
        `${this.basePath}/${rutaId}/siguiente-parada`
      );
      const validated = validateResponse(
        DetalleResponseSchema,
        response.data,
        `GET /api/mobile/rutas/${rutaId}/siguiente-parada`
      );
      return validated.data;
    } catch (e) {
      if (__DEV__) console.warn('[Routes]', e);
      return null;
    }
  }

  async llegarParada(detalleId: number, latitud: number, longitud: number) {
    const response = await api.post<ApiResponse<MobileRutaDetalle>>(
      `${this.basePath}/paradas/${detalleId}/llegar`,
      { latitud, longitud }
    );
    const validated = validateResponse(
      DetalleResponseSchema,
      response.data,
      `POST /api/mobile/rutas/paradas/${detalleId}/llegar`
    );
    return validated.data;
  }

  async salirParada(detalleId: number) {
    const response = await api.post<ApiResponse<MobileRutaDetalle>>(
      `${this.basePath}/paradas/${detalleId}/salir`
    );
    const validated = validateResponse(
      DetalleResponseSchema,
      response.data,
      `POST /api/mobile/rutas/paradas/${detalleId}/salir`
    );
    return validated.data;
  }

  async omitirParada(detalleId: number, razon: string) {
    const response = await api.post<ApiResponse<MobileRutaDetalle>>(
      `${this.basePath}/paradas/${detalleId}/omitir`,
      { razon }
    );
    const validated = validateResponse(
      DetalleResponseSchema,
      response.data,
      `POST /api/mobile/rutas/paradas/${detalleId}/omitir`
    );
    return validated.data;
  }
}

/**
 * Respuesta del endpoint POST /api/mobile/rutas/{id}/aceptar.
 * `pedidosHuerfanosVinculados` aparece cuando el sweep retroactivo encontró
 * pedidos VentaDirecta del día sin ruta asignada — caso del vendedor que
 * empieza a vender antes de que admin le asigne la ruta cargada.
 */
export interface PedidosHuerfanosVinculados {
  pedidosVinculados: number;
  unidadesTotales: number;
}

/**
 * Sweep de Gastos huerfanos (v23, 2026-05-29). Vendedor registro gastos
 * (gasolina, peajes) antes de aceptar la ruta del dia. Al aceptar/iniciar
 * se imputan a la ruta para que entren al aRecibir del cierre.
 */
export interface GastosHuerfanosVinculados {
  gastosVinculados: number;
  montoTotal: number;
}

export interface AceptarRutaResponse {
  success: boolean;
  message: string;
  pedidosHuerfanosVinculados?: PedidosHuerfanosVinculados | null;
  gastosHuerfanosVinculados?: GastosHuerfanosVinculados | null;
}

export const rutasApi = new MobileRutasApi();
