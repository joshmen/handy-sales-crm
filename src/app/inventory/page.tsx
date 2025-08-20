'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { InventoryList, InventoryFilters, InventoryModal } from '@/components/inventory';
import { Plus, Package, Download } from 'lucide-react';
import { InventoryItem, InventoryFilters as IInventoryFilters, InventoryFormData } from '@/types/inventory';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'adjust' | 'transfer'>('adjust');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [filters, setFilters] = useState<IInventoryFilters>({
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

  const handleModalSubmit = async (data: InventoryFormData) => {
    setSubmitting(true);
    try {
      // Aquí iría la llamada a la API
      console.log('Submitting data:', data);
      
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Aquí actualizarías el inventario local o recargarías los datos
      setIsModalOpen(false);
      
      // Mostrar toast de éxito (implementar después)
    } catch (error) {
      console.error('Error submitting data:', error);
      // Mostrar toast de error
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenModal = (mode: 'adjust' | 'transfer' = 'adjust') => {
    setModalMode(mode);
    setIsModalOpen(true);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      lowStock: false,
      outOfStock: false,
      page: 1,
      limit: 50,
    });
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

  return (
    <Layout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Inventario de almacén</h1>
            <p className="text-muted-foreground">Gestiona las existencias de productos</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => handleOpenModal('transfer')} variant="outline">
              Transferir
            </Button>
            <Button onClick={() => handleOpenModal('adjust')}>
              <Plus className="h-4 w-4 mr-2" />
              Ajustar Inventario
            </Button>
          </div>
        </div>

        {/* Estado vacío */}
        {inventoryItems.length === 0 && !loading && (
          <EmptyState
            icon={Package}
            title="Aún no hay ajustes de inventario agregados"
            description="Agrega los ajustes que desees hacer al inventario de tu almacén"
            action={{
              label: 'Agregar ajuste',
              onClick: () => handleOpenModal('adjust'),
            }}
          />
        )}

        {/* Contenido principal */}
        {inventoryItems.length > 0 && (
          <>
            <InventoryFilters
              filters={filters}
              onFiltersChange={setFilters}
              onClearFilters={handleClearFilters}
            />

            <InventoryList
              items={filteredItems}
              loading={loading}
            />
          </>
        )}

        {/* Modal */}
        <InventoryModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          mode={modalMode}
          onSubmit={handleModalSubmit}
          products={products}
          loading={submitting}
        />
      </div>
    </Layout>
  );
}
