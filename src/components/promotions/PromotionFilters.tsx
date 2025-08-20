// src/components/promotions/PromotionFilters.tsx
'use client';

import React from 'react';
import { SearchBar } from '@/components/common/SearchBar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { PromotionType, PromotionStatus } from '@/types/promotions';

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
  const typeOptions = [
    { value: 'all', label: 'Todos los tipos' },
    { value: PromotionType.PERCENTAGE, label: 'Por porcentaje' },
    { value: PromotionType.SPECIAL_CLUB, label: 'Club especial por recomendación' },
    { value: PromotionType.BUY_X_GET_Y, label: 'Compra X obtén Y' },
  ];

  const statusOptions = [
    { value: 'all', label: 'Todos los estados' },
    { value: PromotionStatus.ACTIVE, label: 'Activas' },
    { value: PromotionStatus.PAUSED, label: 'Pausadas' },
    { value: PromotionStatus.FINISHED, label: 'Finalizadas' },
    { value: PromotionStatus.DRAFT, label: 'Borradores' },
  ];

  const zoneOptions = [
    { value: 'all', label: 'Todas las zonas' },
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
            placeholder="Buscar promociones por nombre o descripción..."
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