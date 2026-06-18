import api from './client';

/** Empresa (tenant) en el dashboard de salud de plataforma — metadata read-only,
 *  sin PII de clientes finales. */
export interface OverviewTenant {
  id: number;
  nombre: string;
  plan: string | null;
  activo: boolean;
  usuarios: number;
  pedidosHoy: number;
}

/**
 * Salud de plataforma (agregado) que ve el super admin móvil. Solo números
 * globales — cero PII de clientes finales, cero drill-down per-tenant. El
 * detalle por empresa (con auditoría) vive en la web.
 */
export interface PlatformOverview {
  tenantsActivos: number;
  tenantsInactivos: number;
  tenantsTotal: number;
  pedidosHoy: number;
  ventasHoy: number;
  ventasMes: number;
  tenants: OverviewTenant[];
}

/**
 * API del super admin móvil (Opción A). Solo expone el agregado de plataforma;
 * el SUPER_ADMIN no impersona tenants desde el móvil. El backend valida el rol.
 */
export const adminApi = {
  getOverview: async (): Promise<PlatformOverview> => {
    const res = await api.get<{ success: boolean; data: PlatformOverview }>(
      '/api/mobile/admin/overview',
    );
    return res.data.data;
  },
};
