import React from 'react';
import { Card } from '@/components/ui/Card';
import { SearchBar } from '@/components/common/SearchBar';
import { Button } from '@/components/ui/Button';
import { Filter } from 'lucide-react';
import { InventoryFilters as IInventoryFilters } from '@/types/inventory';

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
            placeholder="Buscar por producto o código..."
          />
        </div>

        {/* Quick filters */}
        <div className="flex items-center gap-2">
          <Button
            variant={filters.lowStock ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterToggle('lowStock')}
          >
            Stock Bajo
          </Button>

          <Button
            variant={filters.outOfStock ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterToggle('outOfStock')}
          >
            Sin Stock
          </Button>

          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Más Filtros
          </Button>

          {hasActiveFilters && onClearFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-muted-foreground"
            >
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Active filters indicator */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t">
          <span className="text-sm text-muted-foreground">Filtros activos:</span>
          {filters.lowStock && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
              Stock Bajo
            </span>
          )}
          {filters.outOfStock && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
              Sin Stock
            </span>
          )}
          {filters.search && filters.search.trim() !== '' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
              Búsqueda: `&quot;`{filters.search}`&quot;`
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
