import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Info, AlertCircle } from 'lucide-react';
import { 
  CreateDiscountDto, 
  DiscountType, 
  DiscountMethod 
} from '@/types/discounts';

interface DiscountPreviewProps {
  formData: CreateDiscountDto;
  productName?: string;
  showHelp?: boolean;
}

export function DiscountPreview({ 
  formData, 
  productName,
  showHelp = true 
}: DiscountPreviewProps) {
  const hasValidRanges = formData.quantityRanges.some(range => 
    range.minQuantity > 0 && range.discountValue > 0
  );

  const hasValidDates = formData.isPermanent || 
    (formData.validFrom && formData.validTo && formData.validFrom < formData.validTo);

  const getValidationWarnings = () => {
    const warnings = [];
    
    if (!formData.name.trim()) {
      warnings.push('Nombre del descuento requerido');
    }
    
    if (!hasValidRanges) {
      warnings.push('Debe tener al menos un rango con valores válidos');
    }
    
    if (!hasValidDates) {
      warnings.push('Fechas de vigencia inválidas');
    }
    
    if (formData.type === DiscountType.PRODUCT_SPECIFIC && !formData.productId) {
      warnings.push('Debe seleccionar un producto');
    }

    // Verificar solapamiento de rangos
    const sortedRanges = [...formData.quantityRanges]
      .filter(r => r.minQuantity > 0)
      .sort((a, b) => a.minQuantity - b.minQuantity);
    
    for (let i = 0; i < sortedRanges.length - 1; i++) {
      const current = sortedRanges[i];
      const next = sortedRanges[i + 1];
      
      if (current.maxQuantity && current.maxQuantity >= next.minQuantity) {
        warnings.push('Algunos rangos se superponen');
        break;
      }
    }
    
    return warnings;
  };

  const warnings = getValidationWarnings();

  return (
    <div className="space-y-6">
      {/* Vista previa */}
      <Card>
        <CardHeader>
          <CardTitle>Vista previa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium">Nombre:</div>
              <div className="text-sm text-gray-600">
                {formData.name || 'Sin nombre'}
              </div>
            </div>
            
            {formData.description && (
              <div>
                <div className="text-sm font-medium">Descripción:</div>
                <div className="text-sm text-gray-600">{formData.description}</div>
              </div>
            )}
            
            <div>
              <div className="text-sm font-medium">Tipo:</div>
              <Badge variant="outline">
                {formData.type === DiscountType.GLOBAL ? 'Global' : 'Por Producto'}
              </Badge>
            </div>

            {formData.type === DiscountType.PRODUCT_SPECIFIC && productName && (
              <div>
                <div className="text-sm font-medium">Producto:</div>
                <div className="text-sm text-gray-600">{productName}</div>
              </div>
            )}

            <div>
              <div className="text-sm font-medium">Método:</div>
              <Badge variant="outline">
                {formData.method === DiscountMethod.PERCENTAGE ? 'Porcentaje' : 'Monto fijo'}
              </Badge>
            </div>

            <div>
              <div className="text-sm font-medium">Rangos:</div>
              <div className="space-y-1">
                {formData.quantityRanges
                  .filter(range => range.minQuantity > 0 && range.discountValue > 0)
                  .map((range, index) => (
                    <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      {range.minQuantity}{range.maxQuantity ? `-${range.maxQuantity}` : '+'} unidades: 
                      {' '}{range.discountValue}{formData.method === DiscountMethod.PERCENTAGE ? '%' : '$'}
                    </div>
                  ))}
                {formData.quantityRanges.filter(r => r.minQuantity > 0 && r.discountValue > 0).length === 0 && (
                  <div className="text-xs text-gray-400 italic">Sin rangos configurados</div>
                )}
              </div>
            </div>

            {formData.minimumAmount && (
              <div>
                <div className="text-sm font-medium">Monto mínimo:</div>
                <div className="text-sm text-gray-600">${formData.minimumAmount}</div>
              </div>
            )}

            {formData.maximumDiscount && (
              <div>
                <div className="text-sm font-medium">Descuento máximo:</div>
                <div className="text-sm text-gray-600">${formData.maximumDiscount}</div>
              </div>
            )}

            <div>
              <div className="text-sm font-medium">Vigencia:</div>
              <div className="text-sm text-gray-600">
                {formData.isPermanent ? 'Permanente' : 
                  formData.validFrom && formData.validTo ?
                    `${formData.validFrom.toLocaleDateString()} - ${formData.validTo.toLocaleDateString()}` :
                    'Fechas no configuradas'
                }
              </div>
            </div>

            <div>
              <div className="text-sm font-medium">Configuración:</div>
              <div className="flex flex-wrap gap-1 mt-1">
                <Badge variant="outline" className="text-xs">
                  {formData.isStackable ? 'Combinable' : 'No combinable'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validaciones */}
      {warnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle size={16} />
              Validaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {warnings.map((warning, index) => (
                <div key={index} className="text-sm text-orange-600 flex items-center gap-2">
                  <div className="w-1 h-1 bg-orange-600 rounded-full"></div>
                  {warning}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ayuda */}
      {showHelp && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info size={16} />
              Ayuda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>Descuentos globales:</strong> Se aplican según la cantidad total de productos en la orden.</p>
              <p><strong>Descuentos por producto:</strong> Se aplican solo al producto específico seleccionado.</p>
              <p><strong>Rangos:</strong> Define cantidad mínima y máxima para cada nivel de descuento.</p>
              <p><strong>Combinables:</strong> Permite que este descuento se use junto con otros.</p>
              <p><strong>Tip:</strong> Los rangos no deben superponerse y deben estar ordenados de menor a mayor cantidad.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
