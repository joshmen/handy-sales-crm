import { api, handleApiError } from '@/lib/api';

// ============ TIPOS ============

export interface LogLevels {
  apiMain: string;
  apiBilling: string;
  apiMobile: string;
}

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
      const data = res.data;
      return {
        errorsLast24h: data?.errorsLast24h ?? 0,
        warningsLast24h: data?.warningsLast24h ?? 0,
        crashesLast24h: data?.crashesLast24h ?? 0,
        apisWithErrors: data?.apisWithErrors ?? 0,
        errorsByHour: Array.isArray(data?.errorsByHour) ? data.errorsByHour : [],
      };
    } catch {
      return { errorsLast24h: 0, warningsLast24h: 0, crashesLast24h: 0, apisWithErrors: 0, errorsByHour: [] };
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
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  }

  async getLogLevels(): Promise<LogLevels> {
    try {
      const res = await api.get<LogLevels>(`${this.basePath}/log-levels`);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async setLogLevel(apiName: string, level: string): Promise<void> {
    try {
      await api.post(`${this.basePath}/log-level`, { apiName, level });
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const monitoringService = new MonitoringService();
