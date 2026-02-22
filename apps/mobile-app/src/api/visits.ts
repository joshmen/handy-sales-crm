import { api } from './client';
import type {
  ApiResponse,
  MobileVisita,
  VisitaCreateRequest,
  CheckInRequest,
  CheckOutRequest,
  ResumenDiario,
  ResumenSemanal,
} from '@/types';

class MobileVisitasApi {
  private basePath = '/api/mobile/visitas';

  async create(data: VisitaCreateRequest): Promise<MobileVisita> {
    const response = await api.post<ApiResponse<MobileVisita>>(
      this.basePath,
      data
    );
    return response.data.data;
  }

  async getHoy(): Promise<MobileVisita[]> {
    const response = await api.get<ApiResponse<MobileVisita[]>>(
      `${this.basePath}/hoy`
    );
    return response.data.data;
  }

  async getMisVisitas(): Promise<MobileVisita[]> {
    const response = await api.get<ApiResponse<MobileVisita[]>>(
      `${this.basePath}/mis-visitas`
    );
    return response.data.data;
  }

  async getActiva(): Promise<MobileVisita | null> {
    try {
      const response = await api.get<ApiResponse<MobileVisita>>(
        `${this.basePath}/activa`
      );
      return response.data.data;
    } catch {
      return null;
    }
  }

  async getById(id: number): Promise<MobileVisita> {
    const response = await api.get<ApiResponse<MobileVisita>>(
      `${this.basePath}/${id}`
    );
    return response.data.data;
  }

  async getByCliente(clienteId: number): Promise<MobileVisita[]> {
    const response = await api.get<ApiResponse<MobileVisita[]>>(
      `${this.basePath}/cliente/${clienteId}`
    );
    return response.data.data;
  }

  async checkIn(id: number, data: CheckInRequest): Promise<MobileVisita> {
    const response = await api.post<ApiResponse<MobileVisita>>(
      `${this.basePath}/${id}/check-in`,
      data
    );
    return response.data.data;
  }

  async checkOut(id: number, data: CheckOutRequest): Promise<MobileVisita> {
    const response = await api.post<ApiResponse<MobileVisita>>(
      `${this.basePath}/${id}/check-out`,
      data
    );
    return response.data.data;
  }

  async resumenDiario(): Promise<ResumenDiario> {
    const response = await api.get<ApiResponse<ResumenDiario>>(
      `${this.basePath}/resumen/diario`
    );
    return response.data.data;
  }

  async resumenSemanal(): Promise<ResumenSemanal> {
    const response = await api.get<ApiResponse<ResumenSemanal>>(
      `${this.basePath}/resumen/semanal`
    );
    return response.data.data;
  }
}

export const visitasApi = new MobileVisitasApi();
