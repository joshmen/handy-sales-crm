import { useQuery } from '@tanstack/react-query';
import { supervisorApi } from '@/api/supervisor';

export function useSupervisorDashboard() {
  return useQuery({
    queryKey: ['supervisor', 'dashboard'],
    queryFn: () => supervisorApi.getDashboard(),
    refetchInterval: 30_000, // refresh every 30s
  });
}

export function useMisVendedores() {
  return useQuery({
    queryKey: ['supervisor', 'vendedores'],
    queryFn: () => supervisorApi.getMisVendedores(),
  });
}

export function useUbicacionesEquipo() {
  return useQuery({
    queryKey: ['supervisor', 'ubicaciones'],
    queryFn: () => supervisorApi.getUbicaciones(),
    refetchInterval: 30_000,
  });
}

export function useActividadEquipo() {
  return useQuery({
    queryKey: ['supervisor', 'actividad'],
    queryFn: () => supervisorApi.getActividad(),
    refetchInterval: 15_000, // refresh every 15s
  });
}

export function useVendedorResumen(vendedorId: number) {
  return useQuery({
    queryKey: ['supervisor', 'vendedor', vendedorId],
    queryFn: () => supervisorApi.getVendedorResumen(vendedorId),
    enabled: vendedorId > 0,
    refetchInterval: 30_000,
  });
}
