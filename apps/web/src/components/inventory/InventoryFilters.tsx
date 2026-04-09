import React from 'react';
import { Card } from '@/components/ui/Card';
import { SearchBar } from '@/components/common/SearchBar';
import { Button } from '@/components/ui/Button';
import { Filter } from 'lucide-react';
import { InventoryFilters as IInventoryFilters } from '@/types/inventory';
import { useTranslations } from 'next-intl';

interface InventoryFiltersProps {
  filters: IInventoryFilters;
  onFiltersChange: (filters: IInventoryFilters) => void;
  onClearFilters?: () => void;
}

export function InventoryFilters({
  filters,
  onFiltersChange,
  onClearFilters,
}: InventoryFiltersProps) {
  const t = useTranslations('inventory.filterForm');
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleFilterToggle = (filterKey: keyof IInventoryFilters) => {
    onFiltersChange({
      ...filters,
      [filterKey]: !filters[filterKey],
    });
  };

  const hasActiveFilters =
    filters.lowStock || filters.outOfStock || (filters.search && filters.search.trim() !== '');

  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <SearchBar
            value={filters.search || ''}
            onChange={handleSearchChange}
            placeholder={t('searchPlaceholder')}
          />
        </div>

        {/* Quick filters */}
        <div className="flex items-center gap-2">
          <Button
            variant={filters.lowStock ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterToggle('lowStock')}
          >
            {t('lowStock')}
          </Button>

          <Button
            variant={filters.outOfStock ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterToggle('outOfStock')}
          >
            {t('outOfStock')}
          </Button>

          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            {t('moreFilters')}
          </Button>

          {hasActiveFilters && onClearFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-muted-foreground"
            >
              {t('clear')}
            </Button>
          )}
        </div>
      </div>

      {/* Active filters indicator */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t">
          <span className="text-sm text-muted-foreground">{t('activeFilters')}</span>
          {filters.lowStock && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
              {t('lowStock')}
            </span>
          )}
          {filters.outOfStock && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
              {t('outOfStock')}
            </span>
          )}
          {filters.search && filters.search.trim() !== '' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
              {t('searchLabel')} `&quot;`{filters.search}`&quot;`
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
