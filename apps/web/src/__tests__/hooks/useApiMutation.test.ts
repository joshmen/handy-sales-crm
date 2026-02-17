/// <reference path="../jest.d.ts" />

import { renderHook, act, waitFor } from '@testing-library/react';
import { useApiMutation } from '@/hooks/useApiMutation';
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

const mockApiInstance = apiInstance as jest.Mocked<typeof apiInstance>;

describe('useApiMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('returns correct initial state', () => {
      const { result } = renderHook(() =>
        useApiMutation('/api/items', { method: 'POST' })
      );

      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isIdle).toBe(true);
      expect(typeof result.current.mutate).toBe('function');
      expect(typeof result.current.mutateAsync).toBe('function');
    });
  });

  describe('mutate', () => {
    it('executes mutation with variables', async () => {
      const mockResponse = { id: 1, name: 'New Item' };
      mockApiInstance.request.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() =>
        useApiMutation<{ id: number; name: string }, { name: string }>(
          '/api/items',
          { method: 'POST' }
        )
      );

      await act(async () => {
        await result.current.mutate({ name: 'New Item' });
      });

      expect(mockApiInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/items',
          method: 'POST',
        })
      );

      expect(result.current.data).toEqual(mockResponse);
      expect(result.current.isSuccess).toBe(true);
    });

    it('supports dynamic URL with function', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: { updated: true } });

      const { result } = renderHook(() =>
        useApiMutation<{ updated: boolean }, { id: string; data: object }>(
          (variables) => `/api/items/${variables.id}`,
          { method: 'PUT' }
        )
      );

      await act(async () => {
        await result.current.mutate({ id: '123', data: { name: 'Updated' } });
      });

      expect(mockApiInstance.request).toHaveBeenCalled();
    });

    it('calls onSuccess callback with data and variables', async () => {
      const mockData = { id: 1 };
      const variables = { name: 'Test' };
      const onSuccess = jest.fn();

      mockApiInstance.request.mockResolvedValueOnce({ data: mockData });

      const { result } = renderHook(() =>
        useApiMutation<typeof mockData, typeof variables>(
          '/api/items',
          { method: 'POST' },
          { onSuccess }
        )
      );

      await act(async () => {
        await result.current.mutate(variables);
      });

      expect(onSuccess).toHaveBeenCalledWith(mockData, variables);
    });

    it('calls onError callback on failure', async () => {
      const error = new Error('Mutation failed');
      const variables = { name: 'Test' };
      const onError = jest.fn();

      mockApiInstance.request.mockRejectedValueOnce(error);

      const { result } = renderHook(() =>
        useApiMutation<unknown, typeof variables>(
          '/api/items',
          { method: 'POST' },
          { onError }
        )
      );

      await act(async () => {
        try {
          await result.current.mutate(variables);
        } catch {
          // Expected to throw
        }
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Mutation failed' }),
        variables
      );
    });

    it('calls onSettled callback on success', async () => {
      const mockData = { id: 1 };
      const variables = { name: 'Test' };
      const onSettled = jest.fn();

      mockApiInstance.request.mockResolvedValueOnce({ data: mockData });

      const { result } = renderHook(() =>
        useApiMutation<typeof mockData, typeof variables>(
          '/api/items',
          { method: 'POST' },
          { onSettled }
        )
      );

      await act(async () => {
        await result.current.mutate(variables);
      });

      expect(onSettled).toHaveBeenCalledWith(mockData, null, variables);
    });

    it('calls onSettled callback on error', async () => {
      const error = new Error('Failed');
      const variables = { name: 'Test' };
      const onSettled = jest.fn();

      mockApiInstance.request.mockRejectedValueOnce(error);

      const { result } = renderHook(() =>
        useApiMutation<unknown, typeof variables>(
          '/api/items',
          { method: 'POST' },
          { onSettled }
        )
      );

      await act(async () => {
        try {
          await result.current.mutate(variables);
        } catch {
          // Expected
        }
      });

      expect(onSettled).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({ message: 'Failed' }),
        variables
      );
    });
  });

  describe('mutateAsync', () => {
    it('returns data on success', async () => {
      const mockData = { id: 1, created: true };
      mockApiInstance.request.mockResolvedValueOnce({ data: mockData });

      const { result } = renderHook(() =>
        useApiMutation<typeof mockData, { name: string }>(
          '/api/items',
          { method: 'POST' }
        )
      );

      let response: typeof mockData | undefined;
      await act(async () => {
        response = await result.current.mutateAsync({ name: 'Test' });
      });

      expect(response).toEqual(mockData);
    });

    it('throws error on failure', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: undefined });

      const { result } = renderHook(() =>
        useApiMutation<{ id: number }, { name: string }>(
          '/api/items',
          { method: 'POST' }
        )
      );

      await expect(
        act(async () => {
          await result.current.mutateAsync({ name: 'Test' });
        })
      ).rejects.toThrow('Mutation failed');
    });
  });

  describe('State Flags', () => {
    it('updates isLoading during mutation', async () => {
      let resolvePromise: (value: { data: unknown }) => void;
      const promise = new Promise<{ data: unknown }>((resolve) => {
        resolvePromise = resolve;
      });

      mockApiInstance.request.mockReturnValueOnce(promise as never);

      const { result } = renderHook(() =>
        useApiMutation('/api/items', { method: 'POST' })
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isIdle).toBe(true);

      act(() => {
        result.current.mutate({});
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isIdle).toBe(false);

      await act(async () => {
        resolvePromise!({ data: { id: 1 } });
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('sets isError on failure', async () => {
      mockApiInstance.request.mockRejectedValueOnce(new Error('Error'));

      const { result } = renderHook(() =>
        useApiMutation('/api/items', { method: 'POST' })
      );

      await act(async () => {
        try {
          await result.current.mutate({});
        } catch {
          // Expected
        }
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.isSuccess).toBe(false);
    });

    it('sets isSuccess on successful mutation', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: { id: 1 } });

      const { result } = renderHook(() =>
        useApiMutation('/api/items', { method: 'POST' })
      );

      await act(async () => {
        await result.current.mutate({});
      });

      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
      expect(result.current.isIdle).toBe(false);
    });
  });

  describe('HTTP Methods', () => {
    it('works with POST method', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() =>
        useApiMutation('/api/items', { method: 'POST' })
      );

      await act(async () => {
        await result.current.mutate({ name: 'New' });
      });

      expect(mockApiInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('works with PUT method', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() =>
        useApiMutation('/api/items/1', { method: 'PUT' })
      );

      await act(async () => {
        await result.current.mutate({ name: 'Updated' });
      });

      expect(mockApiInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('works with DELETE method', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() =>
        useApiMutation('/api/items/1', { method: 'DELETE' })
      );

      await act(async () => {
        await result.current.mutate({});
      });

      expect(mockApiInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('works with PATCH method', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() =>
        useApiMutation('/api/items/1', { method: 'PATCH' })
      );

      await act(async () => {
        await result.current.mutate({ active: false });
      });

      expect(mockApiInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });

  describe('Real-world Usage', () => {
    it('handles create client mutation', async () => {
      const newClient = { id: '1', name: 'Cliente Nuevo', email: 'test@test.com' };
      mockApiInstance.request.mockResolvedValueOnce({ data: newClient });

      const onSuccess = jest.fn();

      const { result } = renderHook(() =>
        useApiMutation<typeof newClient, Omit<typeof newClient, 'id'>>(
          '/api/clientes',
          { method: 'POST' },
          { onSuccess }
        )
      );

      await act(async () => {
        await result.current.mutate({ name: 'Cliente Nuevo', email: 'test@test.com' });
      });

      expect(result.current.data).toEqual(newClient);
      expect(onSuccess).toHaveBeenCalledWith(
        newClient,
        { name: 'Cliente Nuevo', email: 'test@test.com' }
      );
    });

    it('handles update product mutation', async () => {
      const updatedProduct = { id: '123', name: 'Producto Actualizado', price: 150 };
      mockApiInstance.request.mockResolvedValueOnce({ data: updatedProduct });

      const { result } = renderHook(() =>
        useApiMutation<typeof updatedProduct, typeof updatedProduct>(
          (vars) => `/api/productos/${vars.id}`,
          { method: 'PUT' }
        )
      );

      await act(async () => {
        await result.current.mutate({ id: '123', name: 'Producto Actualizado', price: 150 });
      });

      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toEqual(updatedProduct);
    });

    it('handles delete with ID', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: { deleted: true } });

      const onSuccess = jest.fn();

      const { result } = renderHook(() =>
        useApiMutation<{ deleted: boolean }, string>(
          (id) => `/api/items/${id}`,
          { method: 'DELETE' },
          { onSuccess }
        )
      );

      await act(async () => {
        await result.current.mutate('item-123');
      });

      expect(onSuccess).toHaveBeenCalledWith({ deleted: true }, 'item-123');
    });
  });
});
