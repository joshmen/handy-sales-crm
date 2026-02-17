/// <reference path="../jest.d.ts" />

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { promotionsApi } from '@/services/api/promotions';
import { Promotion, PromotionType, PromotionStatus, PromotionFilters } from '@/types/promotions';

// Mock data
const mockPromotion: Promotion = {
  id: 'promo-1',
  name: 'Promoción Verano 2025',
  description: 'Descuento especial de verano',
  type: PromotionType.PERCENTAGE,
  value: 20,
  status: PromotionStatus.ACTIVE,
  startDate: new Date('2025-06-01'),
  endDate: new Date('2025-08-31'),
  minQuantity: 5,
  maxQuantity: 100,
  productIds: ['prod-1', 'prod-2'],
  categoryIds: ['cat-1'],
  zoneIds: ['zone-1', 'zone-2'],
  isStackable: false,
  priority: 1,
  usageCount: 150,
  totalSavings: 5000,
  createdBy: 'user-1',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-15'),
};

describe('PromotionsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all promotions without filters', async () => {
      const mockResponse = {
        items: [mockPromotion],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await promotionsApi.getAll();

      expect(mockFetch).toHaveBeenCalledWith('/api/promotions');
      expect(result.items).toHaveLength(1);
    });

    it('should fetch promotions with filters', async () => {
      const filters: PromotionFilters = {
        search: 'verano',
        type: PromotionType.PERCENTAGE,
        status: PromotionStatus.ACTIVE,
        page: 2,
        limit: 20,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [], total: 0 }),
      });

      await promotionsApi.getAll(filters);

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('search=verano');
      expect(calledUrl).toContain('type=PERCENTAGE');
      expect(calledUrl).toContain('status=ACTIVE');
      expect(calledUrl).toContain('page=2');
    });

    it('should throw error when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(promotionsApi.getAll()).rejects.toThrow('Error fetching promotions');
    });
  });

  describe('getById', () => {
    it('should fetch a promotion by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockPromotion }),
      });

      const result = await promotionsApi.getById('promo-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/promotions/promo-1');
      expect(result.data.name).toBe('Promoción Verano 2025');
    });

    it('should throw error when promotion not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(promotionsApi.getById('invalid-id')).rejects.toThrow('Error fetching promotion');
    });
  });

  describe('create', () => {
    it('should create a new promotion', async () => {
      const createData = {
        name: 'Nueva Promoción',
        description: 'Descripción',
        type: PromotionType.PERCENTAGE,
        value: 15,
        startDate: new Date('2025-03-01'),
        endDate: new Date('2025-03-31'),
        productIds: ['prod-1'],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { ...mockPromotion, ...createData } }),
      });

      const result = await promotionsApi.create(createData);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/promotions',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createData),
        })
      );
      expect(result.data.name).toBe('Nueva Promoción');
    });

    it('should throw error when creation fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      await expect(promotionsApi.create({ name: '' } as never)).rejects.toThrow(
        'Error creating promotion'
      );
    });
  });

  describe('update', () => {
    it('should update an existing promotion', async () => {
      const updateData = {
        name: 'Promoción Actualizada',
        value: 25,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { ...mockPromotion, ...updateData } }),
      });

      const result = await promotionsApi.update('promo-1', updateData);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/promotions/promo-1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData),
        })
      );
      expect(result.data.name).toBe('Promoción Actualizada');
    });
  });

  describe('delete', () => {
    it('should delete a promotion', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await promotionsApi.delete('promo-1');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/promotions/promo-1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should throw error when delete fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(promotionsApi.delete('invalid-id')).rejects.toThrow('Error deleting promotion');
    });
  });

  describe('toggleStatus', () => {
    it('should toggle promotion status', async () => {
      const toggledPromotion = { ...mockPromotion, status: PromotionStatus.PAUSED };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: toggledPromotion }),
      });

      const result = await promotionsApi.toggleStatus('promo-1');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/promotions/promo-1/toggle-status',
        expect.objectContaining({ method: 'PATCH' })
      );
      expect(result.data.status).toBe(PromotionStatus.PAUSED);
    });
  });

  describe('duplicate', () => {
    it('should duplicate a promotion', async () => {
      const duplicatedPromotion = { ...mockPromotion, id: 'promo-2', name: 'Promoción Verano 2025 (copia)' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: duplicatedPromotion }),
      });

      const result = await promotionsApi.duplicate('promo-1');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/promotions/promo-1/duplicate',
        expect.objectContaining({ method: 'POST' })
      );
      expect(result.data.id).toBe('promo-2');
    });
  });

  describe('validate', () => {
    it('should validate a promotion', async () => {
      const validationResult = {
        isValid: true,
        errors: [],
        warnings: ['La promoción expira pronto'],
        canApply: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: validationResult }),
      });

      const result = await promotionsApi.validate('promo-1', { quantity: 10 });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/promotions/promo-1/validate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ quantity: 10 }),
        })
      );
      expect(result.data.isValid).toBe(true);
    });

    it('should validate without extra data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { isValid: true } }),
      });

      await promotionsApi.validate('promo-1');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/promotions/promo-1/validate',
        expect.objectContaining({
          body: JSON.stringify({}),
        })
      );
    });
  });

  describe('getStats', () => {
    it('should fetch promotion stats without date range', async () => {
      const stats = {
        totalPromotions: 10,
        activePromotions: 5,
        totalSavings: 15000,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: stats }),
      });

      const result = await promotionsApi.getStats();

      expect(mockFetch).toHaveBeenCalledWith('/api/promotions/stats');
      expect(result.data.totalPromotions).toBe(10);
    });

    it('should fetch promotion stats with date range', async () => {
      const dateRange = {
        from: new Date('2025-01-01'),
        to: new Date('2025-01-31'),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      });

      await promotionsApi.getStats(dateRange);

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('from=');
      expect(calledUrl).toContain('to=');
    });
  });

  describe('getReport', () => {
    it('should fetch promotion report', async () => {
      const dateRange = {
        from: new Date('2025-01-01'),
        to: new Date('2025-01-31'),
      };

      const report = {
        period: dateRange,
        totalOrders: 100,
        ordersWithPromotion: 45,
        totalSavings: 8000,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: report }),
      });

      const result = await promotionsApi.getReport(dateRange);

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/promotions/report?'));
      expect(result.data.totalOrders).toBe(100);
    });
  });

  describe('import', () => {
    it('should import promotions from file', async () => {
      const mockFile = new File(['test'], 'promotions.csv', { type: 'text/csv' });
      const importResult = {
        total: 10,
        successful: 8,
        failed: 2,
        errors: [{ row: 3, error: 'Invalid date' }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: importResult }),
      });

      const result = await promotionsApi.import(mockFile);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/promotions/import',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      );
      expect(result.data.successful).toBe(8);
    });
  });

  describe('export', () => {
    it('should export promotions', async () => {
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const result = await promotionsApi.export();

      expect(mockFetch).toHaveBeenCalledWith('/api/promotions/export');
      expect(result).toBeInstanceOf(Blob);
    });

    it('should export promotions with filters', async () => {
      const filters: PromotionFilters = {
        status: PromotionStatus.ACTIVE,
      };

      const mockBlob = new Blob(['csv,data']);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      await promotionsApi.export(filters);

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('status=ACTIVE');
    });
  });

  describe('searchProducts', () => {
    it('should search products', async () => {
      const products = [
        { id: 'prod-1', name: 'Producto 1', code: 'P001' },
        { id: 'prod-2', name: 'Producto 2', code: 'P002' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: products }),
      });

      const result = await promotionsApi.searchProducts('producto');

      expect(mockFetch).toHaveBeenCalledWith('/api/products/search?search=producto');
      expect(result.data).toHaveLength(2);
    });
  });

  describe('getAvailableZones', () => {
    it('should fetch available zones', async () => {
      const zones = ['Norte', 'Sur', 'Centro'];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: zones }),
      });

      const result = await promotionsApi.getAvailableZones();

      expect(mockFetch).toHaveBeenCalledWith('/api/zones');
      expect(result.data).toHaveLength(3);
    });
  });

  describe('getAvailableCategories', () => {
    it('should fetch available categories', async () => {
      const categories = ['Electrónicos', 'Ropa', 'Alimentos'];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: categories }),
      });

      const result = await promotionsApi.getAvailableCategories();

      expect(mockFetch).toHaveBeenCalledWith('/api/categories');
      expect(result.data).toContain('Electrónicos');
    });
  });
});
