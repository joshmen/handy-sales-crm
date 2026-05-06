import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { VisitCard } from './VisitCard';
import { VisitFilters } from './VisitFilters';
import { VisitSummary } from './VisitSummary';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ClienteVisitaListaDto, ResultadoVisita } from '@/types/visits';
import { Plus, MapPin } from 'lucide-react';
import { useFormatters } from '@/hooks/useFormatters';

interface VisitListProps {
  visits: ClienteVisitaListaDto[];
  loading?: boolean;
  onCreateVisit: () => void;
  onViewDetails: (visitId: number) => void;
  onCheckIn?: (visitId: number) => void;
  onCheckOut?: (visitId: number) => void;
  className?: string;
}

export const VisitList: React.FC<VisitListProps> = ({
  visits,
  loading = false,
  onCreateVisit,
  onViewDetails,
  onCheckIn,
  onCheckOut,
  className = '',
}) => {
  const t = useTranslations('visits.list');
  // Día calendario en TZ tenant — antes los presets ("hoy", etc.) usaban
  // TZ del browser, lo que dejaba fuera visitas legítimas en cruce de
  // medianoche para tenants con TZ negativa.
  const { tenantToday } = useFormatters();
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [resultadoFilter, setResultadoFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Función para filtrar por fecha (anclada en día tenant)
  const filterByDate = (visit: ClienteVisitaListaDto, filter: string) => {
    if (!filter) return true;

    const sourceDate = visit.fechaProgramada ?? visit.fechaHoraInicio;
    if (!sourceDate) return true;

    const visitKey = (typeof sourceDate === 'string'
      ? sourceDate
      : new Date(sourceDate).toISOString()
    ).slice(0, 10);
    const todayKey = tenantToday();
    const [ty, tm, td] = todayKey.split('-').map(Number);
    const todayUtcNoon = new Date(Date.UTC(ty ?? 0, (tm ?? 1) - 1, td ?? 1, 12, 0, 0));
    const ymdOf = (d: Date) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

    switch (filter) {
      case 'today':
        return visitKey === todayKey;
      case 'yesterday': {
        const y = new Date(todayUtcNoon);
        y.setUTCDate(y.getUTCDate() - 1);
        return visitKey === ymdOf(y);
      }
      case 'this_week': {
        const weekStart = new Date(todayUtcNoon);
        weekStart.setUTCDate(todayUtcNoon.getUTCDate() - todayUtcNoon.getUTCDay());
        return visitKey >= ymdOf(weekStart);
      }
      case 'last_week': {
        const lastWeekStart = new Date(todayUtcNoon);
        lastWeekStart.setUTCDate(todayUtcNoon.getUTCDate() - todayUtcNoon.getUTCDay() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setUTCDate(lastWeekStart.getUTCDate() + 6);
        return visitKey >= ymdOf(lastWeekStart) && visitKey <= ymdOf(lastWeekEnd);
      }
      case 'this_month':
        return visitKey.slice(0, 7) === todayKey.slice(0, 7);
      case 'last_month': {
        const lm = new Date(todayUtcNoon);
        lm.setUTCMonth(todayUtcNoon.getUTCMonth() - 1);
        return visitKey.slice(0, 7) === `${lm.getUTCFullYear()}-${String(lm.getUTCMonth() + 1).padStart(2, '0')}`;
      }
      default:
        return true;
    }
  };

  // Visitas filtradas
  const filteredVisits = useMemo(() => {
    return visits.filter((visit) => {
      // Filtro de búsqueda
      const matchesSearch =
        searchTerm === '' ||
        visit.clienteNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (visit.clienteDireccion &&
          visit.clienteDireccion.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtros específicos
      const matchesTipo = tipoFilter === '' || Number(visit.tipoVisita) === Number(tipoFilter);
      const matchesResultado =
        resultadoFilter === '' || Number(visit.resultado) === Number(resultadoFilter);
      const matchesDate = filterByDate(visit, dateFilter);

      return matchesSearch && matchesTipo && matchesResultado && matchesDate;
    });
  }, [visits, searchTerm, tipoFilter, resultadoFilter, dateFilter]);

  // Cálculos para el resumen
  const summaryData = useMemo(() => {
    const totalVisits = filteredVisits.length;
    const completedVisits = filteredVisits.filter(
      (v) => v.fechaHoraFin !== null && v.fechaHoraFin !== undefined
    ).length;
    const visitsWithSale = filteredVisits.filter(
      (v) => v.resultado === ResultadoVisita.Venta
    ).length;
    const pendingVisits = filteredVisits.filter(
      (v) => v.resultado === ResultadoVisita.Pendiente
    ).length;
    const cancelledVisits = filteredVisits.filter(
      (v) => v.resultado === ResultadoVisita.Cancelada
    ).length;
    const conversionRate =
      completedVisits > 0 ? (visitsWithSale / completedVisits) * 100 : 0;

    return {
      totalVisits,
      completedVisits,
      visitsWithSale,
      pendingVisits,
      cancelledVisits,
      conversionRate,
    };
  }, [filteredVisits]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setTipoFilter('');
    setResultadoFilter('');
    setDateFilter('');
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-24 bg-surface-3 rounded-lg mb-6"></div>
          <div className="h-16 bg-surface-3 rounded-lg mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-surface-3 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Resumen de visitas */}
      <VisitSummary {...summaryData} />

      {/* Header con filtros y botón crear */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1">
          <VisitFilters
            searchTerm={searchTerm}
            tipoFilter={tipoFilter}
            resultadoFilter={resultadoFilter}
            dateFilter={dateFilter}
            onSearchChange={setSearchTerm}
            onTipoChange={setTipoFilter}
            onResultadoChange={setResultadoFilter}
            onDateChange={setDateFilter}
            onClearFilters={handleClearFilters}
          />
        </div>

        <Button onClick={onCreateVisit} className="lg:ml-4">
          <Plus size={20} className="mr-2" />
          {t('scheduleVisit')}
        </Button>
      </div>

      {/* Lista de visitas */}
      {filteredVisits.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVisits.map((visit) => (
            <VisitCard
              key={visit.id}
              visit={visit}
              onViewDetails={onViewDetails}
              onCheckIn={onCheckIn}
              onCheckOut={onCheckOut}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={MapPin}
          title={visits.length === 0 ? t('emptyTitle') : t('noResults')}
          description={
            visits.length === 0
              ? t('emptyDescription')
              : t('noResultsDescription')
          }
          action={{
            label: t('scheduleFirst'),
            onClick: onCreateVisit,
          }}
        />
      )}
    </div>
  );
};
