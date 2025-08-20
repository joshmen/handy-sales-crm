import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { SelectCompat as Select } from '@/components/ui/SelectCompat';
import { Badge } from '@/components/ui/Badge';
import { Plus, Trash2, Search } from 'lucide-react';
import { 
  DiscountType, 
  DiscountMethod, 
  QuantityRange,
  CreateDiscountDto 
} from '@/types/discounts';

interface Product {
  id: string;
  name: string;
  code: string;
}

interface DiscountFormProps {
  formData: CreateDiscountDto;
  onFormChange: (data: CreateDiscountDto) => void;
  products?: Product[];
  onTypeChange?: (type: DiscountType) => void;
}

export function DiscountForm({ 
  formData, 
  onFormChange, 
  products = [],
  onTypeChange 
}: DiscountFormProps) {
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.code.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleTypeChange = (newType: DiscountType) => {
    const updatedData = { ...formData, type: newType, productId: undefined };
    onFormChange(updatedData);
    onTypeChange?.(newType);
  };

  const addQuantityRange = () => {
    const lastRange = formData.quantityRanges[formData.quantityRanges.length - 1];
    const newMinQuantity = lastRange.maxQuantity ? lastRange.maxQuantity + 1 : lastRange.minQuantity + 1;
    
    onFormChange({
      ...formData,
      quantityRanges: [
        ...formData.quantityRanges,
        {
          minQuantity: newMinQuantity,
          maxQuantity: undefined,
          discountValue: 0,
          description: ''
        }
      ]
    });
  };

  const removeQuantityRange = (index: number) => {
    if (formData.quantityRanges.length > 1) {
      onFormChange({
        ...formData,
        quantityRanges: formData.quantityRanges.filter((_, i) => i !== index)
      });
    }
  };

  const updateQuantityRange = (index: number, field: keyof QuantityRange, value: QuantityRange[keyof QuantityRange]) => {
    onFormChange({
      ...formData,
      quantityRanges: formData.quantityRanges.map((range, i) => 
        i === index ? { ...range, [field]: value } : range
      )
    });
  };

  const selectedProduct = products.find(p => p.id === formData.productId);

  return (
    <div className="space-y-6">
      {/* Tipo de descuento */}
      <Card>
        <CardHeader>
          <CardTitle>Tipo de descuento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleTypeChange(DiscountType.GLOBAL)}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                formData.type === DiscountType.GLOBAL
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">Descuento global</div>
              <div className="text-sm text-gray-600">
                Aplica a cualquier producto según cantidad total
              </div>
            </button>
            
            <button
              onClick={() => handleTypeChange(DiscountType.PRODUCT_SPECIFIC)}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                formData.type === DiscountType.PRODUCT_SPECIFIC
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">Descuento por producto</div>
              <div className="text-sm text-gray-600">
                Aplica solo a un producto específico
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Información básica */}
      <Card>
        <CardHeader>
          <CardTitle>Información básica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre del descuento</Label>
            <Input
              id="name"
              placeholder="Ej: Descuento por volumen estándar"
              value={formData.name}
              onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Input
              id="description"
              placeholder="Describe cómo funciona este descuento"
              value={formData.description}
              onChange={(e) => onFormChange({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="method">Método de descuento</Label>
              <Select
                value={formData.method}
                onChange={(e) => onFormChange({ ...formData, method: e.target.value as DiscountMethod })}
              >
                <option value={DiscountMethod.PERCENTAGE}>Porcentaje (%)</option>
                <option value={DiscountMethod.FIXED_AMOUNT}>Monto fijo ($)</option>
              </Select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isStackable}
                  onChange={(e) => onFormChange({ ...formData, isStackable: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Combinable con otros descuentos</span>
              </label>
            </div>
          </div>

          {/* Selector de producto para descuentos específicos */}
          {formData.type === DiscountType.PRODUCT_SPECIFIC && (
            <div>
              <Label>Producto</Label>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar producto por nombre o código..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowProductSearch(true);
                    }}
                    onFocus={() => setShowProductSearch(true)}
                    className="pl-10"
                  />
                </div>
                
                {showProductSearch && filteredProducts.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredProducts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => {
                          onFormChange({ ...formData, productId: product.id });
                          setProductSearch(`${product.code} - ${product.name}`);
                          setShowProductSearch(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-500">Código: {product.code}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedProduct && (
                <div className="mt-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    Producto seleccionado: {selectedProduct.name}
                  </Badge>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rangos de cantidad */}
      <Card>
        <CardHeader>
          <CardTitle>Rangos de descuento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.quantityRanges.map((range, index) => (
            <div key={index} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
              <div className="flex-1 grid grid-cols-3 gap-4">
                <div>
                  <Label>Cantidad mínima</Label>
                  <Input
                    type="number"
                    min="1"
                    value={range.minQuantity}
                    onChange={(e) => updateQuantityRange(index, 'minQuantity', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label>Cantidad máxima</Label>
                  <Input
                    type="number"
                    placeholder="Sin límite"
                    value={range.maxQuantity || ''}
                    onChange={(e) => updateQuantityRange(index, 'maxQuantity', e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
                <div>
                  <Label>Descuento ({formData.method === DiscountMethod.PERCENTAGE ? '%' : '$'})</Label>
                  <Input
                    type="number"
                    min="0"
                    step={formData.method === DiscountMethod.PERCENTAGE ? "0.1" : "0.01"}
                    value={range.discountValue}
                    onChange={(e) => updateQuantityRange(index, 'discountValue', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeQuantityRange(index)}
                disabled={formData.quantityRanges.length === 1}
                className="text-red-600"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
          
          <Button
            variant="outline"
            onClick={addQuantityRange}
            className="w-full"
          >
            <Plus size={16} className="mr-2" />
            Agregar rango
          </Button>
        </CardContent>
      </Card>

      {/* Configuraciones avanzadas */}
      <Card>
        <CardHeader>
          <CardTitle>Configuraciones avanzadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minimumAmount">Monto mínimo de compra ($)</Label>
              <Input
                id="minimumAmount"
                type="number"
                min="0"
                step="0.01"
                placeholder="Sin mínimo"
                value={formData.minimumAmount || ''}
                onChange={(e) => onFormChange({ 
                  ...formData, 
                  minimumAmount: e.target.value ? parseFloat(e.target.value) : undefined 
                })}
              />
            </div>
            <div>
              <Label htmlFor="maximumDiscount">Descuento máximo ($)</Label>
              <Input
                id="maximumDiscount"
                type="number"
                min="0"
                step="0.01"
                placeholder="Sin límite"
                value={formData.maximumDiscount || ''}
                onChange={(e) => onFormChange({ 
                  ...formData, 
                  maximumDiscount: e.target.value ? parseFloat(e.target.value) : undefined 
                })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vigencia */}
      <Card>
        <CardHeader>
          <CardTitle>Vigencia del descuento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isPermanent}
              onChange={(e) => onFormChange({ ...formData, isPermanent: e.target.checked })}
              className="rounded"
            />
            <span>Descuento permanente</span>
          </label>

          {!formData.isPermanent && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="validFrom">Fecha de inicio</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={formData.validFrom ? formData.validFrom.toISOString().split('T')[0] : ''}
                  onChange={(e) => onFormChange({ 
                    ...formData, 
                    validFrom: e.target.value ? new Date(e.target.value) : undefined 
                  })}
                />
              </div>
              <div>
                <Label htmlFor="validTo">Fecha de fin</Label>
                <Input
                  id="validTo"
                  type="date"
                  value={formData.validTo ? formData.validTo.toISOString().split('T')[0] : ''}
                  onChange={(e) => onFormChange({ 
                    ...formData, 
                    validTo: e.target.value ? new Date(e.target.value) : undefined 
                  })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
