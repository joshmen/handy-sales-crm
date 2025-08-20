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

interface InventoryAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InventoryAdjustmentForm) => void;
  products: Product[];
  selectedProduct?: Product;
  currentStock?: number;
  loading?: boolean;
}

export function InventoryAdjustmentDialog({
  open,
  onOpenChange,
  onSubmit,
  products,
  selectedProduct,
  currentStock = 0,
  loading = false,
}: InventoryAdjustmentDialogProps) {
  const [formData, setFormData] = useState<InventoryAdjustmentForm>({
    productId: '',
    type: InventoryAdjustmentType.INCREASE,
    quantity: 0,
    reason: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when dialog opens/closes or product changes
  useEffect(() => {
    if (selectedProduct) {
      setFormData(prev => ({
        ...prev,
        productId: selectedProduct.id,
      }));
    }
    if (!open) {
      setFormData({
        productId: '',
        type: InventoryAdjustmentType.INCREASE,
        quantity: 0,
        reason: '',
      });
      setErrors({});
    }
  }, [open, selectedProduct]);

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

    if (formData.type === InventoryAdjustmentType.DECREASE && formData.quantity > currentStock) {
      newErrors.quantity = 'No puedes disminuir más cantidad de la que tienes en stock';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSubmit(formData);
  };

  const adjustmentTypeOptions = [
    { value: InventoryAdjustmentType.INCREASE, label: 'Cantidad a aumentar' },
    { value: InventoryAdjustmentType.DECREASE, label: 'Cantidad a disminuir' },
    { value: InventoryAdjustmentType.SET_NEW, label: 'Nuevo inventario' },
  ];

  const productOptions = products.map(product => ({
    value: product.id,
    label: `${product.code} - ${product.name}`,
  }));

  return (
    <Modal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="Agregar ajuste de inventario"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Selection */}
          <div className="space-y-2">
            <Label htmlFor="product">Buscar producto</Label>
            <Select
              value={formData.productId}
              onValueChange={(value) =>
                setFormData(prev => ({ ...prev, productId: value }))
              }
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
          {formData.productId && (
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
                    checked={formData.type === option.value}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        type: e.target.value as InventoryAdjustmentType,
                      }))
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
              {formData.type === InventoryAdjustmentType.SET_NEW 
                ? 'Nueva cantidad' 
                : 'Cantidad'
              }
            </Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              value={formData.quantity || ''}
              onChange={(e) =>
                setFormData(prev => ({
                  ...prev,
                  quantity: parseInt(e.target.value) || 0,
                }))
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
              value={formData.reason}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, reason: e.target.value }))
              }
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              placeholder="Describe el motivo del ajuste..."
              rows={3}
            />
          </div>

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
              Aceptar
            </Button>
          </div>
        </form>
    </Modal>
  );
}
