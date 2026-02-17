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
  productService,
  ProductsListParams,
  ProductsListResponse,
  CreateProductRequest,
  UpdateProductRequest,
  StockUpdateRequest,
  ProductStatsResponse,
} from '@/services/api/products';
import { Product } from '@/types';

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
const mockProduct: Product = {
  id: 'prod-1',
  name: 'Producto Test',
  code: 'PROD-001',
  description: 'Descripción del producto',
  price: 100,
  stock: 50,
  category: 'Electrónicos',
  family: 'Accesorios',
  isActive: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-15'),
};

const mockProductsListResponse: ProductsListResponse = {
  products: [mockProduct],
  total: 1,
  page: 1,
  limit: 10,
  totalPages: 1,
};

const mockProductStats: ProductStatsResponse = {
  totalProducts: 100,
  activeProducts: 85,
  lowStockProducts: 10,
  outOfStockProducts: 5,
  totalValue: 50000,
  categoriesCount: 8,
  familiesCount: 12,
};

describe('ProductService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleApiResponse.mockImplementation((response: { data: unknown }) => response.data);
  });

  describe('getProducts', () => {
    it('should fetch products with default params', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse(mockProductsListResponse));

      const result = await productService.getProducts();

      expect(mockApi.get).toHaveBeenCalledWith('/products?');
      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe('Producto Test');
    });

    it('should fetch products with all filter params', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse(mockProductsListResponse));

      const params: ProductsListParams = {
        page: 2,
        limit: 20,
        search: 'test',
        category: 'Electrónicos',
        family: 'Accesorios',
        isActive: true,
        minPrice: 50,
        maxPrice: 200,
        inStock: true,
        sortBy: 'price',
        sortOrder: 'desc',
      };

      await productService.getProducts(params);

      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('page=2'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('limit=20'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('search=test'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('minPrice=50'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('maxPrice=200'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('inStock=true'));
    });

    it('should handle errors when fetching products', async () => {
      const error = new Error('Network error');
      mockApi.get.mockRejectedValueOnce(error);
      mockHandleApiError.mockImplementationOnce(() => {
        throw { message: 'Network error', status: 500 };
      });

      await expect(productService.getProducts()).rejects.toEqual({
        message: 'Network error',
        status: 500,
      });
    });
  });

  describe('getProductById', () => {
    it('should fetch a product by ID', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse(mockProduct));

      const result = await productService.getProductById('prod-1');

      expect(mockApi.get).toHaveBeenCalledWith('/products/prod-1');
      expect(result.name).toBe('Producto Test');
      expect(result.code).toBe('PROD-001');
    });

    it('should handle not found error', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Product not found'));
      mockHandleApiError.mockImplementationOnce(() => {
        throw { message: 'Product not found', status: 404 };
      });

      await expect(productService.getProductById('invalid-id')).rejects.toEqual({
        message: 'Product not found',
        status: 404,
      });
    });
  });

  describe('getProductByCode', () => {
    it('should fetch a product by code', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse(mockProduct));

      const result = await productService.getProductByCode('PROD-001');

      expect(mockApi.get).toHaveBeenCalledWith('/products/code/PROD-001');
      expect(result.code).toBe('PROD-001');
    });
  });

  describe('createProduct', () => {
    it('should create a new product', async () => {
      const newProductData: CreateProductRequest = {
        name: 'Nuevo Producto',
        code: 'PROD-002',
        description: 'Descripción nueva',
        price: 150,
        stock: 25,
        category: 'Electrónicos',
        family: 'Cables',
        isActive: true,
      };

      const createdProduct = { ...mockProduct, ...newProductData, id: 'prod-2' };
      mockApi.post.mockResolvedValueOnce(mockApiResponse(createdProduct));

      const result = await productService.createProduct(newProductData);

      expect(mockApi.post).toHaveBeenCalledWith('/products', newProductData);
      expect(result.name).toBe('Nuevo Producto');
      expect(result.price).toBe(150);
    });

    it('should handle validation errors', async () => {
      const invalidData: CreateProductRequest = {
        name: '',
        code: '',
        price: -10,
        stock: 0,
        category: '',
        family: '',
      };

      mockApi.post.mockRejectedValueOnce(new Error('Validation failed'));
      mockHandleApiError.mockImplementationOnce(() => {
        throw { message: 'Validation failed', status: 400, errors: ['Name is required', 'Price must be positive'] };
      });

      await expect(productService.createProduct(invalidData)).rejects.toEqual({
        message: 'Validation failed',
        status: 400,
        errors: ['Name is required', 'Price must be positive'],
      });
    });
  });

  describe('updateProduct', () => {
    it('should update an existing product', async () => {
      const updateData: UpdateProductRequest = {
        id: 'prod-1',
        name: 'Producto Actualizado',
        price: 120,
      };

      const updatedProduct = { ...mockProduct, ...updateData };
      mockApi.put.mockResolvedValueOnce(mockApiResponse(updatedProduct));

      const result = await productService.updateProduct(updateData);

      expect(mockApi.put).toHaveBeenCalledWith('/products/prod-1', {
        name: 'Producto Actualizado',
        price: 120,
      });
      expect(result.name).toBe('Producto Actualizado');
      expect(result.price).toBe(120);
    });
  });

  describe('deleteProduct', () => {
    it('should delete a product', async () => {
      mockApi.delete.mockResolvedValueOnce(
        mockApiResponse({ message: 'Product deleted successfully' })
      );

      const result = await productService.deleteProduct('prod-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/products/prod-1');
      expect(result.message).toBe('Product deleted successfully');
    });
  });

  describe('toggleProductStatus', () => {
    it('should toggle product active status', async () => {
      const toggledProduct = { ...mockProduct, isActive: false };
      mockApi.patch.mockResolvedValueOnce(mockApiResponse(toggledProduct));

      const result = await productService.toggleProductStatus('prod-1');

      expect(mockApi.patch).toHaveBeenCalledWith('/products/prod-1/toggle-status');
      expect(result.isActive).toBe(false);
    });
  });

  describe('updateStock', () => {
    it('should add stock to a product', async () => {
      const stockData: StockUpdateRequest = {
        productId: 'prod-1',
        quantity: 20,
        operation: 'add',
        reason: 'Nuevo inventario',
      };

      const updatedProduct = { ...mockProduct, stock: 70 };
      mockApi.patch.mockResolvedValueOnce(mockApiResponse(updatedProduct));

      const result = await productService.updateStock(stockData);

      expect(mockApi.patch).toHaveBeenCalledWith('/products/prod-1/stock', stockData);
      expect(result.stock).toBe(70);
    });

    it('should subtract stock from a product', async () => {
      const stockData: StockUpdateRequest = {
        productId: 'prod-1',
        quantity: 10,
        operation: 'subtract',
        reason: 'Venta',
      };

      const updatedProduct = { ...mockProduct, stock: 40 };
      mockApi.patch.mockResolvedValueOnce(mockApiResponse(updatedProduct));

      const result = await productService.updateStock(stockData);

      expect(result.stock).toBe(40);
    });

    it('should set stock to specific value', async () => {
      const stockData: StockUpdateRequest = {
        productId: 'prod-1',
        quantity: 100,
        operation: 'set',
        reason: 'Inventario físico',
      };

      const updatedProduct = { ...mockProduct, stock: 100 };
      mockApi.patch.mockResolvedValueOnce(mockApiResponse(updatedProduct));

      const result = await productService.updateStock(stockData);

      expect(result.stock).toBe(100);
    });
  });

  describe('getProductsByCategory', () => {
    it('should fetch products by category', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse([mockProduct]));

      const result = await productService.getProductsByCategory('Electrónicos');

      expect(mockApi.get).toHaveBeenCalledWith('/products/by-category/Electrónicos');
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('Electrónicos');
    });
  });

  describe('getProductsByFamily', () => {
    it('should fetch products by family', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse([mockProduct]));

      const result = await productService.getProductsByFamily('Accesorios');

      expect(mockApi.get).toHaveBeenCalledWith('/products/by-family/Accesorios');
      expect(result).toHaveLength(1);
      expect(result[0].family).toBe('Accesorios');
    });
  });

  describe('getLowStockProducts', () => {
    it('should fetch low stock products with default threshold', async () => {
      const lowStockProduct = { ...mockProduct, stock: 5 };
      mockApi.get.mockResolvedValueOnce(mockApiResponse([lowStockProduct]));

      const result = await productService.getLowStockProducts();

      expect(mockApi.get).toHaveBeenCalledWith('/products/low-stock?threshold=10');
      expect(result).toHaveLength(1);
    });

    it('should fetch low stock products with custom threshold', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse([]));

      await productService.getLowStockProducts(20);

      expect(mockApi.get).toHaveBeenCalledWith('/products/low-stock?threshold=20');
    });
  });

  describe('getOutOfStockProducts', () => {
    it('should fetch out of stock products', async () => {
      const outOfStockProduct = { ...mockProduct, stock: 0 };
      mockApi.get.mockResolvedValueOnce(mockApiResponse([outOfStockProduct]));

      const result = await productService.getOutOfStockProducts();

      expect(mockApi.get).toHaveBeenCalledWith('/products/out-of-stock');
      expect(result).toHaveLength(1);
      expect(result[0].stock).toBe(0);
    });
  });

  describe('getProductStats', () => {
    it('should fetch product statistics', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse(mockProductStats));

      const result = await productService.getProductStats();

      expect(mockApi.get).toHaveBeenCalledWith('/products/stats');
      expect(result.totalProducts).toBe(100);
      expect(result.activeProducts).toBe(85);
      expect(result.lowStockProducts).toBe(10);
      expect(result.outOfStockProducts).toBe(5);
      expect(result.totalValue).toBe(50000);
    });
  });

  describe('getCategories', () => {
    it('should fetch all categories', async () => {
      const categories = ['Electrónicos', 'Ropa', 'Alimentos'];
      mockApi.get.mockResolvedValueOnce(mockApiResponse(categories));

      const result = await productService.getCategories();

      expect(mockApi.get).toHaveBeenCalledWith('/products/categories');
      expect(result).toHaveLength(3);
      expect(result).toContain('Electrónicos');
    });
  });

  describe('getFamilies', () => {
    it('should fetch all families', async () => {
      const families = ['Accesorios', 'Cables', 'Baterías'];
      mockApi.get.mockResolvedValueOnce(mockApiResponse(families));

      const result = await productService.getFamilies();

      expect(mockApi.get).toHaveBeenCalledWith('/products/families');
      expect(result).toHaveLength(3);
      expect(result).toContain('Cables');
    });
  });

  describe('searchProducts', () => {
    it('should search products by query', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse([mockProduct]));

      const result = await productService.searchProducts('Test');

      expect(mockApi.get).toHaveBeenCalledWith('/products/search?q=Test');
      expect(result).toHaveLength(1);
    });

    it('should encode special characters in search query', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse([]));

      await productService.searchProducts('Cable USB-C');

      expect(mockApi.get).toHaveBeenCalledWith('/products/search?q=Cable%20USB-C');
    });
  });

  describe('exportProducts', () => {
    it('should export products as CSV', async () => {
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });
      mockApi.get.mockResolvedValueOnce({ data: mockBlob });

      const result = await productService.exportProducts('csv');

      expect(mockApi.get).toHaveBeenCalledWith('/products/export?format=csv', {
        responseType: 'blob',
      });
      expect(result).toBeInstanceOf(Blob);
    });

    it('should export products as Excel', async () => {
      const mockBlob = new Blob(['excel,data']);
      mockApi.get.mockResolvedValueOnce({ data: mockBlob });

      const result = await productService.exportProducts('excel');

      expect(mockApi.get).toHaveBeenCalledWith('/products/export?format=excel', {
        responseType: 'blob',
      });
      expect(result).toBeInstanceOf(Blob);
    });
  });

  describe('importProducts', () => {
    it('should import products from file', async () => {
      const mockFile = new File(['test'], 'products.csv', { type: 'text/csv' });
      const importResponse = {
        message: 'Import successful',
        imported: 15,
        errors: [],
      };
      mockApi.post.mockResolvedValueOnce(mockApiResponse(importResponse));

      const result = await productService.importProducts(mockFile);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/products/import',
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      expect(result.imported).toBe(15);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid import', async () => {
      const mockFile = new File(['invalid'], 'products.csv', { type: 'text/csv' });
      const importResponse = {
        message: 'Import completed with errors',
        imported: 8,
        errors: ['Row 2: Invalid price format', 'Row 5: Duplicate code'],
      };
      mockApi.post.mockResolvedValueOnce(mockApiResponse(importResponse));

      const result = await productService.importProducts(mockFile);

      expect(result.imported).toBe(8);
      expect(result.errors).toHaveLength(2);
    });
  });
});
