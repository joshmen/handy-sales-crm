import { api, handleApiError } from '@/lib/api';

// Conteos para los badges del sidebar de la Consola de plataforma (Super Admin).
export interface ConsoleBadges {
  support: number;
  dunning: number;
  crashReports: number;
}

class ConsoleAdminService {
  private basePath = '/api/superadmin/console';

  async getBadges(): Promise<ConsoleBadges> {
    try {
      const res = await api.get<ConsoleBadges>(`${this.basePath}/badges`);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const consoleAdminService = new ConsoleAdminService();
