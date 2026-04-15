import React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';
import { QuantityRange } from '@/types/discounts';

interface DiscountTemplate {
  id: string;
  nameKey: string;
  descKey: string;
  ranges: Omit<QuantityRange, 'id'>[];
}

interface DiscountTemplatesProps {
  selectedTemplate: string;
  onTemplateSelect: (templateId: string) => void;
}

const discountTemplates: DiscountTemplate[] = [
  {
    id: 'bulk-standard',
    nameKey: 'bulkStandard',
    descKey: 'bulkStandardDesc',
    ranges: [
      { minQuantity: 1, maxQuantity: 10, discountValue: 2, description: '1-10: 2%' },
      { minQuantity: 11, maxQuantity: 50, discountValue: 5, description: '11-50: 5%' },
      { minQuantity: 51, discountValue: 10, description: '51+: 10%' },
    ]
  },
  {
    id: 'aggressive-bulk',
    nameKey: 'aggressiveBulk',
    descKey: 'aggressiveBulkDesc',
    ranges: [
      { minQuantity: 1, maxQuantity: 24, discountValue: 5, description: '1-24: 5%' },
      { minQuantity: 25, maxQuantity: 99, discountValue: 12, description: '25-99: 12%' },
      { minQuantity: 100, discountValue: 20, description: '100+: 20%' },
    ]
  },
  {
    id: 'wholesale',
    nameKey: 'wholesale',
    descKey: 'wholesaleDesc',
    ranges: [
      { minQuantity: 50, maxQuantity: 199, discountValue: 8, description: '50-199: 8%' },
      { minQuantity: 200, maxQuantity: 499, discountValue: 15, description: '200-499: 15%' },
      { minQuantity: 500, discountValue: 25, description: '500+: 25%' },
    ]
  },
  {
    id: 'retail-small',
    nameKey: 'retail',
    descKey: 'retailDesc',
    ranges: [
      { minQuantity: 1, maxQuantity: 5, discountValue: 2, description: '1-5: 2%' },
      { minQuantity: 6, maxQuantity: 15, discountValue: 4, description: '6-15: 4%' },
      { minQuantity: 16, discountValue: 7, description: '16+: 7%' },
    ]
  },
  {
    id: 'seasonal-promo',
    nameKey: 'seasonal',
    descKey: 'seasonalDesc',
    ranges: [
      { minQuantity: 1, maxQuantity: 2, discountValue: 10, description: '1-2: 10%' },
      { minQuantity: 3, maxQuantity: 9, discountValue: 15, description: '3-9: 15%' },
      { minQuantity: 10, discountValue: 25, description: '10+: 25%' },
    ]
  },
];

export function DiscountTemplates({
  selectedTemplate,
  onTemplateSelect,
}: DiscountTemplatesProps) {
  const t = useTranslations('discounts.templates');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-foreground/70 mb-4">
          {t('selectTemplate')}
        </div>

        {discountTemplates.map(template => (
          <button
            key={template.id}
            onClick={() => onTemplateSelect(template.id)}
            className={`w-full text-left p-3 border rounded-lg transition-all ${
              selectedTemplate === template.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-border-subtle hover:border-border-default'
            }`}
          >
            <div className="font-medium text-sm">{t(template.nameKey)}</div>
            <div className="text-xs text-foreground/70 mt-1">{t(template.descKey)}</div>
            <div className="mt-2 space-y-1">
              {template.ranges.map((range, index) => (
                <div key={index} className="text-xs text-muted-foreground">
                  {range.description}
                </div>
              ))}
            </div>
          </button>
        ))}

        <div className="mt-4 p-3 bg-surface-1 rounded-lg">
          <div className="text-xs text-foreground/70">
            <strong>{t('noteLabel')}:</strong> {t('noteText')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { discountTemplates };
export type { DiscountTemplate };
