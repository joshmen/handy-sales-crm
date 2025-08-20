'use client';

import React, { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus, Download, Upload } from 'lucide-react';
import { 
  DiscountMetrics,
  DiscountTable,
  DiscountFilters,
  DiscountModal
} from '@/components/discounts';
import { 
  Discount, 
  DiscountType, 
  DiscountMethod, 
  DiscountStatus 
} from '@/types/discounts';

// Mock data para demostración
const mockDiscounts: Discount[] = [
  {
    id: '1',
    name: 'Descuento por Volumen Global',
    description: 'Descuento aplicado según cantidad total de productos',
    type: DiscountType.GLOBAL,
    method: DiscountMethod.PERCENTAGE,
    status: DiscountStatus.ACTIVE,
    isPermanent: false,
    validFrom: new Date('2024-01-01'),
    validTo: new Date('2024-12-31'),
    quantityRanges: [
      { id: '1', minQuantity: 1, maxQuantity: 10, discountValue: 2, description: '1-10 unidades' },
      { id: '2', minQuantity: 11, maxQuantity: 50, discountValue: 5, description: '11-50 unidades' },
      { id: '3', minQuantity: 51, discountValue: 10, description: '51+ unidades' },
    ],
    isStackable: false,
    minimumAmount: 100,
    maximumDiscount: 1000,
    createdBy: 'admin',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    totalUsed: 25,
    totalSavings: 5420.50,
    lastUsed: new Date('2024-08-15'),
  },
  {
    id: '2',
    name: 'Píldoras para Termostato Acme',
    description: 'Descuento específico para producto termostato',
    type: DiscountType.PRODUCT_SPECIFIC,
    method: DiscountMethod.PERCENTAGE,
    status: DiscountStatus.ACTIVE,
    isPermanent: true,
    quantityRanges: [
      { id: '4', minQuantity: 1, maxQuantity: 9, discountValue: 5, description: '1-9 unidades' },
      { id: '5', minQuantity: 10, discountValue: 15, description: '10+ unidades' },
    ],
    productId: 'AC-04-01-005',
    isStackable: true,
    createdBy: 'supervisor',
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-15'),
    totalUsed: 8,
    totalSavings: 1205.00,
    lastUsed: new Date('2024-08-10'),
  },
];

export default function DiscountsPage() {
  const [discounts] = useState<Discount[]>(mockDiscounts);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);
  const [modalType, setModalType] = useState<'view' | 'delete' | 'import' | 'export' | null>(null);

  const filteredDiscounts = discounts.filter(discount => {
    const matchesSearch = discount.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         discount.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || discount.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || discount.status === selectedStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleView = (discount: Discount) => {
    setSelectedDiscount(discount);
    setModalType('view');
  };

  const handleEdit = (discount: Discount) => {
    // Navegar a la página de edición
    window.open(`/discounts/edit/${discount.id}`, '_self');
  };

  const handleToggleStatus = (discount: Discount) => {
    console.log('Toggle status for:', discount.id);
    // Aquí iría la lógica para cambiar el estado
  };

  const handleDelete = (discount: Discount) => {
    setSelectedDiscount(discount);
    setModalType('delete');
  };

  const handleCreate = () => {
    window.open('/discounts/create?type=global', '_self');
  };

  const handleImport = () => {
    setModalType('import');
  };

  const handleExport = () => {
    setModalType('export');
  };

  const handleConfirmDelete = () => {
    console.log('Deleting discount:', selectedDiscount?.id);
    // Aquí iría la lógica para eliminar
    setModalType(null);
    setSelectedDiscount(null);
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedDiscount(null);
  };

  return (
    <Layout>
      <div className="p-6">
        {/* Métricas */}
        <DiscountMetrics discounts={discounts} />

        {/* Contenido principal */}
        <Card>
          <CardHeader className="mb-2 grid grid-cols-[1fr_auto] items-start gap-3">
            <CardTitle className="text-xl sm:text-2xl">Descuentos por cantidad</CardTitle>

            <div className="flex gap-2 justify-self-end">
              <Button 
                variant="outline" 
                className="h-10 px-4"
                onClick={handleCreate}
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear nuevo descuento
              </Button>
              <Button 
                variant="outline" 
                className="h-10 px-4"
                onClick={handleImport}
              >
                <Upload className="w-4 h-4 mr-2" />
                Importar
              </Button>
              <Button 
                variant="outline" 
                className="h-10 px-4"
                onClick={handleExport}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {/* Filtros */}
            <DiscountFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedType={selectedType}
              onTypeChange={setSelectedType}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
            />

            {/* Tabla */}
            {filteredDiscounts.length > 0 ? (
              <DiscountTable
                discounts={filteredDiscounts}
                onView={handleView}
                onEdit={handleEdit}
                onToggleStatus={handleToggleStatus}
                onDelete={handleDelete}
                onCreate={handleCreate}
              />
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || selectedType !== 'all' || selectedStatus !== 'all' 
                    ? 'No se encontraron descuentos' 
                    : 'Sin descuentos configurados'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || selectedType !== 'all' || selectedStatus !== 'all'
                    ? 'Intenta cambiar los filtros de búsqueda'
                    : 'Crea tu primer descuento por cantidad para comenzar'}
                </p>
                <Button onClick={handleCreate} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear descuento
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal */}
        <DiscountModal
          isOpen={modalType !== null}
          onClose={closeModal}
          type={modalType || 'view'}
          discount={selectedDiscount || undefined}
          onConfirm={modalType === 'delete' ? handleConfirmDelete : undefined}
        />
      </div>
    </Layout>
  );
}
