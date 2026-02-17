/// <reference path="../jest.d.ts" />

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { inventoryApi } from '@/services/api/inventory';
import { InventoryItem, InventoryAdjustment, InventoryAdjustmentForm, InventoryFilters } from '@/types/inventory';

// Mock data
const mockInventoryItem: InventoryItem = {
  id: 'inv-1',
  productId: 'prod-1',
  productName: 'Producto Test',
  productCode: 'PROD-001',
  category: 'Electrónicos',
  currentStock: 50,
  minimumStock: 10,
  maximumStock: 100,
  reorderPoint: 20,
  unitCost: 50,
  totalValue: 2500,
  lastUpdated: new Date('2025-01-15'),
  status: 'normal',
};

const mockInventoryAdjustment: InventoryAdjustment = {
  id: 'adj-1',
  productId: 'prod-1',
  productName: 'Producto Test',
  type: 'entrada',
  quantity: 20,
  previousStock: 30,
  newStock: 50,
  reason: 'Nuevo inventario',
  notes: 'Recepción de mercancía',
  createdBy: 'user-1',
  createdByName: 'Usuario Test',
  createdAt: new Date('2025-01-15'),
};

describe('InventoryApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getInventoryItems', () => {
    it('should fetch inventory items without filters', async () => {
      const mockResponse = {
        success: true,
        data: [mockInventoryItem],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await inventoryApi.getInventoryItems();

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/inventory?'));
      expect(result.data).toHaveLength(1);
      expect(result.data[0].productName).toBe('Producto Test');
    });

    it('should fetch inventory items with filters', async () => {
      const filters: InventoryFilters = {
        search: 'test',
        category: 'Electrónicos',
        status: 'low',
        page: 2,
        limit: 20,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      });

      await inventoryApi.getInventoryItems(filters);

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('search=test');
      expect(calledUrl).toContain('category=Electr');
      expect(calledUrl).toContain('status=low');
      expect(calledUrl).toContain('page=2');
      expect(calledUrl).toContain('limit=20');
    });

    it('should ignore empty filter values', async () => {
      const filters: InventoryFilters = {
        search: '',
        category: undefined,
        status: null as unknown as string,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      });

      await inventoryApi.getInventoryItems(filters);

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).not.toContain('search=');
      expect(calledUrl).not.toContain('category=');
      expect(calledUrl).not.toContain('status=');
    });

    it('should throw error when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(inventoryApi.getInventoryItems()).rejects.toThrow(
        'Failed to fetch inventory items'
      );
    });
  });

  describe('getInventoryByProductId', () => {
    it('should fetch inventory for a specific product', async () => {
      const mockResponse = {
        success: true,
        data: mockInventoryItem,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await inventoryApi.getInventoryByProductId('prod-1');

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/inventory/product/prod-1'));
      expect(result.data.productId).toBe('prod-1');
    });

    it('should throw error when product not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(inventoryApi.getInventoryByProductId('invalid-id')).rejects.toThrow(
        'Failed to fetch inventory item'
      );
    });
  });

  describe('createAdjustment', () => {
    it('should create an inventory adjustment', async () => {
      const adjustmentForm: InventoryAdjustmentForm = {
        productId: 'prod-1',
        type: 'entrada',
        quantity: 20,
        reason: 'Nuevo inventario',
        notes: 'Recepción de mercancía',
      };

      const mockResponse = {
        success: true,
        data: mockInventoryAdjustment,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await inventoryApi.createAdjustment(adjustmentForm);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/inventory/adjustments'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(adjustmentForm),
        })
      );
      expect(result.data.quantity).toBe(20);
      expect(result.data.type).toBe('entrada');
    });

    it('should create a stock decrease adjustment', async () => {
      const adjustmentForm: InventoryAdjustmentForm = {
        productId: 'prod-1',
        type: 'salida',
        quantity: 10,
        reason: 'Venta',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { ...mockInventoryAdjustment, type: 'salida', quantity: 10 },
          }),
      });

      const result = await inventoryApi.createAdjustment(adjustmentForm);

      expect(result.data.type).toBe('salida');
      expect(result.data.quantity).toBe(10);
    });

    it('should throw error when adjustment creation fails', async () => {
      const adjustmentForm: InventoryAdjustmentForm = {
        productId: 'prod-1',
        type: 'salida',
        quantity: 1000, // More than available stock
        reason: 'Test',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      await expect(inventoryApi.createAdjustment(adjustmentForm)).rejects.toThrow(
        'Failed to create inventory adjustment'
      );
    });
  });

  describe('getAdjustmentHistory', () => {
    it('should fetch all adjustment history', async () => {
      const mockResponse = {
        success: true,
        data: [mockInventoryAdjustment],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await inventoryApi.getAdjustmentHistory();

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/inventory/adjustments'));
      expect(mockFetch).toHaveBeenCalledWith(expect.not.stringContaining('productId='));
      expect(result.data).toHaveLength(1);
    });

    it('should fetch adjustment history for specific product', async () => {
      const mockResponse = {
        success: true,
        data: [mockInventoryAdjustment],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await inventoryApi.getAdjustmentHistory('prod-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/inventory/adjustments?productId=prod-1')
      );
      expect(result.data).toHaveLength(1);
    });

    it('should throw error when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(inventoryApi.getAdjustmentHistory()).rejects.toThrow(
        'Failed to fetch adjustment history'
      );
    });
  });

  describe('exportInventory', () => {
    it('should export inventory without filters', async () => {
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const result = await inventoryApi.exportInventory();

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/inventory/export?'));
      expect(result).toBeInstanceOf(Blob);
    });

    it('should export inventory with filters', async () => {
      const filters: InventoryFilters = {
        category: 'Electrónicos',
        status: 'low',
      };

      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const result = await inventoryApi.exportInventory(filters);

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('category=Electr');
      expect(calledUrl).toContain('status=low');
      expect(result).toBeInstanceOf(Blob);
    });

    it('should throw error when export fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(inventoryApi.exportInventory()).rejects.toThrow(
        'Failed to export inventory'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty inventory response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      });

      const result = await inventoryApi.getInventoryItems();

      expect(result.data).toHaveLength(0);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(inventoryApi.getInventoryItems()).rejects.toThrow('Network error');
    });

    it('should handle malformed response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(inventoryApi.getInventoryItems()).rejects.toThrow('Invalid JSON');
    });
  });
});
