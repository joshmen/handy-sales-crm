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
  DollarSign,
  Calendar,
  User,
} from 'lucide-react';
import { PriceList, PriceListFormData } from '@/types/price-lists';

interface PriceListModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'create' | 'edit' | 'view' | 'delete';
  priceList?: PriceList | null;
  onSave?: (formData: PriceListFormData) => void;
  onConfirmDelete?: () => void;
  loading?: boolean;
}

export const PriceListModal: React.FC<PriceListModalProps> = ({
  isOpen,
  onClose,
  type,
  priceList,
  onSave,
  onConfirmDelete,
  loading = false,
}) => {
  const [formData, setFormData] = useState<PriceListFormData>({
    code: '',
    description: '',
    isEnabled: true,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Inicializar form data cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      if (type === 'edit' && priceList) {
        setFormData({
          code: priceList.code,
          description: priceList.description,
          isEnabled: priceList.isEnabled,
        });
      } else if (type === 'create') {
        setFormData({
          code: '',
          description: '',
          isEnabled: true,
        });
      }
      setErrors({});
    }
  }, [isOpen, type, priceList]);

  // Validación
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.code.trim()) {
      newErrors.code = 'El código es requerido';
    } else if (formData.code.length < 2) {
      newErrors.code = 'El código debe tener al menos 2 caracteres';
    } else if (formData.code.length > 20) {
      newErrors.code = 'El código no puede tener más de 20 caracteres';
    } else if (!/^[a-zA-Z0-9-_]+$/.test(formData.code)) {
      newErrors.code = 'El código solo puede contener letras, números, guiones y guiones bajos';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es requerida';
    } else if (formData.description.length > 500) {
      newErrors.description = 'La descripción no puede tener más de 500 caracteres';
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

  const handleInputChange = (field: keyof PriceListFormData, value: string | boolean) => {
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
            {/* Código */}
            <div>
              <Label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Código *
              </Label>
              <Input
                id="code"
                type="text"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
                placeholder="Ej: LP001"
                className={errors.code ? 'border-red-500' : ''}
                disabled={loading}
              />
              {errors.code && (
                <p className="mt-1 text-sm text-red-600">{errors.code}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Este código es lo que identifica cuando agregues los precios a los productos
              </p>
            </div>

            {/* Descripción */}
            <div>
              <Label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Descripción *
              </Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe esta lista de precios..."
                rows={3}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.description ? 'border-red-500' : ''
                }`}
                disabled={loading}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
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
                Los productos podrán asignar más precios
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
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{priceList?.code}</h3>
                  <p className="text-gray-600">{priceList?.description}</p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                priceList?.isEnabled
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {priceList?.isEnabled ? 'Activa' : 'Inactiva'}
              </div>
            </div>

            <div className="space-y-6">
              {/* Información básica */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Información básica</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Código:</span>
                      <span className="font-mono">{priceList?.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estado:</span>
                      <span>{priceList?.isEnabled ? 'Activa' : 'Inactiva'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Productos:</span>
                      <span>{priceList?.productCount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Estadísticas</h4>
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg mx-auto mb-2">
                      <DollarSign className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                      {priceList?.productCount.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Productos con precio</div>
                  </div>
                </div>
              </div>

              {/* Auditoría */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Información de auditoría</h4>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>Creado por: {priceList?.createdBy}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Fecha de creación: {priceList?.createdAt.toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>Modificado por: {priceList?.modifiedBy}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Última modificación: {priceList?.lastModified.toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
              <Button onClick={() => console.log('Edit price list')}>
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
                <h3 className="text-lg font-semibold">Eliminar lista de precios</h3>
                <p className="text-gray-600">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">
                ¿Estás seguro de que quieres eliminar la lista de precios{' '}
                <strong>&quot;{priceList?.code}&quot;</strong>?
              </p>
              <div className="mt-2 text-sm text-red-600">
                • Se eliminarán todos los precios asociados ({priceList?.productCount.toLocaleString()} productos)
                • Los productos afectados quedarán sin precio para esta lista
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
                {loading ? 'Eliminando...' : 'Eliminar lista'}
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
        return 'Crear nueva lista de precios';
      case 'edit':
        return 'Editar lista de precios';
      case 'view':
        return 'Detalles de la lista de precios';
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
