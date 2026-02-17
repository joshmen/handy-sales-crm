import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { Separator } from '@/components/ui/Separator';
import { InventoryAdjustmentType, InventoryAdjustmentForm } from '@/types/inventory';
import { Product } from '@/types';

// Tipos específicos para diferentes modos del modal
interface BaseInventoryFormData {
  productId: string;
  quantity: number;
  reason?: string;
}

interface AdjustmentFormData extends BaseInventoryFormData {
  type: InventoryAdjustmentType;
}

interface TransferFormData extends BaseInventoryFormData {
  fromLocation: 'warehouse' | 'route';
  toLocation: 'warehouse' | 'route';
}

type InventoryFormData = AdjustmentFormData | TransferFormData;

interface InventoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'adjust' | 'transfer' | 'create' | 'edit';
  onSubmit: (data: InventoryFormData) => void;
  products: Product[];
  selectedProduct?: Product;
  currentStock?: number;
  loading?: boolean;
}

export function InventoryModal({
  open,
  onOpenChange,
  mode = 'adjust',
  onSubmit,
  products,
  selectedProduct,
  currentStock = 0,
  loading = false,
}: InventoryModalProps) {
  const getInitialFormData = (currentMode: typeof mode): InventoryFormData => {
    if (currentMode === 'transfer') {
      return {
        productId: selectedProduct?.id || '',
        quantity: 0,
        reason: '',
        fromLocation: 'warehouse',
        toLocation: 'route',
      };
    }
    // Default para adjust, create, edit
    return {
      productId: selectedProduct?.id || '',
      type: InventoryAdjustmentType.INCREASE,
      quantity: 0,
      reason: '',
    };
  };

  const [formData, setFormData] = useState<InventoryFormData>(() => getInitialFormData(mode));
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Type guards
  const isAdjustmentData = (data: InventoryFormData): data is AdjustmentFormData => {
    return 'type' in data;
  };

  const isTransferData = (data: InventoryFormData): data is TransferFormData => {
    return 'fromLocation' in data && 'toLocation' in data;
  };

  // Reset form when dialog opens/closes, mode changes, or product changes
  useEffect(() => {
    if (open) {
      // Cuando se abre el modal o cambia el modo, inicializar con el modo correcto
      const initialData = getInitialFormData(mode);
      if (selectedProduct) {
        initialData.productId = selectedProduct.id;
      }
      setFormData(initialData);
      setErrors({});
    }
  }, [open, mode]);

  // Handle selectedProduct changes when modal is open
  useEffect(() => {
    if (open && selectedProduct) {
      setFormData(prev => ({
        ...prev,
        productId: selectedProduct.id,
      }));
    }
  }, [selectedProduct, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.productId) {
      newErrors.productId = 'Selecciona un producto';
    }
    
    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = 'La cantidad debe ser mayor a 0';
    }

    // Validación específica para ajustes
    if (mode === 'adjust' && isAdjustmentData(formData) && formData.type === InventoryAdjustmentType.DECREASE && formData.quantity > currentStock) {
      newErrors.quantity = 'No puedes disminuir más cantidad de la que tienes en stock';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSubmit(formData);
  };

  // Funciones de actualización type-safe
  const updateFormData = (updates: Partial<InventoryFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const updateAdjustmentData = (updates: Partial<AdjustmentFormData>) => {
    if (isAdjustmentData(formData)) {
      setFormData(prev => ({ ...prev, ...updates }));
    }
  };

  const updateTransferData = (updates: Partial<TransferFormData>) => {
    if (isTransferData(formData)) {
      setFormData(prev => ({ ...prev, ...updates }));
    }
  };

  const getModalTitle = () => {
    switch (mode) {
      case 'adjust': return 'Agregar ajuste de inventario';
      case 'transfer': return 'Transferir inventario';
      case 'create': return 'Crear producto en inventario';
      case 'edit': return 'Editar inventario';
      default: return 'Gestionar inventario';
    }
  };

  const adjustmentTypeOptions = [
    { value: InventoryAdjustmentType.INCREASE, label: 'Cantidad a aumentar' },
    { value: InventoryAdjustmentType.DECREASE, label: 'Cantidad a disminuir' },
    { value: InventoryAdjustmentType.SET_NEW, label: 'Nuevo inventario' },
  ];

  const locationOptions = [
    { value: 'warehouse', label: 'Almacén' },
    { value: 'route', label: 'Ruta' },
  ];

  const productOptions = products.map(product => ({
    value: product.id,
    label: `${product.code} - ${product.name}`,
  }));

  const renderAdjustmentForm = () => {
    // Verificar tanto el mode como el type guard para mayor robustez
    if (mode !== 'adjust' && mode !== 'create' && mode !== 'edit') return null;
    
    // Para adjust/create/edit, asegurar que tenemos los campos correctos
    const adjustmentData = isAdjustmentData(formData) ? formData : {
      ...formData,
      type: InventoryAdjustmentType.INCREASE
    } as AdjustmentFormData;

    return (
      <>
        {/* Product Selection */}
        <div className="space-y-2">
          <Label htmlFor="product">Buscar producto</Label>
          <Select
            value={adjustmentData.productId}
            onValueChange={(value) => updateFormData({ productId: value })}
          >
            <SelectTrigger className={errors.productId ? 'border-red-500' : ''}>
              <SelectValue placeholder="Selecciona un producto" />
            </SelectTrigger>
            <SelectContent>
              {productOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.productId && (
            <p className="text-xs text-red-600">{errors.productId}</p>
          )}
        </div>

        {/* Current Stock Display */}
        {adjustmentData.productId && (
          <div className="space-y-2">
            <Label htmlFor="current-stock">Inventario actual</Label>
            <Input
              id="current-stock"
              value={currentStock}
              readOnly
              className="bg-gray-50"
            />
          </div>
        )}

        <Separator />

        {/* Adjustment Type */}
        <div className="space-y-3">
          <Label>Tipo de ajuste</Label>
          <div className="space-y-2">
            {adjustmentTypeOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={option.value}
                  name="adjustmentType"
                  value={option.value}
                  checked={adjustmentData.type === option.value}
                  onChange={(e) =>
                    updateAdjustmentData({ type: e.target.value as InventoryAdjustmentType })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <Label htmlFor={option.value} className="text-sm font-normal">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <Label htmlFor="quantity">
            {adjustmentData.type === InventoryAdjustmentType.SET_NEW 
              ? 'Nueva cantidad' 
              : 'Cantidad'
            }
          </Label>
          <Input
            id="quantity"
            type="number"
            min="0"
            value={adjustmentData.quantity || ''}
            onChange={(e) =>
              updateFormData({ quantity: parseInt(e.target.value) || 0 })
            }
            error={errors.quantity}
            placeholder="0"
          />
        </div>

        {/* Reason/Comment */}
        <div className="space-y-2">
          <Label htmlFor="reason">Motivo / Comentario</Label>
          <textarea
            id="reason"
            value={adjustmentData.reason || ''}
            onChange={(e) =>
              updateFormData({ reason: e.target.value })
            }
            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            placeholder="Describe el motivo del ajuste..."
            rows={3}
          />
        </div>
      </>
    );
  };

  const renderTransferForm = () => {
    // Verificar tanto el mode como el type guard para mayor robustez
    if (mode !== 'transfer') return null;
    
    // Para transfer, asegurar que tenemos los campos correctos
    const transferData = isTransferData(formData) ? formData : {
      ...formData,
      fromLocation: 'warehouse' as const,
      toLocation: 'route' as const
    } as TransferFormData;

    return (
      <>
        {/* Product Selection */}
        <div className="space-y-2">
          <Label htmlFor="product">Producto</Label>
          <Select
            value={transferData.productId}
            onValueChange={(value) => updateFormData({ productId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un producto" />
            </SelectTrigger>
            <SelectContent>
              {productOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* From/To Locations */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Desde</Label>
            <Select
              value={transferData.fromLocation}
              onValueChange={(value) =>
                updateTransferData({ fromLocation: value as 'warehouse' | 'route' })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {locationOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Hacia</Label>
            <Select
              value={transferData.toLocation}
              onValueChange={(value) =>
                updateTransferData({ toLocation: value as 'warehouse' | 'route' })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {locationOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <Label htmlFor="quantity">Cantidad a transferir</Label>
          <Input
            id="quantity"
            type="number"
            min="0"
            value={transferData.quantity || ''}
            onChange={(e) =>
              updateFormData({ quantity: parseInt(e.target.value) || 0 })
            }
            placeholder="0"
          />
        </div>
      </>
    );
  };

  const renderFormContent = () => {
    switch (mode) {
      case 'adjust':
        return renderAdjustmentForm();
      case 'transfer':
        return renderTransferForm();
      default:
        return renderAdjustmentForm();
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={getModalTitle()}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {renderFormContent()}

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={!formData.productId || !formData.quantity}
          >
            {mode === 'transfer' ? 'Transferir' : 'Aceptar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
