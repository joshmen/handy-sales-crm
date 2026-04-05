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
      const res = await api.get<any>(`${this.basePath}/stats`);
      const raw = res.data?.data ?? res.data;

      // Backend returns: { data: [{ logGroup, status, hourlyData: [{hour, count}] }] }
      // Transform to flat stats
      let totalErrors = 0;
      const errorsByHour: { hour: string; count: number; logGroup: string }[] = [];
      const apisWithErrors = new Set<string>();

      if (Array.isArray(raw)) {
        for (const group of raw) {
          const groupName = (group.logGroup || '').replace('/handysuites/', '');
          for (const h of (group.hourlyData || [])) {
            const count = parseInt(h.count, 10) || 0;
            totalErrors += count;
            if (count > 0) apisWithErrors.add(groupName);
            errorsByHour.push({ hour: h.hour, count, logGroup: groupName });
          }
        }
      }

      return {
        errorsLast24h: totalErrors,
        warningsLast24h: 0,
        crashesLast24h: 0,
        apisWithErrors: apisWithErrors.size,
        errorsByHour,
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
      const res = await api.get<any>(url);
      const raw = res.data?.data ?? res.data;

      // Backend returns: { data: [{ logGroup, timestamp, message }] }
      if (Array.isArray(raw)) {
        return raw.map((entry: any) => {
          // Parse the JSON message to extract level/details
          let parsedMsg = entry.message || '';
          let logStream = entry.logStream || '';
          try {
            const json = JSON.parse(entry.message);
            parsedMsg = json.MessageTemplate || json.Exception?.split('\n')[0] || entry.message;
            if (json.Level) parsedMsg = `[${json.Level}] ${parsedMsg}`;
          } catch { /* not JSON, use raw */ }
          return {
            timestamp: entry.timestamp || '',
            message: parsedMsg,
            logGroup: (entry.logGroup || '').replace('/handysuites/', ''),
            logStream,
          };
        });
      }
      return [];
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
