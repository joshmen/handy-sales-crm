import { api } from './client';
import { validateResponse } from './validateResponse';
import {
  ApiResponseSchema,
  MobileVisitaSchema,
  ResumenDiarioSchema,
  ResumenSemanalSchema,
} from './schemas';
import { z } from 'zod';
import type {
  ApiResponse,
  MobileVisita,
  VisitaCreateRequest,
  CheckInRequest,
  CheckOutRequest,
  ResumenDiario,
  ResumenSemanal,
} from '@/types';

const VisitaResponseSchema = ApiResponseSchema(MobileVisitaSchema);
const VisitaArrayResponseSchema = ApiResponseSchema(z.array(MobileVisitaSchema));
const ResumenDiarioResponseSchema = ApiResponseSchema(ResumenDiarioSchema);
const ResumenSemanalResponseSchema = ApiResponseSchema(ResumenSemanalSchema);

class MobileVisitasApi {
  private basePath = '/api/mobile/visitas';

  async create(data: VisitaCreateRequest): Promise<MobileVisita> {
    const response = await api.post<ApiResponse<MobileVisita>>(
      this.basePath,
      data
    );
    const validated = validateResponse(
      VisitaResponseSchema,
      response.data,
      'POST /api/mobile/visitas'
    );
    return validated.data;
  }

  async getHoy(): Promise<MobileVisita[]> {
    const response = await api.get<ApiResponse<MobileVisita[]>>(
      `${this.basePath}/hoy`
    );
    const validated = validateResponse(
      VisitaArrayResponseSchema,
      response.data,
      'GET /api/mobile/visitas/hoy'
    );
    return validated.data;
  }

  async getMisVisitas(): Promise<MobileVisita[]> {
    const response = await api.get<ApiResponse<MobileVisita[]>>(
      `${this.basePath}/mis-visitas`
    );
    const validated = validateResponse(
      VisitaArrayResponseSchema,
      response.data,
      'GET /api/mobile/visitas/mis-visitas'
    );
    return validated.data;
  }

  async getActiva(): Promise<MobileVisita | null> {
    try {
      const response = await api.get<ApiResponse<MobileVisita>>(
        `${this.basePath}/activa`
      );
      const validated = validateResponse(
        VisitaResponseSchema,
        response.data,
        'GET /api/mobile/visitas/activa'
      );
      return validated.data;
    } catch (e) {
      if (__DEV__) console.warn('[Visits]', e);
      return null;
    }
  }

  async getById(id: number): Promise<MobileVisita> {
    const response = await api.get<ApiResponse<MobileVisita>>(
      `${this.basePath}/${id}`
    );
    const validated = validateResponse(
      VisitaResponseSchema,
      response.data,
      `GET /api/mobile/visitas/${id}`
    );
    return validated.data;
  }

  async getByCliente(clienteId: number): Promise<MobileVisita[]> {
    const response = await api.get<ApiResponse<MobileVisita[]>>(
      `${this.basePath}/cliente/${clienteId}`
    );
    const validated = validateResponse(
      VisitaArrayResponseSchema,
      response.data,
      `GET /api/mobile/visitas/cliente/${clienteId}`
    );
    return validated.data;
  }

  async checkIn(id: number, data: CheckInRequest): Promise<MobileVisita> {
    const response = await api.post<ApiResponse<MobileVisita>>(
      `${this.basePath}/${id}/check-in`,
      data
    );
    const validated = validateResponse(
      VisitaResponseSchema,
      response.data,
      `POST /api/mobile/visitas/${id}/check-in`
    );
    return validated.data;
  }

  async checkOut(id: number, data: CheckOutRequest): Promise<MobileVisita> {
    const response = await api.post<ApiResponse<MobileVisita>>(
      `${this.basePath}/${id}/check-out`,
      data
    );
    const validated = validateResponse(
      VisitaResponseSchema,
      response.data,
      `POST /api/mobile/visitas/${id}/check-out`
    );
    return validated.data;
  }

  async resumenDiario(): Promise<ResumenDiario> {
    const response = await api.get<ApiResponse<ResumenDiario>>(
      `${this.basePath}/resumen/diario`
    );
    const validated = validateResponse(
      ResumenDiarioResponseSchema,
      response.data,
      'GET /api/mobile/visitas/resumen/diario'
    );
    return validated.data;
  }

  async resumenSemanal(): Promise<ResumenSemanal> {
    const response = await api.get<ApiResponse<ResumenSemanal>>(
      `${this.basePath}/resumen/semanal`
    );
    const validated = validateResponse(
      ResumenSemanalResponseSchema,
      response.data,
      'GET /api/mobile/visitas/resumen/semanal'
    );
    return validated.data;
  }
}

export const visitasApi = new MobileVisitasApi();
