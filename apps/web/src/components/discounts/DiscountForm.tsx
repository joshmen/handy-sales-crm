import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { Label } from '@/components/ui/Label';
import { SelectCompat as Select } from '@/components/ui/SelectCompat';
import { Badge } from '@/components/ui/Badge';
import { Plus, Trash2, Search, Package } from 'lucide-react';
import {
  DiscountType,
  DiscountMethod,
  QuantityRange,
  CreateDiscountDto
} from '@/types/discounts';
import { useTranslations } from 'next-intl';

interface Product {
  id: string;
  name: string;
  code: string;
  images?: string[];
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
  const t = useTranslations('discounts.form');
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
          <CardTitle>{t('discountType')}</CardTitle>
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
              <div className="font-medium">{t('globalDiscount')}</div>
              <div className="text-sm text-gray-600">
                {t('globalDiscountDesc')}
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
              <div className="font-medium">{t('productDiscount')}</div>
              <div className="text-sm text-gray-600">
                {t('productDiscountDesc')}
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Información básica */}
      <Card>
        <CardHeader>
          <CardTitle>{t('basicInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">{t('discountName')}</Label>
            <Input
              id="name"
              placeholder={t('discountNamePlaceholder')}
              value={formData.name}
              onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="description">{t('descriptionOptional')}</Label>
            <Input
              id="description"
              placeholder={t('descriptionPlaceholder')}
              value={formData.description}
              onChange={(e) => onFormChange({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="method">{t('discountMethod')}</Label>
              <Select
                value={formData.method}
                onChange={(e) => onFormChange({ ...formData, method: e.target.value as DiscountMethod })}
              >
                <option value={DiscountMethod.PERCENTAGE}>{t('percentage')}</option>
                <option value={DiscountMethod.FIXED_AMOUNT}>{t('fixedAmount')}</option>
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
                <span className="text-sm">{t('stackableWithOthers')}</span>
              </label>
            </div>
          </div>

          {/* Selector de producto para descuentos específicos */}
          {formData.type === DiscountType.PRODUCT_SPECIFIC && (
            <div>
              <Label>{t('productLabel')}</Label>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder={t('searchProductPlaceholder')}
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
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center gap-3"
                      >
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt="" className="w-11 h-11 rounded-md object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-11 h-11 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-500">{t('codeLabel')} {product.code}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedProduct && (
                <div className="mt-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {t('selectedProduct')} {selectedProduct.name}
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
          <CardTitle>{t('discountRanges')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.quantityRanges.map((range, index) => (
            <div key={index} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
              <div className="flex-1 grid grid-cols-3 gap-4">
                <div>
                  <Label>{t('minQuantity')}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={range.minQuantity}
                    onChange={(e) => updateQuantityRange(index, 'minQuantity', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label>{t('maxQuantity')}</Label>
                  <Input
                    type="number"
                    placeholder={t('noLimit')}
                    value={range.maxQuantity || ''}
                    onChange={(e) => updateQuantityRange(index, 'maxQuantity', e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
                <div>
                  <Label>{t('discountValue')} ({formData.method === DiscountMethod.PERCENTAGE ? '%' : '$'})</Label>
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
            {t('addRange')}
          </Button>
        </CardContent>
      </Card>

      {/* Configuraciones avanzadas */}
      <Card>
        <CardHeader>
          <CardTitle>{t('advancedSettings')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minimumAmount">{t('minPurchaseAmount')}</Label>
              <Input
                id="minimumAmount"
                type="number"
                min="0"
                step="0.01"
                placeholder={t('noMinimum')}
                value={formData.minimumAmount || ''}
                onChange={(e) => onFormChange({ 
                  ...formData, 
                  minimumAmount: e.target.value ? parseFloat(e.target.value) : undefined 
                })}
              />
            </div>
            <div>
              <Label htmlFor="maximumDiscount">{t('maxDiscountAmount')}</Label>
              <Input
                id="maximumDiscount"
                type="number"
                min="0"
                step="0.01"
                placeholder={t('noLimit')}
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
          <CardTitle>{t('discountValidity')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isPermanent}
              onChange={(e) => onFormChange({ ...formData, isPermanent: e.target.checked })}
              className="rounded"
            />
            <span>{t('permanentDiscount')}</span>
          </label>

          {!formData.isPermanent && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="validFrom">{t('startDate')}</Label>
                <DateTimePicker
                  id="validFrom"
                  mode="date"
                  value={formData.validFrom ? formData.validFrom.toISOString().split('T')[0] : ''}
                  onChange={(val) => onFormChange({ 
                    ...formData, 
                    validFrom: val ? new Date(val) : undefined 
                  })}
                />
              </div>
              <div>
                <Label htmlFor="validTo">{t('endDate')}</Label>
                <DateTimePicker
                  id="validTo"
                  mode="date"
                  value={formData.validTo ? formData.validTo.toISOString().split('T')[0] : ''}
                  onChange={(val) => onFormChange({ 
                    ...formData, 
                    validTo: val ? new Date(val) : undefined 
                  })}
                  min={formData.validFrom ? formData.validFrom.toISOString().split('T')[0] : undefined}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
