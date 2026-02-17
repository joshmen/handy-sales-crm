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

import { deliveryService, DeliveryItem } from '@/services/api/deliveries';

const mockApiResponse = <T>(data: T) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {},
});

describe('DeliveryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockDelivery: DeliveryItem = {
    pedidoId: 1,
    numeroPedido: 'PED-001',
    clienteId: 1,
    clienteNombre: 'Cliente Test',
    clienteDireccion: 'Calle Falsa 123',
    clienteLatitud: 19.4326,
    clienteLongitud: -99.1332,
    vendedorId: 1,
    vendedorNombre: 'Vendedor Test',
    estado: 'EnRuta',
    total: 1160,
    fechaPedido: '2025-01-30',
    fechaEntregaEstimada: '2025-01-31',
    rutaId: 1,
    rutaNombre: 'Ruta Norte',
    ordenEnRuta: 1,
  };

  describe('getDeliveries', () => {
    it('should fetch deliveries with default status filter', async () => {
      mockApi.get.mockResolvedValueOnce(
        mockApiResponse({ items: [mockDelivery] })
      );

      const result = await deliveryService.getDeliveries();

      // URLSearchParams encodes commas as %2C
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('estado=EnRuta%2CListoParaEnvio%2CEnProceso')
      );
      expect(result).toHaveLength(1);
    });

    it('should fetch deliveries with custom filters', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse({ items: [] }));

      await deliveryService.getDeliveries({
        usuarioId: 1,
        zonaId: 5,
        estado: 'Entregado',
      });

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('usuarioId=1')
      );
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('zonaId=5')
      );
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('estado=Entregado')
      );
    });
  });

  describe('getTodayDeliveries', () => {
    it('should fetch deliveries for today', async () => {
      mockApi.get.mockResolvedValueOnce(
        mockApiResponse({ items: [mockDelivery] })
      );

      const result = await deliveryService.getTodayDeliveries();

      const today = new Date().toISOString().split('T')[0];
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining(`fechaInicio=${today}`)
      );
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining(`fechaFin=${today}`)
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('getDeliveriesByRoute', () => {
    it('should fetch deliveries for a specific route', async () => {
      mockApi.get.mockResolvedValueOnce(
        mockApiResponse({ detalles: [mockDelivery] })
      );

      const result = await deliveryService.getDeliveriesByRoute(1);

      expect(mockApi.get).toHaveBeenCalledWith('/rutas/1');
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no details', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse({}));

      const result = await deliveryService.getDeliveriesByRoute(1);

      expect(result).toEqual([]);
    });
  });

  describe('getDeliveriesByUser', () => {
    it('should fetch deliveries for a specific user', async () => {
      mockApi.get.mockResolvedValueOnce(
        mockApiResponse({ items: [mockDelivery] })
      );

      await deliveryService.getDeliveriesByUser(1);

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('usuarioId=1')
      );
    });
  });

  describe('getDeliveriesByClient', () => {
    it('should fetch deliveries for a specific client', async () => {
      mockApi.get.mockResolvedValueOnce(
        mockApiResponse({ items: [mockDelivery] })
      );

      await deliveryService.getDeliveriesByClient(5);

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('clienteId=5')
      );
    });
  });

  describe('markAsDelivered', () => {
    it('should mark order as delivered', async () => {
      mockApi.post.mockResolvedValueOnce(
        mockApiResponse({ mensaje: 'Pedido entregado' })
      );

      const result = await deliveryService.markAsDelivered(1, 'Sin problemas');

      expect(mockApi.post).toHaveBeenCalledWith('/pedidos/1/entregar', {
        notas: 'Sin problemas',
      });
      expect(result.mensaje).toBe('Pedido entregado');
    });

    it('should mark as delivered without notes', async () => {
      mockApi.post.mockResolvedValueOnce(
        mockApiResponse({ mensaje: 'Pedido entregado' })
      );

      await deliveryService.markAsDelivered(1);

      expect(mockApi.post).toHaveBeenCalledWith('/pedidos/1/entregar', {
        notas: undefined,
      });
    });
  });

  describe('markAsFailed', () => {
    it('should mark delivery as failed', async () => {
      mockApi.post.mockResolvedValueOnce(
        mockApiResponse({ mensaje: 'Entrega cancelada' })
      );

      const result = await deliveryService.markAsFailed(1, 'Cliente no disponible');

      expect(mockApi.post).toHaveBeenCalledWith('/pedidos/1/cancelar', {
        notas: 'Cliente no disponible',
      });
      expect(result.mensaje).toBe('Entrega cancelada');
    });
  });

  describe('getDeliveryStats', () => {
    it('should calculate delivery stats correctly', async () => {
      const deliveries: DeliveryItem[] = [
        { ...mockDelivery, estado: 'Confirmado' },
        { ...mockDelivery, estado: 'EnProceso' },
        { ...mockDelivery, estado: 'EnRuta' },
        { ...mockDelivery, estado: 'EnRuta' },
        { ...mockDelivery, estado: 'Entregado' },
        { ...mockDelivery, estado: 'Entregado' },
        { ...mockDelivery, estado: 'Entregado' },
        { ...mockDelivery, estado: 'Cancelado' },
      ];

      mockApi.get.mockResolvedValueOnce(mockApiResponse({ items: deliveries }));

      const stats = await deliveryService.getDeliveryStats();

      expect(stats.totalPendientes).toBe(2);
      expect(stats.totalEnRuta).toBe(2);
      expect(stats.totalEntregados).toBe(3);
      expect(stats.totalFallidos).toBe(1);
      expect(stats.porcentajeEntrega).toBe(37.5);
    });

    it('should return zero stats for empty deliveries', async () => {
      mockApi.get.mockResolvedValueOnce(mockApiResponse({ items: [] }));

      const stats = await deliveryService.getDeliveryStats();

      expect(stats.totalPendientes).toBe(0);
      expect(stats.totalEnRuta).toBe(0);
      expect(stats.totalEntregados).toBe(0);
      expect(stats.totalFallidos).toBe(0);
      expect(stats.porcentajeEntrega).toBe(0);
    });
  });

  describe('helper methods', () => {
    const deliveries: DeliveryItem[] = [
      { ...mockDelivery, estado: 'Confirmado' },
      { ...mockDelivery, estado: 'EnProceso' },
      { ...mockDelivery, estado: 'ListoParaEnvio' },
      { ...mockDelivery, estado: 'EnRuta' },
      { ...mockDelivery, estado: 'Entregado' },
    ];

    describe('filterByStatus', () => {
      it('should filter deliveries by status', () => {
        const result = deliveryService.filterByStatus(deliveries, 'EnRuta');

        expect(result).toHaveLength(1);
        expect(result[0].estado).toBe('EnRuta');
      });
    });

    describe('getPendingDeliveries', () => {
      it('should return pending deliveries', () => {
        const result = deliveryService.getPendingDeliveries(deliveries);

        expect(result).toHaveLength(3);
        expect(result.map(d => d.estado)).toEqual(
          expect.arrayContaining(['Confirmado', 'EnProceso', 'ListoParaEnvio'])
        );
      });
    });

    describe('getInTransitDeliveries', () => {
      it('should return in-transit deliveries', () => {
        const result = deliveryService.getInTransitDeliveries(deliveries);

        expect(result).toHaveLength(1);
        expect(result[0].estado).toBe('EnRuta');
      });
    });

    describe('getCompletedDeliveries', () => {
      it('should return completed deliveries', () => {
        const result = deliveryService.getCompletedDeliveries(deliveries);

        expect(result).toHaveLength(1);
        expect(result[0].estado).toBe('Entregado');
      });
    });

    describe('sortByPriority', () => {
      it('should sort by estimated delivery date', () => {
        const unsorted: DeliveryItem[] = [
          { ...mockDelivery, pedidoId: 1, fechaEntregaEstimada: '2025-02-01' },
          { ...mockDelivery, pedidoId: 2, fechaEntregaEstimada: '2025-01-15' },
          { ...mockDelivery, pedidoId: 3, fechaEntregaEstimada: '2025-01-20' },
        ];

        const sorted = deliveryService.sortByPriority(unsorted);

        expect(sorted[0].pedidoId).toBe(2);
        expect(sorted[1].pedidoId).toBe(3);
        expect(sorted[2].pedidoId).toBe(1);
      });

      it('should prioritize deliveries with estimated date', () => {
        const unsorted: DeliveryItem[] = [
          { ...mockDelivery, pedidoId: 1, fechaEntregaEstimada: undefined },
          { ...mockDelivery, pedidoId: 2, fechaEntregaEstimada: '2025-01-20' },
        ];

        const sorted = deliveryService.sortByPriority(unsorted);

        expect(sorted[0].pedidoId).toBe(2);
        expect(sorted[1].pedidoId).toBe(1);
      });

      it('should sort by order date when no estimated dates', () => {
        const unsorted: DeliveryItem[] = [
          { ...mockDelivery, pedidoId: 1, fechaEntregaEstimada: undefined, fechaPedido: '2025-01-30' },
          { ...mockDelivery, pedidoId: 2, fechaEntregaEstimada: undefined, fechaPedido: '2025-01-25' },
        ];

        const sorted = deliveryService.sortByPriority(unsorted);

        expect(sorted[0].pedidoId).toBe(2);
        expect(sorted[1].pedidoId).toBe(1);
      });
    });
  });
});
