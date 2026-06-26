'use client';

import React, { useState, useEffect, useCallback, Suspense, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { TabBar } from '@/components/ui/TabBar';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { DataGrid, DataGridColumn } from '@/components/ui/DataGrid';
import { Drawer } from '@/components/ui/Drawer';
import { SoftBadge, SoftBadgeTone } from '@/components/ui/SoftBadge';
import { NameAvatar } from '@/components/ui/NameAvatar';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { VisitForm } from '@/components/visits';
import { DateRangeFilter, type DateRangeValue } from '@/components/ui/DateRangeFilter';
import { startOfMonthIso } from '@/components/ui/dateFilterUtils';
import { GoogleMapWrapper, MapMarker } from '@/components/maps/GoogleMapWrapper';
import { Client } from '@/types';
import {
  ClienteVisitaListaDto,
  ClienteVisitaDto,
  ClienteVisitaCreateDto,
  CoberturaCliente,
  ResultadoVisita,
  TipoVisita,
  VisitaResumen,
} from '@/types/visits';
import { visitService } from '@/services/api/visits';
import { clientService } from '@/services/api/clients';
import { toast } from '@/hooks/useToast';
import {
  Plus, Eye, ShoppingCart, User, MapPin, Calendar, Clock, CalendarDays,
  CheckCircle, Percent, Timer, XCircle, AlertTriangle, Download, CalendarPlus,
} from 'lucide-react';
import { useFormatters } from '@/hooks/useFormatters';
import { formatDate as libFmtDate } from '@/lib/formatters';
import { downloadBlob } from '@/lib/download';
import { useTranslations } from 'next-intl';
import { useBackendTranslation } from '@/hooks/useBackendTranslation';
import { usePermissions } from '@/hooks/usePermissions';
import { useCompany } from '@/contexts/CompanyContext';

type Segment = 'today' | 'coverage';

const PAGE_SIZE = 10;
const DASH = '-';

// API returns enums as integers (0-5) — colors are static, labels resolved via i18n inside component
const resultadoKeys = ['pending', 'withSale', 'noSale', 'notFound', 'rescheduled', 'cancelled'];
const resultadoToneArr: SoftBadgeTone[] = ['warning', 'success', 'default', 'danger', 'info', 'danger'];
const resultadoStringMap: Record<string, number> = {
  Pendiente: 0, Venta: 1, SinVenta: 2, NoEncontrado: 3, Reprogramada: 4, Cancelada: 5,
};

const tipoKeys = ['routine', 'collection', 'delivery', 'prospecting', 'followUp', 'other'];
const tipoStringMap: Record<string, number> = {
  Rutina: 0, Cobranza: 1, Entrega: 2, Prospeccion: 3, Seguimiento: 4, Otro: 5,
};

const formatTime = (dateStr?: string) => {
  if (!dateStr) return '-';
  return libFmtDate(dateStr, null, { hour: '2-digit', minute: '2-digit' });
};

function VisitsPageContent() {
  const t = useTranslations('visits');
  const tc = useTranslations('common');
  const { tApi } = useBackendTranslation();
  const { tenantToday, formatCurrency } = useFormatters();
  const searchParams = useSearchParams();
  const { isAdminValue, hasRole, isVendedorValue } = usePermissions();
  const { settings } = useCompany();

  const geofenceRadius = settings?.geocercaRadioMetros ?? 80;
  const canSchedule = !!isAdminValue || hasRole('SUPERVISOR');

  // Translated helpers for enums
  const getResultado = (val: ResultadoVisita | number) => {
    const idx = typeof val === 'number' ? val : (resultadoStringMap[val] ?? 0);
    return { label: t(`results.${resultadoKeys[idx] ?? 'pending'}`), tone: resultadoToneArr[idx] ?? 'default' };
  };
  const getTipo = (val: TipoVisita | number) => {
    const idx = typeof val === 'number' ? val : (tipoStringMap[val] ?? 5);
    return t(`types.${tipoKeys[idx] ?? 'other'}`);
  };

  // Segment
  const [segment, setSegment] = useState<Segment>('today');

  // Registro de hoy — datos
  const [visits, setVisits] = useState<ClienteVisitaListaDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  // Filtro de RANGO — por defecto "este mes" (día 1 del mes a hoy). Reemplaza al
  // antiguo filtro de un solo día (`diaFiltro`).
  const [rango, setRango] = useState<DateRangeValue>(() => {
    const hoy = tenantToday();
    return { mode: 'mes', from: startOfMonthIso(hoy), to: hoy };
  });

  // Resumen (KPIs) del rango filtrado completo — lo calcula el backend sobre TODO
  // el set, no la página. Se hidrata desde `getVisits().resumen`.
  const [resumen, setResumen] = useState<VisitaResumen>({ total: 0, completadas: 0, conVenta: 0, sinVenta: 0, duracionPromedio: 0 });

  // Cobertura — datos
  const [cobertura, setCobertura] = useState<CoberturaCliente[]>([]);
  const [coberturaLoading, setCoberturaLoading] = useState(false);
  const [coberturaLoaded, setCoberturaLoaded] = useState(false);
  const [coberturaPage, setCoberturaPage] = useState(1);

  // Clientes para el form de agendar
  const [clients, setClients] = useState<Client[]>([]);

  // Drawers
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [visitDetail, setVisitDetail] = useState<ClienteVisitaDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [prefilledClienteId, setPrefilledClienteId] = useState<number | undefined>();

  // Honra ?clienteId=X (deep link desde email "Programar visita" o reorder-opportunities):
  // abre el drawer de agendar con cliente pre-seleccionado.
  const handledClienteIdRef = useRef<string | null>(null);
  useEffect(() => {
    const clienteIdParam = searchParams.get('clienteId');
    if (!clienteIdParam) {
      handledClienteIdRef.current = null;
      return;
    }
    if (handledClienteIdRef.current === clienteIdParam) return;
    const parsed = parseInt(clienteIdParam, 10);
    if (isNaN(parsed) || parsed <= 0) return;
    if (clients.length === 0) return;

    handledClienteIdRef.current = clienteIdParam;

    const exists = clients.some(c => parseInt(c.id) === parsed);
    if (exists) {
      setPrefilledClienteId(parsed);
      setShowVisitForm(true);
      return;
    }
    (async () => {
      try {
        const cliente = await clientService.getClientById(parsed);
        setClients(prev => prev.some(c => c.id === cliente.id) ? prev : [...prev, cliente]);
        setPrefilledClienteId(parsed);
        setShowVisitForm(true);
      } catch {
        setShowVisitForm(true);
      }
    })();
  }, [searchParams, clients]);

  // Fetch del rango (registro de visitas). El backend devuelve `resumen` con los
  // KPIs del rango completo (no la página), que hidratamos para las MetricCards.
  const fetchVisits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await visitService.getVisits({
        pagina: currentPage,
        tamanoPagina: PAGE_SIZE,
        fechaDesde: `${rango.from}T00:00:00`,
        fechaHasta: `${rango.to}T23:59:59`,
      });
      setVisits(response.items);
      setTotalItems(response.totalItems);
      if (response.resumen) setResumen(response.resumen);
    } catch (err) {
      console.error('Error al cargar visitas:', err);
      setError(t('errorLoadingRetry'));
      toast.error(t('errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [currentPage, rango]);

  const fetchClients = useCallback(async () => {
    try {
      const res = await clientService.getClients({ limit: 100 });
      setClients(res.clients || []);
    } catch {
      // non-critical
    }
  }, []);

  const fetchCobertura = useCallback(async () => {
    try {
      setCoberturaLoading(true);
      const data = await visitService.getCobertura();
      setCobertura(data);
      setCoberturaLoaded(true);
    } catch (err) {
      console.error('Error al cargar cobertura:', err);
    } finally {
      setCoberturaLoading(false);
    }
  }, []);

  useEffect(() => { fetchVisits(); }, [fetchVisits]);
  useEffect(() => { fetchClients(); }, [fetchClients]);

  // Carga la cobertura la primera vez que se abre esa pestaña.
  useEffect(() => {
    if (segment === 'coverage' && !coberturaLoaded) fetchCobertura();
  }, [segment, coberturaLoaded, fetchCobertura]);

  useEffect(() => { setCurrentPage(1); }, [rango]);
  useEffect(() => { setCoberturaPage(1); }, [cobertura]);

  // KPIs derivados del `resumen` agregado del backend (rango completo, NO la página).
  const todayMetrics = useMemo(() => {
    const total = resumen.total;
    const done = resumen.completadas;
    const effectiveness = done > 0 ? Math.round((resumen.conVenta / done) * 100) : 0;
    const avg = Math.round(resumen.duracionPromedio);
    const noSale = resumen.sinVenta;
    return { total, done, effectiveness, avg, noSale };
  }, [resumen]);

  // KPIs "Cobertura" derivados del dataset de cobertura.
  const coverageMetrics = useMemo(() => {
    const totalClientes = cobertura.length;
    const dentroFrecuencia = cobertura.filter(c => c.estado === 'PorVisitar').length;
    const monthCoverage = totalClientes > 0 ? Math.round((dentroFrecuencia / totalClientes) * 100) : 0;
    // diasDesdeUltima null = nunca visitado → cuenta como atrasado.
    const noVisit7 = cobertura.filter(c => c.diasDesdeUltima == null || c.diasDesdeUltima >= 7).length;
    const noVisit14 = cobertura.filter(c => c.diasDesdeUltima == null || c.diasDesdeUltima >= 14).length;
    const atRisk = cobertura.filter(c => c.estado === 'Vencida').length;
    return { monthCoverage, noVisit7, noVisit14, atRisk };
  }, [cobertura]);

  // Geocerca dentro/fuera por distancia vs radio del tenant.
  const renderGeofence = (distancia?: number) => {
    if (distancia == null) return <span className="text-muted-foreground">{DASH}</span>;
    const d = Math.round(distancia);
    const inside = d <= geofenceRadius;
    return <SoftBadge tone={inside ? 'success' : 'danger'}>{t(inside ? 'geofence.inside' : 'geofence.outside', { d })}</SoftBadge>;
  };

  // Columnas Registro de hoy
  const visitColumns = useMemo<DataGridColumn<ClienteVisitaListaDto>[]>(() => {
    const cols: DataGridColumn<ClienteVisitaListaDto>[] = [
      {
        key: 'clienteNombre',
        label: t('columns.client'),
        width: 'flex',
        cellRenderer: (v) => (
          <div className="flex items-center gap-2.5 min-w-0">
            <NameAvatar name={v.clienteNombre} size={32} />
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate">{v.clienteNombre}</p>
              {v.clienteDireccion && <p className="text-[11px] text-muted-foreground truncate">{v.clienteDireccion}</p>}
            </div>
          </div>
        ),
      },
    ];

    // El vendedor no necesita ver la columna "Vendedor" (todas son suyas).
    if (!isVendedorValue) {
      cols.push({
        key: 'vendedorNombre',
        label: t('vendorColumn'),
        width: 150,
        cellRenderer: (v) => <span className="text-[12px] text-foreground/70 truncate">{v.vendedorNombre || t('noVendor')}</span>,
      });
    }

    cols.push(
      {
        key: 'hora',
        label: t('timeColumn'),
        width: 80,
        cellRenderer: (v) => <span className="text-[12px] text-foreground/70">{v.fechaHoraInicio ? formatTime(v.fechaHoraInicio) : DASH}</span>,
      },
      {
        key: 'duracion',
        label: t('columns.duration'),
        width: 80,
        align: 'center',
        cellRenderer: (v) => <span className="text-[13px] text-foreground/70">{v.duracionMinutos ? `${v.duracionMinutos} min` : DASH}</span>,
      },
      {
        key: 'tipoPlaneacion',
        label: t('columns.type'),
        width: 110,
        cellRenderer: (v) => {
          const planeada = v.esProgramada ?? !!v.fechaProgramada;
          return <SoftBadge tone={planeada ? 'info' : 'warning'}>{t(planeada ? 'planeada' : 'adHoc')}</SoftBadge>;
        },
      },
      {
        key: 'resultado',
        label: t('columns.result'),
        width: 130,
        cellRenderer: (v) => { const r = getResultado(v.resultado); return <SoftBadge tone={r.tone}>{r.label}</SoftBadge>; },
      },
      {
        key: 'monto',
        label: t('amountColumn'),
        width: 110,
        align: 'right',
        cellRenderer: (v) => v.monto != null
          ? <span className="text-[13px] font-medium text-foreground">{formatCurrency(v.monto)}</span>
          : <span className="text-[13px] text-muted-foreground">{DASH}</span>,
      },
      {
        key: 'geocerca',
        label: t('geofenceColumn'),
        width: 130,
        cellRenderer: (v) => renderGeofence(v.distanciaCliente),
      },
    );

    return cols;
  }, [isVendedorValue, geofenceRadius]);

  // Cobertura paginada en cliente.
  const coberturaPaged = useMemo(() => {
    const start = (coberturaPage - 1) * PAGE_SIZE;
    return cobertura.slice(start, start + PAGE_SIZE);
  }, [cobertura, coberturaPage]);
  const coberturaTotalPages = Math.max(1, Math.ceil(cobertura.length / PAGE_SIZE));

  const renderLastVisit = (c: CoberturaCliente) => {
    if (c.diasDesdeUltima == null) {
      return <span className="text-[12px] font-medium text-red-600">{t('lastVisitNever')}</span>;
    }
    const cls = c.estado === 'Vencida' ? 'text-red-600' : 'text-foreground/70';
    return <span className={`text-[12px] ${cls}`}>{t('lastVisitRelative', { days: c.diasDesdeUltima })}</span>;
  };

  const coberturaColumns = useMemo<DataGridColumn<CoberturaCliente>[]>(() => [
    {
      key: 'clienteNombre',
      label: t('columns.client'),
      width: 'flex',
      cellRenderer: (c) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <NameAvatar name={c.clienteNombre} size={32} />
          <p className="text-[13px] font-medium text-foreground truncate">{c.clienteNombre}</p>
        </div>
      ),
    },
    {
      key: 'zonaNombre',
      label: t('coverageColumns.zone'),
      width: 140,
      cellRenderer: (c) => <span className="text-[12px] text-foreground/70 truncate">{c.zonaNombre || DASH}</span>,
    },
    {
      key: 'vendedorNombre',
      label: t('coverageColumns.vendor'),
      width: 150,
      cellRenderer: (c) => <span className="text-[12px] text-foreground/70 truncate">{c.vendedorNombre || t('noVendor')}</span>,
    },
    {
      key: 'frecuencia',
      label: t('coverageColumns.frequency'),
      width: 110,
      cellRenderer: (c) => <SoftBadge tone="info" dot={false}>{tApi(c.frecuenciaNombre) || c.frecuenciaNombre}</SoftBadge>,
    },
    {
      key: 'ultimaVisita',
      label: t('coverageColumns.lastVisit'),
      width: 120,
      cellRenderer: (c) => renderLastVisit(c),
    },
    {
      key: 'estado',
      label: t('coverageColumns.status'),
      width: 120,
      cellRenderer: (c) => (
        <SoftBadge tone={c.estado === 'Vencida' ? 'danger' : 'warning'}>
          {t(c.estado === 'Vencida' ? 'coverageStatus.overdue' : 'coverageStatus.toVisit')}
        </SoftBadge>
      ),
    },
    {
      key: 'actions',
      label: tc('actions'),
      width: 120,
      align: 'right',
      cellRenderer: (c) => (
        <div onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleScheduleFor(c.clienteId, c.clienteNombre)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            {t('schedule')}
          </button>
        </div>
      ),
    },
  ], []);

  // Handlers
  const handleOpenSchedule = () => {
    setPrefilledClienteId(undefined);
    setShowVisitForm(true);
  };

  const handleScheduleFor = async (clienteId: number, clienteNombre: string) => {
    // Asegura que el cliente esté en la lista del SearchableSelect del form.
    if (!clients.some(c => parseInt(c.id) === clienteId)) {
      try {
        const cliente = await clientService.getClientById(clienteId);
        setClients(prev => prev.some(c => c.id === cliente.id) ? prev : [...prev, cliente]);
      } catch {
        // Inyecta un mínimo viable si el fetch falla, para que el nombre aparezca.
        setClients(prev => prev.some(c => parseInt(c.id) === clienteId)
          ? prev
          : [...prev, { id: String(clienteId), name: clienteNombre } as Client]);
      }
    }
    setPrefilledClienteId(clienteId);
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
    // Modelo: la web solo AGENDA visitas futuras. Si el form no trae fecha,
    // por defecto se agenda para mañana (nunca una visita inmediata/ad-hoc).
    let fechaProgramada = data.fechaProgramada;
    if (!fechaProgramada) {
      const manana = new Date();
      manana.setDate(manana.getDate() + 1);
      manana.setHours(9, 0, 0, 0);
      fechaProgramada = manana.toISOString();
    }
    try {
      await visitService.createVisit({ ...data, fechaProgramada });
      toast.success(t('visitCreated'));
      await fetchVisits();
      if (coberturaLoaded) await fetchCobertura();
      setShowVisitForm(false);
      setPrefilledClienteId(undefined);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(tApi(e?.response?.data?.message) || tApi(e?.message) || t('errorCreating'));
    }
  };

  const handleExport = () => {
    const rows = segment === 'today'
      ? visits.map(v => ({
          cliente: v.clienteNombre,
          vendedor: v.vendedorNombre || '',
          hora: v.fechaHoraInicio ? formatTime(v.fechaHoraInicio) : '',
          duracion: v.duracionMinutos ?? '',
          resultado: getResultado(v.resultado).label,
          monto: v.monto ?? '',
          distancia: v.distanciaCliente ?? '',
        }))
      : cobertura.map(c => ({
          cliente: c.clienteNombre,
          zona: c.zonaNombre || '',
          vendedor: c.vendedorNombre || '',
          frecuencia: c.frecuenciaNombre,
          diasDesdeUltima: c.diasDesdeUltima ?? '',
          estado: c.estado,
        }));
    if (rows.length === 0) { toast.error(t('errorLoading')); return; }
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String((r as Record<string, unknown>)[h] ?? '')}"`).join(','))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `visitas-${segment}-${tenantToday()}.csv`);
    toast.success(tc('csvDownloaded'));
  };

  const headerActions = (
    <>
      <DateRangeFilter
        value={rango}
        onChange={setRango}
        retentionDays={180}
      />
      {canSchedule && (
        <Button variant="wbPrimary" onClick={handleOpenSchedule}>
          <Plus className="w-4 h-4 mr-2" />
          {t('scheduleVisit')}
        </Button>
      )}
      <button
        onClick={handleExport}
        className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-[13px] font-medium text-foreground border border-border-strong bg-card rounded-full hover:bg-surface-2 transition-colors"
      >
        <Download className="w-4 h-4 text-muted-foreground" />
        <span className="hidden sm:inline">{t('export')}</span>
      </button>
    </>
  );

  return (
    <PageHeader
      section="operacion"
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: t('breadcrumbOperation') },
        { label: t('title') },
      ]}
      title={t('title')}
      subtitle={t('subtitleToday', { count: resumen.total })}
      actions={headerActions}
    >
      <div className="space-y-4">
        {/* Segment tabs (TabBar subrayado, teal operación) */}
        <TabBar
          items={[
            { id: 'today', label: t('segments.today') },
            { id: 'coverage', label: t('segments.coverage') },
          ]}
          value={segment}
          onChange={(id) => setSegment(id as Segment)}
        />

        {/* ─────────── Registro de hoy ─────────── */}
        {segment === 'today' && (
          <>
            <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-[13px] leading-relaxed text-foreground/80">
                <span className="font-semibold text-foreground">{t('todayBanner.title')}</span>{' '}
                {t('todayBanner.before')}
                <span className="font-semibold text-foreground">{t('todayBanner.bold')}</span>
                {t('todayBanner.after')}
                <span className="font-semibold text-foreground">{t('todayBanner.tab')}</span>
                {t('todayBanner.end')}
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard title={t('todayMetrics.visitsToday')} value={`${todayMetrics.done} / ${todayMetrics.total}`} icon={CheckCircle} color="blue" />
              <MetricCard title={t('todayMetrics.effectiveness')} value={`${todayMetrics.effectiveness}%`} icon={Percent} color="green" />
              <MetricCard title={t('todayMetrics.avgDuration')} value={`${todayMetrics.avg} min`} icon={Timer} color="purple" />
              <MetricCard title={t('todayMetrics.noSale')} value={todayMetrics.noSale} icon={XCircle} color="orange" />
            </div>

            <ErrorBanner error={error} onRetry={fetchVisits} />

            <DataGrid<ClienteVisitaListaDto>
              columns={visitColumns}
              data={visits}
              keyExtractor={(v) => v.id}
              loading={loading}
              loadingMessage={t('loadingVisits')}
              onRowClick={(v) => handleViewDetails(v.id)}
              emptyIcon={<MapPin className="w-12 h-12 text-muted-foreground/60" />}
              emptyTitle={t('emptyTitle')}
              emptyMessage={t('emptyDefault')}
              pagination={{ currentPage, totalPages, totalItems, pageSize: PAGE_SIZE, onPageChange: setCurrentPage }}
              mobileCardRenderer={(v) => {
                const r = getResultado(v.resultado);
                return (
                  <div onClick={() => handleViewDetails(v.id)}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <NameAvatar name={v.clienteNombre} size={28} />
                        <span className="text-sm font-medium truncate">{v.clienteNombre}</span>
                      </div>
                      <SoftBadge tone={r.tone}>{r.label}</SoftBadge>
                    </div>
                    {!isVendedorValue && v.vendedorNombre && (
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground truncate">{v.vendedorNombre}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{v.fechaHoraInicio ? formatTime(v.fechaHoraInicio) : DASH}</span>
                      {v.duracionMinutos ? <span>{v.duracionMinutos} min</span> : null}
                      {v.monto != null && <span className="font-medium text-foreground ml-auto">{formatCurrency(v.monto)}</span>}
                    </div>
                    <div className="mt-1">{renderGeofence(v.distanciaCliente)}</div>
                  </div>
                );
              }}
            />
          </>
        )}

        {/* ─────────── Cobertura ─────────── */}
        {segment === 'coverage' && (
          <>
            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
              <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-[13px] leading-relaxed text-foreground/80">
                <span className="font-semibold text-foreground">{t('coverageBanner.title')}</span>{' '}
                {t('coverageBanner.body')}
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard title={t('coverageMetrics.monthCoverage')} value={`${coverageMetrics.monthCoverage}%`} icon={Percent} color="blue" />
              <MetricCard title={t('coverageMetrics.noVisit7')} value={coverageMetrics.noVisit7} icon={Clock} color="orange" />
              <MetricCard title={t('coverageMetrics.noVisit14')} value={coverageMetrics.noVisit14} icon={AlertTriangle} color="orange" />
              <MetricCard title={t('coverageMetrics.atRisk')} value={coverageMetrics.atRisk} icon={XCircle} color="red" />
            </div>

            <DataGrid<CoberturaCliente>
              columns={coberturaColumns}
              data={coberturaPaged}
              keyExtractor={(c) => c.clienteId}
              loading={coberturaLoading}
              loadingMessage={t('loadingVisits')}
              emptyIcon={<CheckCircle className="w-12 h-12 text-muted-foreground/60" />}
              emptyTitle={t('coverageEmptyTitle')}
              emptyMessage={t('coverageEmptyMessage')}
              pagination={{ currentPage: coberturaPage, totalPages: coberturaTotalPages, totalItems: cobertura.length, pageSize: PAGE_SIZE, onPageChange: setCoberturaPage }}
              mobileCardRenderer={(c) => (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <NameAvatar name={c.clienteNombre} size={28} />
                      <span className="text-sm font-medium truncate">{c.clienteNombre}</span>
                    </div>
                    <SoftBadge tone={c.estado === 'Vencida' ? 'danger' : 'warning'}>
                      {t(c.estado === 'Vencida' ? 'coverageStatus.overdue' : 'coverageStatus.toVisit')}
                    </SoftBadge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2">
                    {c.zonaNombre && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{c.zonaNombre}</span>}
                    {c.vendedorNombre && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{c.vendedorNombre}</span>}
                    <span>{renderLastVisit(c)}</span>
                  </div>
                  <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleScheduleFor(c.clienteId, c.clienteNombre)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />{t('schedule')}
                    </button>
                  </div>
                </div>
              )}
            />
          </>
        )}
      </div>

      {/* Drawer: Agendar visita (futura) */}
      <Drawer
        isOpen={showVisitForm}
        onClose={() => { setShowVisitForm(false); setPrefilledClienteId(undefined); }}
        title={t('scheduleDrawerTitle')}
        icon={<CalendarDays className="w-5 h-5 text-primary" />}
        width="md"
      >
        <div className="p-6">
          <VisitForm
            clients={clients}
            onSave={handleSaveVisit}
            onCancel={() => { setShowVisitForm(false); setPrefilledClienteId(undefined); }}
            initialClienteId={prefilledClienteId}
          />
        </div>
      </Drawer>

      {/* Drawer: Detalle de visita */}
      <Drawer
        isOpen={showDetailDrawer}
        onClose={() => { setShowDetailDrawer(false); setVisitDetail(null); }}
        title={t('detail.title')}
        icon={<Eye className="w-5 h-5 text-blue-600" />}
        width="md"
      >
        {detailLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}
        {!detailLoading && visitDetail && (
          <div className="space-y-5 p-6">
            <div className="flex items-center gap-3">
              <SoftBadge tone={getResultado(visitDetail.resultado).tone}>{getResultado(visitDetail.resultado).label}</SoftBadge>
              <span className="text-sm font-medium text-foreground/70">{getTipo(visitDetail.tipoVisita)}</span>
            </div>

            <div className="bg-surface-1 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{visitDetail.clienteNombre}</span>
              </div>
              {visitDetail.clienteDireccion && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground/70">{visitDetail.clienteDireccion}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('detail.vendor')}: {visitDetail.usuarioNombre}</span>
              </div>
            </div>

            <div className="space-y-2">
              {visitDetail.fechaProgramada && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('detail.scheduled')}:</span>
                  <span>{libFmtDate(visitDetail.fechaProgramada, null, { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                </div>
              )}
              {visitDetail.fechaHoraInicio && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('detail.start')}:</span>
                  <span>{libFmtDate(visitDetail.fechaHoraInicio, null, { day: '2-digit', month: '2-digit', year: 'numeric' })} {formatTime(visitDetail.fechaHoraInicio)}</span>
                </div>
              )}
              {visitDetail.fechaHoraFin && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('detail.end')}:</span>
                  <span>{libFmtDate(visitDetail.fechaHoraFin, null, { day: '2-digit', month: '2-digit', year: 'numeric' })} {formatTime(visitDetail.fechaHoraFin)}</span>
                </div>
              )}
              {visitDetail.duracionMinutos && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('detail.durationLabel')}:</span>
                  <span className="font-medium">{visitDetail.duracionMinutos} min</span>
                </div>
              )}
            </div>

            {visitDetail.numeroPedido && (
              <div className="flex items-center gap-2 p-3 bg-surface-1 rounded-lg text-sm">
                <ShoppingCart className="w-4 h-4 text-primary" />
                <span className="text-foreground/80 font-medium">{t('detail.linkedOrder', { number: visitDetail.numeroPedido })}</span>
              </div>
            )}

            {visitDetail.notas && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t('detail.notes')}</p>
                <p className="text-sm text-foreground/80 bg-surface-1 rounded p-3">{visitDetail.notas}</p>
              </div>
            )}

            {(visitDetail.latitudInicio || visitDetail.latitudFin) && (() => {
              const markers: MapMarker[] = [];
              if (visitDetail.latitudInicio && visitDetail.longitudInicio) {
                markers.push({ id: 'checkin', lat: visitDetail.latitudInicio, lng: visitDetail.longitudInicio, title: t('detail.checkIn'), label: t('detail.checkIn'), color: 'green' });
              }
              if (visitDetail.latitudFin && visitDetail.longitudFin) {
                markers.push({ id: 'checkout', lat: visitDetail.latitudFin, lng: visitDetail.longitudFin, title: t('detail.checkOut'), label: t('detail.checkOut'), color: 'blue' });
              }
              return (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{t('detail.location')}</p>
                  <GoogleMapWrapper markers={markers} zoom={15} height="200px" />
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {visitDetail.latitudInicio && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        {t('detail.checkIn')}: {visitDetail.latitudInicio.toFixed(5)}, {visitDetail.longitudInicio?.toFixed(5)}
                      </span>
                    )}
                    {visitDetail.latitudFin && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        {t('detail.checkOut')}: {visitDetail.latitudFin.toFixed(5)}, {visitDetail.longitudFin?.toFixed(5)}
                      </span>
                    )}
                    {visitDetail.distanciaCliente != null && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {t('detail.distanceToClient')}: {visitDetail.distanciaCliente.toFixed(0)} m
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            <p className="text-sm text-muted-foreground text-center py-3">{t('detail.mobileOnlyHint')}</p>
          </div>
        )}
      </Drawer>
    </PageHeader>
  );
}

export default function VisitsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <VisitsPageContent />
    </Suspense>
  );
}
