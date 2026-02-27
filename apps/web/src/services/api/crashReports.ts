// src/services/api/crashReports.ts
import { api, handleApiError } from '@/lib/api';

// ============ TIPOS ============

export interface CrashReportDto {
  id: number;
  tenantId: number;
  tenantNombre: string;
  userId: number | null;
  userNombre: string | null;
  deviceId: string | null;
  deviceName: string | null;
  appVersion: string | null;
  osVersion: string | null;
  errorMessage: string;
  stackTrace: string | null;
  componentName: string | null;
  severity: string; // CRASH | ERROR | WARNING
  resuelto: boolean;
  notaResolucion: string | null;
  resueltoPor: number | null;
  resueltoPorNombre: string | null;
  creadoEn: string;
}

export interface CrashReportPaginatedResponse {
  data: CrashReportDto[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface CrashReportEstadisticas {
  totalHoy: number;
  sinResolver: number;
  totalCrashes: number;
  totalErrors: number;
  totalWarnings: number;
  total: number;
}

export interface CrashReportFilters {
  page?: number;
  pageSize?: number;
  severity?: string;
  resuelto?: boolean | null;
  tenantId?: number;
  appVersion?: string;
}

// ============ SERVICIO ============

class CrashReportService {
  private basePath = '/api/crash-reports';

  async getAll(params: CrashReportFilters = {}): Promise<CrashReportPaginatedResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.set('page', params.page.toString());
      if (params.pageSize) queryParams.set('pageSize', params.pageSize.toString());
      if (params.severity) queryParams.set('severity', params.severity);
      if (params.resuelto !== undefined && params.resuelto !== null) {
        queryParams.set('resuelto', params.resuelto.toString());
      }
      if (params.tenantId) queryParams.set('tenantId', params.tenantId.toString());
      if (params.appVersion) queryParams.set('appVersion', params.appVersion);

      const query = queryParams.toString();
      const url = query ? `${this.basePath}?${query}` : this.basePath;
      const res = await api.get<CrashReportPaginatedResponse>(url);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getById(id: number): Promise<CrashReportDto> {
    try {
      const res = await api.get<CrashReportDto>(`${this.basePath}/${id}`);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async marcarResuelto(id: number, nota?: string): Promise<void> {
    try {
      await api.patch(`${this.basePath}/${id}/resolver`, { nota });
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getEstadisticas(): Promise<CrashReportEstadisticas> {
    try {
      const res = await api.get<CrashReportEstadisticas>(`${this.basePath}/estadisticas`);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const crashReportService = new CrashReportService();
