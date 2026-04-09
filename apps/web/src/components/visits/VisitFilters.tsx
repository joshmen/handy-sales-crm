import React from 'react';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { TipoVisita, ResultadoVisita } from '@/types/visits';
import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('visits.filterForm');
  const tv = useTranslations('visits.types');
  const hasFilters = searchTerm || tipoFilter || resultadoFilter || dateFilter;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Barra de búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder={t('searchByClient')}
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
              { value: '', label: t('allTypes') },
              { value: String(TipoVisita.Rutina), label: tv('routine') },
              { value: String(TipoVisita.Cobranza), label: tv('collection') },
              { value: String(TipoVisita.Entrega), label: tv('delivery') },
              { value: String(TipoVisita.Prospeccion), label: tv('prospecting') },
              { value: String(TipoVisita.Seguimiento), label: tv('followUp') },
              { value: String(TipoVisita.Otro), label: tv('other') },
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
              { value: '', label: t('allResults') },
              { value: String(ResultadoVisita.Pendiente), label: t('resultPending') },
              { value: String(ResultadoVisita.Venta), label: t('resultWithSale') },
              { value: String(ResultadoVisita.SinVenta), label: t('resultNoSale') },
              { value: String(ResultadoVisita.NoEncontrado), label: t('resultNotFound') },
              { value: String(ResultadoVisita.Reprogramada), label: t('resultRescheduled') },
              { value: String(ResultadoVisita.Cancelada), label: t('resultCancelled') },
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
              { value: '', label: t('allDates') },
              { value: 'today', label: t('today') },
              { value: 'yesterday', label: t('yesterday') },
              { value: 'this_week', label: t('thisWeek') },
              { value: 'last_week', label: t('lastWeek') },
              { value: 'this_month', label: t('thisMonth') },
              { value: 'last_month', label: t('lastMonth') },
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
            {t('clear')}
          </Button>
        )}
      </div>
    </div>
  );
};
