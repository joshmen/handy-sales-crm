'use client';

import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchBar } from '@/components/common/SearchBar';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { DataGrid, DataGridColumn } from '@/components/ui/DataGrid';
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
} from '@/types/visits';
import { visitService } from '@/services/api/visits';
import { clientService } from '@/services/api/clients';
import { toast } from '@/hooks/useToast';
import {
  List, CalendarDays, Plus, RefreshCw, Eye, CheckCircle,
  ShoppingCart, User, MapPin, Calendar, Clock, X,
} from 'lucide-react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays, subWeeks, subMonths } from 'date-fns';
import { useFormatters } from '@/hooks/useFormatters';
import { formatDate as libFmtDate } from '@/lib/formatters';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('visits');
  const tc = useTranslations('common');
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
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
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
      setError(t('errorLoadingRetry'));
      toast.error(t('errorLoading'));
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

  // Sort state
  const [sortKey, setSortKey] = useState('fechaProgramada');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = useCallback((key: string) => {
    setSortDir(prev => sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc');
    setSortKey(key);
  }, [sortKey]);

  // Client-side search filter (search is not sent to API)
  const filteredVisits = searchTerm
    ? visits.filter(v =>
        v.clienteNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.clienteDireccion && v.clienteDireccion.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : visits;

  const sortedVisits = useMemo(() => {
    const sorted = [...filteredVisits];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'clienteNombre': cmp = a.clienteNombre.localeCompare(b.clienteNombre); break;
        case 'fechaProgramada': cmp = (a.fechaProgramada || '').localeCompare(b.fechaProgramada || ''); break;
        default: cmp = 0;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return sorted;
  }, [filteredVisits, sortKey, sortDir]);

  // Column definitions
  const visitColumns = useMemo<DataGridColumn<ClienteVisitaListaDto>[]>(() => [
    {
      key: 'clienteNombre',
      label: 'Cliente',
      sortable: true,
      width: 'flex',
      cellRenderer: (visit) => (
        <div>
          <p className="text-sm font-medium text-gray-900 truncate">{visit.clienteNombre}</p>
          {visit.clienteDireccion && <p className="text-xs text-gray-500 truncate">{visit.clienteDireccion}</p>}
        </div>
      ),
    },
    {
      key: 'tipoVisita',
      label: 'Tipo',
      width: 100,
      cellRenderer: (visit) => {
        const tipo = getTipo(visit.tipoVisita);
        return <span className={`text-xs font-medium ${tipo.color}`}>{tipo.label}</span>;
      },
    },
    {
      key: 'fechaProgramada',
      label: 'Fecha',
      sortable: true,
      width: 110,
      cellRenderer: (visit) => (
        <div className="text-xs text-gray-600">
          {formatDate(visit.fechaProgramada)}
          {visit.fechaHoraInicio && <span className="block text-gray-400">{formatTime(visit.fechaHoraInicio)}</span>}
        </div>
      ),
    },
    {
      key: 'resultado',
      label: 'Resultado',
      width: 120,
      cellRenderer: (visit) => {
        const res = getResultado(visit.resultado);
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${res.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${res.dotColor}`} />
            {res.label}
          </span>
        );
      },
    },
    {
      key: 'duracion',
      label: 'Duración',
      width: 70,
      align: 'center',
      cellRenderer: (visit) => <span className="text-xs text-gray-600">{visit.duracionMinutos ? `${visit.duracionMinutos} min` : '-'}</span>,
    },
    {
      key: 'pedido',
      label: '',
      width: 30,
      cellRenderer: (visit) => visit.tienePedido ? <ShoppingCart className="w-4 h-4 text-green-500" /> : null,
    },
    {
      key: 'actions',
      label: 'Acciones',
      width: 130,
      align: 'right',
      cellRenderer: (visit) => {
        const isCompleted = !!visit.fechaHoraFin;
        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => handleViewDetails(visit.id)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors" title="Ver detalles">
              <Eye className="w-4 h-4" />
            </button>
            {isCompleted && (
              <span className="flex items-center gap-1 px-2 py-1 text-xs text-green-600">
                <CheckCircle className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        );
      },
    },
  ], []);

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
      toast.error(t('errorLoadingDetail'));
      setShowDetailDrawer(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveVisit = async (data: ClienteVisitaCreateDto) => {
    try {
      await visitService.createVisit(data);
      toast.success(t('visitCreated'));
      await fetchVisits();
      await fetchSummary();
      if (currentView === 'calendar') {
        const now = new Date();
        await fetchCalendarVisits(startOfMonth(now), endOfMonth(now));
      }
      setShowVisitForm(false);
    } catch {
      toast.error(t('errorCreating'));
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
          {t('views.list')}
        </button>
        <button
          onClick={() => setView('calendar')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            currentView === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          {t('views.calendar')}
        </button>
      </div>
      <button
        onClick={handleCreateVisit}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">{t('newVisit')}</span>
        <span className="sm:hidden">{t('newVisitShort')}</span>
      </button>
    </>
  );

  return (
    <PageHeader
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: t('title') },
      ]}
      title={t('title')}
      subtitle={t('subtitle')}
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
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
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
                {t('clearFilters')}
              </button>
            )}
          </div>
        )}

        <ErrorBanner error={error} onRetry={fetchVisits} />

        {/* List View */}
        {currentView === 'list' && (
          <>
            {/* Visits DataGrid */}
            <DataGrid<ClienteVisitaListaDto>
              columns={visitColumns}
              data={sortedVisits}
              keyExtractor={(v) => v.id}
              loading={loading}
              loadingMessage={t('loadingVisits')}
              emptyIcon={<MapPin className="w-12 h-12 text-gray-300" />}
              emptyTitle={t('emptyTitle')}
              emptyMessage={t('emptyDefault')}
              sort={{
                key: sortKey,
                direction: sortDir,
                onSort: handleSort,
              }}
              pagination={{
                currentPage,
                totalPages,
                totalItems,
                pageSize: PAGE_SIZE,
                onPageChange: setCurrentPage,
              }}
              mobileCardRenderer={(visit) => {
                const res = getResultado(visit.resultado);
                const tipo = getTipo(visit.tipoVisita);
                return (
                  <>
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
                      {visit.duracionMinutos && <span className="text-xs text-gray-400 ml-auto">{visit.duracionMinutos} min</span>}
                    </div>
                    <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleViewDetails(visit.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 rounded hover:bg-gray-50">
                        <Eye className="w-3.5 h-3.5" /> Ver
                      </button>
                    </div>
                  </>
                );
              }}
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
        title={t('detail.scheduleTitle')}
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
        title={t('detail.title')}
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
                <p className="text-xs font-medium text-gray-500 mb-1">Notas</p>
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
                  <p className="text-xs font-medium text-gray-500">Ubicación</p>
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

            {/* Check-in/out only available from mobile app */}
            <p className="text-sm text-muted-foreground text-center py-3">{t('detail.mobileOnlyHint')}</p>
          </div>
        )}
      </Drawer>

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
