import { api, handleApiError } from '@/lib/api';
import type { AutomationTemplate, AutomationExecution } from '@/types/automations';

class AutomationService {
  private readonly basePath = '/api/automations';

  async getTemplates(): Promise<AutomationTemplate[]> {
    try {
      const response = await api.get<AutomationTemplate[]>(`${this.basePath}/templates`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getMisAutomaciones(): Promise<AutomationTemplate[]> {
    try {
      const response = await api.get<AutomationTemplate[]>(`${this.basePath}/mis-automaciones`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async activar(slug: string, paramsJson?: string): Promise<{ id: number }> {
    try {
      const response = await api.post<{ id: number }>(`${this.basePath}/${slug}/activar`, {
        paramsJson: paramsJson || null,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async desactivar(slug: string): Promise<void> {
    try {
      await api.post(`${this.basePath}/${slug}/desactivar`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async configurar(slug: string, paramsJson: string): Promise<void> {
    try {
      await api.put(`${this.basePath}/${slug}/configurar`, { paramsJson });
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getHistorial(page = 1, pageSize = 20, slug?: string): Promise<{ items: AutomationExecution[]; total: number }> {
    try {
      const params: Record<string, string | number> = { page, pageSize };
      if (slug) params.slug = slug;
      const response = await api.get<AutomationExecution[]>(`${this.basePath}/historial`, { params });
      const total = parseInt(response.headers['x-total-count'] || '0', 10);
      return { items: response.data, total };
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const automationService = new AutomationService();
export default automationService;
