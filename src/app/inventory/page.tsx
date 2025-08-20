'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { EmptyState } from '@/components/common/EmptyState';
import { SearchBar } from '@/components/common/SearchBar';
import { InventoryAdjustmentDialog } from '@/components/inventory/InventoryAdjustmentDialog';
import { Plus, Package, Search, Filter, Download } from 'lucide-react';
import { InventoryItem, InventoryAdjustmentForm, InventoryFilters } from '@/types/inventory';
import { Product } from '@/types';

// Importar Layout de forma dinámica para evitar problemas de SSR
const Layout = dynamic(
  () => import('@/components/layout/Layout').then((mod) => mod.Layout),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Cargando...</h2>
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }
);

// Mock data - En producción esto vendría de la API
const mockProducts: Product[] = [
  {
    id: '1',
    code: 'ACME-01-001',
    name: 'Voltaren Amex',
    description: 'Medicamento antiinflamatorio',
    category: 'Medicamentos',
    brand: 'ACME',
    family: 'Antiinflamatorios',
    unit: 'PZS',
    price: 25.50,
    cost: 15.00,
    stock: 100,
    minStock: 10,
    maxStock: 500,
    isActive: true,
    images: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    code: 'ACME-02-001',
    name: 'Dolex Niños Max Velocidad Amex',
    description: 'Medicamento para niños',
    category: 'Medicamentos',
    brand: 'ACME',
    family: 'Pediátricos',
    unit: 'PZS',
    price: 18.75,
    cost: 12.00,
    stock: 100,
    minStock: 15,
    maxStock: 300,
    isActive: true,
    images: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // ... más productos mock
];

const mockInventoryItems: InventoryItem[] = [
  {
    id: '1',
    productId: '1',
    warehouseQuantity: 100,
    routeQuantity: 0,
    totalQuantity: 100,
    minStock: 10,
    maxStock: 500,
    lastUpdated: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    product: mockProducts[0],
  },
  {
    id: '2', 
    productId: '2',
    warehouseQuantity: 100,
    routeQuantity: 0,
    totalQuantity: 100,
    minStock: 15,
    maxStock: 300,
    lastUpdated: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    product: mockProducts[1],
  },
];

export default function InventoryPage() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [filters, setFilters] = useState<InventoryFilters>({
    search: '',
    lowStock: false,
    outOfStock: false,
    page: 1,
    limit: 50,
  });

  // Mounted check
  useEffect(() => {
    setMounted(true);
  }, []);

  // Simular carga de datos
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setInventoryItems(mockInventoryItems);
      setLoading(false);
    };

    if (mounted) {
      loadData();
    }
  }, [mounted]);

  // Filtrar items basado en los filtros
  const filteredItems = inventoryItems.filter(item => {
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase();
      const productMatch = item.product?.name.toLowerCase().includes(searchTerm) ||
                          item.product?.code.toLowerCase().includes(searchTerm);
      if (!productMatch) return false;
    }

    if (filters.lowStock && item.totalQuantity > item.minStock) {
      return false;
    }

    if (filters.outOfStock && item.totalQuantity > 0) {
      return false;
    }

    return true;
  });

  const handleAdjustmentSubmit = async (data: InventoryAdjustmentForm) => {
    setSubmitting(true);
    try {
      // Aquí iría la llamada a la API
      console.log('Submitting adjustment:', data);
      
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Aquí actualizarías el inventario local o recargarías los datos
      setIsDialogOpen(false);
      
      // Mostrar toast de éxito (implementar después)
    } catch (error) {
      console.error('Error submitting adjustment:', error);
      // Mostrar toast de error
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  const getStockBadgeVariant = (item: InventoryItem) => {
    if (item.totalQuantity === 0) return 'destructive';
    if (item.totalQuantity <= item.minStock) return 'warning';
    return 'success';
  };

  const getStockBadgeText = (item: InventoryItem) => {
    if (item.totalQuantity === 0) return 'Sin stock';
    if (item.totalQuantity <= item.minStock) return 'Stock bajo';
    return 'Disponible';
  };

  // No renderizar hasta que esté montado
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Cargando Inventario...</h2>
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inventario de almacén</h1>
              <p className="text-gray-600">Gestiona las existencias de productos</p>
            </div>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </Layout>
    );
  }

  // Estado vacío
  if (inventoryItems.length === 0) {
    return (
      <Layout>
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inventario de almacén</h1>
              <p className="text-gray-600">Gestiona las existencias de productos</p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Inventario de ajustes
            </Button>
          </div>

          <EmptyState
            icon={Package}
            title="Aún no hay ajustes de inventario agregados"
            description="Agrega los ajustes que desees hacer al inventario de tu almacén"
            action={{
              label: 'Agregar ajuste',
              onClick: () => setIsDialogOpen(true),
            }}
          />

          <InventoryAdjustmentDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            onSubmit={handleAdjustmentSubmit}
            products={products}
            loading={submitting}
          />
        </div>
      </Layout>
    );
  }

  // Vista con datos
  return (
    <Layout>
      <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario de almacén</h1>
          <p className="text-gray-600">Gestiona las existencias de productos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Inventario de ajustes
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <SearchBar
              value={filters.search || ''}
              onChange={handleSearchChange}
              placeholder="Buscar por producto o código..."
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Unidad de medida</TableHead>
              <TableHead>Existencia totales</TableHead>
              <TableHead>Existencia en almacén</TableHead>
              <TableHead>Existencia en ruta</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-100 rounded-sm flex items-center justify-center">
                      <Package className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {item.product?.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.product?.code}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{item.product?.unit}</TableCell>
                <TableCell>
                  <span className="font-medium">{item.totalQuantity}</span>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{item.warehouseQuantity}</span>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{item.routeQuantity}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={getStockBadgeVariant(item)}>
                    {getStockBadgeText(item)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Dialogs */}
      <InventoryAdjustmentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleAdjustmentSubmit}
        products={products}
        loading={submitting}
      />
      </div>
    </Layout>
  );
}
