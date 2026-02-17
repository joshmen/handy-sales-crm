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
  priceListService,
  productPriceService,
  PriceListDto,
  ProductPriceDto,
  CreatePriceListRequest,
  CreateProductPriceRequest,
} from '@/services/api/priceLists';

const mockApiResponse = <T>(data: T) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {},
});

describe('PriceListService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockPriceList: PriceListDto = {
    id: 1,
    nombre: 'Lista Mayoreo',
    descripcion: 'Precios para mayoristas',
    activo: true,
    esDefault: false,
    cantidadProductos: 10,
    creadoEn: '2025-01-01T10:00:00Z',
  };

  describe('getPriceLists', () => {
    it('should fetch all price lists', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse([mockPriceList]));

      const result = await priceListService.getPriceLists();

      expect(mockApi.get).toHaveBeenCalledWith('/listas-precios');
      expect(result).toHaveLength(1);
      expect(result[0].nombre).toBe('Lista Mayoreo');
    });
  });

  describe('getPriceListById', () => {
    it('should fetch price list by id', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse(mockPriceList));

      const result = await priceListService.getPriceListById(1);

      expect(mockApi.get).toHaveBeenCalledWith('/listas-precios/1');
      expect(result.id).toBe(1);
    });
  });

  describe('createPriceList', () => {
    it('should create a new price list', async () => {
      const newPriceList: CreatePriceListRequest = {
        nombre: 'Lista Nueva',
        descripcion: 'Nueva lista de precios',
        activo: true,
        esDefault: false,
      };

      mockApi.post.mockResolvedValueOnce(mockApiResponse({ id: 2 }));

      const result = await priceListService.createPriceList(newPriceList);

      expect(mockApi.post).toHaveBeenCalledWith('/listas-precios', newPriceList);
      expect(result.id).toBe(2);
    });
  });

  describe('updatePriceList', () => {
    it('should update a price list', async () => {
      mockApi.put.mockResolvedValueOnce(mockApiResponse(undefined));

      await priceListService.updatePriceList(1, { nombre: 'Lista Actualizada' });

      expect(mockApi.put).toHaveBeenCalledWith('/listas-precios/1', {
        nombre: 'Lista Actualizada',
      });
    });
  });

  describe('deletePriceList', () => {
    it('should delete a price list', async () => {
      mockApi.delete.mockResolvedValueOnce(mockApiResponse(undefined));

      await priceListService.deletePriceList(1);

      expect(mockApi.delete).toHaveBeenCalledWith('/listas-precios/1');
    });
  });

  describe('helper methods', () => {
    describe('getActivePriceLists', () => {
      it('should filter active price lists', () => {
        const priceLists: PriceListDto[] = [
          { ...mockPriceList, id: 1, activo: true },
          { ...mockPriceList, id: 2, activo: false },
          { ...mockPriceList, id: 3, activo: true },
        ];

        const result = priceListService.getActivePriceLists(priceLists);

        expect(result).toHaveLength(2);
        expect(result.every(l => l.activo)).toBe(true);
      });
    });

    describe('getDefaultPriceList', () => {
      it('should return the default price list', () => {
        const priceLists: PriceListDto[] = [
          { ...mockPriceList, id: 1, esDefault: false },
          { ...mockPriceList, id: 2, esDefault: true },
          { ...mockPriceList, id: 3, esDefault: false },
        ];

        const result = priceListService.getDefaultPriceList(priceLists);

        expect(result).not.toBeUndefined();
        expect(result?.id).toBe(2);
        expect(result?.esDefault).toBe(true);
      });

      it('should return undefined when no default price list exists', () => {
        const priceLists: PriceListDto[] = [
          { ...mockPriceList, id: 1, esDefault: false },
          { ...mockPriceList, id: 2, esDefault: false },
        ];

        const result = priceListService.getDefaultPriceList(priceLists);

        expect(result).toBeUndefined();
      });
    });
  });
});

describe('ProductPriceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockProductPrice: ProductPriceDto = {
    id: 1,
    listaPrecioId: 1,
    listaPrecioNombre: 'Lista Mayoreo',
    productoId: 10,
    productoNombre: 'Producto Test',
    productoCodigo: 'PROD-001',
    precio: 150.0,
    activo: true,
    creadoEn: '2025-01-01T10:00:00Z',
  };

  describe('getProductPrices', () => {
    it('should fetch all product prices', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse([mockProductPrice]));

      const result = await productPriceService.getProductPrices();

      expect(mockApi.get).toHaveBeenCalledWith('/precios');
      expect(result).toHaveLength(1);
    });
  });

  describe('getProductPriceById', () => {
    it('should fetch product price by id', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse(mockProductPrice));

      const result = await productPriceService.getProductPriceById(1);

      expect(mockApi.get).toHaveBeenCalledWith('/precios/1');
      expect(result.precio).toBe(150.0);
    });
  });

  describe('getProductPricesByList', () => {
    it('should fetch product prices by price list id', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse([mockProductPrice]));

      const result = await productPriceService.getProductPricesByList(1);

      // Actual endpoint uses /por-lista/
      expect(mockApi.get).toHaveBeenCalledWith('/precios/por-lista/1');
      expect(result[0].listaPrecioId).toBe(1);
    });
  });

  describe('createProductPrice', () => {
    it('should create a new product price', async () => {
      const newPrice: CreateProductPriceRequest = {
        listaPrecioId: 1,
        productoId: 20,
        precio: 200.0,
        activo: true,
      };

      mockApi.post.mockResolvedValueOnce(mockApiResponse({ id: 5 }));

      const result = await productPriceService.createProductPrice(newPrice);

      expect(mockApi.post).toHaveBeenCalledWith('/precios', newPrice);
      expect(result.id).toBe(5);
    });
  });

  describe('updateProductPrice', () => {
    it('should update a product price', async () => {
      mockApi.put.mockResolvedValueOnce(mockApiResponse(undefined));

      await productPriceService.updateProductPrice(1, { precio: 175.0 });

      expect(mockApi.put).toHaveBeenCalledWith('/precios/1', { precio: 175.0 });
    });
  });

  describe('deleteProductPrice', () => {
    it('should delete a product price', async () => {
      mockApi.delete.mockResolvedValueOnce(mockApiResponse(undefined));

      await productPriceService.deleteProductPrice(1);

      expect(mockApi.delete).toHaveBeenCalledWith('/precios/1');
    });
  });

  describe('helper methods', () => {
    describe('getPriceForProduct', () => {
      it('should return price object for matching product in list', () => {
        const prices: ProductPriceDto[] = [
          { ...mockProductPrice, productoId: 10, precio: 100 },
          { ...mockProductPrice, productoId: 20, precio: 200 },
        ];

        const result = productPriceService.getPriceForProduct(prices, 20);

        expect(result).not.toBeUndefined();
        expect(result?.precio).toBe(200);
        expect(result?.productoId).toBe(20);
      });

      it('should return undefined when product not found', () => {
        const prices: ProductPriceDto[] = [
          { ...mockProductPrice, productoId: 10, precio: 100 },
        ];

        const result = productPriceService.getPriceForProduct(prices, 99);

        expect(result).toBeUndefined();
      });

      it('should only consider active prices', () => {
        const prices: ProductPriceDto[] = [
          { ...mockProductPrice, productoId: 10, precio: 100, activo: false },
          { ...mockProductPrice, productoId: 10, precio: 150, activo: true },
        ];

        const result = productPriceService.getPriceForProduct(prices, 10);

        expect(result).not.toBeUndefined();
        expect(result?.precio).toBe(150);
        expect(result?.activo).toBe(true);
      });

      it('should filter by listaPrecioId when provided', () => {
        const prices: ProductPriceDto[] = [
          { ...mockProductPrice, productoId: 10, listaPrecioId: 1, precio: 100 },
          { ...mockProductPrice, productoId: 10, listaPrecioId: 2, precio: 150 },
        ];

        const result = productPriceService.getPriceForProduct(prices, 10, 2);

        expect(result).not.toBeUndefined();
        expect(result?.precio).toBe(150);
        expect(result?.listaPrecioId).toBe(2);
      });
    });
  });
});
