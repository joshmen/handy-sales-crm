'use client';

import React, { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus, Download, Upload } from 'lucide-react';
import { 
  PriceListTable,
  PriceListModal,
  PriceListFilters
} from '@/components/price-lists';
import { 
  PriceList,
  PriceListFormData
} from '@/types/price-lists';

// Mock data para demostración
const mockPriceLists: PriceList[] = [
  {
    id: '1',
    code: 'LP001',
    description: 'Lista de precios mayoreo',
    isEnabled: true,
    productCount: 150,
    lastModified: new Date('2024-08-19'),
    modifiedBy: 'Carlos Mendoza',
    createdAt: new Date('2024-01-15'),
    createdBy: 'admin'
  },
  {
    id: '2', 
    code: 'LP002',
    description: 'Lista de precios promocional verano',
    isEnabled: false,
    productCount: 45,
    lastModified: new Date('2024-07-30'),
    modifiedBy: 'Ana García',
    createdAt: new Date('2024-06-01'),
    createdBy: 'supervisor'
  }
];

export default function PriceListsPage() {
  const [priceLists, setPriceLists] = useState<PriceList[]>(mockPriceLists);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDisabled, setShowDisabled] = useState(false);
  const [selectedPriceList, setSelectedPriceList] = useState<PriceList | null>(null);
  const [modalType, setModalType] = useState<'create' | 'edit' | 'view' | 'delete' | null>(null);
  const [loading, setLoading] = useState(false);

  // Filtrar listas de precios
  const filteredPriceLists = priceLists.filter(priceList => {
    const matchesSearch = priceList.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         priceList.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEnabled = showDisabled || priceList.isEnabled;
    
    return matchesSearch && matchesEnabled;
  });

  // Handlers
  const handleCreate = () => {
    setSelectedPriceList(null);
    setModalType('create');
  };

  const handleEdit = (priceList: PriceList) => {
    setSelectedPriceList(priceList);
    setModalType('edit');
  };

  const handleView = (priceList: PriceList) => {
    setSelectedPriceList(priceList);
    setModalType('view');
  };

  const handleDelete = (priceList: PriceList) => {
    setSelectedPriceList(priceList);
    setModalType('delete');
  };

  const handleToggleStatus = (priceList: PriceList) => {
    setPriceLists(prev => 
      prev.map(pl => 
        pl.id === priceList.id 
          ? { ...pl, isEnabled: !pl.isEnabled, lastModified: new Date(), modifiedBy: 'Carlos Mendoza' }
          : pl
      )
    );
  };

  const handleSave = async (formData: PriceListFormData) => {
    setLoading(true);
    try {
      if (modalType === 'create') {
        // Crear nueva lista
        const newPriceList: PriceList = {
          id: `${Date.now()}`,
          code: formData.code,
          description: formData.description,
          isEnabled: formData.isEnabled,
          productCount: 0,
          lastModified: new Date(),
          modifiedBy: 'Carlos Mendoza',
          createdAt: new Date(),
          createdBy: 'Carlos Mendoza'
        };
        setPriceLists(prev => [...prev, newPriceList]);
      } else if (modalType === 'edit' && selectedPriceList) {
        // Editar lista existente
        setPriceLists(prev => 
          prev.map(pl => 
            pl.id === selectedPriceList.id
              ? {
                  ...pl,
                  code: formData.code,
                  description: formData.description,
                  isEnabled: formData.isEnabled,
                  lastModified: new Date(),
                  modifiedBy: 'Carlos Mendoza'
                }
              : pl
          )
        );
      }
      closeModal();
    } catch (error) {
      console.error('Error saving price list:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = () => {
    if (selectedPriceList) {
      setPriceLists(prev => prev.filter(pl => pl.id !== selectedPriceList.id));
      closeModal();
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedPriceList(null);
  };

  const handleImport = () => {
    console.log('Import price lists');
    // TODO: Implementar importación
  };

  const handleExport = () => {
    console.log('Export price lists');
    // TODO: Implementar exportación
  };

  return (
    <Layout>
      <div className="p-6">
        {/* Contenido principal */}
        <Card>
          <CardHeader className="mb-2 grid grid-cols-[1fr_auto] items-start gap-3">
            <CardTitle className="text-xl sm:text-2xl">
              Listas de precios ({filteredPriceLists.length})
            </CardTitle>

            <div className="flex gap-2 justify-self-end">
              <Button 
                variant="outline" 
                className="h-10 px-4"
                onClick={handleCreate}
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear nueva lista de precios
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
            <PriceListFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              showDisabled={showDisabled}
              onShowDisabledChange={setShowDisabled}
            />

            {/* Tabla */}
            {filteredPriceLists.length > 0 ? (
              <PriceListTable
                priceLists={filteredPriceLists}
                onView={handleView}
                onEdit={handleEdit}
                onToggleStatus={handleToggleStatus}
                onDelete={handleDelete}
              />
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">💰</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || !showDisabled
                    ? 'No se encontraron listas de precios' 
                    : 'Sin listas de precios configuradas'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || !showDisabled
                    ? 'Intenta cambiar los filtros de búsqueda'
                    : 'Crea tu primera lista de precios para comenzar'}
                </p>
                <Button onClick={handleCreate} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear lista de precios
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal */}
        <PriceListModal
          isOpen={modalType !== null}
          onClose={closeModal}
          type={modalType || 'create'}
          priceList={selectedPriceList}
          onSave={handleSave}
          onConfirmDelete={handleConfirmDelete}
          loading={loading}
        />
      </div>
    </Layout>
  );
}
