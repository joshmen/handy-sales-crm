import React from 'react';
import { Input } from '@/components/ui/Input';
import { SelectCompat as Select } from '@/components/ui/SelectCompat';
import { Button } from '@/components/ui/Button';
import { Search, Filter } from 'lucide-react';
import { DiscountType, DiscountMethod, DiscountStatus } from '@/types/discounts';
import { useTranslations } from 'next-intl';

interface DiscountFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedType: string;
  onTypeChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  selectedMethod?: string;
  onMethodChange?: (value: string) => void;
  onAdvancedFilters?: () => void;
}

export function DiscountFilters({
  searchTerm,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedStatus,
  onStatusChange,
  selectedMethod,
  onMethodChange,
  onAdvancedFilters,
}: DiscountFiltersProps) {
  const t = useTranslations('discounts.filterForm');
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Select 
        value={selectedType} 
        onChange={(e) => onTypeChange(e.target.value)} 
        placeholder="Todos los tipos"
      >
        <option value="all">{t('allTypes')}</option>
        <option value={DiscountType.GLOBAL}>{t('typeGlobal')}</option>
        <option value={DiscountType.PRODUCT_SPECIFIC}>{t('typeProduct')}</option>
      </Select>

      {selectedMethod !== undefined && onMethodChange && (
        <Select
          value={selectedMethod}
          onChange={(e) => onMethodChange(e.target.value)}
          placeholder="Todos los métodos"
        >
          <option value="all">{t('allMethods')}</option>
          <option value={DiscountMethod.PERCENTAGE}>{t('methodPercentage')}</option>
          <option value={DiscountMethod.FIXED_AMOUNT}>{t('methodFixed')}</option>
        </Select>
      )}

      <Select 
        value={selectedStatus} 
        onChange={(e) => onStatusChange(e.target.value)} 
        placeholder="Todos los estados"
      >
        <option value="all">{t('allStatuses')}</option>
        <option value={DiscountStatus.ACTIVE}>{t('statusActive')}</option>
        <option value={DiscountStatus.INACTIVE}>{t('statusInactive')}</option>
        <option value={DiscountStatus.PAUSED}>{t('statusPaused')}</option>
      </Select>

      {onAdvancedFilters && (
        <Button variant="outline" className="h-10 px-4" onClick={onAdvancedFilters}>
          <Filter className="w-4 h-4 mr-2" />
          {t('filters')}
        </Button>
      )}
    </div>
  );
}
