import { useState, useCallback } from 'react';
import { clientService, productService, dashboardService } from '@/services/api';
import { useAppStore } from '@/stores/useAppStore';
import type { ApiError } from '@/lib/api';
import { ClientType } from '@/types';

/* ============================
   Tipos derivados de los services (0 any)
   ============================ */

// CLIENTES
type SrvListClientsParams = Parameters<typeof clientService.getClients>[0];
type SrvCreateClientRequest = Parameters<typeof clientService.createClient>[0];
type SrvUpdateClientRequest = Parameters<typeof clientService.updateClient>[0];

// PRODUCTOS
type SrvListProductsParams = Parameters<typeof productService.getProducts>[0];
type SrvCreateProductRequest = Parameters<typeof productService.createProduct>[0];
type SrvUpdateProductRequest = Parameters<typeof productService.updateProduct>[0];

// DASHBOARD
type SrvDashboardRange = Parameters<typeof dashboardService.getMetrics>[0];
type SrvDashboardChartsRange = Parameters<typeof dashboardService.getChartsData>[0];

/* ============================
   Tipos “app” (lo que usas en UI)
   ============================ */

type ListClientsParams = {
  search?: string;
  page?: number;
  limit?: number;
  type?: ClientType;
  city?: string;
  isActive?: boolean;
};

type CreateClientRequest = {
  name: string;
  address: string;
  zone: string;
  type: ClientType;
  email?: string;
  phone?: string;
  city?: string;
  zipCode?: string;
  notes?: string;
};

type UpdateClientRequest = {
  id: string;
} & Partial<CreateClientRequest>;

type ListProductsParams = {
  search?: string;
  page?: number;
  limit?: number;
  category?: string;
  brand?: string;
  inStock?: boolean;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
};

type CreateProductRequest = {
  code: string;
  name: string;
  unit: string;
  price: number;
  stock: number;
  category: string;
  family: string; // requerido por tu service
  minStock: number;
  description?: string;
  brand?: string;
  cost?: number;
  maxStock?: number;
  isActive?: boolean;
  images?: string[];
};

type UpdateProductRequest = {
  id: string;
} & Partial<CreateProductRequest>;

/* ============================
   Mapeos App -> Service
   ============================ */

type SrvClientType = SrvCreateClientRequest extends { type: infer T } ? T : never;

const mapClientTypeToService = (t: ClientType): SrvClientType => {
  // El service usa: 'minorista' | 'medio-mayorista' | 'mayorista' | 'vip'
  switch (t) {
    case ClientType.MINORISTA:
      return 'minorista' as SrvClientType;
    case ClientType.MAYORISTA:
      return 'mayorista' as SrvClientType;
    case ClientType.DISTRIBUIDOR:
      return 'medio-mayorista' as SrvClientType; // ajusta a 'vip' si aplica
    default:
      return 'minorista' as SrvClientType;
  }
};

const toSrvListClientsParams = (p: ListClientsParams = {}): SrvListClientsParams => ({
  ...(p.search !== undefined ? { search: p.search } : {}),
  ...(p.page !== undefined ? { page: p.page } : {}),
  ...(p.limit !== undefined ? { limit: p.limit } : {}),
  ...(p.city !== undefined ? { city: p.city } : {}),
  ...(p.isActive !== undefined ? { isActive: p.isActive } : {}),
  ...(p.type !== undefined ? { type: mapClientTypeToService(p.type) } : {}),
});

const toSrvCreateClient = (d: CreateClientRequest): SrvCreateClientRequest => ({
  name: d.name,
  address: d.address,
  zone: d.zone,
  type: mapClientTypeToService(d.type),
  ...(d.email !== undefined ? { email: d.email } : {}),
  ...(d.phone !== undefined ? { phone: d.phone } : {}),
  ...(d.city !== undefined ? { city: d.city } : {}),
  ...(d.zipCode !== undefined ? { zipCode: d.zipCode } : {}),
  ...(d.notes !== undefined ? { notes: d.notes } : {}),
});

const toSrvUpdateClient = (d: UpdateClientRequest): SrvUpdateClientRequest => ({
  id: d.id,
  ...(d.name !== undefined ? { name: d.name } : {}),
  ...(d.address !== undefined ? { address: d.address } : {}),
  ...(d.zone !== undefined ? { zone: d.zone } : {}),
  ...(d.type !== undefined ? { type: mapClientTypeToService(d.type) } : {}),
  ...(d.email !== undefined ? { email: d.email } : {}),
  ...(d.phone !== undefined ? { phone: d.phone } : {}),
  ...(d.city !== undefined ? { city: d.city } : {}),
  ...(d.zipCode !== undefined ? { zipCode: d.zipCode } : {}),
  ...(d.notes !== undefined ? { notes: d.notes } : {}),
});

const toSrvDateRange = (d?: { start: Date; end: Date }): SrvDashboardRange | undefined => {
  if (!d) return undefined;
  // Si el service exige strings requeridos:
  const payload: SrvDashboardRange = {
    startDate: d.start.toISOString(),
    endDate: d.end.toISOString(),
  } as SrvDashboardRange;
  return payload;
};

const toSrvChartsRange = (d?: { start: Date; end: Date }): SrvDashboardChartsRange | undefined => {
  if (!d) return undefined;
  const payload: SrvDashboardChartsRange = {
    startDate: d.start.toISOString(),
    endDate: d.end.toISOString(),
  } as SrvDashboardChartsRange;
  return payload;
};

/* ============================
   HOOKS
   ============================ */

export function useClients() {
  const { clients, setClients, addClient, updateClient, deleteClient } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(
    async (params: ListClientsParams = {}) => {
      setLoading(true);
      setError(null);
      try {
        const response = await clientService.getClients(toSrvListClientsParams(params));
        setClients(response.clients);
        return response;
      } catch (err) {
        const e = err as ApiError;
        setError(e.message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [setClients]
  );

  const createClient = useCallback(
    async (clientData: CreateClientRequest) => {
      setLoading(true);
      setError(null);
      try {
        const client = await clientService.createClient(toSrvCreateClient(clientData));
        addClient(client);
        return client;
      } catch (err) {
        const e = err as ApiError;
        setError(e.message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [addClient]
  );

  const editClient = useCallback(
    async (clientData: UpdateClientRequest) => {
      setLoading(true);
      setError(null);
      try {
        const client = await clientService.updateClient(toSrvUpdateClient(clientData));
        updateClient(client);
        return client;
      } catch (err) {
        const e = err as ApiError;
        setError(e.message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [updateClient]
  );

  const removeClient = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        await clientService.deleteClient(id);
        deleteClient(id);
      } catch (err) {
        const e = err as ApiError;
        setError(e.message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [deleteClient]
  );

  return {
    clients,
    loading,
    error,
    fetchClients,
    createClient,
    updateClient: editClient,
    deleteClient: removeClient,
    clearError: () => setError(null),
  };
}

export function useProducts() {
  const { products, setProducts, addProduct, updateProduct, deleteProduct } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(
    async (params: ListProductsParams = {}) => {
      setLoading(true);
      setError(null);
      try {
        const response = await productService.getProducts(params as SrvListProductsParams);
        setProducts(response.products);
        return response;
      } catch (err) {
        const e = err as ApiError;
        setError(e.message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [setProducts]
  );

  const createProduct = useCallback(
    async (productData: CreateProductRequest) => {
      setLoading(true);
      setError(null);
      try {
        const product = await productService.createProduct(productData as SrvCreateProductRequest);
        addProduct(product);
        return product;
      } catch (err) {
        const e = err as ApiError;
        setError(e.message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [addProduct]
  );

  const editProduct = useCallback(
    async (productData: UpdateProductRequest) => {
      setLoading(true);
      setError(null);
      try {
        const product = await productService.updateProduct(productData as SrvUpdateProductRequest);
        updateProduct(product);
        return product;
      } catch (err) {
        const e = err as ApiError;
        setError(e.message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [updateProduct]
  );

  const removeProduct = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        await productService.deleteProduct(id);
        deleteProduct(id);
      } catch (err) {
        const e = err as ApiError;
        setError(e.message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [deleteProduct]
  );

  return {
    products,
    loading,
    error,
    fetchProducts,
    createProduct,
    updateProduct: editProduct,
    deleteProduct: removeProduct,
    clearError: () => setError(null),
  };
}

export function useDashboard() {
  const { metrics, setMetrics } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(
    async (dateRange?: { start: Date; end: Date }) => {
      setLoading(true);
      setError(null);
      try {
        const data = await dashboardService.getMetrics(toSrvDateRange(dateRange));
        setMetrics(data);
        return data;
      } catch (err) {
        const e = err as ApiError;
        setError(e.message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [setMetrics]
  );

  const fetchChartsData = useCallback(async (dateRange?: { start: Date; end: Date }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getChartsData(toSrvChartsRange(dateRange));
      return data;
    } catch (err) {
      const e = err as ApiError;
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    metrics,
    loading,
    error,
    fetchMetrics,
    fetchChartsData,
    clearError: () => setError(null),
  };
}
