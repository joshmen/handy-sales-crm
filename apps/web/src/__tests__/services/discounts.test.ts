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
  handleApiError: jest.fn((error: unknown) => {
    if (error instanceof Error) {
      return { message: error.message, status: 500, errors: [] };
    }
    return { message: 'An unexpected error occurred', status: 0, errors: [] };
  }),
}));

// Import the mocked module and cast to typed mock
import { api } from '@/lib/api';
const mockApi = api as {
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
  patch: jest.Mock;
  delete: jest.Mock;
};

import {
  discountService,
  DiscountDto,
  CreateDiscountRequest,
} from '@/services/api/discounts';

const mockApiResponse = <T>(data: T) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {},
});

describe('DiscountService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Use dynamic dates to ensure tests pass regardless of current date
  const pastDate = new Date();
  pastDate.setFullYear(pastDate.getFullYear() - 1);
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);

  const mockDiscount: DiscountDto = {
    id: 1,
    nombre: 'Descuento por Volumen',
    descripcion: 'Descuento por cantidad',
    tipoDescuento: 'Global',
    productoId: undefined,
    productoNombre: undefined,
    cantidadMinima: 5,
    cantidadMaxima: 10,
    porcentajeDescuento: 10,
    activo: true,
    fechaInicio: pastDate.toISOString().split('T')[0],
    fechaFin: futureDate.toISOString().split('T')[0],
    creadoEn: '2025-01-01T10:00:00Z',
  };

  describe('getDiscounts', () => {
    it('should fetch all discounts', async () => {
      const mockDiscounts: DiscountDto[] = [mockDiscount];

      mockApi.get.mockResolvedValueOnce(mockApiResponse(mockDiscounts));

      const result = await discountService.getDiscounts();

      expect(mockApi.get).toHaveBeenCalledWith('/descuentos');
      expect(result).toHaveLength(1);
      expect(result[0].porcentajeDescuento).toBe(10);
    });
  });

  describe('getDiscountById', () => {
    it('should fetch discount by id', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse(mockDiscount));

      const result = await discountService.getDiscountById(1);

      expect(mockApi.get).toHaveBeenCalledWith('/descuentos/1');
      expect(result.id).toBe(1);
    });
  });

  describe('getDiscountsByProduct', () => {
    it('should fetch discounts by product id', async () => {
      const productDiscount: DiscountDto = {
        ...mockDiscount,
        tipoDescuento: 'PorProducto',
        productoId: 10,
        productoNombre: 'Producto Test',
      };
      const mockDiscounts: DiscountDto[] = [
        productDiscount,
        { ...productDiscount, id: 2, cantidadMinima: 11, cantidadMaxima: 20, porcentajeDescuento: 15 },
      ];

      mockApi.get.mockResolvedValueOnce(mockApiResponse(mockDiscounts));

      const result = await discountService.getDiscountsByProduct(10);

      // Actual endpoint uses /por-producto/
      expect(mockApi.get).toHaveBeenCalledWith('/descuentos/por-producto/10');
      expect(result).toHaveLength(2);
    });
  });

  describe('createDiscount', () => {
    it('should create a new discount', async () => {
      const newDiscount: CreateDiscountRequest = {
        nombre: 'Nuevo Descuento',
        descripcion: 'Descuento de prueba',
        tipoDescuento: 'Global',
        cantidadMinima: 5,
        cantidadMaxima: 10,
        porcentajeDescuento: 10,
        activo: true,
        fechaInicio: '2025-01-01',
        fechaFin: '2025-12-31',
      };

      mockApi.post.mockResolvedValueOnce(mockApiResponse({ id: 1 }));

      const result = await discountService.createDiscount(newDiscount);

      expect(mockApi.post).toHaveBeenCalledWith('/descuentos', newDiscount);
      expect(result.id).toBe(1);
    });
  });

  describe('updateDiscount', () => {
    it('should update an existing discount', async () => {
      const updateData = {
        porcentajeDescuento: 15,
        activo: false,
      };

      mockApi.put.mockResolvedValueOnce(mockApiResponse(undefined));

      await discountService.updateDiscount(1, updateData);

      expect(mockApi.put).toHaveBeenCalledWith('/descuentos/1', updateData);
    });
  });

  describe('deleteDiscount', () => {
    it('should delete a discount', async () => {
      mockApi.delete.mockResolvedValueOnce(mockApiResponse(undefined));

      await discountService.deleteDiscount(1);

      expect(mockApi.delete).toHaveBeenCalledWith('/descuentos/1');
    });
  });

  describe('helper methods', () => {
    describe('getActiveDiscounts', () => {
      it('should filter active discounts', () => {
        const discounts: DiscountDto[] = [
          { ...mockDiscount, id: 1, activo: true },
          { ...mockDiscount, id: 2, activo: false },
          { ...mockDiscount, id: 3, activo: true },
        ];

        const result = discountService.getActiveDiscounts(discounts);

        expect(result).toHaveLength(2);
        expect(result.every(d => d.activo)).toBe(true);
      });

      it('should filter by date range', () => {
        const expiredDate = new Date();
        expiredDate.setFullYear(expiredDate.getFullYear() - 2);
        const farFutureDate = new Date();
        farFutureDate.setFullYear(farFutureDate.getFullYear() + 2);

        const discounts: DiscountDto[] = [
          { ...mockDiscount, id: 1, fechaInicio: expiredDate.toISOString().split('T')[0], fechaFin: farFutureDate.toISOString().split('T')[0] },
          { ...mockDiscount, id: 2, fechaFin: expiredDate.toISOString().split('T')[0] }, // Expired
        ];

        const result = discountService.getActiveDiscounts(discounts);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(1);
      });
    });

    describe('getGlobalDiscounts', () => {
      it('should filter global discounts', () => {
        const discounts: DiscountDto[] = [
          { ...mockDiscount, id: 1, tipoDescuento: 'Global' },
          { ...mockDiscount, id: 2, tipoDescuento: 'PorProducto', productoId: 10 },
        ];

        const result = discountService.getGlobalDiscounts(discounts);

        expect(result).toHaveLength(1);
        expect(result[0].tipoDescuento).toBe('Global');
      });
    });

    describe('getProductDiscounts', () => {
      it('should filter product discounts', () => {
        const discounts: DiscountDto[] = [
          { ...mockDiscount, id: 1, tipoDescuento: 'Global' },
          { ...mockDiscount, id: 2, tipoDescuento: 'PorProducto', productoId: 10 },
        ];

        const result = discountService.getProductDiscounts(discounts);

        expect(result).toHaveLength(1);
        expect(result[0].tipoDescuento).toBe('PorProducto');
      });
    });

    describe('calculateDiscount', () => {
      it('should return null when no discounts match quantity', () => {
        const discounts: DiscountDto[] = [
          { ...mockDiscount, tipoDescuento: 'Global', cantidadMinima: 10, cantidadMaxima: 20 },
        ];

        const result = discountService.calculateDiscount(discounts, 5);

        expect(result).toBeNull();
      });

      it('should return matching global discount for quantity', () => {
        const discounts: DiscountDto[] = [
          { ...mockDiscount, id: 1, tipoDescuento: 'Global', cantidadMinima: 1, cantidadMaxima: 5, porcentajeDescuento: 5 },
          { ...mockDiscount, id: 2, tipoDescuento: 'Global', cantidadMinima: 6, cantidadMaxima: 10, porcentajeDescuento: 10 },
          { ...mockDiscount, id: 3, tipoDescuento: 'Global', cantidadMinima: 11, cantidadMaxima: 20, porcentajeDescuento: 15 },
        ];

        const result = discountService.calculateDiscount(discounts, 7);

        expect(result).not.toBeNull();
        expect(result?.porcentajeDescuento).toBe(10);
      });

      it('should prioritize product discount when productoId provided', () => {
        const discounts: DiscountDto[] = [
          { ...mockDiscount, id: 1, tipoDescuento: 'Global', cantidadMinima: 5, cantidadMaxima: 10, porcentajeDescuento: 5 },
          { ...mockDiscount, id: 2, tipoDescuento: 'PorProducto', productoId: 20, cantidadMinima: 5, cantidadMaxima: 10, porcentajeDescuento: 15 },
        ];

        const result = discountService.calculateDiscount(discounts, 7, 20);

        expect(result).not.toBeNull();
        expect(result?.productoId).toBe(20);
        expect(result?.porcentajeDescuento).toBe(15);
      });

      it('should fall back to global discount if product discount not found', () => {
        const discounts: DiscountDto[] = [
          { ...mockDiscount, id: 1, tipoDescuento: 'Global', cantidadMinima: 5, cantidadMaxima: 10, porcentajeDescuento: 5 },
          { ...mockDiscount, id: 2, tipoDescuento: 'PorProducto', productoId: 99, cantidadMinima: 5, cantidadMaxima: 10, porcentajeDescuento: 15 },
        ];

        const result = discountService.calculateDiscount(discounts, 7, 20);

        expect(result).not.toBeNull();
        expect(result?.tipoDescuento).toBe('Global');
        expect(result?.porcentajeDescuento).toBe(5);
      });

      it('should only consider active discounts', () => {
        const discounts: DiscountDto[] = [
          { ...mockDiscount, id: 1, tipoDescuento: 'Global', activo: false, cantidadMinima: 5, cantidadMaxima: 10, porcentajeDescuento: 20 },
          { ...mockDiscount, id: 2, tipoDescuento: 'Global', activo: true, cantidadMinima: 5, cantidadMaxima: 10, porcentajeDescuento: 10 },
        ];

        const result = discountService.calculateDiscount(discounts, 7);

        expect(result).not.toBeNull();
        expect(result?.porcentajeDescuento).toBe(10);
      });

      it('should handle undefined cantidadMaxima (no upper limit)', () => {
        const discounts: DiscountDto[] = [
          { ...mockDiscount, id: 1, tipoDescuento: 'Global', cantidadMinima: 5, cantidadMaxima: undefined, porcentajeDescuento: 10 },
        ];

        const result = discountService.calculateDiscount(discounts, 100);

        expect(result).not.toBeNull();
        expect(result?.porcentajeDescuento).toBe(10);
      });
    });
  });
});
