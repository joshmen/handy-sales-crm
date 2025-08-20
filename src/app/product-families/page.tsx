'use client';

import React, { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import { 
  ProductFamilyTable,
  ProductFamilyModal,
  ProductFamilyFilters
} from '@/components/product-families';
import { 
  ProductFamily,
  ProductFamilyFormData
} from '@/types/product-families';

// Mock data para demostración - siguiendo las capturas proporcionadas
const mockProductFamilies: ProductFamily[] = [
  {
    id: '1',
    description: 'Implantes',
    isEnabled: true,
    enabledProducts: 1,
    disabledProducts: 0,
    lastModified: new Date('2024-08-19'),
    modifiedBy: 'Juan Mendoza',
    createdAt: new Date('2024-01-15'),
    createdBy: 'Juan Mendoza'
  },
  {
    id: '2', 
    description: 'Magnéticos',
    isEnabled: true,
    enabledProducts: 1,
    disabledProducts: 0,
    lastModified: new Date('2024-08-18'),
    modifiedBy: 'Juan Mendoza',
    createdAt: new Date('2024-02-01'),
    createdBy: 'Juan Mendoza'
  },
  {
    id: '3',
    description: 'Abutments',
    isEnabled: true,
    enabledProducts: 2,
    disabledProducts: 1,
    lastModified: new Date('2024-08-17'),
    modifiedBy: 'Juan Mendoza',
    createdAt: new Date('2024-03-15'),
    createdBy: 'Juan Mendoza'
  },
  {
    id: '4',
    description: 'Ortética',
    isEnabled: true,
    enabledProducts: 1,
    disabledProducts: 0,
    lastModified: new Date('2024-08-16'),
    modifiedBy: 'Juan Mendoza',
    createdAt: new Date('2024-04-01'),
    createdBy: 'Juan Mendoza'
  }
];

export default function ProductFamiliesPage() {
  const [productFamilies, setProductFamilies] = useState<ProductFamily[]>(mockProductFamilies);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDisabled, setShowDisabled] = useState(false);
  const [selectedProductFamily, setSelectedProductFamily] = useState<ProductFamily | null>(null);
  const [modalType, setModalType] = useState<'create' | 'edit' | 'view' | 'delete' | null>(null);
  const [loading, setLoading] = useState(false);

  // Filtrar familias de productos
  const filteredProductFamilies = productFamilies.filter(family => {
    const matchesSearch = family.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEnabled = showDisabled || family.isEnabled;
    
    return matchesSearch && matchesEnabled;
  });

  // Handlers
  const handleCreate = () => {
    setSelectedProductFamily(null);
    setModalType('create');
  };

  const handleEdit = (productFamily: ProductFamily) => {
    setSelectedProductFamily(productFamily);
    setModalType('edit');
  };

  const handleView = (productFamily: ProductFamily) => {
    setSelectedProductFamily(productFamily);
    setModalType('view');
  };

  const handleDelete = (productFamily: ProductFamily) => {
    setSelectedProductFamily(productFamily);
    setModalType('delete');
  };

  const handleToggleStatus = (productFamily: ProductFamily) => {
    setProductFamilies(prev => 
      prev.map(family => 
        family.id === productFamily.id 
          ? { ...family, isEnabled: !family.isEnabled, lastModified: new Date(), modifiedBy: 'Juan Mendoza' }
          : family
      )
    );
  };

  const handleSave = async (formData: ProductFamilyFormData) => {
    setLoading(true);
    try {
      if (modalType === 'create') {
        // Crear nueva familia
        const newProductFamily: ProductFamily = {
          id: `${Date.now()}`,
          description: formData.description,
          isEnabled: formData.isEnabled,
          enabledProducts: 0,
          disabledProducts: 0,
          lastModified: new Date(),
          modifiedBy: 'Juan Mendoza',
          createdAt: new Date(),
          createdBy: 'Juan Mendoza'
        };
        setProductFamilies(prev => [...prev, newProductFamily]);
      } else if (modalType === 'edit' && selectedProductFamily) {
        // Editar familia existente
        setProductFamilies(prev => 
          prev.map(family => 
            family.id === selectedProductFamily.id
              ? {
                  ...family,
                  description: formData.description,
                  isEnabled: formData.isEnabled,
                  lastModified: new Date(),
                  modifiedBy: 'Juan Mendoza'
                }
              : family
          )
        );
      }
      closeModal();
    } catch (error) {
      console.error('Error saving product family:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = () => {
    if (selectedProductFamily) {
      setProductFamilies(prev => prev.filter(family => family.id !== selectedProductFamily.id));
      closeModal();
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedProductFamily(null);
  };

  return (
    <Layout>
      <div className="p-6">
        {/* Contenido principal */}
        <Card>
          <CardHeader className="mb-2 grid grid-cols-[1fr_auto] items-start gap-3">
            <CardTitle className="text-xl sm:text-2xl">
              Familias de productos ({filteredProductFamilies.length})
            </CardTitle>

            <div className="flex gap-2 justify-self-end">
              <Button 
                className="h-10 px-4"
                onClick={handleCreate}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {/* Filtros */}
            <ProductFamilyFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              showDisabled={showDisabled}
              onShowDisabledChange={setShowDisabled}
            />

            {/* Tabla */}
            {filteredProductFamilies.length > 0 ? (
              <ProductFamilyTable
                productFamilies={filteredProductFamilies}
                onView={handleView}
                onEdit={handleEdit}
                onToggleStatus={handleToggleStatus}
                onDelete={handleDelete}
              />
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📦</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || !showDisabled
                    ? 'No se encontraron familias de productos' 
                    : 'Sin familias de productos configuradas'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || !showDisabled
                    ? 'Intenta cambiar los filtros de búsqueda'
                    : 'Crea tu primera familia de productos para comenzar'}
                </p>
                <Button onClick={handleCreate} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar familia de productos
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal */}
        <ProductFamilyModal
          isOpen={modalType !== null}
          onClose={closeModal}
          type={modalType || 'create'}
          productFamily={selectedProductFamily}
          onSave={handleSave}
          onConfirmDelete={handleConfirmDelete}
          loading={loading}
        />
      </div>
    </Layout>
  );
}