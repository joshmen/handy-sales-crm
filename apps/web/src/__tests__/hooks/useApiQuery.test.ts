/// <reference path="../jest.d.ts" />

import { renderHook, act, waitFor } from '@testing-library/react';
import { useApiQuery } from '@/hooks/useApiQuery';
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

describe('useApiQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial Fetch', () => {
    it('fetches data automatically when enabled', async () => {
      const mockData = { items: [1, 2, 3] };
      mockApiInstance.request.mockResolvedValueOnce({ data: mockData });

      const { result } = renderHook(() =>
        useApiQuery('test-key', '/api/items')
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      expect(mockApiInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/items',
        })
      );
    });

    it('does not fetch when enabled is false', async () => {
      const { result } = renderHook(() =>
        useApiQuery('test-key', '/api/items', {}, { enabled: false })
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(mockApiInstance.request).not.toHaveBeenCalled();
      expect(result.current.data).toBeUndefined();
    });

    it('uses initial data when provided', () => {
      const initialData = { cached: true };

      const { result } = renderHook(() =>
        useApiQuery('test-key', '/api/items', {}, { initialData, enabled: false })
      );

      expect(result.current.data).toEqual(initialData);
    });
  });

  describe('Query Key', () => {
    it('supports string key', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: {} });

      renderHook(() => useApiQuery('simple-key', '/api/test'));

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(mockApiInstance.request).toHaveBeenCalled();
    });

    it('supports array key', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: {} });

      renderHook(() =>
        useApiQuery(['items', 'category', '123'], '/api/items/category/123')
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(mockApiInstance.request).toHaveBeenCalled();
    });

    it('refetches when key changes', async () => {
      mockApiInstance.request.mockResolvedValue({ data: {} });

      const { rerender } = renderHook(
        ({ key }) => useApiQuery(key, `/api/items/${key}`),
        { initialProps: { key: 'first' } }
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(mockApiInstance.request).toHaveBeenCalledTimes(1);

      rerender({ key: 'second' });

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(mockApiInstance.request).toHaveBeenCalledTimes(2);
    });
  });

  describe('Callbacks', () => {
    it('calls onSuccess when request succeeds', async () => {
      const mockData = { success: true };
      const onSuccess = jest.fn();
      mockApiInstance.request.mockResolvedValueOnce({ data: mockData });

      renderHook(() =>
        useApiQuery('test', '/api/test', {}, { onSuccess })
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(mockData);
      });
    });

    it('calls onError when request fails', async () => {
      const error = new Error('Request failed');
      const onError = jest.fn();
      mockApiInstance.request.mockRejectedValueOnce(error);

      renderHook(() =>
        useApiQuery('test', '/api/test', {}, { onError })
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });
  });

  describe('refetch', () => {
    it('provides refetch function', async () => {
      mockApiInstance.request.mockResolvedValue({ data: {} });

      const { result } = renderHook(() =>
        useApiQuery('test', '/api/test')
      );

      expect(typeof result.current.refetch).toBe('function');
    });

    it('refetches data when refetch is called', async () => {
      mockApiInstance.request.mockResolvedValue({ data: { updated: true } });

      const { result } = renderHook(() =>
        useApiQuery('test', '/api/test')
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      mockApiInstance.request.mockClear();
      mockApiInstance.request.mockResolvedValueOnce({ data: { refreshed: true } });

      await act(async () => {
        await result.current.refetch();
        await jest.runAllTimersAsync();
      });

      expect(mockApiInstance.request).toHaveBeenCalled();
    });
  });

  describe('Refetch Interval', () => {
    it('refetches at specified interval', async () => {
      mockApiInstance.request.mockResolvedValue({ data: {} });

      renderHook(() =>
        useApiQuery('test', '/api/test', {}, { refetchInterval: 5000 })
      );

      // Initial fetch
      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(mockApiInstance.request).toHaveBeenCalledTimes(1);

      // Advance time by interval
      await act(async () => {
        jest.advanceTimersByTime(5000);
        await jest.runAllTimersAsync();
      });

      expect(mockApiInstance.request).toHaveBeenCalledTimes(2);

      // Advance again
      await act(async () => {
        jest.advanceTimersByTime(5000);
        await jest.runAllTimersAsync();
      });

      expect(mockApiInstance.request).toHaveBeenCalledTimes(3);
    });

    it('stops interval when disabled', async () => {
      mockApiInstance.request.mockResolvedValue({ data: {} });

      const { rerender } = renderHook(
        ({ enabled }) =>
          useApiQuery('test', '/api/test', {}, { refetchInterval: 5000, enabled }),
        { initialProps: { enabled: true } }
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(mockApiInstance.request).toHaveBeenCalledTimes(1);

      // Disable the query
      rerender({ enabled: false });

      // Advance time
      await act(async () => {
        jest.advanceTimersByTime(10000);
        await jest.runAllTimersAsync();
      });

      // Should not have made more requests
      expect(mockApiInstance.request).toHaveBeenCalledTimes(1);
    });
  });

  describe('Window Focus Refetch', () => {
    it('refetches on window focus when enabled (default)', async () => {
      mockApiInstance.request.mockResolvedValue({ data: {} });

      renderHook(() =>
        useApiQuery('test', '/api/test', {}, { staleTime: 0 })
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(mockApiInstance.request).toHaveBeenCalledTimes(1);

      // Simulate window focus
      await act(async () => {
        window.dispatchEvent(new Event('focus'));
        await jest.runAllTimersAsync();
      });

      expect(mockApiInstance.request).toHaveBeenCalledTimes(2);
    });

    it('does not refetch on focus when refetchOnWindowFocus is false', async () => {
      mockApiInstance.request.mockResolvedValue({ data: {} });

      renderHook(() =>
        useApiQuery('test', '/api/test', {}, { refetchOnWindowFocus: false })
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(mockApiInstance.request).toHaveBeenCalledTimes(1);

      // Simulate window focus
      await act(async () => {
        window.dispatchEvent(new Event('focus'));
        await jest.runAllTimersAsync();
      });

      // Should still be 1 call
      expect(mockApiInstance.request).toHaveBeenCalledTimes(1);
    });
  });

  describe('isStale', () => {
    it('returns isStale status', async () => {
      mockApiInstance.request.mockResolvedValue({ data: {} });

      const { result } = renderHook(() =>
        useApiQuery('test', '/api/test', {}, { staleTime: 1000 })
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      // Data should not be stale immediately after fetch
      expect(result.current.isStale).toBe(false);

      // Advance past stale time
      await act(async () => {
        jest.advanceTimersByTime(1500);
      });

      expect(result.current.isStale).toBe(true);
    });
  });

  describe('Caching', () => {
    it('uses cache by default', async () => {
      const mockData = { cached: true };
      mockApiInstance.request.mockResolvedValueOnce({ data: mockData });

      const { result, rerender } = renderHook(() =>
        useApiQuery('cached-test', '/api/test')
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(result.current.data).toEqual(mockData);

      // Clear mock and rerender
      mockApiInstance.request.mockClear();
      rerender();

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      // Should not make another request due to caching
      expect(mockApiInstance.request).not.toHaveBeenCalled();
    });
  });

  describe('Config Passthrough', () => {
    it('passes axios config to request', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: {} });

      const config = {
        method: 'GET' as const,
        params: { page: 1, limit: 10 },
        headers: { Authorization: 'Bearer token' },
      };

      renderHook(() => useApiQuery('test', '/api/items', config));

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(mockApiInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/items',
          params: { page: 1, limit: 10 },
          headers: { Authorization: 'Bearer token' },
        })
      );
    });
  });
});
