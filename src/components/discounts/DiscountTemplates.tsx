import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';
import { QuantityRange } from '@/types/discounts';

interface DiscountTemplate {
  id: string;
  name: string;
  description: string;
  ranges: Omit<QuantityRange, 'id'>[];
}

interface DiscountTemplatesProps {
  selectedTemplate: string;
  onTemplateSelect: (templateId: string) => void;
}

// Plantillas predefinidas
const discountTemplates: DiscountTemplate[] = [
  {
    id: 'bulk-standard',
    name: 'Descuento por Volumen Estándar',
    description: 'Plantilla común para descuentos por cantidad',
    ranges: [
      { minQuantity: 1, maxQuantity: 10, discountValue: 2, description: '1-10 unidades: 2%' },
      { minQuantity: 11, maxQuantity: 50, discountValue: 5, description: '11-50 unidades: 5%' },
      { minQuantity: 51, discountValue: 10, description: '51+ unidades: 10%' },
    ]
  },
  {
    id: 'aggressive-bulk',
    name: 'Descuento Agresivo por Volumen',
    description: 'Descuentos más altos para incentivar compras grandes',
    ranges: [
      { minQuantity: 1, maxQuantity: 24, discountValue: 5, description: '1-24 unidades: 5%' },
      { minQuantity: 25, maxQuantity: 99, discountValue: 12, description: '25-99 unidades: 12%' },
      { minQuantity: 100, discountValue: 20, description: '100+ unidades: 20%' },
    ]
  },
  {
    id: 'wholesale',
    name: 'Descuento Mayorista',
    description: 'Descuentos para ventas al por mayor',
    ranges: [
      { minQuantity: 50, maxQuantity: 199, discountValue: 8, description: '50-199 unidades: 8%' },
      { minQuantity: 200, maxQuantity: 499, discountValue: 15, description: '200-499 unidades: 15%' },
      { minQuantity: 500, discountValue: 25, description: '500+ unidades: 25%' },
    ]
  },
  {
    id: 'retail-small',
    name: 'Descuento Minorista',
    description: 'Descuentos pequeños para ventas al detalle',
    ranges: [
      { minQuantity: 1, maxQuantity: 5, discountValue: 2, description: '1-5 unidades: 2%' },
      { minQuantity: 6, maxQuantity: 15, discountValue: 4, description: '6-15 unidades: 4%' },
      { minQuantity: 16, discountValue: 7, description: '16+ unidades: 7%' },
    ]
  },
  {
    id: 'seasonal-promo',
    name: 'Promoción Estacional',
    description: 'Descuentos promocionales para temporadas especiales',
    ranges: [
      { minQuantity: 1, maxQuantity: 2, discountValue: 10, description: '1-2 unidades: 10%' },
      { minQuantity: 3, maxQuantity: 9, discountValue: 15, description: '3-9 unidades: 15%' },
      { minQuantity: 10, discountValue: 25, description: '10+ unidades: 25%' },
    ]
  },
];

export function DiscountTemplates({
  selectedTemplate,
  onTemplateSelect,
}: DiscountTemplatesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Plantillas predefinidas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-gray-600 mb-4">
          Selecciona una plantilla para aplicar rangos predefinidos:
        </div>
        
        {discountTemplates.map(template => (
          <button
            key={template.id}
            onClick={() => onTemplateSelect(template.id)}
            className={`w-full text-left p-3 border rounded-lg transition-all ${
              selectedTemplate === template.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium text-sm">{template.name}</div>
            <div className="text-xs text-gray-600 mt-1">{template.description}</div>
            <div className="mt-2 space-y-1">
              {template.ranges.map((range, index) => (
                <div key={index} className="text-xs text-gray-500">
                  {range.description}
                </div>
              ))}
            </div>
          </button>
        ))}

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-600">
            <strong>Nota:</strong> Las plantillas son puntos de partida. Puedes personalizar 
            los rangos y valores después de seleccionar una plantilla.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { discountTemplates };
export type { DiscountTemplate };
