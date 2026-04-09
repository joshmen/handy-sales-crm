// src/components/promotions/PromotionModal.tsx
'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AlertTriangle, Download, Upload } from 'lucide-react';
import { Promotion, PromotionStatus, PromotionType, RewardMethod } from '@/types/promotions';
import { useFormatters } from '@/hooks/useFormatters';
import { useTranslations } from 'next-intl';

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'view' | 'delete' | 'import' | 'export';
  promotion?: Promotion;
  onConfirm?: () => void;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({
  isOpen,
  onClose,
  type,
  promotion,
  onConfirm,
}) => {
  const { formatCurrency } = useFormatters();
  const t = useTranslations('promotions.modal');
  const tf = useTranslations('promotions.form');
  const tc = useTranslations('common');
  const getStatusBadge = (status: PromotionStatus) => {
    const statusConfig = {
      [PromotionStatus.ACTIVE]: { label: t('statusActive'), variant: 'success' as const },
      [PromotionStatus.PAUSED]: { label: t('statusPaused'), variant: 'warning' as const },
      [PromotionStatus.FINISHED]: { label: t('statusFinished'), variant: 'secondary' as const },
      [PromotionStatus.DRAFT]: { label: t('statusDraft'), variant: 'outline' as const },
    };
    
    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeLabel = (type: PromotionType) => {
    const typeLabels = {
      [PromotionType.PERCENTAGE]: t('typePercentage'),
      [PromotionType.SPECIAL_CLUB]: t('typeSpecialClub'),
      [PromotionType.BUY_X_GET_Y]: t('typeBuyXGetY'),
    };
    return typeLabels[type];
  };

  const getRewardMethodLabel = (method: RewardMethod) => {
    const methodLabels = {
      [RewardMethod.FREE]: t('freeLabel'),
      [RewardMethod.PERCENTAGE_DISCOUNT]: tf('rewardPercentageDiscount'),
      [RewardMethod.FIXED_DISCOUNT]: tf('rewardFixedDiscount'),
    };
    return methodLabels[method];
  };

  const formatDate = (date?: Date) => {
    if (!date) return t('notSpecified');
    return formatDate(date);
  };

  if (type === 'view' && promotion) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={t('detailsTitle')} size="xl">
        <div className="space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('generalInfo')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">{t('nameLabel')}</label>
                  <p className="text-sm">{promotion.name}</p>
                </div>
                {promotion.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">{t('descriptionLabel')}</label>
                    <p className="text-sm">{promotion.description}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-600">{t('typeLabel')}</label>
                  <p className="text-sm">{getTypeLabel(promotion.type)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">{t('statusLabel')}</label>
                  <div className="mt-1">{getStatusBadge(promotion.status)}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('stats')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">{t('totalUsage')}</label>
                  <p className="text-sm">{promotion.totalUsed || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">{t('savingsGenerated')}</label>
                  <p className="text-sm">{formatCurrency(promotion.totalSavings || 0)}</p>
                </div>
                {promotion.currentBudgetUsed !== undefined && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">{t('budgetUsed')}</label>
                    <p className="text-sm">{formatCurrency(promotion.currentBudgetUsed)}</p>
                  </div>
                )}
                {promotion.lastUsed && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">{t('lastUsage')}</label>
                    <p className="text-sm">{formatDate(promotion.lastUsed)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Productos de aplicación */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('applicationProducts')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {promotion.applicationProducts.map((product) => (
                  <div key={product.id} className="border rounded-lg p-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="font-medium">{t('productId')}</span> {product.productId}
                      </div>
                      <div>
                        <span className="font-medium">{t('minQuantity')}</span> {product.minimumQuantity}
                      </div>
                      {product.description && (
                        <div className="md:col-span-3">
                          <span className="font-medium">{t('descriptionField')}</span> {product.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Productos de recompensa */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('rewardProducts')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {promotion.rewardProducts.map((product) => (
                  <div key={product.id} className="border rounded-lg p-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="font-medium">{t('productId')}</span> {product.productId}
                      </div>
                      <div>
                        <span className="font-medium">{t('methodField')}</span> {getRewardMethodLabel(product.discountMethod)}
                      </div>
                      <div>
                        <span className="font-medium">{t('valueField')}</span>
                        {product.discountMethod === RewardMethod.PERCENTAGE_DISCOUNT
                          ? ` ${product.discountValue}%`
                          : product.discountMethod === RewardMethod.FIXED_DISCOUNT
                            ? ` ${formatCurrency(product.discountValue)}`
                            : ` ${t('freeLabel')}`
                        }
                      </div>
                      {product.maxQuantity && (
                        <div>
                          <span className="font-medium">{t('maxQty')}</span> {product.maxQuantity}
                        </div>
                      )}
                      {product.description && (
                        <div className="md:col-span-4">
                          <span className="font-medium">{t('descriptionField')}</span> {product.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Limitantes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('limitsTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {promotion.limits.maxUsagePerClient && (
                  <div>
                    <span className="font-medium">{t('maxUsagePerClient')}</span> {promotion.limits.maxUsagePerClient}
                  </div>
                )}
                {promotion.limits.maxTotalUsage && (
                  <div>
                    <span className="font-medium">{t('maxTotalUsage')}</span> {promotion.limits.maxTotalUsage}
                  </div>
                )}
                {promotion.limits.maxBudget && (
                  <div>
                    <span className="font-medium">{t('maxBudget')}</span> {formatCurrency(promotion.limits.maxBudget)}
                  </div>
                )}
                {promotion.limits.maxRewardPieces && (
                  <div>
                    <span className="font-medium">{t('maxRewardPieces')}</span> {promotion.limits.maxRewardPieces}
                  </div>
                )}
                {promotion.limits.startDate && (
                  <div>
                    <span className="font-medium">{t('startDate')}</span> {formatDate(promotion.limits.startDate)}
                  </div>
                )}
                {promotion.limits.endDate && (
                  <div>
                    <span className="font-medium">{t('endDate')}</span> {formatDate(promotion.limits.endDate)}
                  </div>
                )}
                {promotion.limits.allowedZones && promotion.limits.allowedZones.length > 0 && (
                  <div className="md:col-span-2">
                    <span className="font-medium">{t('allowedZones')}</span> {promotion.limits.allowedZones.join(', ')}
                  </div>
                )}
                {promotion.limits.allowedCategories && promotion.limits.allowedCategories.length > 0 && (
                  <div className="md:col-span-2">
                    <span className="font-medium">{t('allowedCategories')}</span> {promotion.limits.allowedCategories.join(', ')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </Modal>
    );
  }

  if (type === 'delete' && promotion) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={t('deleteTitle')} size="md">
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="font-medium text-red-800">{t('areYouSure')}</h3>
              <p className="text-sm text-red-600">
                {t('deleteWarning')}
              </p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">{t('promotionToDelete')}</h4>
            <p className="text-sm"><strong>{promotion.name}</strong></p>
            {promotion.description && (
              <p className="text-sm text-gray-600 mt-1">{promotion.description}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              {tc('cancel')}
            </Button>
            <Button variant="destructive" onClick={onConfirm}>
              {t('deletePromotion')}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  if (type === 'import') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={t('importTitle')} size="md">
        <div className="space-y-4">
          <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('uploadFile')}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {t('supportedFormats')}
            </p>
            <Button>
              {tc('upload')}
            </Button>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">{t('requiredFormat')}</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• {t('formatName')}</li>
              <li>• {t('formatType')}</li>
              <li>• {t('formatAppProducts')}</li>
              <li>• {t('formatRewardProducts')}</li>
              <li>• {t('formatLimits')}</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              {tc('cancel')}
            </Button>
            <Button>
              {tc('importCsv')}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  if (type === 'export') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={t('exportTitle')} size="md">
        <div className="space-y-4">
          <div className="text-center p-8">
            <Download className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('exportList')}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {t('exportDesc')}
            </p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">{t('fileIncludes')}</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• {t('includeGeneral')}</li>
              <li>• {t('includeProducts')}</li>
              <li>• {t('includeLimits')}</li>
              <li>• {t('includeStats')}</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              {tc('cancel')}
            </Button>
            <Button>
              {t('downloadExcel')}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return null;
};