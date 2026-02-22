import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { clientesApi } from '@/api';

interface UseClientsListParams {
  busqueda?: string;
  zonaId?: number;
  porPagina?: number;
}

export function useClientsList(params: UseClientsListParams = {}) {
  return useInfiniteQuery({
    queryKey: ['clients', params],
    queryFn: ({ pageParam = 1 }) =>
      clientesApi.list({
        ...params,
        pagina: pageParam,
        porPagina: params.porPagina || 20,
      }),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
  });
}

export function useClientDetail(id: number) {
  return useQuery({
    queryKey: ['client', id],
    queryFn: () => clientesApi.getById(id),
    enabled: id > 0,
  });
}
