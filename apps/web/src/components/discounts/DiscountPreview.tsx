import React from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('discounts.preview');

  const hasValidRanges = formData.quantityRanges.some(range =>
    range.minQuantity > 0 && range.discountValue > 0
  );

  const hasValidDates = formData.isPermanent ||
    (formData.validFrom && formData.validTo && formData.validFrom < formData.validTo);

  const getValidationWarnings = () => {
    const warnings = [];

    if (!formData.name.trim()) {
      warnings.push(t('warnNameRequired'));
    }

    if (!hasValidRanges) {
      warnings.push(t('warnNoValidRanges'));
    }

    if (!hasValidDates) {
      warnings.push(t('warnInvalidDates'));
    }

    if (formData.type === DiscountType.PRODUCT_SPECIFIC && !formData.productId) {
      warnings.push(t('warnSelectProduct'));
    }

    const sortedRanges = [...formData.quantityRanges]
      .filter(r => r.minQuantity > 0)
      .sort((a, b) => a.minQuantity - b.minQuantity);

    for (let i = 0; i < sortedRanges.length - 1; i++) {
      const current = sortedRanges[i];
      const next = sortedRanges[i + 1];

      if (current.maxQuantity && current.maxQuantity >= next.minQuantity) {
        warnings.push(t('warnOverlappingRanges'));
        break;
      }
    }

    return warnings;
  };

  const warnings = getValidationWarnings();

  return (
    <div className="space-y-6">
      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium">{t('name')}:</div>
              <div className="text-sm text-foreground/70">
                {formData.name || t('noName')}
              </div>
            </div>

            {formData.description && (
              <div>
                <div className="text-sm font-medium">{t('description')}:</div>
                <div className="text-sm text-foreground/70">{formData.description}</div>
              </div>
            )}

            <div>
              <div className="text-sm font-medium">{t('type')}:</div>
              <Badge variant="outline">
                {formData.type === DiscountType.GLOBAL ? t('typeGlobal') : t('typeProduct')}
              </Badge>
            </div>

            {formData.type === DiscountType.PRODUCT_SPECIFIC && productName && (
              <div>
                <div className="text-sm font-medium">{t('product')}:</div>
                <div className="text-sm text-foreground/70">{productName}</div>
              </div>
            )}

            <div>
              <div className="text-sm font-medium">{t('method')}:</div>
              <Badge variant="outline">
                {formData.method === DiscountMethod.PERCENTAGE ? t('methodPercentage') : t('methodFixed')}
              </Badge>
            </div>

            <div>
              <div className="text-sm font-medium">{t('ranges')}:</div>
              <div className="space-y-1">
                {formData.quantityRanges
                  .filter(range => range.minQuantity > 0 && range.discountValue > 0)
                  .map((range, index) => (
                    <div key={index} className="text-xs text-foreground/70 bg-surface-1 p-2 rounded">
                      {range.minQuantity}{range.maxQuantity ? `-${range.maxQuantity}` : '+'} {t('units')}:
                      {' '}{range.discountValue}{formData.method === DiscountMethod.PERCENTAGE ? '%' : '$'}
                    </div>
                  ))}
                {formData.quantityRanges.filter(r => r.minQuantity > 0 && r.discountValue > 0).length === 0 && (
                  <div className="text-xs text-muted-foreground italic">{t('noRanges')}</div>
                )}
              </div>
            </div>

            {formData.minimumAmount && (
              <div>
                <div className="text-sm font-medium">{t('minimumAmount')}:</div>
                <div className="text-sm text-foreground/70">${formData.minimumAmount}</div>
              </div>
            )}

            {formData.maximumDiscount && (
              <div>
                <div className="text-sm font-medium">{t('maximumDiscount')}:</div>
                <div className="text-sm text-foreground/70">${formData.maximumDiscount}</div>
              </div>
            )}

            <div>
              <div className="text-sm font-medium">{t('validity')}:</div>
              <div className="text-sm text-foreground/70">
                {formData.isPermanent ? t('permanent') :
                  formData.validFrom && formData.validTo ?
                    `${formData.validFrom.toLocaleDateString()} - ${formData.validTo.toLocaleDateString()}` :
                    t('datesNotConfigured')
                }
              </div>
            </div>

            <div>
              <div className="text-sm font-medium">{t('configuration')}:</div>
              <div className="flex flex-wrap gap-1 mt-1">
                <Badge variant="outline" className="text-xs">
                  {formData.isStackable ? t('stackable') : t('notStackable')}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validations */}
      {warnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle size={16} />
              {t('validations')}
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

      {/* Help */}
      {showHelp && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info size={16} />
              {t('help')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-foreground/70 space-y-2">
              <p><strong>{t('helpGlobalTitle')}:</strong> {t('helpGlobalDesc')}</p>
              <p><strong>{t('helpProductTitle')}:</strong> {t('helpProductDesc')}</p>
              <p><strong>{t('helpRangesTitle')}:</strong> {t('helpRangesDesc')}</p>
              <p><strong>{t('helpStackableTitle')}:</strong> {t('helpStackableDesc')}</p>
              <p><strong>{t('helpTipTitle')}:</strong> {t('helpTipDesc')}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
