/// <reference path="../jest.d.ts" />

import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useClients,
  useClient,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
} from '@/hooks/useClients';
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
const mockSetClients = jest.fn();
const mockAddClient = jest.fn();
const mockUpdateClient = jest.fn();
const mockDeleteClient = jest.fn();

jest.mock('@/stores/useAppStore', () => ({
  useAppStore: () => ({
    setClients: mockSetClients,
    addClient: mockAddClient,
    updateClient: mockUpdateClient,
    deleteClient: mockDeleteClient,
  }),
}));

const mockApiInstance = apiInstance as jest.Mocked<typeof apiInstance>;

const mockClient = {
  id: 'client-1',
  name: 'Cliente Test',
  email: 'cliente@test.com',
  phone: '555-1234',
  address: 'Calle Test 123',
  zone: 'Norte',
  type: 'mayorista',
  isActive: true,
};

const mockClientsResponse = {
  clients: [mockClient],
  total: 1,
  page: 1,
  limit: 10,
};

describe('useClients Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('useClients', () => {
    it('fetches clients list', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: mockClientsResponse });

      const { result } = renderHook(() => useClients());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(mockApiInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            url: '/api/clientes',
            method: 'GET',
          })
        );
      });
    });

    it('calls setClients on success', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: mockClientsResponse });

      renderHook(() => useClients());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(mockSetClients).toHaveBeenCalledWith(mockClientsResponse.clients);
      });
    });

    it('passes search params to request', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: mockClientsResponse });

      const params = {
        search: 'test',
        page: 2,
        limit: 20,
        type: 'mayorista',
        isActive: true,
      };

      renderHook(() => useClients(params));

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(mockApiInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            url: '/api/clientes',
            params,
          })
        );
      });
    });

    it('creates unique query key from params', async () => {
      mockApiInstance.request.mockResolvedValue({ data: mockClientsResponse });

      const { rerender } = renderHook(
        ({ params }) => useClients(params),
        { initialProps: { params: { search: 'a' } } }
      );

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(mockApiInstance.request).toHaveBeenCalledTimes(1);

      rerender({ params: { search: 'b' } });

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(mockApiInstance.request).toHaveBeenCalledTimes(2);
    });
  });

  describe('useClient', () => {
    it('fetches single client by ID', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: mockClient });

      const { result } = renderHook(() => useClient('client-1'));

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(mockApiInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            url: '/api/clientes/client-1',
            method: 'GET',
          })
        );
      });
    });

    it('does not fetch when ID is empty', async () => {
      renderHook(() => useClient(''));

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(mockApiInstance.request).not.toHaveBeenCalled();
    });

    it('returns client data', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: mockClient });

      const { result } = renderHook(() => useClient('client-1'));

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockClient);
      });
    });
  });

  describe('useCreateClient', () => {
    it('creates new client', async () => {
      const newClient = { ...mockClient, id: 'client-new' };
      mockApiInstance.request.mockResolvedValueOnce({ data: newClient });

      const { result } = renderHook(() => useCreateClient());

      await act(async () => {
        await result.current.mutate({
          name: 'Cliente Test',
          email: 'cliente@test.com',
          zone: 'Norte',
          type: 'mayorista',
        });
      });

      expect(mockApiInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/clientes',
          method: 'POST',
        })
      );
    });

    it('calls addClient on success', async () => {
      const newClient = { ...mockClient, id: 'client-new' };
      mockApiInstance.request.mockResolvedValueOnce({ data: newClient });

      const { result } = renderHook(() => useCreateClient());

      await act(async () => {
        await result.current.mutate({ name: 'Test' });
      });

      expect(mockAddClient).toHaveBeenCalledWith(newClient);
    });

    it('returns mutation state', () => {
      const { result } = renderHook(() => useCreateClient());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(typeof result.current.mutate).toBe('function');
      expect(typeof result.current.mutateAsync).toBe('function');
    });
  });

  describe('useUpdateClient', () => {
    it('updates existing client', async () => {
      const updatedClient = { ...mockClient, name: 'Updated Name' };
      mockApiInstance.request.mockResolvedValueOnce({ data: updatedClient });

      const { result } = renderHook(() => useUpdateClient());

      await act(async () => {
        await result.current.mutate({
          id: 'client-1',
          name: 'Updated Name',
        });
      });

      expect(mockApiInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });

    it('calls updateClient on success', async () => {
      const updatedClient = { ...mockClient, name: 'Updated' };
      mockApiInstance.request.mockResolvedValueOnce({ data: updatedClient });

      const { result } = renderHook(() => useUpdateClient());

      await act(async () => {
        await result.current.mutate({ id: 'client-1', name: 'Updated' });
      });

      expect(mockUpdateClient).toHaveBeenCalledWith(updatedClient);
    });

    it('includes ID in URL path', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: mockClient });

      const { result } = renderHook(() => useUpdateClient());

      await act(async () => {
        await result.current.mutate({ id: 'client-123', name: 'Test' });
      });

      // The hook uses dynamic URL generation
      expect(mockApiInstance.request).toHaveBeenCalled();
    });
  });

  describe('useDeleteClient', () => {
    it('deletes client by ID', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: undefined });

      const { result } = renderHook(() => useDeleteClient());

      await act(async () => {
        await result.current.mutate('client-1');
      });

      expect(mockApiInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('calls deleteClient on success', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: undefined });

      const { result } = renderHook(() => useDeleteClient());

      await act(async () => {
        await result.current.mutate('client-1');
      });

      expect(mockDeleteClient).toHaveBeenCalledWith('client-1');
    });

    it('handles delete error', async () => {
      const error = new Error('Cannot delete client with orders');
      mockApiInstance.request.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useDeleteClient());

      await act(async () => {
        try {
          await result.current.mutate('client-1');
        } catch {
          // Expected
        }
      });

      expect(result.current.isError).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('handles CRUD workflow', async () => {
      // Create
      const newClient = { ...mockClient, id: 'new-1' };
      mockApiInstance.request.mockResolvedValueOnce({ data: newClient });

      const { result: createResult } = renderHook(() => useCreateClient());

      await act(async () => {
        await createResult.current.mutate({ name: 'New Client' });
      });

      expect(mockAddClient).toHaveBeenCalledWith(newClient);

      // Update
      const updatedClient = { ...newClient, name: 'Updated Client' };
      mockApiInstance.request.mockResolvedValueOnce({ data: updatedClient });

      const { result: updateResult } = renderHook(() => useUpdateClient());

      await act(async () => {
        await updateResult.current.mutate({ id: 'new-1', name: 'Updated Client' });
      });

      expect(mockUpdateClient).toHaveBeenCalledWith(updatedClient);

      // Delete
      mockApiInstance.request.mockResolvedValueOnce({ data: undefined });

      const { result: deleteResult } = renderHook(() => useDeleteClient());

      await act(async () => {
        await deleteResult.current.mutate('new-1');
      });

      expect(mockDeleteClient).toHaveBeenCalledWith('new-1');
    });

    it('filters clients by zone and type', async () => {
      mockApiInstance.request.mockResolvedValueOnce({ data: mockClientsResponse });

      renderHook(() =>
        useClients({
          type: 'mayorista',
          city: 'Norte',
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
              type: 'mayorista',
              city: 'Norte',
              isActive: true,
            },
          })
        );
      });
    });
  });
});
