import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pedidosApi } from '@/api';
import { performSync } from '@/sync';

/** Trigger sync after server-side state changes so WatermelonDB gets updated */
async function syncAfterMutation() {
  try { await performSync(); } catch { /* silent */ }
}

interface UseOrdersListParams {
  estado?: number;
  porPagina?: number;
}

export function useOrdersList(params: UseOrdersListParams = {}) {
  return useInfiniteQuery({
    queryKey: ['orders', params],
    queryFn: ({ pageParam = 1 }) =>
      pedidosApi.misPedidos({
        ...params,
        pagina: pageParam,
        porPagina: params.porPagina || 20,
      }),
    getNextPageParam: (lastPage) => {
      if (!lastPage.pagination) return undefined;
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
  });
}

export function useOrderDetail(id: number) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => pedidosApi.getById(id),
    enabled: id > 0,
  });
}

export function useEnviarPedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => pedidosApi.enviar(id),
    onSuccess: (_data, id) => {
      syncAfterMutation();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useConfirmarPedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => pedidosApi.confirmar(id),
    onSuccess: (_data, id) => {
      syncAfterMutation();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
  });
}

export function useProcesarPedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => pedidosApi.procesar(id),
    onSuccess: (_data, id) => {
      syncAfterMutation();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
  });
}

export function useEnRutaPedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => pedidosApi.enRuta(id),
    onSuccess: (_data, id) => {
      syncAfterMutation();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
  });
}

export function useEntregarPedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notasEntrega }: { id: number; notasEntrega?: string }) =>
      pedidosApi.entregar(id, notasEntrega),
    onSuccess: (_data, { id }) => {
      syncAfterMutation();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
  });
}

export function useCancelarPedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, razon }: { id: number; razon: string }) =>
      pedidosApi.cancelar(id, razon),
    onSuccess: (_data, { id }) => {
      syncAfterMutation();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
  });
}
