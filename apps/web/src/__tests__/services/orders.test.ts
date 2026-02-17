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

import { orderService, OrderListItem, OrderDetail, CreateOrderDto } from '@/services/api/orders';
import { OrderStatus } from '@/types';

const mockApiResponse = <T>(data: T) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {},
});

describe('OrderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrders', () => {
    it('should fetch orders with default params', async () => {
      const mockOrders: OrderListItem[] = [
        {
          id: 1,
          numeroPedido: 'PED-001',
          clienteId: 1,
          clienteNombre: 'Cliente Test',
          usuarioId: 1,
          usuarioNombre: 'Vendedor Test',
          estado: OrderStatus.PENDIENTE,
          subtotal: 100,
          descuento: 0,
          impuestos: 16,
          total: 116,
          fechaPedido: '2025-01-30',
          totalProductos: 2,
          creadoEn: '2025-01-30T10:00:00Z',
        },
      ];

      mockApi.get.mockResolvedValueOnce(
        mockApiResponse({
          items: mockOrders,
          totalCount: 1,
          page: 1,
          pageSize: 20,
        })
      );

      const result = await orderService.getOrders();

      expect(mockApi.get).toHaveBeenCalledWith('/pedidos?');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].numeroPedido).toBe('PED-001');
    });

    it('should fetch orders with filters', async () => {
      mockApi.get.mockResolvedValueOnce(
        mockApiResponse({ items: [], totalCount: 0, page: 1, pageSize: 20 })
      );

      await orderService.getOrders({
        clienteId: 1,
        estado: 'Confirmado',
        page: 2,
        pageSize: 10,
      });

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('clienteId=1')
      );
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('estado=Confirmado')
      );
    });
  });

  describe('getOrderById', () => {
    it('should fetch order by id', async () => {
      const mockOrder: OrderDetail = {
        id: 1,
        numeroPedido: 'PED-001',
        clienteId: 1,
        clienteNombre: 'Cliente Test',
        usuarioId: 1,
        usuarioNombre: 'Vendedor',
        estado: OrderStatus.PENDIENTE,
        subtotal: 100,
        descuento: 0,
        impuestos: 16,
        total: 116,
        fechaPedido: '2025-01-30',
        detalles: [],
        creadoEn: '2025-01-30T10:00:00Z',
      };

      mockApi.get.mockResolvedValueOnce(mockApiResponse(mockOrder));

      const result = await orderService.getOrderById(1);

      expect(mockApi.get).toHaveBeenCalledWith('/pedidos/1');
      expect(result.id).toBe(1);
    });
  });

  describe('getOrderByNumber', () => {
    it('should fetch order by number', async () => {
      mockApi.get.mockResolvedValueOnce(
        mockApiResponse({ id: 1, numeroPedido: 'PED-001' })
      );

      await orderService.getOrderByNumber('PED-001');

      expect(mockApi.get).toHaveBeenCalledWith('/pedidos/numero/PED-001');
    });
  });

  describe('createOrder', () => {
    it('should create a new order', async () => {
      const newOrder: CreateOrderDto = {
        clienteId: 1,
        detalles: [
          { productoId: 1, cantidad: 2 },
          { productoId: 2, cantidad: 1, precioUnitario: 50 },
        ],
      };

      mockApi.post.mockResolvedValueOnce(mockApiResponse({ id: 123 }));

      const result = await orderService.createOrder(newOrder);

      expect(mockApi.post).toHaveBeenCalledWith('/pedidos', newOrder);
      expect(result.id).toBe(123);
    });
  });

  describe('updateOrder', () => {
    it('should update an order', async () => {
      mockApi.put.mockResolvedValueOnce(mockApiResponse(undefined));

      await orderService.updateOrder(1, { notas: 'Nota actualizada' });

      expect(mockApi.put).toHaveBeenCalledWith('/pedidos/1', {
        notas: 'Nota actualizada',
      });
    });
  });

  describe('deleteOrder', () => {
    it('should delete an order', async () => {
      mockApi.delete.mockResolvedValueOnce(mockApiResponse(undefined));

      await orderService.deleteOrder(1);

      expect(mockApi.delete).toHaveBeenCalledWith('/pedidos/1');
    });
  });

  describe('workflow methods', () => {
    it('should send order', async () => {
      mockApi.post.mockResolvedValueOnce(
        mockApiResponse({ mensaje: 'Pedido enviado' })
      );

      const result = await orderService.sendOrder(1);

      expect(mockApi.post).toHaveBeenCalledWith('/pedidos/1/enviar');
      expect(result.mensaje).toBe('Pedido enviado');
    });

    it('should confirm order', async () => {
      mockApi.post.mockResolvedValueOnce(
        mockApiResponse({ mensaje: 'Pedido confirmado' })
      );

      const result = await orderService.confirmOrder(1);

      expect(mockApi.post).toHaveBeenCalledWith('/pedidos/1/confirmar');
      expect(result.mensaje).toBe('Pedido confirmado');
    });

    it('should process order', async () => {
      mockApi.post.mockResolvedValueOnce(
        mockApiResponse({ mensaje: 'Pedido en proceso' })
      );

      const result = await orderService.processOrder(1);

      expect(mockApi.post).toHaveBeenCalledWith('/pedidos/1/procesar');
      expect(result.mensaje).toBe('Pedido en proceso');
    });

    it('should send order to route', async () => {
      mockApi.post.mockResolvedValueOnce(
        mockApiResponse({ mensaje: 'Pedido en ruta' })
      );

      const result = await orderService.sendToRoute(1);

      expect(mockApi.post).toHaveBeenCalledWith('/pedidos/1/en-ruta');
      expect(result.mensaje).toBe('Pedido en ruta');
    });

    it('should deliver order with notes', async () => {
      mockApi.post.mockResolvedValueOnce(
        mockApiResponse({ mensaje: 'Pedido entregado' })
      );

      const result = await orderService.deliverOrder(1, 'Entregado sin problemas');

      expect(mockApi.post).toHaveBeenCalledWith('/pedidos/1/entregar', {
        notas: 'Entregado sin problemas',
      });
      expect(result.mensaje).toBe('Pedido entregado');
    });

    it('should cancel order', async () => {
      mockApi.post.mockResolvedValueOnce(
        mockApiResponse({ mensaje: 'Pedido cancelado' })
      );

      const result = await orderService.cancelOrder(1, 'Cliente canceló');

      expect(mockApi.post).toHaveBeenCalledWith('/pedidos/1/cancelar', {
        notas: 'Cliente canceló',
      });
      expect(result.mensaje).toBe('Pedido cancelado');
    });
  });

  describe('order details management', () => {
    it('should add order detail', async () => {
      mockApi.post.mockResolvedValueOnce(
        mockApiResponse({ mensaje: 'Detalle agregado' })
      );

      const result = await orderService.addOrderDetail(1, {
        productoId: 5,
        cantidad: 3,
      });

      expect(mockApi.post).toHaveBeenCalledWith('/pedidos/1/detalles', {
        productoId: 5,
        cantidad: 3,
      });
      expect(result.mensaje).toBe('Detalle agregado');
    });

    it('should update order detail', async () => {
      mockApi.put.mockResolvedValueOnce(mockApiResponse(undefined));

      await orderService.updateOrderDetail(1, 10, {
        productoId: 5,
        cantidad: 5,
      });

      expect(mockApi.put).toHaveBeenCalledWith('/pedidos/1/detalles/10', {
        productoId: 5,
        cantidad: 5,
      });
    });

    it('should delete order detail', async () => {
      mockApi.delete.mockResolvedValueOnce(mockApiResponse(undefined));

      await orderService.deleteOrderDetail(1, 10);

      expect(mockApi.delete).toHaveBeenCalledWith('/pedidos/1/detalles/10');
    });
  });

  describe('filter methods', () => {
    it('should get orders by client', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse([]));

      await orderService.getOrdersByClient(5);

      expect(mockApi.get).toHaveBeenCalledWith('/pedidos/cliente/5');
    });

    it('should get my orders', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse([]));

      await orderService.getMyOrders();

      expect(mockApi.get).toHaveBeenCalledWith('/pedidos/mis-pedidos');
    });

    it('should get orders by user', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse([]));

      await orderService.getOrdersByUser(3);

      expect(mockApi.get).toHaveBeenCalledWith('/pedidos/usuario/3');
    });
  });

  // ============================================
  // ERROR HANDLING TESTS (Aligned with handleApiError)
  // ============================================
  describe('error handling', () => {
    it('should handle API error when fetching orders', async () => {
      const networkError = new Error('Network Error');
      mockApi.get.mockRejectedValueOnce(networkError);

      // The service catches errors and throws handleApiError result
      await expect(orderService.getOrders()).rejects.toMatchObject({
        message: 'Network Error',
        status: 500,
        errors: [],
      });
    });

    it('should handle error when order not found', async () => {
      const error = new Error('Pedido no encontrado');
      mockApi.get.mockRejectedValueOnce(error);

      await expect(orderService.getOrderById(999)).rejects.toMatchObject({
        message: 'Pedido no encontrado',
        status: 500,
      });
    });

    it('should handle error on create', async () => {
      const error = new Error('Error de validación');
      mockApi.post.mockRejectedValueOnce(error);

      await expect(orderService.createOrder({ clienteId: 0, detalles: [] }))
        .rejects.toMatchObject({
          message: 'Error de validación',
        });
    });

    it('should handle non-Error objects', async () => {
      // When error is not an Error instance
      mockApi.get.mockRejectedValueOnce({ code: 'UNKNOWN' });

      await expect(orderService.getMyOrders()).rejects.toMatchObject({
        message: 'An unexpected error occurred',
        status: 0,
      });
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================
  describe('edge cases', () => {
    it('should handle empty order list response', async () => {
      mockApi.get.mockResolvedValueOnce(
        mockApiResponse({ items: [], totalCount: 0, page: 1, pageSize: 20 })
      );

      const result = await orderService.getOrders();

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('should handle order with no details', async () => {
      const orderWithNoDetails: OrderDetail = {
        id: 1,
        numeroPedido: 'PED-001',
        clienteId: 1,
        clienteNombre: 'Cliente',
        usuarioId: 1,
        usuarioNombre: 'Vendedor',
        estado: OrderStatus.PENDIENTE,
        subtotal: 0,
        descuento: 0,
        impuestos: 0,
        total: 0,
        fechaPedido: '2025-01-30',
        detalles: [],
        creadoEn: '2025-01-30T10:00:00Z',
      };

      mockApi.get.mockResolvedValueOnce(mockApiResponse(orderWithNoDetails));

      const result = await orderService.getOrderById(1);

      expect(result.detalles).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle special characters in order number search', async () => {
      mockApi.get.mockResolvedValueOnce(
        mockApiResponse({ id: 1, numeroPedido: 'PED-2025/001-A' })
      );

      await orderService.getOrderByNumber('PED-2025/001-A');

      expect(mockApi.get).toHaveBeenCalledWith('/pedidos/numero/PED-2025/001-A');
    });

    it('should handle large pagination values', async () => {
      mockApi.get.mockResolvedValueOnce(
        mockApiResponse({ items: [], totalCount: 10000, page: 500, pageSize: 100 })
      );

      const result = await orderService.getOrders({ page: 500, pageSize: 100 });

      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('page=500'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('pageSize=100'));
    });

    it('should handle delivery with empty notes', async () => {
      mockApi.post.mockResolvedValueOnce(
        mockApiResponse({ mensaje: 'Pedido entregado' })
      );

      await orderService.deliverOrder(1);

      expect(mockApi.post).toHaveBeenCalledWith('/pedidos/1/entregar', {
        notas: undefined,
      });
    });

    it('should handle concurrent API calls', async () => {
      mockApi.get
        .mockResolvedValueOnce(mockApiResponse({ items: [{ id: 1 }], totalCount: 1 }))
        .mockResolvedValueOnce(mockApiResponse({ items: [{ id: 2 }], totalCount: 1 }))
        .mockResolvedValueOnce(mockApiResponse({ items: [{ id: 3 }], totalCount: 1 }));

      const [result1, result2, result3] = await Promise.all([
        orderService.getOrders({ clienteId: 1 }),
        orderService.getOrders({ clienteId: 2 }),
        orderService.getOrders({ clienteId: 3 }),
      ]);

      expect(result1.items[0].id).toBe(1);
      expect(result2.items[0].id).toBe(2);
      expect(result3.items[0].id).toBe(3);
    });
  });
});
