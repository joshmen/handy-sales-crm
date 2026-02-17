import React, { useState, useMemo } from 'react';
import { VisitCard } from './VisitCard';
import { VisitFilters } from './VisitFilters';
import { VisitSummary } from './VisitSummary';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ClienteVisitaListaDto, ResultadoVisita, TipoVisita } from '@/types/visits';
import { Plus, MapPin } from 'lucide-react';

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
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [resultadoFilter, setResultadoFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Función para filtrar por fecha
  const filterByDate = (visit: ClienteVisitaListaDto, filter: string) => {
    if (!filter) return true;

    const visitDate = visit.fechaProgramada
      ? new Date(visit.fechaProgramada)
      : visit.fechaHoraInicio
      ? new Date(visit.fechaHoraInicio)
      : null;

    if (!visitDate) return true;

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    switch (filter) {
      case 'today':
        return visitDate.toDateString() === today.toDateString();
      case 'yesterday':
        return visitDate.toDateString() === yesterday.toDateString();
      case 'this_week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return visitDate >= weekStart;
      case 'last_week':
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        return visitDate >= lastWeekStart && visitDate <= lastWeekEnd;
      case 'this_month':
        return (
          visitDate.getMonth() === today.getMonth() &&
          visitDate.getFullYear() === today.getFullYear()
        );
      case 'last_month':
        const lastMonth = new Date(today);
        lastMonth.setMonth(today.getMonth() - 1);
        return (
          visitDate.getMonth() === lastMonth.getMonth() &&
          visitDate.getFullYear() === lastMonth.getFullYear()
        );
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
      const matchesTipo = tipoFilter === '' || visit.tipoVisita === tipoFilter;
      const matchesResultado =
        resultadoFilter === '' || visit.resultado === resultadoFilter;
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
          <div className="h-24 bg-gray-200 rounded-lg mb-6"></div>
          <div className="h-16 bg-gray-200 rounded-lg mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
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
          Programar Visita
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
          title={visits.length === 0 ? 'No hay visitas' : 'No se encontraron visitas'}
          description={
            visits.length === 0
              ? 'Comienza programando tu primera visita'
              : 'Intenta cambiar los filtros o programar una nueva visita'
          }
          action={{
            label: 'Programar Primera Visita',
            onClick: onCreateVisit,
          }}
        />
      )}
    </div>
  );
};
