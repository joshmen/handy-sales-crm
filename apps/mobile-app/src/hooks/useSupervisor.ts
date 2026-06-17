import { useQuery } from '@tanstack/react-query';
import { supervisorApi } from '@/api/supervisor';

export function useSupervisorDashboard() {
  // KPIs ejecutivos del día (vendedores activos, pedidos hoy, ventas mes).
  // Refresca solo mientras la pantalla está visible — sin esto cargaban una
  // sola vez al montar y quedaban congelados toda la jornada (inconsistente con
  // el mapa GPS / resumen-tenant que sí refrescan).
  return useQuery({
    queryKey: ['supervisor', 'dashboard'],
    queryFn: () => supervisorApi.getDashboard(),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}

export function useMisVendedores() {
  // Lista del equipo con estado online/offline (último ping GPS). Refresca para
  // que los badges "en línea" no queden pegados con datos viejos.
  return useQuery({
    queryKey: ['supervisor', 'vendedores'],
    queryFn: () => supervisorApi.getMisVendedores(),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}

export function useUbicacionesEquipo() {
  // staleTime corto + refetchInterval — el mapa muestra ubicaciones "en vivo".
  // Sin esto, el supervisor podría ver pins de hace horas sin saberlo.
  return useQuery({
    queryKey: ['supervisor', 'ubicaciones'],
    queryFn: () => supervisorApi.getUbicaciones(),
    staleTime: 60_000,        // 1 min — datos GPS no envejecen instantáneamente
    refetchInterval: 60_000,  // refresca cada 1 min mientras la pantalla esté visible
  });
}

export function useActividadEquipo() {
  return useQuery({
    queryKey: ['supervisor', 'actividad'],
    queryFn: () => supervisorApi.getActividad(),
  });
}

export function useVendedorResumen(
  vendedorId: number,
  opts?: { fecha?: string; rango?: '7d' }
) {
  return useQuery({
    queryKey: ['supervisor', 'vendedor', vendedorId, opts?.rango ?? opts?.fecha ?? 'hoy'],
    queryFn: () => supervisorApi.getVendedorResumen(vendedorId, opts),
    enabled: vendedorId > 0,
  });
}

/**
 * Admin only — agregados del día de TODO el tenant. Solo se llama si
 * el rol del usuario actual es ADMIN/SUPER_ADMIN. Si no, queda disabled.
 * Refresca cada 2 min para mantener los KPIs frescos durante el día.
 */
export function useTenantResumen(enabled: boolean) {
  return useQuery({
    queryKey: ['supervisor', 'resumen-tenant'],
    queryFn: () => supervisorApi.getResumenTenant(),
    enabled,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}

/**
 * Admin/Supervisor — lista paginada de pedidos del tenant.
 * - sin opts.dia ni opts.rango: hoy (default)
 * - opts.dia=YYYY-MM-DD: día específico (ayer)
 * - opts.rango='7d'|'30d': últimos 7 o 30 días
 */
export function useTenantPedidos(opts: {
  dia?: string;
  rango?: '7d' | '30d';
  page?: number;
  pageSize?: number;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: ['supervisor', 'pedidos', opts.rango ?? opts.dia ?? 'hoy', opts.page ?? 1, opts.pageSize ?? 20],
    queryFn: () => supervisorApi.getTenantPedidos({ dia: opts.dia, rango: opts.rango, page: opts.page, pageSize: opts.pageSize }),
    enabled: opts.enabled,
    staleTime: 30_000,
  });
}

export function useTenantCobros(opts: {
  dia?: string;
  rango?: '7d' | '30d';
  page?: number;
  pageSize?: number;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: ['supervisor', 'cobros', opts.rango ?? opts.dia ?? 'hoy', opts.page ?? 1, opts.pageSize ?? 20],
    queryFn: () => supervisorApi.getTenantCobros({ dia: opts.dia, rango: opts.rango, page: opts.page, pageSize: opts.pageSize }),
    enabled: opts.enabled,
    staleTime: 30_000,
  });
}
