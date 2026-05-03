'use client';

import { Suspense, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Papa from 'papaparse';
import {
  Download, MapPin, Search, ExternalLink,
  ShoppingCart, Wallet, Users, Play, StopCircle, Moon,
  Navigation, Flag, MapPinned, Radar,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import {
  teamLocationService,
  EventoGpsDelDia,
  FuenteUbicacion,
} from '@/services/api/teamLocation';
import { cn } from '@/lib/utils';
import { useFormatters } from '@/hooks/useFormatters';
import { useCompany } from '@/contexts/CompanyContext';
import type { GpsActivityMapHandle } from '@/app/(dashboard)/team/components/GpsActivityMap';

// Mapa Leaflet sólo en cliente (manipula `window`)
const GpsActivityMap = dynamic(
  () => import('@/app/(dashboard)/team/components/GpsActivityMap'),
  { ssr: false }
);

const ALL_TYPES: FuenteUbicacion[] = [
  'pedido', 'cobro', 'visita',
  'inicio_jornada', 'fin_jornada', 'stop_automatico',
  'inicio_ruta', 'fin_ruta', 'parada',
  'checkpoint', 'tracking',
];

const TYPE_COLOR: Record<string, string> = {
  pedido: 'bg-blue-100 text-blue-700 ring-blue-300',
  cobro: 'bg-violet-100 text-violet-700 ring-violet-300',
  visita: 'bg-emerald-100 text-emerald-700 ring-emerald-300',
  inicio_jornada: 'bg-green-100 text-green-700 ring-green-300',
  fin_jornada: 'bg-rose-100 text-rose-700 ring-rose-300',
  stop_automatico: 'bg-amber-100 text-amber-700 ring-amber-300',
  inicio_ruta: 'bg-cyan-100 text-cyan-700 ring-cyan-300',
  fin_ruta: 'bg-red-100 text-red-700 ring-red-300',
  parada: 'bg-orange-100 text-orange-700 ring-orange-300',
  checkpoint: 'bg-slate-100 text-slate-700 ring-slate-300',
  tracking: 'bg-slate-100 text-slate-700 ring-slate-300',
};

// Iconos lucide-react por tipo de evento. Reemplazó el map de emoji
// (🛒💰👥...) que el usuario reportó como "modo IA" — inconsistente con
// el resto del proyecto que usa SVG/lucide.
const TYPE_ICON: Record<string, LucideIcon> = {
  pedido: ShoppingCart,
  cobro: Wallet,
  visita: Users,
  inicio_jornada: Play,
  fin_jornada: StopCircle,
  stop_automatico: Moon,
  inicio_ruta: Navigation,
  fin_ruta: Flag,
  parada: MapPin,
  checkpoint: MapPinned,
  tracking: Radar,
};

/**
 * Devuelve YYYY-MM-DD del instante `date` calculado en la TZ del tenant.
 *
 * BUG previo: usábamos `new Date().toISOString().slice(0,10)` que retorna
 * la fecha en UTC. Para tenants en TZ negativa (Mazatlan UTC-7), después
 * de las 5pm local el UTC ya está en el día siguiente — el filtro "Hoy"
 * pedía la fecha de mañana al backend y los pings reales del día no salían.
 * Reportado en prod 2026-05-02 19:27 PDT por Jeyma. (Locale 'en-CA'
 * porque su formato default es YYYY-MM-DD, así no parseamos manualmente.)
 */
function isoDateInTz(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function todayIso(tz: string): string {
  return isoDateInTz(new Date(), tz);
}

function ayerIso(tz: string): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return isoDateInTz(d, tz);
}

function lastNDays(n: number, tz: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(isoDateInTz(d, tz));
  }
  return out;
}

/**
 * Página detalle del histórico GPS de un vendedor.
 * Layout split: mapa a la izquierda, lista de eventos a la derecha.
 * Filtros sticky arriba: date preset (Hoy/Ayer/7d/Custom) + tipo + búsqueda.
 * KPI bar abajo.
 *
 * Wrapper exportado: envuelve el contenido en <Suspense> porque usa
 * useSearchParams (Next.js 15 lo requiere para no convertir toda la ruta
 * a client-side rendering durante hydration).
 */
export default function TeamGpsDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Cargando…</div>}>
      <TeamGpsDetailContent />
    </Suspense>
  );
}

function TeamGpsDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('team.gpsHistorial');
  const { formatDate } = useFormatters();
  const { settings } = useCompany();
  // TZ del tenant (Mazatlan, México DF, etc.). Fallback a CDMX como en formatters.
  const tz = settings?.timezone || 'America/Mexico_City';

  const usuarioId = parseInt(params.id, 10);
  const dia = searchParams.get('dia');
  const rango = searchParams.get('rango');

  const [eventos, setEventos] = useState<EventoGpsDelDia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tiposActivos, setTiposActivos] = useState<Set<string>>(new Set(ALL_TYPES));
  const [busqueda, setBusqueda] = useState('');
  const [vendorName, setVendorName] = useState<string>('');
  // Ref imperativo al mapa Leaflet para que el botón "Ver en mapa" del
  // timeline pueda hacer flyTo + abrir el popup del marker correspondiente.
  const mapRef = useRef<GpsActivityMapHandle | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // `defaultDia` se inicializa vacío (estable entre SSR y hydration) y se
  // popula en useEffect — cualquier cómputo con `new Date()` durante render
  // produce React error #418 (hydration mismatch) ya que el server usa la
  // hora del server y el client la del browser. Reportado en prod por
  // Jeyma 2026-05-02 navegando a /team/3/gps?rango=7d.
  const [defaultDia, setDefaultDia] = useState<string>('');
  useEffect(() => {
    setDefaultDia(todayIso(tz));
  }, [tz]);

  const diaParam = dia ?? defaultDia;

  // Preset state: se inicializa en valor estable y luego se ajusta en
  // useEffect según la URL (?dia=... o ?rango=7d) y la fecha real (TZ tenant).
  const [preset, setPreset] = useState<'hoy' | 'ayer' | '7d' | 'custom'>('hoy');
  useEffect(() => {
    if (rango === '7d') { setPreset('7d'); return; }
    if (!dia) { setPreset('hoy'); return; }
    if (dia === todayIso(tz)) { setPreset('hoy'); return; }
    if (dia === ayerIso(tz)) { setPreset('ayer'); return; }
    setPreset('custom');
  }, [dia, rango, tz]);

  const cargarDia = useCallback(async (dia: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await teamLocationService.getActividadDelDia(usuarioId, dia);
      setEventos(res.eventos);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      setError(msg);
      setEventos([]);
    } finally {
      setLoading(false);
    }
  }, [usuarioId]);

  const cargarRango = useCallback(async (dias: string[]) => {
    try {
      setLoading(true);
      setError(null);
      const responses = await Promise.all(
        dias.map(d => teamLocationService.getActividadDelDia(usuarioId, d).catch(() => null))
      );
      const todos = responses
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .flatMap(r => r.eventos)
        .sort((a, b) => a.cuando.localeCompare(b.cuando));
      setEventos(todos);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      setError(msg);
      setEventos([]);
    } finally {
      setLoading(false);
    }
  }, [usuarioId]);

  // Cargar nombre del vendedor desde el listado de ubicaciones (no hay otro endpoint barato)
  useEffect(() => {
    let cancelled = false;
    teamLocationService.getUltimasUbicaciones().then(list => {
      if (cancelled) return;
      const found = list.find(u => u.usuarioId === usuarioId);
      if (found) setVendorName(found.nombre);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [usuarioId]);

  // Cargar al cambiar usuarioId o preset
  useEffect(() => {
    if (preset === 'hoy') {
      cargarDia(todayIso(tz));
    } else if (preset === 'ayer') {
      cargarDia(ayerIso(tz));
    } else if (preset === '7d') {
      cargarRango(lastNDays(7, tz));
    } else if (preset === 'custom' && diaParam) {
      cargarDia(diaParam);
    }
  }, [usuarioId, preset, diaParam, cargarDia, cargarRango, tz]);

  const handlePreset = (p: 'hoy' | 'ayer' | '7d' | 'custom') => {
    setPreset(p);
    if (p === 'hoy') router.replace(`/team/${usuarioId}/gps?dia=${todayIso(tz)}`);
    else if (p === 'ayer') router.replace(`/team/${usuarioId}/gps?dia=${ayerIso(tz)}`);
    else if (p === '7d') router.replace(`/team/${usuarioId}/gps?rango=7d`);
  };

  const toggleTipo = (tipo: string) => {
    setTiposActivos(prev => {
      const next = new Set(prev);
      if (next.has(tipo)) next.delete(tipo);
      else next.add(tipo);
      return next;
    });
  };

  // Eventos filtrados por tipo + búsqueda libre (cliente)
  const eventosFiltrados = useMemo(() => {
    let out = eventos.filter(ev => tiposActivos.has(ev.tipo));
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      out = out.filter(ev =>
        (ev.clienteNombre ?? '').toLowerCase().includes(q)
      );
    }
    return out;
  }, [eventos, tiposActivos, busqueda]);

  // KPIs derivados (sobre filtrados)
  const kpis = useMemo(() => {
    const ventas = eventosFiltrados.filter(e => e.tipo === 'pedido').length;
    const cobros = eventosFiltrados.filter(e => e.tipo === 'cobro').length;
    const visitas = eventosFiltrados.filter(e => e.tipo === 'visita').length;
    const total = eventosFiltrados.length;
    const inicio = eventosFiltrados[0]?.cuando ?? null;
    const fin = eventosFiltrados[eventosFiltrados.length - 1]?.cuando ?? null;
    return { total, ventas, cobros, visitas, inicio, fin };
  }, [eventosFiltrados]);

  const handleExportCsv = () => {
    const rows = eventosFiltrados.map((ev, i) => ({
      '#': i + 1,
      Fecha: ev.cuando.slice(0, 10),
      Hora: formatDate(ev.cuando, { hour: '2-digit', minute: '2-digit' }),
      Tipo: ev.tipo,
      Cliente: ev.clienteNombre ?? '',
      Latitud: ev.latitud.toFixed(6),
      Longitud: ev.longitud.toFixed(6),
      'DistanciaCliente(m)': ev.distanciaCliente ?? '',
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gps-vendedor-${usuarioId}-${diaParam}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const labelTipo = (tipo: string): string => {
    switch (tipo) {
      case 'pedido': return t('source.order');
      case 'cobro': return t('source.payment');
      case 'visita': return t('source.visit');
      case 'inicio_jornada': return t('source.workdayStart');
      case 'fin_jornada': return t('source.workdayEnd');
      case 'stop_automatico': return t('source.autoStop');
      case 'inicio_ruta': return t('source.routeStart');
      case 'fin_ruta': return t('source.routeEnd');
      case 'parada': return t('source.stop');
      case 'checkpoint': return t('source.checkpoint');
      case 'tracking': return t('source.tracking');
      default: return tipo;
    }
  };

  const tc = useTranslations('common');

  return (
    <PageHeader
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: t('teamLabel'), href: '/team' },
        { label: t('title'), href: '/team/gps' },
        { label: vendorName || `#${usuarioId}` },
      ]}
      title={vendorName || `Vendedor #${usuarioId}`}
      subtitle={t('detailSubtitle')}
      actions={
        <>
          {(['hoy', 'ayer', '7d'] as const).map(p => {
            const label = p === 'hoy' ? t('preset.today') : p === 'ayer' ? t('preset.yesterday') : t('preset.last7days');
            return (
              <button
                key={p}
                onClick={() => handlePreset(p)}
                aria-pressed={preset === p}
                className={cn(
                  'px-3 py-2 text-xs font-medium rounded transition-colors',
                  preset === p
                    ? 'bg-success text-success-foreground'
                    : 'bg-surface-3 text-foreground/70 hover:bg-surface-3'
                )}
              >
                {label}
              </button>
            );
          })}
          <button
            onClick={handleExportCsv}
            disabled={eventosFiltrados.length === 0}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-foreground border border-border-subtle rounded hover:bg-surface-1 transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">{t('exportCsv')}</span>
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Filter Row — chips por tipo + búsqueda cliente */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {ALL_TYPES.map(tipo => {
              const active = tiposActivos.has(tipo);
              const tipoLabel = labelTipo(tipo);
              const Icon = TYPE_ICON[tipo] ?? MapPin;
              return (
                <button
                  key={tipo}
                  onClick={() => toggleTipo(tipo)}
                  aria-pressed={active}
                  aria-label={`${active ? 'Desactivar' : 'Activar'} filtro: ${tipoLabel}`}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors',
                    active
                      ? `${TYPE_COLOR[tipo]}`
                      : 'bg-surface-3 text-muted-foreground/60 line-through'
                  )}
                >
                  <Icon className="w-3 h-3" aria-hidden="true" />
                  {tipoLabel}
                </button>
              );
            })}
          </div>
          <div className="relative ml-auto" style={{ width: '220px' }}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" aria-hidden="true" />
            <input
              type="text"
              placeholder={t('searchClient')}
              aria-label={t('searchClient')}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-border-subtle rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border-subtle rounded-lg px-4 py-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{t('kpi.events')}</div>
            <div className="text-2xl font-bold text-foreground mt-1">{kpis.total}</div>
          </div>
          <div className="bg-card border border-border-subtle rounded-lg px-4 py-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{t('kpi.orders')}</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{kpis.ventas}</div>
          </div>
          <div className="bg-card border border-border-subtle rounded-lg px-4 py-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{t('kpi.payments')}</div>
            <div className="text-2xl font-bold text-violet-600 mt-1">{kpis.cobros}</div>
          </div>
          <div className="bg-card border border-border-subtle rounded-lg px-4 py-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{t('kpi.visits')}</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{kpis.visitas}</div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Cuerpo split: mapa + lista */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-380px)] min-h-[400px]">
          {/* Mapa */}
          <div ref={mapContainerRef} className="bg-card border border-border-subtle rounded-lg overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">{t('loading')}</div>
            ) : (
              <GpsActivityMap ref={mapRef} eventos={eventosFiltrados} fullHeight />
            )}
          </div>

          {/* Lista */}
          <div className="bg-card border border-border-subtle rounded-lg flex flex-col min-h-0">
            <div className="px-3 py-2 border-b border-border-subtle text-[11px] uppercase tracking-wide font-medium text-muted-foreground">
              {t('eventsTimeline')}
            </div>
            <div className="overflow-y-auto flex-1 px-3 py-2 space-y-1.5">
              {loading ? (
                <p className="text-center text-muted-foreground py-8 text-sm">{t('loading')}</p>
              ) : eventosFiltrados.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{t('noEvents')}</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">{t('tryDifferentRange')}</p>
                </div>
              ) : (
                eventosFiltrados.map((ev, i) => {
                  const hora = formatDate(ev.cuando, { hour: '2-digit', minute: '2-digit' });
                  const fecha = formatDate(ev.cuando, { day: '2-digit', month: 'short' });
                  // Indicador de eventos agrupados (mismo timestamp al minuto que el anterior).
                  // Util para detectar el patrón Venta+InicioJornada+StopAutomatico que reportamos
                  // en Jeyma sábado — mismo `cuando` apila 3 pings consecutivos.
                  const esAgrupado = i > 0 &&
                    eventosFiltrados[i - 1].cuando.slice(0, 16) === ev.cuando.slice(0, 16);
                  // Link a la orden/cobro si el evento tiene referenciaId
                  const tieneRef = ev.referenciaId != null && (ev.tipo === 'pedido' || ev.tipo === 'cobro');
                  const refHref = ev.tipo === 'pedido' ? `/orders/${ev.referenciaId}` : `/cobranza/${ev.referenciaId}`;
                  const refLabel = ev.tipo === 'pedido' ? 'pedido' : 'cobro';
                  return (
                    <div
                      key={`${ev.tipo}-${ev.referenciaId ?? 'np'}-${i}`}
                      className="flex items-start gap-3 p-2.5 bg-surface-1 rounded-lg border border-transparent hover:border-border-subtle transition-colors"
                    >
                      <div className="text-[10px] font-bold text-muted-foreground w-6 text-right pt-0.5">
                        #{i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge className={cn('inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5', TYPE_COLOR[ev.tipo])}>
                            {(() => { const Icon = TYPE_ICON[ev.tipo] ?? MapPin; return <Icon className="w-3 h-3" aria-hidden="true" />; })()}
                            {labelTipo(ev.tipo)}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {fecha} · {hora}
                          </span>
                          {esAgrupado && (
                            <span
                              title="Evento simultáneo con el anterior"
                              aria-label="Evento simultáneo con el anterior"
                              className="w-2 h-2 rounded-full bg-amber-400 ring-1 ring-amber-200 flex-shrink-0"
                            />
                          )}
                        </div>
                        {ev.clienteNombre && (
                          <p className="text-[12px] font-medium text-foreground truncate">
                            {ev.clienteNombre}
                          </p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          {/* "Ver en mapa" — pan + abre popup del marker en el mapa Leaflet
                              embedido. Antes había un link externo a Google Maps, removido
                              porque sacaba al usuario de la app y no integraba con el mapa
                              de la página. */}
                          <button
                            type="button"
                            onClick={() => {
                              mapRef.current?.focusEvent(i);
                              // En layout vertical (mobile/tablet), traer el mapa a la vista.
                              mapContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            aria-label={`${t('viewOnMap')}: ${ev.tipo} #${i + 1}`}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                          >
                            <MapPin className="w-3 h-3" aria-hidden="true" />
                            {t('viewOnMap')}
                          </button>
                          <span className="text-[10px] font-mono text-muted-foreground/60">
                            {ev.latitud.toFixed(5)}, {ev.longitud.toFixed(5)}
                          </span>
                          {ev.distanciaCliente != null && (
                            <span className="text-[10px] text-muted-foreground/70">
                              ({Math.round(ev.distanciaCliente)}m)
                            </span>
                          )}
                        </div>
                        {tieneRef && (
                          <Link
                            href={refHref}
                            className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline"
                            aria-label={`Ver ${refLabel} #${ev.referenciaId}`}
                          >
                            <ExternalLink className="w-3 h-3" aria-hidden="true" />
                            Ver {refLabel} #{ev.referenciaId}
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </PageHeader>
  );
}
