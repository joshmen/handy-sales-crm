// src/components/promotions/PromotionForm.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Plus, X, Search } from 'lucide-react';
import {
  PromotionType,
  RewardMethod,
  CreatePromotionDto,
  ApplicationProduct,
  RewardProduct,
  ClientRange,
  PromotionLimits
} from '@/types/promotions';
import { useTranslations } from 'next-intl';

interface PromotionFormProps {
  onSubmit: (data: CreatePromotionDto) => void;
  onCancel: () => void;
  initialData?: Partial<CreatePromotionDto>;
}

export const PromotionForm: React.FC<PromotionFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
}) => {
  const t = useTranslations('promotions.form');
  const tc = useTranslations('common');
  const [formData, setFormData] = useState<CreatePromotionDto>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    type: initialData?.type || PromotionType.PERCENTAGE,
    applicationProducts: initialData?.applicationProducts || [],
    rewardProducts: initialData?.rewardProducts || [],
    clientRanges: initialData?.clientRanges || [],
    limits: initialData?.limits || {
      maxUsagePerClient: undefined,
      maxTotalUsage: undefined,
      maxBudget: undefined,
      maxRewardPieces: undefined,
      allowedZones: [],
      allowedCategories: [],
      startDate: undefined,
      endDate: undefined,
    },
    isStackable: initialData?.isStackable || false,
    requiresApproval: initialData?.requiresApproval || false,
    isVisible: initialData?.isVisible || true,
  });

  const handleInputChange = <K extends keyof CreatePromotionDto>(field: K, value: CreatePromotionDto[K]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLimitsChange = <K extends keyof PromotionLimits>(field: K, value: PromotionLimits[K]) => {
    setFormData(prev => ({
      ...prev,
      limits: {
        ...prev.limits,
        [field]: value
      }
    }));
  };

  const addApplicationProduct = () => {
    const newProduct: Omit<ApplicationProduct, 'id'> = {
      productId: '',
      minimumQuantity: 1,
      description: '',
    };
    
    setFormData(prev => ({
      ...prev,
      applicationProducts: [...prev.applicationProducts, newProduct]
    }));
  };

  const updateApplicationProduct = <K extends keyof ApplicationProduct>(index: number, field: K, value: ApplicationProduct[K]) => {
    setFormData(prev => ({
      ...prev,
      applicationProducts: prev.applicationProducts.map((product, i) => 
        i === index ? { ...product, [field]: value } : product
      )
    }));
  };

  const removeApplicationProduct = (index: number) => {
    setFormData(prev => ({
      ...prev,
      applicationProducts: prev.applicationProducts.filter((_, i) => i !== index)
    }));
  };

  const addRewardProduct = () => {
    const newProduct: Omit<RewardProduct, 'id'> = {
      productId: '',
      maxQuantity: undefined,
      discountValue: 0,
      discountMethod: RewardMethod.FREE,
      description: '',
    };
    
    setFormData(prev => ({
      ...prev,
      rewardProducts: [...prev.rewardProducts, newProduct]
    }));
  };

  const updateRewardProduct = <K extends keyof RewardProduct>(index: number, field: K, value: RewardProduct[K]) => {
    setFormData(prev => ({
      ...prev,
      rewardProducts: prev.rewardProducts.map((product, i) => 
        i === index ? { ...product, [field]: value } : product
      )
    }));
  };

  const removeRewardProduct = (index: number) => {
    setFormData(prev => ({
      ...prev,
      rewardProducts: prev.rewardProducts.filter((_, i) => i !== index)
    }));
  };

  const addClientRange = () => {
    const newRange: Omit<ClientRange, 'id'> = {
      minQuantity: 1,
      maxQuantity: undefined,
      rewardValue: 0,
      rewardMethod: RewardMethod.PERCENTAGE_DISCOUNT,
      description: '',
    };
    
    setFormData(prev => ({
      ...prev,
      clientRanges: [...prev.clientRanges, newRange]
    }));
  };

  const updateClientRange = <K extends keyof ClientRange>(index: number, field: K, value: ClientRange[K]) => {
    setFormData(prev => ({
      ...prev,
      clientRanges: prev.clientRanges.map((range, i) => 
        i === index ? { ...range, [field]: value } : range
      )
    }));
  };

  const removeClientRange = (index: number) => {
    setFormData(prev => ({
      ...prev,
      clientRanges: prev.clientRanges.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Información básica */}
      <Card>
        <CardHeader>
          <CardTitle>{t('generalInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">{t('promotionName')}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder={t('promotionNamePlaceholder')}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">{t('descriptionLabel')}</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder={t('descriptionPlaceholder')}
            />
          </div>

          <div>
            <Label htmlFor="type">{t('promotionType')}</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => handleInputChange('type', value as PromotionType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PromotionType.PERCENTAGE}>{t('typePercentage')}</SelectItem>
                <SelectItem value={PromotionType.SPECIAL_CLUB}>{t('typeSpecialClub')}</SelectItem>
                <SelectItem value={PromotionType.BUY_X_GET_Y}>{t('typeBuyXGetY')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Productos de aplicación */}
      <Card>
        <CardHeader>
          <CardTitle>{t('applicationProducts')}</CardTitle>
          <p className="text-sm text-foreground/70">
            {t('applicationProductsDesc')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.applicationProducts.map((product, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">{t('productN', { n: index + 1 })}</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeApplicationProduct(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>{t('searchProduct')}</Label>
                  <div className="relative">
                    <Input
                      value={product.productId}
                      onChange={(e) => updateApplicationProduct(index, 'productId', e.target.value)}
                      placeholder={t('searchProductPlaceholder')}
                    />
                    <Search className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                
                <div>
                  <Label>{t('minQuantity')}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={product.minimumQuantity}
                    onChange={(e) => updateApplicationProduct(index, 'minimumQuantity', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <Label>{t('noProductAddedLabel')}</Label>
                <Input
                  value={product.description || ''}
                  onChange={(e) => updateApplicationProduct(index, 'description', e.target.value)}
                  placeholder={t('optionalDescription')}
                />
              </div>
            </div>
          ))}
          
          <Button
            type="button"
            variant="outline"
            onClick={addApplicationProduct}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('addApplicationProduct')}
          </Button>
        </CardContent>
      </Card>

      {/* Productos de recompensa */}
      <Card>
        <CardHeader>
          <CardTitle>{t('rewardProducts')}</CardTitle>
          <p className="text-sm text-foreground/70">
            {t('rewardProductsDesc')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.rewardProducts.map((product, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">{t('rewardN', { n: index + 1 })}</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeRewardProduct(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>{t('searchProduct')}</Label>
                  <div className="relative">
                    <Input
                      value={product.productId}
                      onChange={(e) => updateRewardProduct(index, 'productId', e.target.value)}
                      placeholder={t('searchProductPlaceholder')}
                    />
                    <Search className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                
                <div>
                  <Label>{t('rewardMethod')}</Label>
                  <Select 
                    value={product.discountMethod} 
                    onValueChange={(value) => updateRewardProduct(index, 'discountMethod', value as RewardMethod)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={RewardMethod.FREE}>{t('rewardFree')}</SelectItem>
                      <SelectItem value={RewardMethod.PERCENTAGE_DISCOUNT}>{t('rewardPercentageDiscount')}</SelectItem>
                      <SelectItem value={RewardMethod.FIXED_DISCOUNT}>{t('rewardFixedDiscount')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {product.discountMethod !== RewardMethod.FREE && (
                  <div>
                    <Label>
                      {product.discountMethod === RewardMethod.PERCENTAGE_DISCOUNT ? t('percentageLabel') : t('fixedAmountLabel')}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={product.discountValue}
                      onChange={(e) => updateRewardProduct(index, 'discountValue', parseFloat(e.target.value))}
                      placeholder={product.discountMethod === RewardMethod.PERCENTAGE_DISCOUNT ? '10' : '100.00'}
                    />
                  </div>
                )}
              </div>
              
              <div>
                <Label>{t('noRewardProductLabel')}</Label>
                <Input
                  value={product.description || ''}
                  onChange={(e) => updateRewardProduct(index, 'description', e.target.value)}
                  placeholder={t('optionalDescription')}
                />
              </div>
            </div>
          ))}
          
          <Button
            type="button"
            variant="outline"
            onClick={addRewardProduct}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('addRewardProduct')}
          </Button>
        </CardContent>
      </Card>

      {/* Rangos de clientes */}
      <Card>
        <CardHeader>
          <CardTitle>{t('ranges')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.clientRanges.map((range, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">{t('rangeN', { n: index + 1 })}</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeClientRange(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <Label>{t('minQty')}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={range.minQuantity}
                    onChange={(e) => updateClientRange(index, 'minQuantity', parseInt(e.target.value))}
                  />
                </div>
                
                <div>
                  <Label>{t('maxQty')}</Label>
                  <Input
                    type="number"
                    value={range.maxQuantity || ''}
                    onChange={(e) => updateClientRange(index, 'maxQuantity', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder={t('noLimit')}
                  />
                </div>
                
                <div>
                  <Label>{t('methodLabel')}</Label>
                  <Select 
                    value={range.rewardMethod} 
                    onValueChange={(value) => updateClientRange(index, 'rewardMethod', value as RewardMethod)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={RewardMethod.FREE}>{t('rewardFree')}</SelectItem>
                      <SelectItem value={RewardMethod.PERCENTAGE_DISCOUNT}>{t('percentageLabel')}</SelectItem>
                      <SelectItem value={RewardMethod.FIXED_DISCOUNT}>{t('fixedAmountLabel')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>{t('rewardValue')}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={range.rewardValue}
                    onChange={(e) => updateClientRange(index, 'rewardValue', parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </div>
          ))}
          
          <Button
            type="button"
            variant="outline"
            onClick={addClientRange}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('addClientRange')}
          </Button>
        </CardContent>
      </Card>

      {/* Limitantes */}
      <Card>
        <CardHeader>
          <CardTitle>{t('limits')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maxUsagePerClient">{t('maxUsagePerClient')}</Label>
              <Input
                id="maxUsagePerClient"
                type="number"
                min="1"
                value={formData.limits.maxUsagePerClient || ''}
                onChange={(e) => handleLimitsChange('maxUsagePerClient', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder={t('noLimit')}
              />
            </div>

            <div>
              <Label htmlFor="maxTotalUsage">{t('maxTotalUsage')}</Label>
              <Input
                id="maxTotalUsage"
                type="number" 
                min="1"
                value={formData.limits.maxTotalUsage || ''}
                onChange={(e) => handleLimitsChange('maxTotalUsage', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder={t('noLimit')}
              />
            </div>

            <div>
              <Label htmlFor="maxBudget">{t('maxBudget')}</Label>
              <Input
                id="maxBudget"
                type="number"
                min="0"
                step="0.01"
                value={formData.limits.maxBudget || ''}
                onChange={(e) => handleLimitsChange('maxBudget', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder={t('noLimit')}
              />
            </div>

            <div>
              <Label htmlFor="maxRewardPieces">{t('maxRewardPieces')}</Label>
              <Input
                id="maxRewardPieces"
                type="number"
                min="0"
                value={formData.limits.maxRewardPieces || ''}
                onChange={(e) => handleLimitsChange('maxRewardPieces', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder={t('noLimit')}
              />
            </div>

            <div>
              <Label htmlFor="startDate">{t('dateRangeStart')}</Label>
              <DateTimePicker
                id="startDate"
                mode="date"
                value={formData.limits.startDate ? formData.limits.startDate.toISOString().split('T')[0] : ''}
                onChange={(val) => handleLimitsChange('startDate', val ? new Date(val) : undefined)}
              />
            </div>

            <div>
              <Label htmlFor="endDate">{t('dateRangeEnd')}</Label>
              <DateTimePicker
                id="endDate"
                mode="date"
                value={formData.limits.endDate ? formData.limits.endDate.toISOString().split('T')[0] : ''}
                onChange={(val) => handleLimitsChange('endDate', val ? new Date(val) : undefined)}
                min={formData.limits.startDate ? formData.limits.startDate.toISOString().split('T')[0] : undefined}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuraciones adicionales */}
      <Card>
        <CardHeader>
          <CardTitle>{t('additionalSettings')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isStackable"
              checked={formData.isStackable}
              onChange={(e) => handleInputChange('isStackable', e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="isStackable">{t('allowStackable')}</Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="requiresApproval"
              checked={formData.requiresApproval}
              onChange={(e) => handleInputChange('requiresApproval', e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="requiresApproval">{t('requiresApproval')}</Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isVisible"
              checked={formData.isVisible}
              onChange={(e) => handleInputChange('isVisible', e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="isVisible">{t('visibleToVendors')}</Label>
          </div>
        </CardContent>
      </Card>

      {/* Botones de acción */}
      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          {tc('cancel')}
        </Button>
        <Button type="submit">
          {t('createPromotion')}
        </Button>
      </div>
    </form>
  );
};