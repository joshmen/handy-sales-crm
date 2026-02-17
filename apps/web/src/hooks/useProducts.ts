import { useApiQuery } from './useApiQuery';
import { useApiMutation } from './useApiMutation';
import { useAppStore } from '@/stores/useAppStore';
import type { Product } from '@/types';

interface ProductsParams {
  search?: string;
  page?: number;
  limit?: number;
  category?: string;
  brand?: string;
  inStock?: boolean;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

export function useProducts(params?: ProductsParams) {
  const { setProducts } = useAppStore();

  const queryKey = ['products', JSON.stringify(params || {})];

  return useApiQuery(
    queryKey,
    '/api/productos',
    {
      method: 'GET',
      params,
    },
    {
      onSuccess: (data: { products: Product[] }) => {
        if (data?.products) {
          setProducts(data.products);
        }
      },
    }
  );
}

export function useProduct(id: string) {
  return useApiQuery(
    ['product', id],
    `/api/productos/${id}`,
    { method: 'GET' },
    {
      enabled: !!id,
    }
  );
}

export function useCreateProduct() {
  const { addProduct } = useAppStore();

  return useApiMutation<Product, Partial<Product>>(
    '/api/productos',
    { method: 'POST' },
    {
      onSuccess: data => {
        addProduct(data);
      },
    }
  );
}

export function useUpdateProduct() {
  const { updateProduct } = useAppStore();

  return useApiMutation<Product, { id: string } & Partial<Product>>(
    variables => `/api/productos/${variables.id}`,
    { method: 'PUT' },
    {
      onSuccess: data => {
        updateProduct(data);
      },
    }
  );
}

export function useDeleteProduct() {
  const { deleteProduct } = useAppStore();

  return useApiMutation<void, string>(
    id => `/api/productos/${id}`,
    { method: 'DELETE' },
    {
      onSuccess: (_, id) => {
        deleteProduct(id);
      },
    }
  );
}
