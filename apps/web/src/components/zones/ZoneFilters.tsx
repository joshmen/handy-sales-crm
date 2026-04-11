import React from 'react';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ZoneFilters } from '@/types/zones';
import { Search, Filter, Download, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ZoneFiltersProps {
  filters: ZoneFilters;
  onFiltersChange: (filters: ZoneFilters) => void;
  onExport?: () => void;
  totalZones: number;
  loading?: boolean;
}

export function ZoneFiltersComponent({
  filters,
  onFiltersChange,
  onExport,
  totalZones,
  loading = false,
}: ZoneFiltersProps) {
  const t = useTranslations('zones.filterForm');
  const updateFilter = (key: keyof ZoneFilters, value: unknown) => {
    onFiltersChange({
      ...filters,
      [key]: value,
      page: 1, // Reset to first page when filtering
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      isEnabled: undefined,
      hasUsers: undefined,
      sortBy: 'name',
      sortOrder: 'asc',
      page: 1,
      limit: filters.limit || 10,
    });
  };

  const hasActiveFilters = !!(
    filters.search || 
    filters.isEnabled !== undefined || 
    filters.hasUsers !== undefined
  );

  return (
    <div className="space-y-4">
      {/* Search and primary filters */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholder')}
              value={filters.search || ''}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Status Filter */}
        <Select
          value={filters.isEnabled?.toString() || 'all'}
          onValueChange={(value) => 
            updateFilter('isEnabled', value === 'all' ? undefined : value === 'true')
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allStatuses')}</SelectItem>
            <SelectItem value="true">{t('statusActive')}</SelectItem>
            <SelectItem value="false">{t('statusInactive')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Users Filter */}
        <Select
          value={filters.hasUsers?.toString() || 'all'}
          onValueChange={(value) => 
            updateFilter('hasUsers', value === 'all' ? undefined : value === 'true')
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Usuarios" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('withAndWithoutUsers')}</SelectItem>
            <SelectItem value="true">{t('withUsers')}</SelectItem>
            <SelectItem value="false">{t('withoutUsers')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={`${filters.sortBy}-${filters.sortOrder}` || 'name-asc'}
          onValueChange={(value) => {
            const [sortBy, sortOrder] = value.split('-');
            onFiltersChange({
              ...filters,
              sortBy: sortBy as ZoneFilters['sortBy'],
              sortOrder: sortOrder as ZoneFilters['sortOrder'],
            });
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">{t('nameAZ')}</SelectItem>
            <SelectItem value="name-desc">{t('nameZA')}</SelectItem>
            <SelectItem value="createdAt-desc">{t('mostRecent')}</SelectItem>
            <SelectItem value="createdAt-asc">{t('oldest')}</SelectItem>
            <SelectItem value="clientCount-desc">{t('mostClients')}</SelectItem>
            <SelectItem value="userCount-desc">{t('mostUsers')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Actions and results */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {t('zonesFound', { count: totalZones, plural: totalZones !== 1 ? 's' : '', plural2: totalZones !== 1 ? 's' : '' })}
          </span>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 gap-1 text-xs"
            >
              <X className="h-3 w-3" />
              {t('clearFilters')}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              disabled={loading || totalZones === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {t('exportLabel')}
            </Button>
          )}

          {hasActiveFilters && (
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <Filter className="h-3 w-3" />
              {t('activeFilters')}
            </div>
          )}
        </div>
      </div>

      {/* Active filters summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs">
              <span>{t('searchLabel')} &quot;{filters.search}&quot;</span>
              <button
                onClick={() => updateFilter('search', '')}
                className="hover:bg-blue-100 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {filters.isEnabled !== undefined && (
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-md text-xs">
              <span>{filters.isEnabled ? t('statusActive') : t('statusInactive')}</span>
              <button
                onClick={() => updateFilter('isEnabled', undefined)}
                className="hover:bg-green-100 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {filters.hasUsers !== undefined && (
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs">
              <span>{filters.hasUsers ? t('withUsers') : t('withoutUsers')}</span>
              <button
                onClick={() => updateFilter('hasUsers', undefined)}
                className="hover:bg-purple-100 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
