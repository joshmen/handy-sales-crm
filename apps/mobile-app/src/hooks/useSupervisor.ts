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
  return useQuery({
    queryKey: ['supervisor', 'ubicaciones'],
    queryFn: () => supervisorApi.getUbicaciones(),
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
