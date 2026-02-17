/// <reference path="../jest.d.ts" />

import { renderHook, act, waitFor } from '@testing-library/react';
import { useApi } from '@/hooks/useApi';
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

describe('useApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('returns initial state with undefined data', () => {
      const { result } = renderHook(() => useApi('/api/test'));

      expect(result.current.data).toBeUndefined();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.execute).toBe('function');
      expect(typeof result.current.reset).toBe('function');
      expect(typeof result.current.setData).toBe('function');
    });

    it('uses initialData when provided', () => {
      const initialData = { name: 'Test' };
      const { result } = renderHook(() =>
        useApi('/api/test', {}, { initialData })
      );

      expect(result.current.data).toEqual(initialData);
    });
  });

  describe('execute', () => {
    it('makes API request and returns data', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockApiInstance.request.mockResolvedValueOnce({ data: mockData });

      const { result } = renderHook(() => useApi('/api/test'));

      let response: typeof mockData | undefined;
      await act(async () => {
        response = await result.current.execute();
      });

      expect(mockApiInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/test',
        })
      );
      expect(response).toEqual(mockData);
      expect(result.current.data).toEqual(mockData);
      expect(result.current.loading).toBe(false);
    });

    it('sets loading state during request', async () => {
      let resolvePromise: (value: { data: unknown }) => void;
      const promise = new Promise<{ data: unknown }>((resolve) => {
        resolvePromise = resolve;
      });

      mockApiInstance.request.mockReturnValueOnce(promise as never);

      const { result } = renderHook(() => useApi('/api/test'));

      act(() => {
        result.current.execute();
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise!({ data: { id: 1 } });
        await promise;
      });

      expect(result.current.loading).toBe(false);
    });

    it('handles errors correctly', async () => {
      const error = new Error('Network error');
      mockApiInstance.request.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useApi('/api/test'));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toEqual({
        message: 'Network error',
        status: 500,
      });
      expect(result.current.data).toBeUndefined();
    });

    it('calls onSuccess callback on successful request', async () => {
      const mockData = { id: 1 };
      const onSuccess = jest.fn();
      mockApiInstance.request.mockResolvedValueOnce({ data: mockData });

      const { result } = renderHook(() =>
        useApi('/api/test', {}, { onSuccess })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(onSuccess).toHaveBeenCalledWith(mockData);
    });

    it('calls onError callback on failed request', async () => {
      const error = new Error('API Error');
      const onError = jest.fn();
      mockApiInstance.request.mockRejectedValueOnce(error);

      const { result } = renderHook(() =>
        useApi('/api/test', {}, { onError })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'API Error',
        })
      );
    });

    it('supports dynamic URL with function', async () => {
      const mockData = { id: 123 };
      mockApiInstance.request.mockResolvedValueOnce({ data: mockData });

      const urlFn = (data?: Record<string, unknown>) =>
        `/api/items/${data?.id}`;

      const { result } = renderHook(() => useApi(urlFn));

      await act(async () => {
        await result.current.execute({ id: 123 });
      });

      expect(mockApiInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/items/123',
        })
      );
    });

    it('includes data in request body for non-GET methods', async () => {
      const requestData = { name: 'New Item' };
      mockApiInstance.request.mockResolvedValueOnce({ data: { id: 1 } });

      const { result } = renderHook(() =>
        useApi('/api/items', { method: 'POST' })
      );

      await act(async () => {
        await result.current.execute(requestData);
      });

      expect(mockApiInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/items',
          method: 'POST',
          data: requestData,
        })
      );
    });
  });

  describe('Caching', () => {
    it('uses cached data when cache is enabled', async () => {
      const mockData = { id: 1 };
      mockApiInstance.request.mockResolvedValueOnce({ data: mockData });

      const { result } = renderHook(() =>
        useApi('/api/test', {}, { cache: true })
      );

      // First call
      await act(async () => {
        await result.current.execute();
      });

      // Reset mock to verify second call doesn't happen
      mockApiInstance.request.mockClear();

      // Second call should use cache
      await act(async () => {
        await result.current.execute();
      });

      expect(mockApiInstance.request).not.toHaveBeenCalled();
      expect(result.current.data).toEqual(mockData);
    });
  });

  describe('reset', () => {
    it('resets state to initial values', async () => {
      const mockData = { id: 1 };
      mockApiInstance.request.mockResolvedValueOnce({ data: mockData });

      const { result } = renderHook(() =>
        useApi('/api/test', {}, { initialData: undefined })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toEqual(mockData);

      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it('resets to initialData if provided', async () => {
      const initialData = { default: true };
      const mockData = { id: 1 };
      mockApiInstance.request.mockResolvedValueOnce({ data: mockData });

      const { result } = renderHook(() =>
        useApi('/api/test', {}, { initialData })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toEqual(mockData);

      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toEqual(initialData);
    });
  });

  describe('setData', () => {
    it('allows manual data setting', () => {
      const { result } = renderHook(() => useApi('/api/test'));

      const newData = { id: 99, manual: true };

      act(() => {
        result.current.setData(newData);
      });

      expect(result.current.data).toEqual(newData);
    });
  });

  describe('Request Abortion', () => {
    it('aborts previous request when new one is made', async () => {
      let resolveFirst: (value: { data: unknown }) => void;
      const firstPromise = new Promise<{ data: unknown }>((resolve) => {
        resolveFirst = resolve;
      });

      mockApiInstance.request
        .mockReturnValueOnce(firstPromise as never)
        .mockResolvedValueOnce({ data: { id: 2 } });

      const { result } = renderHook(() => useApi('/api/test'));

      // Start first request
      act(() => {
        result.current.execute();
      });

      // Start second request (should abort first)
      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toEqual({ id: 2 });
    });
  });

  describe('Config Options', () => {
    it('passes axios config to request', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: {} });

      const config = {
        method: 'POST' as const,
        headers: { 'Content-Type': 'application/json' },
        params: { filter: 'active' },
      };

      const { result } = renderHook(() => useApi('/api/test', config));

      await act(async () => {
        await result.current.execute();
      });

      expect(mockApiInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          params: { filter: 'active' },
        })
      );
    });
  });
});
