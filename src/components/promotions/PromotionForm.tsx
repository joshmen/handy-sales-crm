// src/components/promotions/PromotionForm.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
          <CardTitle>Información General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre de la promoción *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Ej: Promoción por volumen 2024"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="La promoción será no fue solo configurada"
            />
          </div>

          <div>
            <Label htmlFor="type">Tipo de promoción *</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => handleInputChange('type', value as PromotionType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PromotionType.PERCENTAGE}>Por porcentaje</SelectItem>
                <SelectItem value={PromotionType.SPECIAL_CLUB}>Club especial por recomendación</SelectItem>
                <SelectItem value={PromotionType.BUY_X_GET_Y}>Compra X obtén Y</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Productos de aplicación */}
      <Card>
        <CardHeader>
          <CardTitle>Productos de Aplicación</CardTitle>
          <p className="text-sm text-gray-600">
            Productos que debe comprar el cliente para obtener el incentivo
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.applicationProducts.map((product, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Producto {index + 1}</h4>
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
                  <Label>Buscar producto</Label>
                  <div className="relative">
                    <Input
                      value={product.productId}
                      onChange={(e) => updateApplicationProduct(index, 'productId', e.target.value)}
                      placeholder="Buscar producto..."
                    />
                    <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                  </div>
                </div>
                
                <div>
                  <Label>Cantidad mínima</Label>
                  <Input
                    type="number"
                    min="1"
                    value={product.minimumQuantity}
                    onChange={(e) => updateApplicationProduct(index, 'minimumQuantity', parseInt(e.target.value))}
                  />
                </div>
              </div>
              
              <div>
                <Label>Aquí no se le agregado ningún producto a la promoción</Label>
                <Input
                  value={product.description || ''}
                  onChange={(e) => updateApplicationProduct(index, 'description', e.target.value)}
                  placeholder="Descripción opcional..."
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
            Agregar producto de aplicación
          </Button>
        </CardContent>
      </Card>

      {/* Productos de recompensa */}
      <Card>
        <CardHeader>
          <CardTitle>Productos de Recompensa</CardTitle>
          <p className="text-sm text-gray-600">
            Productos que se podrán descontar antes como parte de la promoción
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.rewardProducts.map((product, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Recompensa {index + 1}</h4>
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
                  <Label>Buscar producto</Label>
                  <div className="relative">
                    <Input
                      value={product.productId}
                      onChange={(e) => updateRewardProduct(index, 'productId', e.target.value)}
                      placeholder="Buscar producto..."
                    />
                    <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                  </div>
                </div>
                
                <div>
                  <Label>Método de recompensa</Label>
                  <Select 
                    value={product.discountMethod} 
                    onValueChange={(value) => updateRewardProduct(index, 'discountMethod', value as RewardMethod)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={RewardMethod.FREE}>Gratis</SelectItem>
                      <SelectItem value={RewardMethod.PERCENTAGE_DISCOUNT}>Descuento porcentual</SelectItem>
                      <SelectItem value={RewardMethod.FIXED_DISCOUNT}>Descuento fijo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {product.discountMethod !== RewardMethod.FREE && (
                  <div>
                    <Label>
                      {product.discountMethod === RewardMethod.PERCENTAGE_DISCOUNT ? 'Porcentaje' : 'Monto fijo'}
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
                <Label>Aquí no se le agregado ningún producto a la recompensa a la promoción</Label>
                <Input
                  value={product.description || ''}
                  onChange={(e) => updateRewardProduct(index, 'description', e.target.value)}
                  placeholder="Descripción opcional..."
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
            Agregar producto de recompensa
          </Button>
        </CardContent>
      </Card>

      {/* Rangos de clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Rangos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.clientRanges.map((range, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Rango {index + 1}: El cliente compra</h4>
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
                  <Label>Cantidad mín</Label>
                  <Input
                    type="number"
                    min="1"
                    value={range.minQuantity}
                    onChange={(e) => updateClientRange(index, 'minQuantity', parseInt(e.target.value))}
                  />
                </div>
                
                <div>
                  <Label>Cantidad máx</Label>
                  <Input
                    type="number"
                    value={range.maxQuantity || ''}
                    onChange={(e) => updateClientRange(index, 'maxQuantity', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Sin límite"
                  />
                </div>
                
                <div>
                  <Label>Método</Label>
                  <Select 
                    value={range.rewardMethod} 
                    onValueChange={(value) => updateClientRange(index, 'rewardMethod', value as RewardMethod)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={RewardMethod.FREE}>Gratis</SelectItem>
                      <SelectItem value={RewardMethod.PERCENTAGE_DISCOUNT}>Porcentaje</SelectItem>
                      <SelectItem value={RewardMethod.FIXED_DISCOUNT}>Monto fijo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Valor recompensa</Label>
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
            Agregar rango cliente
          </Button>
        </CardContent>
      </Card>

      {/* Limitantes */}
      <Card>
        <CardHeader>
          <CardTitle>Limitantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maxUsagePerClient">Límite que un cliente puede utilizar la promoción</Label>
              <Input
                id="maxUsagePerClient"
                type="number"
                min="1"
                value={formData.limits.maxUsagePerClient || ''}
                onChange={(e) => handleLimitsChange('maxUsagePerClient', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Sin límite"
              />
            </div>

            <div>
              <Label htmlFor="maxTotalUsage">Límite de cuantas veces puede usar la promoción</Label>
              <Input
                id="maxTotalUsage"
                type="number" 
                min="1"
                value={formData.limits.maxTotalUsage || ''}
                onChange={(e) => handleLimitsChange('maxTotalUsage', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Sin límite"
              />
            </div>

            <div>
              <Label htmlFor="maxBudget">Límite de presupuesto para la promoción</Label>
              <Input
                id="maxBudget"
                type="number"
                min="0"
                step="0.01"
                value={formData.limits.maxBudget || ''}
                onChange={(e) => handleLimitsChange('maxBudget', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="Sin límite"
              />
            </div>

            <div>
              <Label htmlFor="maxRewardPieces">Cantidad de piezas disponibles para la promoción</Label>
              <Input
                id="maxRewardPieces"
                type="number"
                min="0"
                value={formData.limits.maxRewardPieces || ''}
                onChange={(e) => handleLimitsChange('maxRewardPieces', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Sin límite"
              />
            </div>

            <div>
              <Label htmlFor="startDate">Rango de fechas para la promoción (inicio)</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.limits.startDate ? formData.limits.startDate.toISOString().split('T')[0] : ''}
                onChange={(e) => handleLimitsChange('startDate', e.target.value ? new Date(e.target.value) : undefined)}
              />
            </div>

            <div>
              <Label htmlFor="endDate">Rango de fechas para la promoción (fin)</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.limits.endDate ? formData.limits.endDate.toISOString().split('T')[0] : ''}
                onChange={(e) => handleLimitsChange('endDate', e.target.value ? new Date(e.target.value) : undefined)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuraciones adicionales */}
      <Card>
        <CardHeader>
          <CardTitle>Configuraciones Adicionales</CardTitle>
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
            <Label htmlFor="isStackable">Permitir combinar con otras promociones</Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="requiresApproval"
              checked={formData.requiresApproval}
              onChange={(e) => handleInputChange('requiresApproval', e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="requiresApproval">Requiere aprobación manual</Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isVisible"
              checked={formData.isVisible}
              onChange={(e) => handleInputChange('isVisible', e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="isVisible">Visible para vendedores</Label>
          </div>
        </CardContent>
      </Card>

      {/* Botones de acción */}
      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          Crear promoción
        </Button>
      </div>
    </form>
  );
};