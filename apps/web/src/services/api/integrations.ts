import { api } from '@/lib/api';
import type { IntegrationCatalog, TenantIntegration } from '@/types/integration';

export const integrationService = {
  async getCatalog(): Promise<IntegrationCatalog[]> {
    const { data } = await api.get<IntegrationCatalog[]>('/api/integrations');
    return data;
  },

  async getBySlug(slug: string): Promise<IntegrationCatalog> {
    const { data } = await api.get<IntegrationCatalog>(`/api/integrations/${slug}`);
    return data;
  },

  async getMyIntegrations(): Promise<TenantIntegration[]> {
    const { data } = await api.get<TenantIntegration[]>('/api/integrations/mine');
    return data;
  },

  async activate(slug: string, configuracion?: string): Promise<TenantIntegration> {
    const { data } = await api.post<TenantIntegration>(`/api/integrations/${slug}/activate`, {
      configuracion,
    });
    return data;
  },

  async deactivate(slug: string): Promise<void> {
    await api.post(`/api/integrations/${slug}/deactivate`);
  },
};
