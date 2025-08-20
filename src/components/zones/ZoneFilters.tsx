import React from 'react';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ZoneFilters } from '@/types/zones';
import { Search, Filter, Download, X } from 'lucide-react';

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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar zonas por nombre o descripción..."
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
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="true">Habilitadas</SelectItem>
            <SelectItem value="false">Deshabilitadas</SelectItem>
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
            <SelectItem value="all">Con y sin usuarios</SelectItem>
            <SelectItem value="true">Con usuarios</SelectItem>
            <SelectItem value="false">Sin usuarios</SelectItem>
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
            <SelectItem value="name-asc">Nombre A-Z</SelectItem>
            <SelectItem value="name-desc">Nombre Z-A</SelectItem>
            <SelectItem value="createdAt-desc">Más recientes</SelectItem>
            <SelectItem value="createdAt-asc">Más antiguos</SelectItem>
            <SelectItem value="clientCount-desc">Más clientes</SelectItem>
            <SelectItem value="userCount-desc">Más usuarios</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Actions and results */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {totalZones} zona{totalZones !== 1 ? 's' : ''} encontrada{totalZones !== 1 ? 's' : ''}
          </span>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 gap-1 text-xs"
            >
              <X className="h-3 w-3" />
              Limpiar filtros
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
              Exportar
            </Button>
          )}

          {hasActiveFilters && (
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <Filter className="h-3 w-3" />
              Filtros activos
            </div>
          )}
        </div>
      </div>

      {/* Active filters summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs">
              <span>Búsqueda: &quot;{filters.search}&quot;</span>
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
              <span>{filters.isEnabled ? 'Habilitadas' : 'Deshabilitadas'}</span>
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
              <span>{filters.hasUsers ? 'Con usuarios' : 'Sin usuarios'}</span>
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
