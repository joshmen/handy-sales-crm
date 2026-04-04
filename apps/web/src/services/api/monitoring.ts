import { api, handleApiError } from '@/lib/api';

// ============ TIPOS ============

export interface MonitoringStats {
  errorsLast24h: number;
  warningsLast24h: number;
  crashesLast24h: number;
  apisWithErrors: number;
  errorsByHour: { hour: string; count: number; logGroup: string }[];
}

export interface LogEntry {
  timestamp: string;
  message: string;
  logGroup: string;
  logStream: string;
}

// ============ SERVICIO ============

class MonitoringService {
  private basePath = '/api/superadmin/monitoring';

  async getStats(): Promise<MonitoringStats> {
    try {
      const res = await api.get<MonitoringStats>(`${this.basePath}/stats`);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getRecentErrors(params?: { logGroup?: string; limit?: number }): Promise<LogEntry[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.logGroup) queryParams.set('logGroup', params.logGroup);
      if (params?.limit) queryParams.set('limit', params.limit.toString());

      const query = queryParams.toString();
      const url = query
        ? `${this.basePath}/errors/recent?${query}`
        : `${this.basePath}/errors/recent`;
      const res = await api.get<LogEntry[]>(url);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const monitoringService = new MonitoringService();
