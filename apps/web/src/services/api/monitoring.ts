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
  level: string;
  exception: string;
  rawMessage: string;
  logGroup: string;
  logStream: string;
  properties: Record<string, string>;
}

interface CloudWatchStatsGroup {
  logGroup?: string;
  status?: string;
  hourlyData?: { hour: string; count: string }[];
}

interface CloudWatchLogEntry {
  logGroup?: string;
  timestamp?: string;
  message?: string;
  logStream?: string;
}

// ============ SERVICIO ============

class MonitoringService {
  private basePath = '/api/superadmin/monitoring';

  async getStats(): Promise<MonitoringStats> {
    try {
      const res = await api.get<{ data?: CloudWatchStatsGroup[] }>(`${this.basePath}/stats`);
      const raw: CloudWatchStatsGroup[] = res.data?.data ?? (Array.isArray(res.data) ? res.data as CloudWatchStatsGroup[] : []);

      let totalErrors = 0;
      const errorsByHour: { hour: string; count: number; logGroup: string }[] = [];
      const apisWithErrors = new Set<string>();

      for (const group of raw) {
        const groupName = (group.logGroup || '').replace('/handysuites/', '');
        for (const h of (group.hourlyData || [])) {
          const count = parseInt(h.count, 10) || 0;
          totalErrors += count;
          if (count > 0) apisWithErrors.add(groupName);
          errorsByHour.push({ hour: h.hour, count, logGroup: groupName });
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
      const res = await api.get<{ data?: CloudWatchLogEntry[] }>(url);
      const raw: CloudWatchLogEntry[] = res.data?.data ?? (Array.isArray(res.data) ? res.data as CloudWatchLogEntry[] : []);

      return raw.map((entry): LogEntry => {
        const rawMessage = entry.message || '';
        let message = rawMessage;
        let level = 'Unknown';
        let exception = '';
        let properties: Record<string, string> = {};

        try {
          const json = JSON.parse(rawMessage);
          level = json.Level || 'Unknown';
          message = json.MessageTemplate || json.Message || rawMessage;
          exception = json.Exception || '';
          if (json.Properties) {
            properties = Object.fromEntries(
              Object.entries(json.Properties).map(([k, v]) => [k, String(v)])
            );
          }
        } catch { /* not JSON, use raw */ }

        return {
          timestamp: entry.timestamp || '',
          message,
          level,
          exception,
          rawMessage,
          logGroup: (entry.logGroup || '').replace('/handysuites/', ''),
          logStream: entry.logStream || '',
          properties,
        };
      });
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
