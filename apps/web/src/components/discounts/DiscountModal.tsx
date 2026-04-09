import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  Edit,
  Trash2,
  FileDown,
  Calendar,
  Users,
  DollarSign,
} from 'lucide-react';
import { SbAlert, SbDiscounts, SbDownload } from '@/components/layout/DashboardIcons';
import { Discount, DiscountType, DiscountMethod, DiscountStatus } from '@/types/discounts';
import { useTranslations } from 'next-intl';

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'view' | 'delete' | 'import' | 'export';
  discount?: Discount;
  onConfirm?: () => void;
  loading?: boolean;
}

const statusColors = {
  [DiscountStatus.ACTIVE]: 'bg-green-100 text-green-800',
  [DiscountStatus.INACTIVE]: 'bg-gray-100 text-gray-800',
  [DiscountStatus.PAUSED]: 'bg-yellow-100 text-yellow-800',
};

export function DiscountModal({
  isOpen,
  onClose,
  type,
  discount,
  onConfirm,
  loading = false,
}: DiscountModalProps) {
  const t = useTranslations('discounts.modal');
  const tc = useTranslations('common');

  const statusLabels = {
    [DiscountStatus.ACTIVE]: t('statusActive'),
    [DiscountStatus.INACTIVE]: t('statusInactive'),
    [DiscountStatus.PAUSED]: t('statusPaused'),
  };

  const typeLabels = {
    [DiscountType.GLOBAL]: t('typeGlobal'),
    [DiscountType.PRODUCT_SPECIFIC]: t('typeProduct'),
  };

  const methodLabels = {
    [DiscountMethod.PERCENTAGE]: t('methodPercentage'),
    [DiscountMethod.FIXED_AMOUNT]: t('methodFixed'),
  };

  const getModalContent = () => {
    switch (type) {
      case 'view':
        return (
          <>
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                  <SbDiscounts size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{discount?.name}</h3>
                  <p className="text-gray-600">{discount?.description}</p>
                </div>
              </div>
              <Badge className={statusColors[discount?.status || DiscountStatus.INACTIVE]}>
                {statusLabels[discount?.status || DiscountStatus.INACTIVE]}
              </Badge>
            </div>

            <div className="space-y-6">
              {/* Información básica */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">{t('basicInfo')}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('type')}</span>
                      <span>{typeLabels[discount?.type || DiscountType.GLOBAL]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('method')}</span>
                      <span>{methodLabels[discount?.method || DiscountMethod.PERCENTAGE]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('stackable')}</span>
                      <span>{discount?.isStackable ? tc('yes') : tc('no')}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">{t('settings')}</h4>
                  <div className="space-y-2">
                    {discount?.minimumAmount && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('minimumAmount')}</span>
                        <span>${discount.minimumAmount.toLocaleString()}</span>
                      </div>
                    )}
                    {discount?.maximumDiscount && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('maximumDiscount')}</span>
                        <span>${discount.maximumDiscount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('validity')}</span>
                      <span>
                        {discount?.isPermanent
                          ? t('permanent')
                          : `${discount?.validFrom?.toLocaleDateString()} - ${discount?.validTo?.toLocaleDateString()}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rangos de descuento */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">{t('discountRanges')}</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-2">
                    {discount?.quantityRanges.map((range, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 px-3 bg-white rounded border"
                      >
                        <span className="font-medium">
                          {range.minQuantity}
                          {range.maxQuantity ? `-${range.maxQuantity}` : '+'} {t('units')}
                        </span>
                        <span className="text-green-600 font-medium">
                          {range.discountValue}
                          {discount?.method === DiscountMethod.PERCENTAGE ? '%' : '$'} {t('discountLabel')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Estadísticas */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">{t('usageStats')}</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg mx-auto mb-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="text-lg font-bold text-green-600">
                      ${discount?.totalSavings?.toLocaleString() || '0'}
                    </div>
                    <div className="text-sm text-gray-600">{t('savingsGenerated')}</div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg mx-auto mb-2">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                      {discount?.totalUsed || 0}
                    </div>
                    <div className="text-sm text-gray-600">{t('timesUsed')}</div>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-lg mx-auto mb-2">
                      <Calendar className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="text-lg font-bold text-purple-600">
                      {discount?.lastUsed?.toLocaleDateString() || t('never')}
                    </div>
                    <div className="text-sm text-gray-600">{t('lastUsage')}</div>
                  </div>
                </div>
              </div>

              {/* Auditoría */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">{t('createdBy')}</span> {discount?.createdBy}
                  </div>
                  <div>
                    <span className="font-medium">{t('creationDate')}</span>{' '}
                    {discount?.createdAt.toLocaleDateString()}
                  </div>
                  {discount?.updatedBy && (
                    <>
                      <div>
                        <span className="font-medium">{t('modifiedBy')}</span> {discount.updatedBy}
                      </div>
                      <div>
                        <span className="font-medium">{t('lastModification')}</span>{' '}
                        {discount.updatedAt.toLocaleDateString()}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={onClose}>
                {tc('close')}
              </Button>
              <Button>
                <Edit className="w-4 h-4 mr-2" />
                {tc('edit')}
              </Button>
            </div>
          </>
        );

      case 'delete':
        return (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                <SbAlert size={28} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{t('deleteDiscount')}</h3>
                <p className="text-gray-600">{t('cannotUndo')}</p>
              </div>
            </div>

            <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6">
              <p className="text-foreground">
                {t('confirmDeleteMsg')}{' '}
                <strong>&quot;{discount?.name}&quot;</strong>?
              </p>
              <div className="mt-2 text-sm text-muted-foreground">
                {t('deleteConsequences')}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                {tc('cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={onConfirm}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {loading ? t('deleting') : t('deleteDiscount')}
              </Button>
            </div>
          </>
        );

      case 'import':
        return (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                <SbDownload size={28} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{t('importTitle')}</h3>
                <p className="text-gray-600">{t('importDescription')}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <SbDownload size={48} className="mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">{t('dragFileHere')}</p>
                <p className="text-gray-500 mb-4">{t('orClickToSelect')}</p>
                <Button variant="outline">{t('selectFile')}</Button>
              </div>

              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-2">{t('requiredFormat')}</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {t('csvOrExcel')}</li>
                  <li>• {t('columnsRequired')}</li>
                  <li>• {t('maxRecords')}</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={onClose}>
                {tc('cancel')}
              </Button>
              <Button disabled>{t('importBtn')}</Button>
            </div>
          </>
        );

      case 'export':
        return (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                <SbDownload size={28} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{t('exportTitle')}</h3>
                <p className="text-gray-600">{t('exportDescription')}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('fileFormat')}
                </label>
                <SearchableSelect
                  options={[
                    { value: 'csv', label: 'CSV' },
                    { value: 'excel', label: 'Excel (.xlsx)' },
                    { value: 'json', label: 'JSON' },
                  ]}
                  value="csv"
                  onChange={() => {}}
                  placeholder={t('selectFormat')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('dataToInclude')}
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="mr-2" />
                    {t('basicInfoCheck')}
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="mr-2" />
                    {t('discountRangesCheck')}
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    {t('usageStatsCheck')}
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    {t('auditInfoCheck')}
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={onClose}>
                {tc('cancel')}
              </Button>
              <Button className="flex items-center gap-2">
                <FileDown className="w-4 h-4" />
                {t('exportBtn')}
              </Button>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const getModalTitle = () => {
    switch (type) {
      case 'view':
        return t('detailsTitle');
      case 'delete':
        return t('confirmDelete');
      case 'import':
        return t('importTitle');
      case 'export':
        return t('exportTitle');
      default:
        return '';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getModalTitle()}
      size={type === 'view' ? 'xl' : 'lg'}
    >
      {getModalContent()}
    </Modal>
  );
}
