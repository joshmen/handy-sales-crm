// src/services/api/visits.ts
import { api, handleApiError } from '@/lib/api';
import {
  ClienteVisitaDto,
  ClienteVisitaListaDto,
  ClienteVisitaCreateDto,
  ClienteVisitaFiltroDto,
  CheckInDto,
  CheckOutDto,
  VisitaResumenDiarioDto,
  VisitasPaginatedResult,
} from '@/types/visits';

class VisitService {
  private readonly basePath = '/visitas';

  // Crear nueva visita programada
  async createVisit(data: ClienteVisitaCreateDto): Promise<{ id: number }> {
    try {
      const response = await api.post<{ id: number }>(this.basePath, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Listar visitas con filtros
  async getVisits(filtro: ClienteVisitaFiltroDto = {}): Promise<VisitasPaginatedResult> {
    try {
      const params = { pagina: 1, tamanoPagina: 20, ...filtro };
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });

      const response = await api.get<VisitasPaginatedResult>(
        `${this.basePath}?${queryParams.toString()}`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Obtener visita por ID
  async getVisitById(id: number): Promise<ClienteVisitaDto> {
    try {
      const response = await api.get<ClienteVisitaDto>(`${this.basePath}/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Eliminar visita
  async deleteVisit(id: number): Promise<void> {
    try {
      await api.delete(`${this.basePath}/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Check-in (iniciar visita)
  async checkIn(id: number, data: CheckInDto): Promise<{ mensaje: string }> {
    try {
      const response = await api.post<{ mensaje: string }>(
        `${this.basePath}/${id}/check-in`,
        data
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Check-out (finalizar visita)
  async checkOut(id: number, data: CheckOutDto): Promise<{ mensaje: string }> {
    try {
      const response = await api.post<{ mensaje: string }>(
        `${this.basePath}/${id}/check-out`,
        data
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Obtener mis visitas (vendedor actual)
  async getMyVisits(): Promise<ClienteVisitaListaDto[]> {
    try {
      const response = await api.get<ClienteVisitaListaDto[]>(`${this.basePath}/mis-visitas`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Obtener visitas de hoy
  async getTodayVisits(): Promise<ClienteVisitaListaDto[]> {
    try {
      const response = await api.get<ClienteVisitaListaDto[]>(`${this.basePath}/hoy`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Verificar si hay visita activa (en curso)
  async getActiveVisit(): Promise<ClienteVisitaDto | null> {
    try {
      const response = await api.get<ClienteVisitaDto | null>(`${this.basePath}/activa`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Obtener historial de visitas por cliente
  async getVisitsByClient(clienteId: number): Promise<ClienteVisitaListaDto[]> {
    try {
      const response = await api.get<ClienteVisitaListaDto[]>(
        `${this.basePath}/cliente/${clienteId}`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Obtener visitas por vendedor (admin)
  async getVisitsByUser(usuarioId: number): Promise<ClienteVisitaListaDto[]> {
    try {
      const response = await api.get<ClienteVisitaListaDto[]>(
        `${this.basePath}/usuario/${usuarioId}`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Obtener visitas del día por vendedor (admin)
  async getTodayVisitsByUser(usuarioId: number): Promise<ClienteVisitaListaDto[]> {
    try {
      const response = await api.get<ClienteVisitaListaDto[]>(
        `${this.basePath}/usuario/${usuarioId}/dia`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Obtener mi resumen diario
  async getMyDailySummary(): Promise<VisitaResumenDiarioDto> {
    try {
      const response = await api.get<VisitaResumenDiarioDto>(
        `${this.basePath}/mi-resumen/diario`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Obtener mi resumen semanal
  async getMyWeeklySummary(): Promise<VisitaResumenDiarioDto[]> {
    try {
      const response = await api.get<VisitaResumenDiarioDto[]>(
        `${this.basePath}/mi-resumen/semanal`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Obtener resumen diario por vendedor (admin)
  async getDailySummaryByUser(usuarioId: number): Promise<VisitaResumenDiarioDto> {
    try {
      const response = await api.get<VisitaResumenDiarioDto>(
        `${this.basePath}/resumen/${usuarioId}/diario`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const visitService = new VisitService();
export default visitService;
