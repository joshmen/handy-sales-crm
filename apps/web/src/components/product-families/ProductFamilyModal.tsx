'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Plus,
  Package,
  Calendar,
  User,
} from 'lucide-react';
import { ProductFamily, ProductFamilyFormData } from '@/types/product-families';

interface ProductFamilyModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'create' | 'edit' | 'view' | 'delete';
  productFamily?: ProductFamily | null;
  onSave?: (formData: ProductFamilyFormData) => void;
  onConfirmDelete?: () => void;
  loading?: boolean;
}

export const ProductFamilyModal: React.FC<ProductFamilyModalProps> = ({
  isOpen,
  onClose,
  type,
  productFamily,
  onSave,
  onConfirmDelete,
  loading = false,
}) => {
  const [formData, setFormData] = useState<ProductFamilyFormData>({
    description: '',
    isEnabled: true,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Inicializar form data cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      if (type === 'edit' && productFamily) {
        setFormData({
          description: productFamily.description,
          isEnabled: productFamily.isEnabled,
        });
      } else if (type === 'create') {
        setFormData({
          description: '',
          isEnabled: true,
        });
      }
      setErrors({});
    }
  }, [isOpen, type, productFamily]);

  // Validación
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es requerida';
    } else if (formData.description.length < 2) {
      newErrors.description = 'La descripción debe tener al menos 2 caracteres';
    } else if (formData.description.length > 255) {
      newErrors.description = 'La descripción no puede tener más de 255 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm() && onSave) {
      onSave(formData);
    }
  };

  const handleInputChange = (field: keyof ProductFamilyFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getModalContent = () => {
    switch (type) {
      case 'create':
      case 'edit':
        return (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Descripción */}
            <div>
              <Label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Descripción *
              </Label>
              <Input
                id="description"
                type="text"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Ej: Implantes, Magnéticos, Abutments..."
                className={errors.description ? 'border-red-500' : ''}
                disabled={loading}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Nombre que identifica esta familia de productos
              </p>
            </div>

            {/* Activo */}
            <div className="flex items-center space-x-3">
              <input
                id="isEnabled"
                type="checkbox"
                checked={formData.isEnabled}
                onChange={(e) => handleInputChange('isEnabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={loading}
              />
              <Label htmlFor="isEnabled" className="text-sm font-medium text-gray-700">
                Activo
              </Label>
              <p className="text-sm text-gray-500">
                Los productos podrán ser asignados a esta familia
              </p>
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  'Guardando...'
                ) : (
                  <>
                    {type === 'create' ? <Plus className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
                    {type === 'create' ? 'Crear' : 'Guardar'}
                  </>
                )}
              </Button>
            </div>
          </form>
        );

      case 'view':
        return (
          <>
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{productFamily?.description}</h3>
                  <p className="text-gray-600">Familia de productos</p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                productFamily?.isEnabled
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {productFamily?.isEnabled ? 'Activa' : 'Inactiva'}
              </div>
            </div>

            <div className="space-y-6">
              {/* Información básica */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Información básica</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Descripción:</span>
                      <span className="font-medium">{productFamily?.description}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estado:</span>
                      <span>{productFamily?.isEnabled ? 'Activa' : 'Inactiva'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Productos</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 p-3 rounded-lg text-center">
                      <div className="flex items-center justify-center w-6 h-6 bg-green-100 rounded-full mx-auto mb-1">
                        <Package className="w-3 h-3 text-green-600" />
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        {productFamily?.enabledProducts || 0}
                      </div>
                      <div className="text-xs text-gray-600">Activos</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <div className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full mx-auto mb-1">
                        <Package className="w-3 h-3 text-gray-600" />
                      </div>
                      <div className="text-lg font-bold text-gray-600">
                        {productFamily?.disabledProducts || 0}
                      </div>
                      <div className="text-xs text-gray-600">Inactivos</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Auditoría */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Información de auditoría</h4>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>Creado por: {productFamily?.createdBy}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Fecha de creación: {productFamily?.createdAt.toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>Modificado por: {productFamily?.modifiedBy}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Última modificación: {productFamily?.lastModified.toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
              <Button onClick={() => console.log('Edit product family')}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </div>
          </>
        );

      case 'delete':
        return (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Eliminar familia de productos</h3>
                <p className="text-gray-600">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">
                ¿Estás seguro de que quieres eliminar la familia de productos{' '}
                <strong>&quot;{productFamily?.description}&quot;</strong>?
              </p>
              <div className="mt-2 text-sm text-red-600">
                • Los productos asociados perderán la referencia a esta familia
                • Total de productos afectados: {((productFamily?.enabledProducts || 0) + (productFamily?.disabledProducts || 0)).toLocaleString()}
                • Esta acción es permanente e irreversible
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={onConfirmDelete}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {loading ? 'Eliminando...' : 'Eliminar familia'}
              </Button>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const getModalTitle = () => {
    switch (type) {
      case 'create':
        return 'Agregar familia de productos';
      case 'edit':
        return 'Editar familia de productos';
      case 'view':
        return 'Detalles de la familia de productos';
      case 'delete':
        return 'Confirmar eliminación';
      default:
        return '';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getModalTitle()}
      size={type === 'view' ? 'xl' : 'lg'}
    >
      {getModalContent()}
    </Modal>
  );
};