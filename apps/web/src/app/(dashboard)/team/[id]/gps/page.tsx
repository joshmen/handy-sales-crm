'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Papa from 'papaparse';
import { ChevronLeft, Download, MapPin, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  teamLocationService,
  EventoGpsDelDia,
  FuenteUbicacion,
} from '@/services/api/teamLocation';
import { cn } from '@/lib/utils';
import { useFormatters } from '@/hooks/useFormatters';

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

const TYPE_ICON: Record<string, string> = {
  pedido: '🛒', cobro: '💰', visita: '👥',
  inicio_jornada: '🟢', fin_jornada: '🔴', stop_automatico: '🌙',
  inicio_ruta: '▶️', fin_ruta: '⏹️', parada: '🛣️',
  checkpoint: '📍', tracking: '📡',
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function ayerIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function lastNDays(n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/**
 * Página detalle del histórico GPS de un vendedor.
 * Layout split: mapa a la izquierda, lista de eventos a la derecha.
 * Filtros sticky arriba: date preset (Hoy/Ayer/7d/Custom) + tipo + búsqueda.
 * KPI bar abajo.
 */
export default function TeamGpsDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('team.gpsHistorial');
  const { formatDate } = useFormatters();

  const usuarioId = parseInt(params.id, 10);
  const diaParam = searchParams.get('dia') ?? todayIso();

  const [eventos, setEventos] = useState<EventoGpsDelDia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tiposActivos, setTiposActivos] = useState<Set<string>>(new Set(ALL_TYPES));
  const [busqueda, setBusqueda] = useState('');
  const [vendorName, setVendorName] = useState<string>('');

  // Date preset state
  const [preset, setPreset] = useState<'hoy' | 'ayer' | '7d' | 'custom'>(() => {
    if (diaParam === todayIso()) return 'hoy';
    if (diaParam === ayerIso()) return 'ayer';
    return 'custom';
  });

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
      cargarDia(todayIso());
    } else if (preset === 'ayer') {
      cargarDia(ayerIso());
    } else if (preset === '7d') {
      cargarRango(lastNDays(7));
    } else if (preset === 'custom' && diaParam) {
      cargarDia(diaParam);
    }
  }, [usuarioId, preset, diaParam, cargarDia, cargarRango]);

  const handlePreset = (p: 'hoy' | 'ayer' | '7d' | 'custom') => {
    setPreset(p);
    if (p === 'hoy') router.replace(`/team/${usuarioId}/gps?dia=${todayIso()}`);
    else if (p === 'ayer') router.replace(`/team/${usuarioId}/gps?dia=${ayerIso()}`);
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

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header sticky */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
        <Link
          href="/team/gps"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('back')}
        </Link>
        <div className="flex items-center gap-2 ml-2">
          <div className="w-9 h-9 rounded-full bg-surface-3 flex items-center justify-center text-sm font-semibold text-foreground/70">
            {vendorName[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{vendorName || `Vendedor #${usuarioId}`}</p>
            <p className="text-[11px] text-muted-foreground">ID #{usuarioId}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          {(['hoy', 'ayer', '7d'] as const).map(p => (
            <button
              key={p}
              onClick={() => handlePreset(p)}
              className={cn(
                'px-3 py-1.5 text-[12px] font-medium rounded-lg ring-1 transition-colors',
                preset === p
                  ? 'bg-emerald-100 text-emerald-700 ring-emerald-300'
                  : 'bg-surface-2 text-muted-foreground ring-transparent hover:bg-surface-3'
              )}
            >
              {p === 'hoy' ? t('preset.today') : p === 'ayer' ? t('preset.yesterday') : t('preset.last7days')}
            </button>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={handleExportCsv}
            disabled={eventosFiltrados.length === 0}
            className="ml-2"
          >
            <Download className="w-4 h-4 mr-1" />
            {t('exportCsv')}
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-border bg-surface-1 shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {ALL_TYPES.map(tipo => {
            const active = tiposActivos.has(tipo);
            return (
              <button
                key={tipo}
                onClick={() => toggleTipo(tipo)}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-medium rounded-full ring-1 transition-all',
                  active
                    ? `${TYPE_COLOR[tipo]} ring-current`
                    : 'bg-surface-2 text-muted-foreground/50 ring-transparent line-through'
                )}
              >
                {TYPE_ICON[tipo]} {labelTipo(tipo)}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('searchClient')}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="h-8 text-[12px] w-44"
          />
        </div>
      </div>

      {/* Cuerpo split */}
      <div className="flex flex-1 min-h-0 gap-0">
        {/* Mapa */}
        <div className="w-1/2 border-r border-border">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">{t('loading')}</div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-red-500">{error}</div>
          ) : (
            <GpsActivityMap
              eventos={eventosFiltrados}
              fullHeight
            />
          )}
        </div>

        {/* Lista */}
        <div className="w-1/2 flex flex-col min-h-0">
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
                return (
                  <div
                    key={`${ev.tipo}-${ev.referenciaId ?? 'np'}-${i}`}
                    className="flex items-start gap-3 p-2.5 bg-card rounded-lg border border-border-subtle hover:border-border transition-colors"
                  >
                    <div className="text-[10px] font-bold text-muted-foreground w-6 text-right pt-0.5">
                      #{i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge className={cn('text-[10px] px-1.5 py-0.5', TYPE_COLOR[ev.tipo])}>
                          {TYPE_ICON[ev.tipo]} {labelTipo(ev.tipo)}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {fecha} · {hora}
                        </span>
                      </div>
                      {ev.clienteNombre && (
                        <p className="text-[12px] font-medium text-foreground truncate">
                          {ev.clienteNombre}
                        </p>
                      )}
                      <a
                        href={`https://maps.google.com/?q=${ev.latitud},${ev.longitud}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-mono text-muted-foreground hover:text-primary"
                      >
                        {ev.latitud.toFixed(5)}, {ev.longitud.toFixed(5)} ↗
                      </a>
                      {ev.distanciaCliente != null && (
                        <span className="ml-2 text-[10px] text-muted-foreground/70">
                          ({Math.round(ev.distanciaCliente)}m del cliente)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* KPI bar */}
      <div className="shrink-0 flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 border-t border-border bg-surface-1 text-[11px] text-muted-foreground">
        <span><span className="font-semibold text-foreground">{kpis.total}</span> {t('kpi.events')}</span>
        <span><span className="font-semibold text-blue-700">{kpis.ventas}</span> {t('kpi.orders')}</span>
        <span><span className="font-semibold text-violet-700">{kpis.cobros}</span> {t('kpi.payments')}</span>
        <span><span className="font-semibold text-emerald-700">{kpis.visitas}</span> {t('kpi.visits')}</span>
        {kpis.inicio && (
          <span>{t('kpi.start')}: {formatDate(kpis.inicio, { hour: '2-digit', minute: '2-digit' })}</span>
        )}
        {kpis.fin && kpis.fin !== kpis.inicio && (
          <span>{t('kpi.end')}: {formatDate(kpis.fin, { hour: '2-digit', minute: '2-digit' })}</span>
        )}
      </div>
    </div>
  );
}
