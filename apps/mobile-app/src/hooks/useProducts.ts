import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { productosApi } from '@/api';

interface UseProductsListParams {
  busqueda?: string;
  categoriaId?: number;
  familiaId?: number;
  porPagina?: number;
}

export function useProductsList(params: UseProductsListParams = {}) {
  return useInfiniteQuery({
    queryKey: ['products', params],
    queryFn: ({ pageParam = 1 }) =>
      productosApi.list({
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

export function useProductDetail(id: number) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => productosApi.getById(id),
    enabled: id > 0,
  });
}

export function useProductStock(id: number) {
  return useQuery({
    queryKey: ['product', id, 'stock'],
    queryFn: () => productosApi.getStock(id),
    enabled: id > 0,
  });
}
