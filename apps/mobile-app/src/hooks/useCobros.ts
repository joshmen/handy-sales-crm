import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cobrosApi } from '@/api/cobros';
import type { CobroCreateRequest } from '@/types/cobro';

export function useSaldos(clienteId?: number) {
  return useQuery({
    queryKey: ['cobros', 'saldos', clienteId],
    queryFn: () => cobrosApi.getSaldos(clienteId),
  });
}

export function useResumenCartera() {
  return useQuery({
    queryKey: ['cobros', 'resumen'],
    queryFn: () => cobrosApi.getResumenCartera(),
  });
}

export function useEstadoCuenta(clienteId: number) {
  return useQuery({
    queryKey: ['cobros', 'estado-cuenta', clienteId],
    queryFn: () => cobrosApi.getEstadoCuenta(clienteId),
    enabled: clienteId > 0,
  });
}

export function useMisCobros(params: {
  clienteId?: number;
  desde?: string;
  hasta?: string;
} = {}) {
  return useInfiniteQuery({
    queryKey: ['cobros', 'mis-cobros', params],
    queryFn: ({ pageParam = 1 }) =>
      cobrosApi.misCobros({ ...params, pagina: pageParam, porPagina: 20 }),
    getNextPageParam: (lastPage) => {
      if (!lastPage.pagination) return undefined;
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
  });
}

export function useCrearCobro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cobro: CobroCreateRequest) => cobrosApi.crear(cobro),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cobros'] });
    },
  });
}
