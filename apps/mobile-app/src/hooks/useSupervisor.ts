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
