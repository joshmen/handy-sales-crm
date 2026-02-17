import React from 'react';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { TipoVisita, ResultadoVisita } from '@/types/visits';
import { Search, X } from 'lucide-react';

interface VisitFiltersProps {
  searchTerm: string;
  tipoFilter: string;
  resultadoFilter: string;
  dateFilter: string;
  onSearchChange: (value: string) => void;
  onTipoChange: (value: string) => void;
  onResultadoChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onClearFilters: () => void;
  className?: string;
}

export const VisitFilters: React.FC<VisitFiltersProps> = ({
  searchTerm,
  tipoFilter,
  resultadoFilter,
  dateFilter,
  onSearchChange,
  onTipoChange,
  onResultadoChange,
  onDateChange,
  onClearFilters,
  className = '',
}) => {
  const hasFilters = searchTerm || tipoFilter || resultadoFilter || dateFilter;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Barra de búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por cliente..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4">
        {/* Tipo de visita */}
        <div className="min-w-[170px]">
          <SearchableSelect
            options={[
              { value: '', label: 'Todos los tipos' },
              { value: String(TipoVisita.Rutina), label: 'Rutina' },
              { value: String(TipoVisita.Cobranza), label: 'Cobranza' },
              { value: String(TipoVisita.Entrega), label: 'Entrega' },
              { value: String(TipoVisita.Prospeccion), label: 'Prospección' },
              { value: String(TipoVisita.Seguimiento), label: 'Seguimiento' },
              { value: String(TipoVisita.Otro), label: 'Otro' },
            ]}
            value={tipoFilter || null}
            onChange={(val) => onTipoChange(val ? String(val) : '')}
            placeholder="Todos los tipos"
          />
        </div>

        {/* Resultado */}
        <div className="min-w-[180px]">
          <SearchableSelect
            options={[
              { value: '', label: 'Todos los resultados' },
              { value: String(ResultadoVisita.Pendiente), label: 'Pendiente' },
              { value: String(ResultadoVisita.Venta), label: 'Con Venta' },
              { value: String(ResultadoVisita.SinVenta), label: 'Sin Venta' },
              { value: String(ResultadoVisita.NoEncontrado), label: 'No Encontrado' },
              { value: String(ResultadoVisita.Reprogramada), label: 'Reprogramada' },
              { value: String(ResultadoVisita.Cancelada), label: 'Cancelada' },
            ]}
            value={resultadoFilter || null}
            onChange={(val) => onResultadoChange(val ? String(val) : '')}
            placeholder="Todos los resultados"
          />
        </div>

        {/* Fecha */}
        <div className="min-w-[170px]">
          <SearchableSelect
            options={[
              { value: '', label: 'Todas las fechas' },
              { value: 'today', label: 'Hoy' },
              { value: 'yesterday', label: 'Ayer' },
              { value: 'this_week', label: 'Esta semana' },
              { value: 'last_week', label: 'Semana pasada' },
              { value: 'this_month', label: 'Este mes' },
              { value: 'last_month', label: 'Mes pasado' },
            ]}
            value={dateFilter || null}
            onChange={(val) => onDateChange(val ? String(val) : '')}
            placeholder="Todas las fechas"
          />
        </div>

        {/* Botón limpiar filtros */}
        {hasFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="flex items-center"
          >
            <X size={16} className="mr-1" />
            Limpiar
          </Button>
        )}
      </div>
    </div>
  );
};
