'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  MapPin, ExternalLink, Clock,
  Navigation, Route as RouteIcon, Target, Loader2, Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchBar } from '@/components/common/SearchBar';
import { DateFilter } from '@/components/ui/DateFilter';
import { NameAvatar } from '@/components/ui/NameAvatar';
import { SoftBadge, type SoftBadgeTone } from '@/components/ui/SoftBadge';
import { useSignalR } from '@/contexts/SignalRContext';
import {
  teamLocationService,
  EventoGpsDelDia,
  RosterGpsItem,
  EstadoVendedorGps,
} from '@/services/api/teamLocation';
import { cn } from '@/lib/utils';
import { useFormatters } from '@/hooks/useFormatters';
import { useCompany } from '@/contexts/CompanyContext';
import type { GpsActivityMapHandle } from '@/app/(dashboard)/team/components/GpsActivityMap';

// Mapa Leaflet sólo en cliente (manipula `window`).
const GpsActivityMap = dynamic(
  () => import('@/app/(dashboard)/team/components/GpsActivityMap'),
  { ssr: false }
);

// ── Helpers de fecha (TZ tenant), distancia y formato ────────────────────────
// Espejados del detalle /team/[id]/gps. `isoDateInTz` evita el bug de día UTC
// para tenants en TZ negativa (Mazatlán UTC-7) reportado en prod 2026-05-02.
function isoDateInTz(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}
function todayIso(tz: string): string { return isoDateInTz(new Date(), tz); }
/** Distancia Haversine en km entre dos coordenadas. */
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = (bLat - aLat) * Math.PI / 180;
  const dLng = (bLng - aLng) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
/** Minutos → "Xh Ym" / "Nm" / "—". */
function fmtDur(min: number | null): string {
  if (min == null || min <= 0) return '—';
  const h = Math.floor(min / 60); const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
/** Minutos transcurridos desde un ISO (o null). Solo se invoca en render cliente. */
function minsSince(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.floor((Date.now() - ms) / 60000));
}

// ── Mapeos de estado/tono ────────────────────────────────────────────────────
const STATUS_TONE: Record<EstadoVendedorGps, SoftBadgeTone> = {
  en_ruta: 'success', inactivo: 'warning', sin_senal: 'danger',
};
const STATUS_DOT: Record<EstadoVendedorGps, string> = {
  en_ruta: 'bg-green-500', inactivo: 'bg-amber-500', sin_senal: 'bg-red-500',
};
// Tono del punto en la línea de tiempo según el tipo de evento.
type EvTone = 'success' | 'info' | 'warning' | 'default';
const EVENT_TONE: Record<string, EvTone> = {
  pedido: 'success', cobro: 'info', visita: 'success', parada: 'success',
  stop_automatico: 'warning', inicio_jornada: 'default', fin_jornada: 'default',
  inicio_ruta: 'default', fin_ruta: 'default', checkpoint: 'default', tracking: 'default',
};
const DOT_CLASS: Record<EvTone, string> = {
  success: 'bg-green-500', info: 'bg-blue-500', warning: 'bg-amber-500', default: 'bg-muted-foreground',
};

/** Segmented control (modo en vivo / histórico). */
function Seg<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { v: T; label: React.ReactNode }[];
}) {
  return (
    <div className="inline-flex rounded-lg border border-border-subtle bg-surface-1 p-0.5">
      {options.map(o => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          aria-pressed={value === o.v}
          className={cn(
            'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors',
            value === o.v ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Tarjeta KPI con icono — espejo del StatCard del mockup. */
function StatCard({ icon, label, value, sub, valueClass }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; valueClass?: string;
}) {
  return (
    <div className="bg-card border border-border-subtle rounded-lg px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</div>
        <span className="text-muted-foreground/70" aria-hidden>{icon}</span>
      </div>
      <div className={cn('text-2xl font-bold mt-1 tabular-nums', valueClass ?? 'text-foreground')}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

/**
 * "Histórico GPS" — pantalla master-detail (fiel al mockup TeamGpsPage de Claude
 * Design). Panel izquierdo: roster de vendedores con buscador + filtros + estado.
 * Panel derecho: KPIs + mapa + línea de tiempo del vendedor seleccionado.
 *
 * Modo "En vivo": híbrido — reusa los eventos SignalR que YA emite el main API
 * (PedidoCreated/CobroRegistrado/VisitaCompletada) + un poll ligero de 45s para
 * captar checkpoints de movimiento puro. Sin backplane nuevo (ver plan).
 *
 * Wrapper con <Suspense> porque usa useSearchParams (deep-link ?v=).
 */
export default function TeamGpsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Cargando…</div>}>
      <TeamGpsContent />
    </Suspense>
  );
}

function TeamGpsContent() {
  const t = useTranslations('team.gpsHistorial');
  const tc = useTranslations('common');
  const { formatDate, formatDateOnly, tenantToday } = useFormatters();
  const { settings } = useCompany();
  const tz = settings?.timezone || 'America/Mexico_City';

  const searchParams = useSearchParams();
  const vParam = searchParams.get('v');

  const [mode, setMode] = useState<'vivo' | 'historico'>('vivo');
  // En histórico, el filtro de día único (TZ tenant). Por defecto: hoy.
  const [diaFiltro, setDiaFiltro] = useState<string>(() => tenantToday());

  const [roster, setRoster] = useState<RosterGpsItem[]>([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [selId, setSelId] = useState<number | null>(null);
  const selIdRef = useRef<number | null>(null);
  useEffect(() => { selIdRef.current = selId; }, [selId]);

  const [q, setQ] = useState('');
  const [fZone, setFZone] = useState('');
  const [fSup, setFSup] = useState('');
  const [fStatus, setFStatus] = useState<'todos' | EstadoVendedorGps>('todos');

  const [eventos, setEventos] = useState<EventoGpsDelDia[]>([]);
  const [eventosLoading, setEventosLoading] = useState(false);
  const mapRef = useRef<GpsActivityMapHandle | null>(null);

  // ── Fetchers ──────────────────────────────────────────────────────────────
  const fetchRoster = useCallback(async (): Promise<RosterGpsItem[] | null> => {
    try {
      const list = await teamLocationService.getRosterGps();
      setRoster(list);
      return list;
    } catch {
      return null;
    } finally {
      setRosterLoading(false);
    }
  }, []);

  const fetchTrack = useCallback(async (id: number, dia: string) => {
    setEventosLoading(true);
    try {
      const res = await teamLocationService.getActividadDelDia(id, dia);
      setEventos(res.eventos);
    } catch {
      setEventos([]);
    } finally {
      setEventosLoading(false);
    }
  }, []);

  // Día efectivo a cargar: en vivo siempre hoy; en histórico el día filtrado.
  const diaActivo = mode === 'vivo' ? todayIso(tz) : diaFiltro;

  // Carga inicial del roster + selección por defecto (deep-link ?v= → primer en
  // ruta → primero de la lista).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await fetchRoster();
      if (cancelled || !list) return;
      setSelId(prev => {
        if (prev != null) return prev;
        const fromUrl = vParam ? parseInt(vParam, 10) : NaN;
        if (!Number.isNaN(fromUrl) && list.some(r => r.usuarioId === fromUrl)) return fromUrl;
        const enRuta = list.find(r => r.status === 'en_ruta');
        return enRuta ? enRuta.usuarioId : list.length ? list[0].usuarioId : null;
      });
    })();
    return () => { cancelled = true; };
  }, [fetchRoster, vParam]);

  // Carga del recorrido del vendedor seleccionado al cambiar selección/modo/día.
  useEffect(() => {
    if (selId == null) { setEventos([]); return; }
    fetchTrack(selId, diaActivo);
  }, [selId, diaActivo, fetchTrack]);

  // ── Modo "En vivo": SignalR (reuso de eventos existentes) + poll de 45s ─────
  const { on, off } = useSignalR();
  useEffect(() => {
    if (mode !== 'vivo') return;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        fetchRoster();
        const cur = selIdRef.current;
        if (cur != null) fetchTrack(cur, todayIso(tz));
      }, 800);
    };
    const events = ['PedidoCreated', 'CobroRegistrado', 'VisitaCompletada', 'DashboardUpdate'];
    events.forEach(e => on(e, refresh));
    const poll = setInterval(() => { fetchRoster(); }, 45000);
    return () => {
      events.forEach(e => off(e, refresh));
      if (debounce) clearTimeout(debounce);
      clearInterval(poll);
    };
  }, [mode, tz, on, off, fetchRoster, fetchTrack]);

  // Selección de vendedor — refleja en URL con history API (shallow, sin
  // re-render de la ruta; validado vs docs Next.js 15).
  const selectVendor = useCallback((id: number) => {
    setSelId(id);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `?v=${id}`);
    }
  }, []);

  // ── Derivados ───────────────────────────────────────────────────────────────
  const zones = useMemo(
    () => Array.from(new Set(roster.flatMap(r => r.zonas))).sort((a, b) => a.localeCompare(b)),
    [roster]
  );
  const sups = useMemo(
    () => Array.from(new Set(roster.map(r => r.supervisorNombre).filter((s): s is string => !!s))).sort((a, b) => a.localeCompare(b)),
    [roster]
  );
  const onCount = useMemo(() => roster.filter(r => r.status === 'en_ruta').length, [roster]);

  const filtered = useMemo(() => roster.filter(r =>
    (!q || r.nombre.toLowerCase().includes(q.toLowerCase())) &&
    (!fZone || r.zonas.includes(fZone)) &&
    (!fSup || r.supervisorNombre === fSup) &&
    (fStatus === 'todos' || r.status === fStatus)
  ), [roster, q, fZone, fSup, fStatus]);

  const selected = useMemo(() => roster.find(r => r.usuarioId === selId) ?? null, [roster, selId]);

  // Dwell ("tiempo en sitio") aproximado desde el timeline: para cada evento de
  // parada (con clienteId), el gap hasta el siguiente evento, acotado a 180 min
  // (para no inflar con el cierre de jornada). Decidido con el usuario.
  const dwellByIndex = useMemo(() => {
    const m = new Map<number, number>();
    for (let i = 0; i < eventos.length; i++) {
      if (eventos[i].clienteId == null) continue;
      const next = eventos[i + 1];
      if (!next) continue;
      const mins = Math.round((new Date(next.cuando).getTime() - new Date(eventos[i].cuando).getTime()) / 60000);
      if (mins > 0 && mins <= 180) m.set(i, mins);
    }
    return m;
  }, [eventos]);

  const kpis = useMemo(() => {
    let distKm = 0;
    for (let i = 1; i < eventos.length; i++) {
      distKm += haversineKm(eventos[i - 1].latitud, eventos[i - 1].longitud, eventos[i].latitud, eventos[i].longitud);
    }
    const clientes = new Set<number>(eventos.filter(e => e.clienteId != null).map(e => e.clienteId as number));
    const dwells = Array.from(dwellByIndex.values());
    const onSiteAvg = dwells.length ? Math.round(dwells.reduce((a, b) => a + b, 0) / dwells.length) : null;
    return { distKm, paradas: clientes.size, onSiteAvg };
  }, [eventos, dwellByIndex]);

  // ── Textos i18n ──────────────────────────────────────────────────────────────
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
  const statusLabel = (s: EstadoVendedorGps): string =>
    s === 'en_ruta' ? t('onRoute') : s === 'inactivo' ? t('inactive') : t('noSignal');

  const updText = (mins: number | null): string => {
    if (mins == null) return '—';
    if (mins < 1) return t('now');
    if (mins < 60) return t('minutesAgo', { count: mins });
    return t('hoursAgo', { count: Math.floor(mins / 60) });
  };
  const updToneClass = (status: EstadoVendedorGps, mins: number | null): string => {
    if (status === 'sin_senal') return 'text-red-500';
    if (mins != null && mins <= 5) return 'text-green-600';
    if (mins != null && mins <= 20) return 'text-amber-600';
    return 'text-muted-foreground';
  };

  // Etiqueta del día filtrado: atajos Hoy/Ayer si coinciden, si no la fecha corta.
  const diaLabel = (() => {
    const hoy = todayIso(tz);
    if (diaFiltro === hoy) return t('preset.today');
    const d = new Date(); d.setDate(d.getDate() - 1);
    if (diaFiltro === isoDateInTz(d, tz)) return t('preset.yesterday');
    return formatDateOnly(diaFiltro, { day: '2-digit', month: 'short', year: 'numeric' });
  })();
  const subtitle = mode === 'vivo'
    ? t('liveSubtitle', { onCount, total: roster.length })
    : t('historySubtitle', { day: diaLabel });

  const routeSupLine = selected ? (() => {
    const zona = selected.zonas[0];
    const sup = selected.supervisorNombre ? selected.supervisorNombre.split(' ')[0] : null;
    const parts: string[] = [];
    if (zona) parts.push(t('routeLabel', { zona }));
    if (sup) parts.push(t('supLabel', { sup }));
    return parts.join(' · ') || t('detailSubtitle');
  })() : '';

  const selMins = selected ? minsSince(selected.ultimaActividad) : null;

  return (
    <PageHeader
      section="equipo"
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: t('teamLabel'), href: '/team' },
        { label: t('title') },
      ]}
      title={t('title')}
      subtitle={subtitle}
      actions={
        <div className="flex items-center gap-2">
          <Seg
            value={mode}
            onChange={setMode}
            options={[
              { v: 'vivo', label: (<span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />{t('live')}</span>) },
              { v: 'historico', label: t('history') },
            ]}
          />
          {mode === 'historico' && (
            <DateFilter value={diaFiltro} onChange={setDiaFiltro} retentionDays={90} />
          )}
        </div>
      }
    >
      {!rosterLoading && roster.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Users className="w-10 h-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-foreground/80">{t('noVendors')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 items-start">
          {/* PANEL IZQUIERDO — roster */}
          <div className="bg-card border border-border-subtle rounded-lg overflow-hidden flex flex-col lg:h-[600px]">
            <div className="p-3 border-b border-border-subtle flex flex-col gap-2">
              <SearchBar
                value={q}
                onChange={(v) => setQ(v)}
                placeholder={t('searchVendor')}
                className="w-full"
              />
              <div className="flex gap-1.5">
                <select
                  value={fZone}
                  onChange={e => setFZone(e.target.value)}
                  aria-label={t('filterZone')}
                  className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-border-subtle rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">{t('filterZone')}</option>
                  {zones.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
                <select
                  value={fSup}
                  onChange={e => setFSup(e.target.value)}
                  aria-label={t('filterSupervisor')}
                  className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-border-subtle rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">{t('filterSupervisor')}</option>
                  {sups.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex gap-1">
                {([['todos', t('all')], ['en_ruta', t('onRoute')], ['inactivo', t('inactive')], ['sin_senal', t('noSignal')]] as const).map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => setFStatus(v as 'todos' | EstadoVendedorGps)}
                    aria-pressed={fStatus === v}
                    className={cn(
                      'flex-1 px-1 py-1 rounded-md text-[10.5px] font-semibold border transition-colors',
                      fStatus === v ? 'border-primary bg-primary text-primary-foreground' : 'border-border-subtle bg-card text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-[280px]">
              {rosterLoading ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />{t('loading')}
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-6 py-12 text-center text-xs text-muted-foreground">{t('noVendorsFiltered')}</div>
              ) : (
                filtered.map(v => {
                  const on = selId === v.usuarioId;
                  const mins = minsSince(v.ultimaActividad);
                  return (
                    <button
                      key={v.usuarioId}
                      onClick={() => selectVendor(v.usuarioId)}
                      aria-pressed={on}
                      className={cn(
                        'w-full text-left flex items-center gap-2.5 px-3 py-2.5 border-b border-border-subtle border-l-[3px] transition-colors',
                        on ? 'border-l-primary bg-primary/5' : 'border-l-transparent hover:bg-surface-1'
                      )}
                    >
                      <span className="relative flex-shrink-0">
                        <NameAvatar name={v.nombre} size={34} />
                        <span className={cn('absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-card', STATUS_DOT[v.status])} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-foreground truncate">{v.nombre}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{v.zonas[0] ?? t('noZone')}</div>
                      </div>
                      <div className={cn('text-[10px] font-bold flex items-center gap-1 flex-shrink-0', updToneClass(v.status, mins))}>
                        <span className="w-1 h-1 rounded-full bg-current" />
                        {v.status === 'sin_senal' ? t('noSignal') : updText(mins)}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* PANEL DERECHO — KPIs + mapa + timeline */}
          <div className="min-w-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3.5">
              <StatCard
                icon={<Navigation className="w-[18px] h-[18px]" />}
                label={t('lastLocation')}
                value={selected ? (selected.status === 'sin_senal' ? t('noSignal') : updText(selMins)) : '—'}
                sub={selected ? (selected.status === 'sin_senal' ? updText(selMins) : t('gpsActive')) : undefined}
                valueClass={selected?.status === 'sin_senal' ? 'text-red-500' : 'text-foreground'}
              />
              <StatCard icon={<RouteIcon className="w-[18px] h-[18px]" />} label={t('kpi.distance')} value={`${kpis.distKm.toFixed(1)} km`} />
              <StatCard icon={<MapPin className="w-[18px] h-[18px]" />} label={t('kpi.stops')} value={String(kpis.paradas)} valueClass="text-blue-600" />
              <StatCard icon={<Target className="w-[18px] h-[18px]" />} label={t('timeOnSite')} value={fmtDur(kpis.onSiteAvg)} valueClass="text-emerald-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-3.5">
              {/* Mapa */}
              <div className="bg-card border border-border-subtle rounded-lg overflow-hidden relative h-[420px] lg:h-[520px]">
                {mode === 'vivo' && selected && selected.status !== 'sin_senal' && (
                  <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2 bg-card rounded-full px-3 py-1.5 shadow-md text-[11.5px] font-semibold text-foreground">
                    <span className="w-2 h-2 rounded-full bg-green-500 ring-[3px] ring-green-500/25" />
                    {t('live')} · {selected.nombre}
                  </div>
                )}
                {eventosLoading ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />{t('loading')}
                  </div>
                ) : (
                  <GpsActivityMap ref={mapRef} eventos={eventos} fullHeight />
                )}
              </div>

              {/* Timeline */}
              <div className="bg-card border border-border-subtle rounded-lg overflow-hidden flex flex-col h-[520px]">
                <div className="px-4 py-3.5 border-b border-border-subtle flex items-center gap-2.5">
                  <NameAvatar name={selected?.nombre ?? '?'} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-bold text-foreground truncate">{selected?.nombre ?? '—'}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{routeSupLine}</div>
                  </div>
                  {selected && <SoftBadge tone={STATUS_TONE[selected.status]}>{statusLabel(selected.status)}</SoftBadge>}
                </div>
                <div className="flex-1 overflow-y-auto">
                  {eventosLoading ? (
                    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />{t('loading')}
                    </div>
                  ) : eventos.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <MapPin className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" aria-hidden />
                      <p className="text-sm text-muted-foreground">{t('noEvents')}</p>
                    </div>
                  ) : (
                    eventos.map((ev, i, arr) => {
                      const hora = formatDate(ev.cuando, { hour: '2-digit', minute: '2-digit' });
                      const dwell = dwellByIndex.get(i);
                      const tone = EVENT_TONE[ev.tipo] ?? 'default';
                      const tieneRef = ev.referenciaId != null && (ev.tipo === 'pedido' || ev.tipo === 'cobro');
                      const refHref = ev.tipo === 'pedido' ? `/orders/${ev.referenciaId}` : `/cobranza/${ev.referenciaId}`;
                      return (
                        <div key={`${ev.tipo}-${ev.referenciaId ?? 'np'}-${i}`} className="px-4 py-3 border-b border-border-subtle last:border-0 flex gap-3">
                          <div className="flex flex-col items-center flex-shrink-0">
                            <span className="text-[10.5px] text-muted-foreground font-bold tabular-nums">{hora}</span>
                            <div className={cn('w-2.5 h-2.5 rounded-full mt-1.5', DOT_CLASS[tone])} />
                            {i < arr.length - 1 && <div className="w-0.5 flex-1 min-h-4 bg-border mt-0.5" />}
                          </div>
                          <div className="flex-1 min-w-0 pb-0.5">
                            <div className="text-[12.5px] font-semibold text-foreground">{labelTipo(ev.tipo)}</div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {ev.clienteNombre ?? `${ev.latitud.toFixed(4)}, ${ev.longitud.toFixed(4)}`}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap mt-1.5">
                              {dwell != null && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-foreground/80 bg-surface-2 px-1.5 py-0.5 rounded">
                                  <Clock className="w-3 h-3" aria-hidden />{t('minutesOnSite', { min: dwell })}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => mapRef.current?.focusEvent(i)}
                                className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                              >
                                <MapPin className="w-3 h-3" aria-hidden />{t('viewOnMap')}
                              </button>
                              {tieneRef && (
                                <Link href={refHref} className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:underline">
                                  <ExternalLink className="w-3 h-3" aria-hidden />#{ev.referenciaId}
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageHeader>
  );
}
