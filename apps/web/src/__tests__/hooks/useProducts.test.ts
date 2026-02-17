/// <reference path="../jest.d.ts" />

import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useProducts,
  useProduct,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '@/hooks/useProducts';
import apiInstance from '@/lib/api';

// Mock the api module
jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    request: jest.fn(),
  },
  handleApiError: jest.fn((err) => ({
    message: err.message || 'An error occurred',
    status: err.response?.status || 500,
  })),
}));

// Mock useAppStore
const mockSetProducts = jest.fn();
const mockAddProduct = jest.fn();
const mockUpdateProduct = jest.fn();
const mockDeleteProduct = jest.fn();

jest.mock('@/stores/useAppStore', () => ({
  useAppStore: () => ({
    setProducts: mockSetProducts,
    addProduct: mockAddProduct,
    updateProduct: mockUpdateProduct,
    deleteProduct: mockDeleteProduct,
  }),
}));

const mockApiInstance = apiInstance as jest.Mocked<typeof apiInstance>;

const mockProduct = {
  id: 'prod-1',
  name: 'Producto Test',
  code: 'PROD-001',
  description: 'Descripción del producto',
  price: 100,
  stock: 50,
  category: 'Electrónicos',
  family: 'Accesorios',
  isActive: true,
};

const mockProductsResponse = {
  products: [mockProduct],
  total: 1,
  page: 1,
  limit: 10,
};

describe('useProducts Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('useProducts', () => {
    it('fetches products list', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: mockProductsResponse });

      const { result } = renderHook(() => useProducts());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(mockApiInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            url: '/api/productos',
            method: 'GET',
          })
        );
      });
    });

    it('calls setProducts on success', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: mockProductsResponse });

      renderHook(() => useProducts());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(mockSetProducts).toHaveBeenCalledWith(mockProductsResponse.products);
      });
    });

    it('passes filter params to request', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: mockProductsResponse });

      const params = {
        search: 'test',
        page: 1,
        limit: 20,
        category: 'Electrónicos',
        inStock: true,
        minPrice: 50,
        maxPrice: 200,
      };

      renderHook(() => useProducts(params));

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(mockApiInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            url: '/api/productos',
            params,
          })
        );
      });
    });

    it('refetches when params change', async () => {
      mockApiInstance.request.mockResolvedValue({ data: mockProductsResponse });

      const { rerender } = renderHook(
        ({ params }) => useProducts(params),
        { initialProps: { params: { category: 'A' } } }
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(mockApiInstance.request).toHaveBeenCalledTimes(1);

      rerender({ params: { category: 'B' } });

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(mockApiInstance.request).toHaveBeenCalledTimes(2);
    });

    it('supports price range filters', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: mockProductsResponse });

      renderHook(() =>
        useProducts({
          minPrice: 100,
          maxPrice: 500,
        })
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(mockApiInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            params: expect.objectContaining({
              minPrice: 100,
              maxPrice: 500,
            }),
          })
        );
      });
    });
  });

  describe('useProduct', () => {
    it('fetches single product by ID', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: mockProduct });

      const { result } = renderHook(() => useProduct('prod-1'));

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(mockApiInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            url: '/api/productos/prod-1',
            method: 'GET',
          })
        );
      });
    });

    it('does not fetch when ID is empty', async () => {
      renderHook(() => useProduct(''));

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(mockApiInstance.request).not.toHaveBeenCalled();
    });

    it('returns product data', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: mockProduct });

      const { result } = renderHook(() => useProduct('prod-1'));

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockProduct);
      });
    });
  });

  describe('useCreateProduct', () => {
    it('creates new product', async () => {
      const newProduct = { ...mockProduct, id: 'prod-new' };
      mockApiInstance.request.mockResolvedValueOnce({ data: newProduct });

      const { result } = renderHook(() => useCreateProduct());

      await act(async () => {
        await result.current.mutate({
          name: 'Producto Nuevo',
          code: 'PROD-002',
          price: 150,
          stock: 30,
          category: 'Electrónicos',
          family: 'Cables',
        });
      });

      expect(mockApiInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/productos',
          method: 'POST',
        })
      );
    });

    it('calls addProduct on success', async () => {
      const newProduct = { ...mockProduct, id: 'prod-new' };
      mockApiInstance.request.mockResolvedValueOnce({ data: newProduct });

      const { result } = renderHook(() => useCreateProduct());

      await act(async () => {
        await result.current.mutate({
          name: 'Test Product',
          code: 'TEST-001',
        });
      });

      expect(mockAddProduct).toHaveBeenCalledWith(newProduct);
    });

    it('returns mutation state', () => {
      const { result } = renderHook(() => useCreateProduct());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isIdle).toBe(true);
    });

    it('sets isLoading during mutation', async () => {
      let resolvePromise: (value: { data: unknown }) => void;
      const promise = new Promise<{ data: unknown }>((resolve) => {
        resolvePromise = resolve;
      });

      mockApiInstance.request.mockReturnValueOnce(promise as never);

      const { result } = renderHook(() => useCreateProduct());

      act(() => {
        result.current.mutate({ name: 'Test' });
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({ data: mockProduct });
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('useUpdateProduct', () => {
    it('updates existing product', async () => {
      const updatedProduct = { ...mockProduct, name: 'Updated Product', price: 200 };
      mockApiInstance.request.mockResolvedValueOnce({ data: updatedProduct });

      const { result } = renderHook(() => useUpdateProduct());

      await act(async () => {
        await result.current.mutate({
          id: 'prod-1',
          name: 'Updated Product',
          price: 200,
        });
      });

      expect(mockApiInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });

    it('calls updateProduct on success', async () => {
      const updatedProduct = { ...mockProduct, stock: 100 };
      mockApiInstance.request.mockResolvedValueOnce({ data: updatedProduct });

      const { result } = renderHook(() => useUpdateProduct());

      await act(async () => {
        await result.current.mutate({ id: 'prod-1', stock: 100 });
      });

      expect(mockUpdateProduct).toHaveBeenCalledWith(updatedProduct);
    });

    it('handles partial updates', async () => {
      const updatedProduct = { ...mockProduct, price: 150 };
      mockApiInstance.request.mockResolvedValueOnce({ data: updatedProduct });

      const { result } = renderHook(() => useUpdateProduct());

      await act(async () => {
        await result.current.mutate({ id: 'prod-1', price: 150 });
      });

      expect(mockUpdateProduct).toHaveBeenCalledWith(updatedProduct);
    });
  });

  describe('useDeleteProduct', () => {
    it('deletes product by ID', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: undefined });

      const { result } = renderHook(() => useDeleteProduct());

      await act(async () => {
        await result.current.mutate('prod-1');
      });

      expect(mockApiInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('calls deleteProduct on success', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: undefined });

      const { result } = renderHook(() => useDeleteProduct());

      await act(async () => {
        await result.current.mutate('prod-1');
      });

      expect(mockDeleteProduct).toHaveBeenCalledWith('prod-1');
    });

    it('handles delete error', async () => {
      const error = new Error('Product has pending orders');
      mockApiInstance.request.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useDeleteProduct());

      await act(async () => {
        try {
          await result.current.mutate('prod-1');
        } catch {
          // Expected
        }
      });

      expect(result.current.isError).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('handles full product lifecycle', async () => {
      // Create
      const newProduct = { ...mockProduct, id: 'new-prod' };
      mockApiInstance.request.mockResolvedValueOnce({ data: newProduct });

      const { result: createResult } = renderHook(() => useCreateProduct());

      await act(async () => {
        await createResult.current.mutate({
          name: 'New Product',
          code: 'NEW-001',
          price: 100,
          stock: 50,
        });
      });

      expect(mockAddProduct).toHaveBeenCalledWith(newProduct);
      expect(createResult.current.isSuccess).toBe(true);

      // Update
      const updatedProduct = { ...newProduct, price: 120 };
      mockApiInstance.request.mockResolvedValueOnce({ data: updatedProduct });

      const { result: updateResult } = renderHook(() => useUpdateProduct());

      await act(async () => {
        await updateResult.current.mutate({ id: 'new-prod', price: 120 });
      });

      expect(mockUpdateProduct).toHaveBeenCalledWith(updatedProduct);
      expect(updateResult.current.isSuccess).toBe(true);

      // Delete
      mockApiInstance.request.mockResolvedValueOnce({ data: undefined });

      const { result: deleteResult } = renderHook(() => useDeleteProduct());

      await act(async () => {
        await deleteResult.current.mutate('new-prod');
      });

      expect(mockDeleteProduct).toHaveBeenCalledWith('new-prod');
    });

    it('filters products by category and brand', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: mockProductsResponse });

      renderHook(() =>
        useProducts({
          category: 'Electrónicos',
          brand: 'Samsung',
          isActive: true,
        })
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(mockApiInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            params: {
              category: 'Electrónicos',
              brand: 'Samsung',
              isActive: true,
            },
          })
        );
      });
    });

    it('searches products with pagination', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: mockProductsResponse });

      renderHook(() =>
        useProducts({
          search: 'cable',
          page: 2,
          limit: 25,
        })
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(mockApiInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            params: expect.objectContaining({
              search: 'cable',
              page: 2,
              limit: 25,
            }),
          })
        );
      });
    });

    it('filters in-stock products', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: mockProductsResponse });

      renderHook(() =>
        useProducts({
          inStock: true,
        })
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(mockApiInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            params: expect.objectContaining({
              inStock: true,
            }),
          })
        );
      });
    });
  });
});
