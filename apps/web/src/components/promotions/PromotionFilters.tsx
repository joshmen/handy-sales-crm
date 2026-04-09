// src/components/promotions/PromotionFilters.tsx
'use client';

import React from 'react';
import { SearchBar } from '@/components/common/SearchBar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { PromotionType, PromotionStatus } from '@/types/promotions';
import { useTranslations } from 'next-intl';

interface PromotionFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedType: string;
  onTypeChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  selectedZone?: string;
  onZoneChange?: (value: string) => void;
  availableZones?: string[];
}

export const PromotionFilters: React.FC<PromotionFiltersProps> = ({
  searchTerm,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedStatus,
  onStatusChange,
  selectedZone,
  onZoneChange,
  availableZones = [],
}) => {
  const t = useTranslations('promotions.filterForm');

  const typeOptions = [
    { value: 'all', label: t('allTypes') },
    { value: PromotionType.PERCENTAGE, label: t('typePercentage') },
    { value: PromotionType.SPECIAL_CLUB, label: t('typeSpecialClub') },
    { value: PromotionType.BUY_X_GET_Y, label: t('typeBuyXGetY') },
  ];

  const statusOptions = [
    { value: 'all', label: t('allStatuses') },
    { value: PromotionStatus.ACTIVE, label: t('statusActive') },
    { value: PromotionStatus.PAUSED, label: t('statusPaused') },
    { value: PromotionStatus.FINISHED, label: t('statusFinished') },
    { value: PromotionStatus.DRAFT, label: t('statusDraft') },
  ];

  const zoneOptions = [
    { value: 'all', label: t('allZones') },
    ...availableZones.map(zone => ({ value: zone, label: zone })),
  ];

  return (
    <div className="mb-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Búsqueda */}
        <div className="lg:col-span-2">
          <SearchBar
            value={searchTerm}
            onChange={onSearchChange}
            placeholder={t('searchPlaceholder')}
          />
        </div>

        {/* Tipo de promoción */}
        <div>
          <Select value={selectedType} onValueChange={onTypeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Estado */}
        <div>
          <Select value={selectedStatus} onValueChange={onStatusChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filtros adicionales */}
      {availableZones.length > 0 && onZoneChange && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Select value={selectedZone || 'all'} onValueChange={onZoneChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {zoneOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
};