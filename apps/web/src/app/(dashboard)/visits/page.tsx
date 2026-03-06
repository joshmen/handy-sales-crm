'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchBar } from '@/components/common/SearchBar';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { ListPagination } from '@/components/ui/ListPagination';
import { TableLoadingOverlay } from '@/components/ui/TableLoadingOverlay';
import { Modal } from '@/components/ui/Modal';
import { Drawer } from '@/components/ui/Drawer';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { VisitSummary } from '@/components/visits/VisitSummary';
import { VisitForm } from '@/components/visits';
import { VisitCalendarView } from '@/components/visits/VisitCalendarView';
import { GoogleMapWrapper, MapMarker } from '@/components/maps/GoogleMapWrapper';
import { Client } from '@/types';
import {
  ClienteVisitaListaDto,
  ClienteVisitaDto,
  ClienteVisitaCreateDto,
  ResultadoVisita,
  TipoVisita,
  CheckInDto,
  CheckOutDto,
} from '@/types/visits';
import { visitService } from '@/services/api/visits';
import { clientService } from '@/services/api/clients';
import { toast } from '@/hooks/useToast';
import {
  List, CalendarDays, Plus, RefreshCw, Eye, Play, CheckCircle,
  ShoppingCart, User, MapPin, Calendar, Clock, X,
} from 'lucide-react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays, subWeeks, subMonths } from 'date-fns';
import { useFormatters } from '@/hooks/useFormatters';
import { formatDate as libFmtDate } from '@/lib/formatters';

type ViewMode = 'list' | 'calendar';

const PAGE_SIZE = 10;

// API returns enums as integers (0-5), so we map both numeric and string keys
const resultadoStyles: { label: string; color: string; dotColor: string }[] = [
  { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', dotColor: 'bg-yellow-400' },
  { label: 'Con Venta', color: 'bg-green-100 text-green-800', dotColor: 'bg-green-400' },
  { label: 'Sin Venta', color: 'bg-gray-100 text-gray-800', dotColor: 'bg-gray-400' },
  { label: 'No Encontrado', color: 'bg-orange-100 text-orange-800', dotColor: 'bg-orange-400' },
  { label: 'Reprogramada', color: 'bg-blue-100 text-blue-800', dotColor: 'bg-blue-400' },
  { label: 'Cancelada', color: 'bg-red-100 text-red-800', dotColor: 'bg-red-400' },
];
const resultadoStringMap: Record<string, number> = {
  Pendiente: 0, Venta: 1, SinVenta: 2, NoEncontrado: 3, Reprogramada: 4, Cancelada: 5,
};
const getResultado = (val: ResultadoVisita | number) => {
  const idx = typeof val === 'number' ? val : (resultadoStringMap[val] ?? 0);
  return resultadoStyles[idx] ?? resultadoStyles[0];
};

const tipoStyles: { label: string; color: string }[] = [
  { label: 'Rutina', color: 'text-blue-600' },
  { label: 'Cobranza', color: 'text-green-600' },
  { label: 'Entrega', color: 'text-purple-600' },
  { label: 'Prospección', color: 'text-orange-600' },
  { label: 'Seguimiento', color: 'text-cyan-600' },
  { label: 'Otro', color: 'text-gray-600' },
];
const tipoStringMap: Record<string, number> = {
  Rutina: 0, Cobranza: 1, Entrega: 2, Prospeccion: 3, Seguimiento: 4, Otro: 5,
};
const getTipo = (val: TipoVisita | number) => {
  const idx = typeof val === 'number' ? val : (tipoStringMap[val] ?? 5);
  return tipoStyles[idx] ?? tipoStyles[5];
};

function getDateRange(preset: string): { desde?: string; hasta?: string } {
  const now = new Date();
  switch (preset) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { desde: start.toISOString(), hasta: end.toISOString() };
    }
    case 'yesterday': {
      const start = subDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 1);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { desde: start.toISOString(), hasta: end.toISOString() };
    }
    case 'this_week': {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const end = endOfWeek(now, { weekStartsOn: 1 });
      return { desde: start.toISOString(), hasta: end.toISOString() };
    }
    case 'last_week': {
      const lastWeek = subWeeks(now, 1);
      const start = startOfWeek(lastWeek, { weekStartsOn: 1 });
      const end = endOfWeek(lastWeek, { weekStartsOn: 1 });
      return { desde: start.toISOString(), hasta: end.toISOString() };
    }
    case 'this_month':
      return { desde: startOfMonth(now).toISOString(), hasta: endOfMonth(now).toISOString() };
    case 'last_month': {
      const lastMonth = subMonths(now, 1);
      return { desde: startOfMonth(lastMonth).toISOString(), hasta: endOfMonth(lastMonth).toISOString() };
    }
    default:
      return {};
  }
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  return libFmtDate(dateStr, null, { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatTime = (dateStr?: string) => {
  if (!dateStr) return '-';
  return libFmtDate(dateStr, null, { hour: '2-digit', minute: '2-digit' });
};

function VisitsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const viewParam = searchParams.get('view') as ViewMode | null;
  const currentView: ViewMode = viewParam === 'calendar' ? 'calendar' : 'list';

  // Data state
  const [visits, setVisits] = useState<ClienteVisitaListaDto[]>([]);
  const [calendarVisits, setCalendarVisits] = useState<ClienteVisitaListaDto[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [resultadoFilter, setResultadoFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Summary
  const [summary, setSummary] = useState({ totalVisitas: 0, visitasCompletadas: 0, visitasConVenta: 0, visitasPendientes: 0, visitasCanceladas: 0, tasaConversion: 0 });

  // Modals/Drawers
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const [visitDetail, setVisitDetail] = useState<ClienteVisitaDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [prefilledDate, setPrefilledDate] = useState<string | undefined>();

  const setView = (view: ViewMode) => {
    router.push(`/visits${view === 'calendar' ? '?view=calendar' : ''}`, { scroll: false });
  };

  // Fetch paginated visits
  const fetchVisits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const dateRange = getDateRange(dateFilter);
      const response = await visitService.getVisits({
        pagina: currentPage,
        tamanoPagina: PAGE_SIZE,
        tipoVisita: tipoFilter ? (tipoFilter as TipoVisita) : undefined,
        resultado: resultadoFilter ? (resultadoFilter as ResultadoVisita) : undefined,
        fechaDesde: dateRange.desde,
        fechaHasta: dateRange.hasta,
      });
      setVisits(response.items);
      setTotalItems(response.totalItems);
    } catch (err) {
      console.error('Error al cargar visitas:', err);
      setError('Error al cargar las visitas. Intenta de nuevo.');
      toast.error('Error al cargar las visitas');
    } finally {
      setLoading(false);
    }
  }, [currentPage, tipoFilter, resultadoFilter, dateFilter]);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    try {
      const data = await visitService.getMyDailySummary();
      setSummary(data);
    } catch {
      // Summary is non-critical, don't show error
    }
  }, []);

  // Fetch calendar visits
  const fetchCalendarVisits = useCallback(async (start: Date, end: Date) => {
    try {
      setCalendarLoading(true);
      const response = await visitService.getVisits({
        fechaDesde: start.toISOString(),
        fechaHasta: end.toISOString(),
        tamanoPagina: 500,
      });
      setCalendarVisits(response.items);
    } catch (err) {
      console.error('Error al cargar visitas del calendario:', err);
    } finally {
      setCalendarLoading(false);
    }
  }, []);

  // Fetch clients for form
  const fetchClients = useCallback(async () => {
    try {
      const res = await clientService.getClients({ limit: 100 });
      setClients(res.clients || []);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  useEffect(() => {
    fetchSummary();
    fetchClients();
  }, [fetchSummary, fetchClients]);

  useEffect(() => {
    if (currentView === 'calendar' && calendarVisits.length === 0) {
      const now = new Date();
      fetchCalendarVisits(startOfMonth(now), endOfMonth(now));
    }
  }, [currentView, calendarVisits.length, fetchCalendarVisits]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, tipoFilter, resultadoFilter, dateFilter]);

  // Client-side search filter (search is not sent to API)
  const filteredVisits = searchTerm
    ? visits.filter(v =>
        v.clienteNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.clienteDireccion && v.clienteDireccion.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : visits;

  // Handlers
  const handleCreateVisit = () => {
    setPrefilledDate(undefined);
    setShowVisitForm(true);
  };

  const handleViewDetails = async (visitId: number) => {
    try {
      setDetailLoading(true);
      setShowDetailDrawer(true);
      const detail = await visitService.getVisitById(visitId);
      setVisitDetail(detail);
    } catch {
      toast.error('Error al cargar los detalles de la visita');
      setShowDetailDrawer(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCheckIn = (visitId: number) => {
    setSelectedVisitId(visitId);
    setShowCheckInModal(true);
  };

  const handleCheckOut = (visitId: number) => {
    setSelectedVisitId(visitId);
    setShowCheckOutModal(true);
  };

  const handleSaveVisit = async (data: ClienteVisitaCreateDto) => {
    try {
      await visitService.createVisit(data);
      toast.success('Visita programada correctamente');
      await fetchVisits();
      await fetchSummary();
      if (currentView === 'calendar') {
        const now = new Date();
        await fetchCalendarVisits(startOfMonth(now), endOfMonth(now));
      }
      setShowVisitForm(false);
    } catch {
      toast.error('Error al programar la visita');
    }
  };

  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no soportada'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });
  };

  const handleConfirmCheckIn = async () => {
    if (!selectedVisitId) return;
    try {
      const position = await getCurrentPosition();
      const checkInData: CheckInDto = {
        latitud: position.coords.latitude,
        longitud: position.coords.longitude,
      };
      await visitService.checkIn(selectedVisitId, checkInData);
      toast.success('Check-in realizado correctamente');
      await fetchVisits();
      await fetchSummary();
      setShowCheckInModal(false);
      setSelectedVisitId(null);
    } catch {
      toast.error('Error al realizar el check-in');
    }
  };

  const handleConfirmCheckOut = async (resultado: ResultadoVisita) => {
    if (!selectedVisitId) return;
    try {
      let position: GeolocationPosition | null = null;
      try { position = await getCurrentPosition(); } catch { /* ok */ }
      const checkOutData: CheckOutDto = {
        resultado,
        latitud: position?.coords.latitude,
        longitud: position?.coords.longitude,
      };
      await visitService.checkOut(selectedVisitId, checkOutData);
      toast.success('Check-out realizado correctamente');
      await fetchVisits();
      await fetchSummary();
      setShowCheckOutModal(false);
      setShowDetailDrawer(false);
      setSelectedVisitId(null);
    } catch {
      toast.error('Error al realizar el check-out');
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setTipoFilter('');
    setResultadoFilter('');
    setDateFilter('');
  };

  const hasFilters = searchTerm || tipoFilter || resultadoFilter || dateFilter;

  // Calendar handlers
  const handleDateRangeChange = useCallback((start: Date, end: Date) => {
    fetchCalendarVisits(start, end);
  }, [fetchCalendarVisits]);

  const handleCalendarEventClick = useCallback((visitId: number) => {
    handleViewDetails(visitId);
  }, []);

  const handleCalendarSlotClick = useCallback((date: Date) => {
    setPrefilledDate(date.toISOString().split('T')[0]);
    setShowVisitForm(true);
  }, []);

  // View toggle + create button for actions
  const headerActions = (
    <>
      <div className="inline-flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setView('list')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            currentView === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <List className="w-4 h-4" />
          Lista
        </button>
        <button
          onClick={() => setView('calendar')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            currentView === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Calendario
        </button>
      </div>
      <button
        onClick={handleCreateVisit}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">Programar Visita</span>
        <span className="sm:hidden">Nueva</span>
      </button>
    </>
  );

  return (
    <PageHeader
      breadcrumbs={[
        { label: 'Inicio', href: '/dashboard' },
        { label: 'Visitas' },
      ]}
      title="Visitas"
      subtitle="Administra las visitas a clientes de tu equipo de ventas"
      actions={headerActions}
    >
      <div className="space-y-4">
        {/* Summary KPIs */}
        <VisitSummary
          totalVisits={summary.totalVisitas}
          completedVisits={summary.visitasCompletadas}
          visitsWithSale={summary.visitasConVenta}
          pendingVisits={summary.visitasPendientes}
          cancelledVisits={summary.visitasCanceladas}
          conversionRate={summary.tasaConversion}
        />

        {/* Filters */}
        {currentView === 'list' && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar por cliente..."
            />
            <div className="w-[150px]">
              <SearchableSelect
                options={[
                  { value: '', label: 'Todos los tipos' },
                  { value: TipoVisita.Rutina, label: 'Rutina' },
                  { value: TipoVisita.Cobranza, label: 'Cobranza' },
                  { value: TipoVisita.Entrega, label: 'Entrega' },
                  { value: TipoVisita.Prospeccion, label: 'Prospección' },
                  { value: TipoVisita.Seguimiento, label: 'Seguimiento' },
                  { value: TipoVisita.Otro, label: 'Otro' },
                ]}
                value={tipoFilter || null}
                onChange={(val) => setTipoFilter(val ? String(val) : '')}
                placeholder="Tipo"
              />
            </div>
            <div className="w-[170px]">
              <SearchableSelect
                options={[
                  { value: '', label: 'Todos los resultados' },
                  { value: ResultadoVisita.Pendiente, label: 'Pendiente' },
                  { value: ResultadoVisita.Venta, label: 'Con Venta' },
                  { value: ResultadoVisita.SinVenta, label: 'Sin Venta' },
                  { value: ResultadoVisita.NoEncontrado, label: 'No Encontrado' },
                  { value: ResultadoVisita.Reprogramada, label: 'Reprogramada' },
                  { value: ResultadoVisita.Cancelada, label: 'Cancelada' },
                ]}
                value={resultadoFilter || null}
                onChange={(val) => setResultadoFilter(val ? String(val) : '')}
                placeholder="Resultado"
              />
            </div>
            <div className="w-[160px]">
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
                onChange={(val) => setDateFilter(val ? String(val) : '')}
                placeholder="Fecha"
              />
            </div>
            <button
              onClick={() => fetchVisits()}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
            {hasFilters && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1 px-3 py-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded hover:bg-gray-50"
              >
                <X className="w-3.5 h-3.5" />
                Limpiar
              </button>
            )}
          </div>
        )}

        <ErrorBanner error={error} onRetry={fetchVisits} />

        {/* List View */}
        {currentView === 'list' && (
          <>
            {/* Mobile Cards */}
            <div className="sm:hidden space-y-3">
              {loading && (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="border border-gray-200 rounded-lg p-4 bg-white animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
                      <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              )}
              {!loading && filteredVisits.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No hay visitas</p>
                  <p className="text-sm mt-1">Programa una nueva visita para comenzar</p>
                </div>
              )}
              {!loading && filteredVisits.map(visit => {
                const res = getResultado(visit.resultado);
                const tipo = getTipo(visit.tipoVisita);
                const isPending = !visit.fechaHoraInicio;
                const isInProgress = visit.fechaHoraInicio && !visit.fechaHoraFin;
                return (
                  <div key={visit.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${res.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${res.dotColor}`} />
                          {res.label}
                        </span>
                        <span className={`text-xs font-medium ${tipo.color}`}>{tipo.label}</span>
                      </div>
                      {visit.tienePedido && <ShoppingCart className="w-4 h-4 text-green-600" />}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-sm font-medium truncate">{visit.clienteNombre}</span>
                    </div>
                    {visit.clienteDireccion && (
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-500 truncate">{visit.clienteDireccion}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500">{formatDate(visit.fechaProgramada)}</span>
                      {visit.duracionMinutos && (
                        <span className="text-xs text-gray-400 ml-auto">{visit.duracionMinutos} min</span>
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleViewDetails(visit.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 rounded hover:bg-gray-50"
                      >
                        <Eye className="w-3.5 h-3.5" /> Ver
                      </button>
                      {isPending && (
                        <button
                          onClick={() => handleCheckIn(visit.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-green-600 rounded-lg hover:bg-green-700"
                        >
                          <Play className="w-3.5 h-3.5" /> Iniciar
                        </button>
                      )}
                      {isInProgress && (
                        <button
                          onClick={() => handleCheckOut(visit.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-blue-600 rounded hover:bg-blue-700"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Finalizar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
              {/* Table Header */}
              <div className="flex items-center gap-3 bg-gray-50 px-5 h-10 border-b border-gray-200 min-w-[850px]">
                <div className="flex-1 min-w-[200px] text-[11px] font-medium text-gray-500 uppercase">Cliente</div>
                <div className="w-[100px] text-[11px] font-medium text-gray-500 uppercase">Tipo</div>
                <div className="w-[110px] text-[11px] font-medium text-gray-500 uppercase">Fecha</div>
                <div className="w-[120px] text-[11px] font-medium text-gray-500 uppercase">Resultado</div>
                <div className="w-[70px] text-[11px] font-medium text-gray-500 uppercase text-center">Duración</div>
                <div className="w-[30px]" />
                <div className="w-[130px] text-[11px] font-medium text-gray-500 uppercase text-right">Acciones</div>
              </div>

              {/* Table Body */}
              <div className="relative min-h-[200px]">
                <TableLoadingOverlay loading={loading} message="Cargando visitas..." />
                {!loading && filteredVisits.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 bg-white text-gray-400">
                    <MapPin className="w-12 h-12 mb-3 text-gray-300" />
                    <p className="text-lg font-medium">No hay visitas</p>
                    <p className="text-sm mt-1">Programa una nueva visita para comenzar</p>
                    <button
                      onClick={handleCreateVisit}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4" /> Programar Visita
                    </button>
                  </div>
                )}
                {!loading && filteredVisits.length > 0 && (
                  <div className={`transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                {filteredVisits.map(visit => {
                  const res = getResultado(visit.resultado);
                  const tipo = getTipo(visit.tipoVisita);
                  const isPending = !visit.fechaHoraInicio;
                  const isInProgress = visit.fechaHoraInicio && !visit.fechaHoraFin;
                  const isCompleted = !!visit.fechaHoraFin;
                  return (
                    <div key={visit.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors min-w-[850px]">
                      <div className="flex-1 min-w-[200px]">
                        <p className="text-sm font-medium text-gray-900 truncate">{visit.clienteNombre}</p>
                        {visit.clienteDireccion && (
                          <p className="text-xs text-gray-500 truncate">{visit.clienteDireccion}</p>
                        )}
                      </div>
                      <div className="w-[100px]">
                        <span className={`text-xs font-medium ${tipo.color}`}>{tipo.label}</span>
                      </div>
                      <div className="w-[110px] text-xs text-gray-600">
                        {formatDate(visit.fechaProgramada)}
                        {visit.fechaHoraInicio && (
                          <span className="block text-gray-400">{formatTime(visit.fechaHoraInicio)}</span>
                        )}
                      </div>
                      <div className="w-[120px]">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${res.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${res.dotColor}`} />
                          {res.label}
                        </span>
                      </div>
                      <div className="w-[70px] text-center text-xs text-gray-600">
                        {visit.duracionMinutos ? `${visit.duracionMinutos} min` : '-'}
                      </div>
                      <div className="w-[30px] flex justify-center">
                        {visit.tienePedido && <ShoppingCart className="w-4 h-4 text-green-500" />}
                      </div>
                      <div className="w-[130px] flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewDetails(visit.id)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isPending && (
                          <button
                            onClick={() => handleCheckIn(visit.id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <Play className="w-3 h-3" /> Iniciar
                          </button>
                        )}
                        {isInProgress && (
                          <button
                            onClick={() => handleCheckOut(visit.id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                          >
                            <CheckCircle className="w-3 h-3" /> Finalizar
                          </button>
                        )}
                        {isCompleted && (
                          <span className="flex items-center gap-1 px-2 py-1 text-xs text-green-600">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
                )}
              </div>
            </div>

            <ListPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
              itemLabel="visitas"
              loading={loading}
            />
          </>
        )}

        {/* Calendar View */}
        {currentView === 'calendar' && (
          <div data-tour="visits-calendar">
            <VisitCalendarView
              visits={calendarVisits}
              onDateRangeChange={handleDateRangeChange}
              onEventClick={handleCalendarEventClick}
              onSlotClick={handleCalendarSlotClick}
              loading={calendarLoading}
            />
          </div>
        )}
      </div>

      {/* Drawer: Programar Visita */}
      <Drawer
        isOpen={showVisitForm}
        onClose={() => setShowVisitForm(false)}
        title="Programar Nueva Visita"
        icon={<CalendarDays className="w-5 h-5 text-green-600" />}
        width="md"
      >
        <div className="p-6">
          <VisitForm
            clients={clients}
            onSave={handleSaveVisit}
            onCancel={() => setShowVisitForm(false)}
            defaultDate={prefilledDate}
          />
        </div>
      </Drawer>

      {/* Drawer: Detalle de Visita */}
      <Drawer
        isOpen={showDetailDrawer}
        onClose={() => { setShowDetailDrawer(false); setVisitDetail(null); }}
        title="Detalle de Visita"
        icon={<Eye className="w-5 h-5 text-blue-600" />}
        width="md"
      >
        {detailLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
          </div>
        )}
        {!detailLoading && visitDetail && (
          <div className="space-y-5 p-6">
            {/* Estado */}
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${getResultado(visitDetail.resultado).color}`}>
                <span className={`w-2 h-2 rounded-full ${getResultado(visitDetail.resultado).dotColor}`} />
                {getResultado(visitDetail.resultado).label}
              </span>
              <span className={`text-sm font-medium ${getTipo(visitDetail.tipoVisita).color}`}>
                {getTipo(visitDetail.tipoVisita).label}
              </span>
            </div>

            {/* Cliente */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{visitDetail.clienteNombre}</span>
              </div>
              {visitDetail.clienteDireccion && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{visitDetail.clienteDireccion}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Vendedor: {visitDetail.usuarioNombre}</span>
              </div>
            </div>

            {/* Fechas */}
            <div className="space-y-2">
              {visitDetail.fechaProgramada && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">Programada:</span>
                  <span>{formatDate(visitDetail.fechaProgramada)}</span>
                </div>
              )}
              {visitDetail.fechaHoraInicio && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">Inicio:</span>
                  <span>{formatDate(visitDetail.fechaHoraInicio)} {formatTime(visitDetail.fechaHoraInicio)}</span>
                </div>
              )}
              {visitDetail.fechaHoraFin && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">Fin:</span>
                  <span>{formatDate(visitDetail.fechaHoraFin)} {formatTime(visitDetail.fechaHoraFin)}</span>
                </div>
              )}
              {visitDetail.duracionMinutos && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">Duración:</span>
                  <span className="font-medium">{visitDetail.duracionMinutos} min</span>
                </div>
              )}
            </div>

            {/* Pedido asociado */}
            {visitDetail.numeroPedido && (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-sm">
                <ShoppingCart className="w-4 h-4 text-green-600" />
                <span className="text-green-700">Pedido #{visitDetail.numeroPedido}</span>
              </div>
            )}

            {/* Notas */}
            {visitDetail.notas && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Notas</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded p-3">{visitDetail.notas}</p>
              </div>
            )}

            {/* Ubicación con mapa */}
            {(visitDetail.latitudInicio || visitDetail.latitudFin) && (() => {
              const markers: MapMarker[] = [];
              if (visitDetail.latitudInicio && visitDetail.longitudInicio) {
                markers.push({
                  id: 'checkin',
                  lat: visitDetail.latitudInicio,
                  lng: visitDetail.longitudInicio,
                  title: 'Check-in',
                  label: 'Check-in',
                  color: 'green',
                });
              }
              if (visitDetail.latitudFin && visitDetail.longitudFin) {
                markers.push({
                  id: 'checkout',
                  lat: visitDetail.latitudFin,
                  lng: visitDetail.longitudFin,
                  title: 'Check-out',
                  label: 'Check-out',
                  color: 'blue',
                });
              }
              return (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase">Ubicación</p>
                  <GoogleMapWrapper
                    markers={markers}
                    zoom={15}
                    height="200px"
                  />
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    {visitDetail.latitudInicio && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        Check-in: {visitDetail.latitudInicio.toFixed(5)}, {visitDetail.longitudInicio?.toFixed(5)}
                      </span>
                    )}
                    {visitDetail.latitudFin && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        Check-out: {visitDetail.latitudFin.toFixed(5)}, {visitDetail.longitudFin?.toFixed(5)}
                      </span>
                    )}
                    {visitDetail.distanciaCliente != null && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Distancia al cliente: {visitDetail.distanciaCliente.toFixed(0)} m
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Actions */}
            {!visitDetail.fechaHoraInicio && (
              <button
                onClick={() => { setSelectedVisitId(visitDetail.id); setShowCheckInModal(true); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                <Play className="w-4 h-4" /> Iniciar Visita
              </button>
            )}
            {visitDetail.fechaHoraInicio && !visitDetail.fechaHoraFin && (
              <button
                onClick={() => { setSelectedVisitId(visitDetail.id); setShowCheckOutModal(true); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <CheckCircle className="w-4 h-4" /> Finalizar Visita
              </button>
            )}
          </div>
        )}
      </Drawer>

      {/* Modal: Check-In */}
      {showCheckInModal && (
        <Modal
          isOpen={showCheckInModal}
          onClose={() => { setShowCheckInModal(false); setSelectedVisitId(null); }}
          title="Confirmar Check-In"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              ¿Deseas iniciar esta visita? Se registrará tu ubicación actual.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => { setShowCheckInModal(false); setSelectedVisitId(null); }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmCheckIn}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Iniciar Visita
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Check-Out */}
      {showCheckOutModal && (
        <Modal
          isOpen={showCheckOutModal}
          onClose={() => { setShowCheckOutModal(false); setSelectedVisitId(null); }}
          title="Finalizar Visita"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-gray-600">Selecciona el resultado de la visita:</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleConfirmCheckOut(ResultadoVisita.Venta)}
                className="px-4 py-3 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 font-medium"
              >
                Con Venta
              </button>
              <button
                onClick={() => handleConfirmCheckOut(ResultadoVisita.SinVenta)}
                className="px-4 py-3 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 font-medium"
              >
                Sin Venta
              </button>
              <button
                onClick={() => handleConfirmCheckOut(ResultadoVisita.NoEncontrado)}
                className="px-4 py-3 bg-orange-100 text-orange-800 rounded-lg hover:bg-orange-200 font-medium"
              >
                No Encontrado
              </button>
              <button
                onClick={() => handleConfirmCheckOut(ResultadoVisita.Reprogramada)}
                className="px-4 py-3 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 font-medium"
              >
                Reprogramar
              </button>
            </div>
            <button
              onClick={() => { setShowCheckOutModal(false); setSelectedVisitId(null); }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 mt-2"
            >
              Cancelar
            </button>
          </div>
        </Modal>
      )}
    </PageHeader>
  );
}

export default function VisitsPage() {
  const { formatDate } = useFormatters();
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" /></div>}>
      <VisitsPageContent />
    </Suspense>
  );
}
