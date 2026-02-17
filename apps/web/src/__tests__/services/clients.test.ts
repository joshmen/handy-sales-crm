/// <reference path="../jest.d.ts" />

// Mock must be defined inline to avoid hoisting issues
jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  handleApiResponse: jest.fn((response: { data: unknown }) => response.data),
  handleApiError: jest.fn((error: unknown) => {
    if (error instanceof Error) {
      throw { message: error.message, status: 500, errors: [] };
    }
    throw { message: 'An unexpected error occurred', status: 0, errors: [] };
  }),
}));

import { api, handleApiResponse, handleApiError } from '@/lib/api';
import {
  clientService,
  ClientsListParams,
  ClientsListResponse,
  CreateClientRequest,
  UpdateClientRequest,
} from '@/services/api/clients';
import { Client } from '@/types';

const mockApi = api as {
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
  patch: jest.Mock;
  delete: jest.Mock;
};

const mockHandleApiResponse = handleApiResponse as jest.Mock;
const mockHandleApiError = handleApiError as jest.Mock;

// Helper to create mock API responses
const mockApiResponse = <T>(data: T) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {},
});

// Mock data
const mockClient: Client = {
  id: 'client-1',
  name: 'Cliente Test',
  email: 'cliente@test.com',
  phone: '555-1234',
  address: 'Calle Test 123',
  zone: 'Norte',
  type: 'mayorista',
  isActive: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-15'),
};

const mockClientsListResponse: ClientsListResponse = {
  clients: [mockClient],
  total: 1,
  page: 1,
  limit: 10,
  totalPages: 1,
};

describe('ClientService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleApiResponse.mockImplementation((response: { data: unknown }) => response.data);
  });

  describe('getClients', () => {
    it('should fetch clients with default params', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse(mockClientsListResponse));

      const result = await clientService.getClients();

      expect(mockApi.get).toHaveBeenCalledWith('/clients?');
      expect(result.clients).toHaveLength(1);
      expect(result.clients[0].name).toBe('Cliente Test');
    });

    it('should fetch clients with search params', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse(mockClientsListResponse));

      const params: ClientsListParams = {
        page: 2,
        limit: 20,
        search: 'test',
        type: 'mayorista',
        zone: 'Norte',
        isActive: true,
        sortBy: 'name',
        sortOrder: 'asc',
      };

      await clientService.getClients(params);

      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('page=2'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('limit=20'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('search=test'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('type=mayorista'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('zone=Norte'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('isActive=true'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('sortBy=name'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('sortOrder=asc'));
    });

    it('should handle errors when fetching clients', async () => {
      const error = new Error('Network error');
      mockApi.get.mockRejectedValueOnce(error);
      mockHandleApiError.mockImplementationOnce(() => {
        throw { message: 'Network error', status: 500 };
      });

      await expect(clientService.getClients()).rejects.toEqual({
        message: 'Network error',
        status: 500,
      });
    });
  });

  describe('getClientById', () => {
    it('should fetch a client by ID', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse(mockClient));

      const result = await clientService.getClientById('client-1');

      expect(mockApi.get).toHaveBeenCalledWith('/clients/client-1');
      expect(result.name).toBe('Cliente Test');
      expect(result.id).toBe('client-1');
    });

    it('should handle not found error', async () => {
      const error = new Error('Client not found');
      mockApi.get.mockRejectedValueOnce(error);
      mockHandleApiError.mockImplementationOnce(() => {
        throw { message: 'Client not found', status: 404 };
      });

      await expect(clientService.getClientById('invalid-id')).rejects.toEqual({
        message: 'Client not found',
        status: 404,
      });
    });
  });

  describe('createClient', () => {
    it('should create a new client', async () => {
      const newClientData: CreateClientRequest = {
        name: 'Nuevo Cliente',
        email: 'nuevo@test.com',
        phone: '555-5678',
        address: 'Nueva Calle 456',
        zone: 'Sur',
        type: 'minorista',
        isActive: true,
      };

      const createdClient = { ...mockClient, ...newClientData, id: 'client-2' };
      mockApi.post.mockResolvedValueOnce(mockApiResponse(createdClient));

      const result = await clientService.createClient(newClientData);

      expect(mockApi.post).toHaveBeenCalledWith('/clients', newClientData);
      expect(result.name).toBe('Nuevo Cliente');
      expect(result.type).toBe('minorista');
    });

    it('should handle validation errors', async () => {
      const invalidData: CreateClientRequest = {
        name: '',
        address: '',
        zone: '',
        type: 'mayorista',
      };

      mockApi.post.mockRejectedValueOnce(new Error('Validation failed'));
      mockHandleApiError.mockImplementationOnce(() => {
        throw { message: 'Validation failed', status: 400, errors: ['Name is required'] };
      });

      await expect(clientService.createClient(invalidData)).rejects.toEqual({
        message: 'Validation failed',
        status: 400,
        errors: ['Name is required'],
      });
    });
  });

  describe('updateClient', () => {
    it('should update an existing client', async () => {
      const updateData: UpdateClientRequest = {
        id: 'client-1',
        name: 'Cliente Actualizado',
        phone: '555-9999',
      };

      const updatedClient = { ...mockClient, ...updateData };
      mockApi.put.mockResolvedValueOnce(mockApiResponse(updatedClient));

      const result = await clientService.updateClient(updateData);

      expect(mockApi.put).toHaveBeenCalledWith('/clients/client-1', {
        name: 'Cliente Actualizado',
        phone: '555-9999',
      });
      expect(result.name).toBe('Cliente Actualizado');
    });

    it('should handle update errors', async () => {
      const updateData: UpdateClientRequest = { id: 'invalid-id', name: 'Test' };
      mockApi.put.mockRejectedValueOnce(new Error('Not found'));
      mockHandleApiError.mockImplementationOnce(() => {
        throw { message: 'Not found', status: 404 };
      });

      await expect(clientService.updateClient(updateData)).rejects.toEqual({
        message: 'Not found',
        status: 404,
      });
    });
  });

  describe('deleteClient', () => {
    it('should delete a client', async () => {
      mockApi.delete.mockResolvedValueOnce(
        mockApiResponse({ message: 'Client deleted successfully' })
      );

      const result = await clientService.deleteClient('client-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/clients/client-1');
      expect(result.message).toBe('Client deleted successfully');
    });

    it('should handle delete errors', async () => {
      mockApi.delete.mockRejectedValueOnce(new Error('Cannot delete'));
      mockHandleApiError.mockImplementationOnce(() => {
        throw { message: 'Cannot delete client with orders', status: 409 };
      });

      await expect(clientService.deleteClient('client-1')).rejects.toEqual({
        message: 'Cannot delete client with orders',
        status: 409,
      });
    });
  });

  describe('toggleClientStatus', () => {
    it('should toggle client active status', async () => {
      const toggledClient = { ...mockClient, isActive: false };
      mockApi.patch.mockResolvedValueOnce(mockApiResponse(toggledClient));

      const result = await clientService.toggleClientStatus('client-1');

      expect(mockApi.patch).toHaveBeenCalledWith('/clients/client-1/toggle-status');
      expect(result.isActive).toBe(false);
    });
  });

  describe('getClientsByZone', () => {
    it('should fetch clients by zone', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse([mockClient]));

      const result = await clientService.getClientsByZone('Norte');

      expect(mockApi.get).toHaveBeenCalledWith('/clients/by-zone/Norte');
      expect(result).toHaveLength(1);
      expect(result[0].zone).toBe('Norte');
    });
  });

  describe('getClientsByType', () => {
    it('should fetch clients by type', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse([mockClient]));

      const result = await clientService.getClientsByType('mayorista');

      expect(mockApi.get).toHaveBeenCalledWith('/clients/by-type/mayorista');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('mayorista');
    });
  });

  describe('searchClients', () => {
    it('should search clients by query', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse([mockClient]));

      const result = await clientService.searchClients('Test');

      expect(mockApi.get).toHaveBeenCalledWith('/clients/search?q=Test');
      expect(result).toHaveLength(1);
    });

    it('should encode special characters in search query', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse([]));

      await clientService.searchClients('Cliente & Co');

      expect(mockApi.get).toHaveBeenCalledWith('/clients/search?q=Cliente%20%26%20Co');
    });
  });

  describe('exportClients', () => {
    it('should export clients as CSV', async () => {
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });
      mockApi.get.mockResolvedValueOnce({ data: mockBlob });

      const result = await clientService.exportClients('csv');

      expect(mockApi.get).toHaveBeenCalledWith('/clients/export', {
        params: { format: 'csv' },
        responseType: 'blob',
      });
      expect(result).toBeInstanceOf(Blob);
    });

    it('should export clients as Excel', async () => {
      const mockBlob = new Blob(['excel,data'], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      mockApi.get.mockResolvedValueOnce({ data: mockBlob });

      const result = await clientService.exportClients('excel');

      expect(mockApi.get).toHaveBeenCalledWith('/clients/export', {
        params: { format: 'excel' },
        responseType: 'blob',
      });
      expect(result).toBeInstanceOf(Blob);
    });
  });

  describe('importClients', () => {
    it('should import clients from file', async () => {
      const mockFile = new File(['test'], 'clients.csv', { type: 'text/csv' });
      const importResponse = {
        message: 'Import successful',
        imported: 10,
        errors: [],
      };
      mockApi.post.mockResolvedValueOnce(mockApiResponse(importResponse));

      const result = await clientService.importClients(mockFile);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/clients/import',
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      expect(result.imported).toBe(10);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid import', async () => {
      const mockFile = new File(['invalid'], 'clients.csv', { type: 'text/csv' });
      const importResponse = {
        message: 'Import completed with errors',
        imported: 5,
        errors: ['Row 3: Invalid email format', 'Row 7: Missing required field'],
      };
      mockApi.post.mockResolvedValueOnce(mockApiResponse(importResponse));

      const result = await clientService.importClients(mockFile);

      expect(result.imported).toBe(5);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('Row 3');
    });
  });
});
