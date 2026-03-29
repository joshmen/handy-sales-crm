import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pedidosApi } from '@/api';
import Toast from 'react-native-toast-message';

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

export function useConfirmarPedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => pedidosApi.confirmar(id),
    onSuccess: (_data, id) => {
      Toast.show({ type: 'success', text1: 'Pedido confirmado', visibilityTime: 2000 });
      // WDB sync handles server updates automatically
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Error al confirmar', text2: 'Intenta de nuevo' }),
  });
}

export function useEnRutaPedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => pedidosApi.enRuta(id),
    onSuccess: (_data, id) => {
      Toast.show({ type: 'success', text1: 'Pedido en ruta', visibilityTime: 2000 });
      // WDB sync handles server updates automatically
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Error al cambiar estado', text2: 'Intenta de nuevo' }),
  });
}

export function useEntregarPedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notasEntrega }: { id: number; notasEntrega?: string }) =>
      pedidosApi.entregar(id, notasEntrega),
    onSuccess: (_data, { id }) => {
      Toast.show({ type: 'success', text1: 'Pedido entregado', visibilityTime: 2000 });
      // WDB sync handles server updates automatically
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Error al entregar', text2: 'Intenta de nuevo' }),
  });
}

export function useCancelarPedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, razon }: { id: number; razon: string }) =>
      pedidosApi.cancelar(id, razon),
    onSuccess: (_data, { id }) => {
      Toast.show({ type: 'info', text1: 'Pedido cancelado', visibilityTime: 2000 });
      // WDB sync handles server updates automatically
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
  });
}
