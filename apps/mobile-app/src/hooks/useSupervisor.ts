import { useQuery } from '@tanstack/react-query';
import { supervisorApi } from '@/api/supervisor';

export function useSupervisorDashboard() {
  return useQuery({
    queryKey: ['supervisor', 'dashboard'],
    queryFn: () => supervisorApi.getDashboard(),
  });
}

export function useMisVendedores() {
  return useQuery({
    queryKey: ['supervisor', 'vendedores'],
    queryFn: () => supervisorApi.getMisVendedores(),
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

export function useVendedorResumen(vendedorId: number) {
  return useQuery({
    queryKey: ['supervisor', 'vendedor', vendedorId],
    queryFn: () => supervisorApi.getVendedorResumen(vendedorId),
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
 * Admin/Supervisor — lista paginada de pedidos del tenant del día.
 * Solo enabled cuando user es admin/supervisor — vendedores siguen viendo
 * su lista offline (WatermelonDB).
 */
export function useTenantPedidos(opts: { dia?: string; page?: number; pageSize?: number; enabled: boolean }) {
  return useQuery({
    queryKey: ['supervisor', 'pedidos', opts.dia ?? 'hoy', opts.page ?? 1, opts.pageSize ?? 20],
    queryFn: () => supervisorApi.getTenantPedidos({ dia: opts.dia, page: opts.page, pageSize: opts.pageSize }),
    enabled: opts.enabled,
    staleTime: 30_000,
  });
}

export function useTenantCobros(opts: { dia?: string; page?: number; pageSize?: number; enabled: boolean }) {
  return useQuery({
    queryKey: ['supervisor', 'cobros', opts.dia ?? 'hoy', opts.page ?? 1, opts.pageSize ?? 20],
    queryFn: () => supervisorApi.getTenantCobros({ dia: opts.dia, page: opts.page, pageSize: opts.pageSize }),
    enabled: opts.enabled,
    staleTime: 30_000,
  });
}
