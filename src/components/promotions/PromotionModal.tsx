// src/components/promotions/PromotionModal.tsx
'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AlertTriangle, Download, Upload } from 'lucide-react';
import { Promotion, PromotionStatus, PromotionType, RewardMethod } from '@/types/promotions';

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'view' | 'delete' | 'import' | 'export';
  promotion?: Promotion;
  onConfirm?: () => void;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({
  isOpen,
  onClose,
  type,
  promotion,
  onConfirm,
}) => {
  const getStatusBadge = (status: PromotionStatus) => {
    const statusConfig = {
      [PromotionStatus.ACTIVE]: { label: 'Activa', variant: 'success' as const },
      [PromotionStatus.PAUSED]: { label: 'Pausada', variant: 'warning' as const },
      [PromotionStatus.FINISHED]: { label: 'Finalizada', variant: 'secondary' as const },
      [PromotionStatus.DRAFT]: { label: 'Borrador', variant: 'outline' as const },
    };
    
    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeLabel = (type: PromotionType) => {
    const typeLabels = {
      [PromotionType.PERCENTAGE]: 'Por porcentaje',
      [PromotionType.SPECIAL_CLUB]: 'Club especial por recomendación',
      [PromotionType.BUY_X_GET_Y]: 'Compra X obtén Y',
    };
    return typeLabels[type];
  };

  const getRewardMethodLabel = (method: RewardMethod) => {
    const methodLabels = {
      [RewardMethod.FREE]: 'Gratis',
      [RewardMethod.PERCENTAGE_DISCOUNT]: 'Descuento porcentual',
      [RewardMethod.FIXED_DISCOUNT]: 'Descuento fijo',
    };
    return methodLabels[method];
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'No especificada';
    return new Date(date).toLocaleDateString('es-MX');
  };

  if (type === 'view' && promotion) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Detalles de la promoción" size="xl">
        <div className="space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Nombre</label>
                  <p className="text-sm">{promotion.name}</p>
                </div>
                {promotion.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Descripción</label>
                    <p className="text-sm">{promotion.description}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-600">Tipo</label>
                  <p className="text-sm">{getTypeLabel(promotion.type)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Estado</label>
                  <div className="mt-1">{getStatusBadge(promotion.status)}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estadísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Total de usos</label>
                  <p className="text-sm">{promotion.totalUsed || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Ahorros generados</label>
                  <p className="text-sm">{formatCurrency(promotion.totalSavings || 0)}</p>
                </div>
                {promotion.currentBudgetUsed !== undefined && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Presupuesto utilizado</label>
                    <p className="text-sm">{formatCurrency(promotion.currentBudgetUsed)}</p>
                  </div>
                )}
                {promotion.lastUsed && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Último uso</label>
                    <p className="text-sm">{formatDate(promotion.lastUsed)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Productos de aplicación */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Productos de Aplicación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {promotion.applicationProducts.map((product) => (
                  <div key={product.id} className="border rounded-lg p-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="font-medium">ID Producto:</span> {product.productId}
                      </div>
                      <div>
                        <span className="font-medium">Cantidad mínima:</span> {product.minimumQuantity}
                      </div>
                      {product.description && (
                        <div className="md:col-span-3">
                          <span className="font-medium">Descripción:</span> {product.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Productos de recompensa */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Productos de Recompensa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {promotion.rewardProducts.map((product) => (
                  <div key={product.id} className="border rounded-lg p-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="font-medium">ID Producto:</span> {product.productId}
                      </div>
                      <div>
                        <span className="font-medium">Método:</span> {getRewardMethodLabel(product.discountMethod)}
                      </div>
                      <div>
                        <span className="font-medium">Valor:</span> 
                        {product.discountMethod === RewardMethod.PERCENTAGE_DISCOUNT 
                          ? ` ${product.discountValue}%`
                          : product.discountMethod === RewardMethod.FIXED_DISCOUNT
                            ? ` ${formatCurrency(product.discountValue)}`
                            : ' Gratis'
                        }
                      </div>
                      {product.maxQuantity && (
                        <div>
                          <span className="font-medium">Cantidad máx:</span> {product.maxQuantity}
                        </div>
                      )}
                      {product.description && (
                        <div className="md:col-span-4">
                          <span className="font-medium">Descripción:</span> {product.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Limitantes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Limitantes y Restricciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {promotion.limits.maxUsagePerClient && (
                  <div>
                    <span className="font-medium">Uso máximo por cliente:</span> {promotion.limits.maxUsagePerClient}
                  </div>
                )}
                {promotion.limits.maxTotalUsage && (
                  <div>
                    <span className="font-medium">Uso total máximo:</span> {promotion.limits.maxTotalUsage}
                  </div>
                )}
                {promotion.limits.maxBudget && (
                  <div>
                    <span className="font-medium">Presupuesto máximo:</span> {formatCurrency(promotion.limits.maxBudget)}
                  </div>
                )}
                {promotion.limits.maxRewardPieces && (
                  <div>
                    <span className="font-medium">Piezas máximas de recompensa:</span> {promotion.limits.maxRewardPieces}
                  </div>
                )}
                {promotion.limits.startDate && (
                  <div>
                    <span className="font-medium">Fecha de inicio:</span> {formatDate(promotion.limits.startDate)}
                  </div>
                )}
                {promotion.limits.endDate && (
                  <div>
                    <span className="font-medium">Fecha de fin:</span> {formatDate(promotion.limits.endDate)}
                  </div>
                )}
                {promotion.limits.allowedZones && promotion.limits.allowedZones.length > 0 && (
                  <div className="md:col-span-2">
                    <span className="font-medium">Zonas permitidas:</span> {promotion.limits.allowedZones.join(', ')}
                  </div>
                )}
                {promotion.limits.allowedCategories && promotion.limits.allowedCategories.length > 0 && (
                  <div className="md:col-span-2">
                    <span className="font-medium">Categorías permitidas:</span> {promotion.limits.allowedCategories.join(', ')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </Modal>
    );
  }

  if (type === 'delete' && promotion) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Eliminar promoción" size="md">
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="font-medium text-red-800">¿Estás seguro?</h3>
              <p className="text-sm text-red-600">
                Esta acción no se puede deshacer. La promoción se eliminará permanentemente.
              </p>
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Promoción a eliminar:</h4>
            <p className="text-sm"><strong>{promotion.name}</strong></p>
            {promotion.description && (
              <p className="text-sm text-gray-600 mt-1">{promotion.description}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={onConfirm}>
              Eliminar promoción
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  if (type === 'import') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Importar promociones" size="md">
        <div className="space-y-4">
          <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Subir archivo de promociones
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Formatos admitidos: CSV, Excel (.xlsx)
            </p>
            <Button>
              Seleccionar archivo
            </Button>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Formato requerido:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Nombre de la promoción</li>
              <li>• Tipo de promoción</li>
              <li>• Productos de aplicación (JSON)</li>
              <li>• Productos de recompensa (JSON)</li>
              <li>• Configuración de límites</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button>
              Importar
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  if (type === 'export') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Exportar promociones" size="md">
        <div className="space-y-4">
          <div className="text-center p-8">
            <Download className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Exportar lista de promociones
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Descarga la información de todas las promociones en formato Excel
            </p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">El archivo incluirá:</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Información general de promociones</li>
              <li>• Productos de aplicación y recompensa</li>
              <li>• Limitantes y restricciones</li>
              <li>• Estadísticas de uso</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button>
              Descargar Excel
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return null;
};