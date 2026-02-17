import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  FileDown,
  FileUp,
  Calendar,
  Users,
  DollarSign,
} from 'lucide-react';
import { Discount, DiscountType, DiscountMethod, DiscountStatus } from '@/types/discounts';

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'view' | 'delete' | 'import' | 'export';
  discount?: Discount;
  onConfirm?: () => void;
  loading?: boolean;
}

const statusColors = {
  [DiscountStatus.ACTIVE]: 'bg-green-100 text-green-800',
  [DiscountStatus.INACTIVE]: 'bg-gray-100 text-gray-800',
  [DiscountStatus.PAUSED]: 'bg-yellow-100 text-yellow-800',
};

const statusLabels = {
  [DiscountStatus.ACTIVE]: 'Activo',
  [DiscountStatus.INACTIVE]: 'Inactivo',
  [DiscountStatus.PAUSED]: 'Pausado',
};

const typeLabels = {
  [DiscountType.GLOBAL]: 'Global',
  [DiscountType.PRODUCT_SPECIFIC]: 'Por Producto',
};

const methodLabels = {
  [DiscountMethod.PERCENTAGE]: 'Porcentaje (%)',
  [DiscountMethod.FIXED_AMOUNT]: 'Monto fijo ($)',
};

export function DiscountModal({
  isOpen,
  onClose,
  type,
  discount,
  onConfirm,
  loading = false,
}: DiscountModalProps) {
  const getModalContent = () => {
    switch (type) {
      case 'view':
        return (
          <>
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Eye className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{discount?.name}</h3>
                  <p className="text-gray-600">{discount?.description}</p>
                </div>
              </div>
              <Badge className={statusColors[discount?.status || DiscountStatus.INACTIVE]}>
                {statusLabels[discount?.status || DiscountStatus.INACTIVE]}
              </Badge>
            </div>

            <div className="space-y-6">
              {/* Información básica */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Información básica</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tipo:</span>
                      <span>{typeLabels[discount?.type || DiscountType.GLOBAL]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Método:</span>
                      <span>{methodLabels[discount?.method || DiscountMethod.PERCENTAGE]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Combinable:</span>
                      <span>{discount?.isStackable ? 'Sí' : 'No'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Configuraciones</h4>
                  <div className="space-y-2">
                    {discount?.minimumAmount && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monto mínimo:</span>
                        <span>${discount.minimumAmount.toLocaleString()}</span>
                      </div>
                    )}
                    {discount?.maximumDiscount && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Descuento máximo:</span>
                        <span>${discount.maximumDiscount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Vigencia:</span>
                      <span>
                        {discount?.isPermanent
                          ? 'Permanente'
                          : `${discount?.validFrom?.toLocaleDateString()} - ${discount?.validTo?.toLocaleDateString()}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rangos de descuento */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Rangos de descuento</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-2">
                    {discount?.quantityRanges.map((range, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 px-3 bg-white rounded border"
                      >
                        <span className="font-medium">
                          {range.minQuantity}
                          {range.maxQuantity ? `-${range.maxQuantity}` : '+'} unidades
                        </span>
                        <span className="text-green-600 font-medium">
                          {range.discountValue}
                          {discount?.method === DiscountMethod.PERCENTAGE ? '%' : '$'} descuento
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Estadísticas */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Estadísticas de uso</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg mx-auto mb-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="text-lg font-bold text-green-600">
                      ${discount?.totalSavings?.toLocaleString() || '0'}
                    </div>
                    <div className="text-sm text-gray-600">Ahorros generados</div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg mx-auto mb-2">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                      {discount?.totalUsed || 0}
                    </div>
                    <div className="text-sm text-gray-600">Veces utilizado</div>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-lg mx-auto mb-2">
                      <Calendar className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="text-lg font-bold text-purple-600">
                      {discount?.lastUsed?.toLocaleDateString() || 'Nunca'}
                    </div>
                    <div className="text-sm text-gray-600">Último uso</div>
                  </div>
                </div>
              </div>

              {/* Auditoría */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Creado por:</span> {discount?.createdBy}
                  </div>
                  <div>
                    <span className="font-medium">Fecha de creación:</span>{' '}
                    {discount?.createdAt.toLocaleDateString()}
                  </div>
                  {discount?.updatedBy && (
                    <>
                      <div>
                        <span className="font-medium">Modificado por:</span> {discount.updatedBy}
                      </div>
                      <div>
                        <span className="font-medium">Última modificación:</span>{' '}
                        {discount.updatedAt.toLocaleDateString()}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
              <Button>
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
                <h3 className="text-lg font-semibold">Eliminar descuento</h3>
                <p className="text-gray-600">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">
                ¿Estás seguro de que quieres eliminar el descuento{' '}
                <strong>&quot;{discount?.name}&quot;</strong>?
              </p>
              <div className="mt-2 text-sm text-red-600">
                • Se perderán todas las estadísticas de uso • Los pedidos existentes que usen este
                descuento no se verán afectados • Esta acción es permanente e irreversible
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={onConfirm}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {loading ? 'Eliminando...' : 'Eliminar descuento'}
              </Button>
            </div>
          </>
        );

      case 'import':
        return (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Importar descuentos</h3>
                <p className="text-gray-600">Cargar descuentos desde un archivo</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <FileUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">Arrastra tu archivo aquí</p>
                <p className="text-gray-500 mb-4">o haz clic para seleccionar</p>
                <Button variant="outline">Seleccionar archivo</Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Formato requerido:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Archivo CSV o Excel (.xlsx)</li>
                  <li>• Columnas: nombre, descripción, tipo, método, rangos</li>
                  <li>• Máximo 1000 registros por archivo</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button disabled>Importar</Button>
            </div>
          </>
        );

      case 'export':
        return (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FileDown className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Exportar descuentos</h3>
                <p className="text-gray-600">Descargar datos de descuentos</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Formato de archivo
                </label>
                <SearchableSelect
                  options={[
                    { value: 'csv', label: 'CSV' },
                    { value: 'excel', label: 'Excel (.xlsx)' },
                    { value: 'json', label: 'JSON' },
                  ]}
                  value="csv"
                  onChange={() => {}}
                  placeholder="Seleccionar formato"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Datos a incluir
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="mr-2" />
                    Información básica
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="mr-2" />
                    Rangos de descuento
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    Estadísticas de uso
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    Información de auditoría
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button className="flex items-center gap-2">
                <FileDown className="w-4 h-4" />
                Exportar
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
      case 'view':
        return 'Detalles del descuento';
      case 'delete':
        return 'Confirmar eliminación';
      case 'import':
        return 'Importar descuentos';
      case 'export':
        return 'Exportar descuentos';
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
}
